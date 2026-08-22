import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import {
  EmailIntakeDetail,
  EmailIntakeStatus,
  EmailIntakeSummary,
  EmailReviewStatus,
  EmailSuggestionReviewRequest,
  EmailSuggestionStatus,
  EmailTaskSuggestion,
} from '../../../core/models/email-triage.model';
import { EmailTriageService } from '../../../core/services/email-triage.service';
import { Area, EventPriority, EventType } from '../../../core/models/lookup.model';
import { Project } from '../../../core/models/project.model';
import { LookupService } from '../../../core/services/lookup.service';
import { ProjectsService } from '../../../core/services/projects.service';

interface StatusOption {
  value: EmailIntakeStatus | null;
  label: string;
}

interface SuggestionEdit {
  eventTypeId: number | null;
  areaId: number | null;
  priorityId: number | null;
  projectId: number | null;
}

@Component({
  selector: 'app-email-triage',
  standalone: true,
  imports: [
    DatePipe,
    JsonPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './email-triage.component.html',
  styleUrl: './email-triage.component.scss',
})
export class EmailTriageComponent implements OnInit {
  private readonly triageService = inject(EmailTriageService);
  private readonly lookupService = inject(LookupService);
  private readonly projectsService = inject(ProjectsService);
  private readonly pageSize = 25;

  readonly statusOptions: StatusOption[] = [
    { value: 'needs_review', label: 'Needs review' },
    { value: null, label: 'All messages' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'failed', label: 'Failed' },
    { value: 'quarantined', label: 'Quarantined' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'completed', label: 'Completed' },
  ];

  readonly filterControl = new FormControl<EmailIntakeStatus | null>('needs_review');
  readonly reviewForm = new FormGroup({
    triageSummary: new FormControl('', { nonNullable: true }),
    triageReason: new FormControl('', { nonNullable: true }),
  });

  items: EmailIntakeSummary[] = [];
  selected: EmailIntakeDetail | null = null;
  selectedId: number | null = null;
  suggestionNotes: Record<number, string> = {};
  suggestionEdits: Record<number, SuggestionEdit> = {};
  eventTypes: EventType[] = [];
  areas: Area[] = [];
  priorities: EventPriority[] = [];
  projects: Project[] = [];
  total = 0;
  offset = 0;
  loading = true;
  detailLoading = false;
  saving = false;
  reviewingSuggestionId: number | null = null;
  errorMessage = '';
  successMessage = '';

  get firstItemNumber(): number { return this.total === 0 ? 0 : this.offset + 1; }
  get lastItemNumber(): number { return Math.min(this.offset + this.items.length, this.total); }
  get canGoBack(): boolean { return this.offset > 0; }
  get canGoForward(): boolean { return this.offset + this.pageSize < this.total; }

  ngOnInit(): void {
    this.filterControl.valueChanges.subscribe(() => {
      this.offset = 0;
      this.selectedId = null;
      this.selected = null;
      this.load();
    });
    forkJoin({
      eventTypes: this.lookupService.getEventTypes(),
      areas: this.lookupService.getAreas(),
      priorities: this.lookupService.getEventPriorities(),
      projects: this.projectsService.getAll(),
    }).subscribe({
      next: ({ eventTypes, areas, priorities, projects }) => {
        this.eventTypes = eventTypes;
        this.areas = areas;
        this.priorities = priorities;
        this.projects = projects;
        this.load();
      },
      error: error => {
        this.loading = false;
        this.errorMessage = this.errorText(error, 'Unable to load task options.');
      },
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.triageService.getAll(this.filterControl.value, this.pageSize, this.offset)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: page => {
          this.items = page.items;
          this.total = page.total;
          if (this.selectedId && this.items.some(item => item.emailIntakeId === this.selectedId)) {
            return;
          }
          const first = this.items[0];
          if (first) this.select(first);
          else {
            this.selectedId = null;
            this.selected = null;
          }
        },
        error: error => this.errorMessage = this.errorText(
          error,
          'Unable to load incoming emails. Administrator access is required.',
        ),
      });
  }

  refresh(): void {
    this.successMessage = '';
    this.load();
    if (this.selectedId) this.loadDetail(this.selectedId);
  }

  select(item: EmailIntakeSummary): void {
    if (this.selectedId === item.emailIntakeId && this.selected) return;
    this.selectedId = item.emailIntakeId;
    this.loadDetail(item.emailIntakeId);
  }

  previousPage(): void {
    if (!this.canGoBack) return;
    this.offset = Math.max(0, this.offset - this.pageSize);
    this.selectedId = null;
    this.selected = null;
    this.load();
  }

  nextPage(): void {
    if (!this.canGoForward) return;
    this.offset += this.pageSize;
    this.selectedId = null;
    this.selected = null;
    this.load();
  }

  review(status: EmailReviewStatus): void {
    if (!this.selected || this.saving) return;
    const id = this.selected.emailIntakeId;
    const values = this.reviewForm.getRawValue();
    this.saving = true;
    this.clearMessages();
    this.triageService.reviewIntake(id, {
      status,
      triageSummary: this.clean(values.triageSummary),
      triageReason: this.clean(values.triageReason),
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.successMessage = `Email marked as ${this.statusLabel(status).toLowerCase()}.`;
        this.loadDetail(id);
        this.load();
      },
      error: error => this.errorMessage = this.errorText(error, 'Unable to save the email review.'),
    });
  }

  reviewSuggestion(
    suggestion: EmailTaskSuggestion,
    status: Extract<EmailSuggestionStatus, 'approved' | 'rejected'>,
  ): void {
    if (!this.selected || this.reviewingSuggestionId !== null) return;
    this.reviewingSuggestionId = suggestion.emailTaskSuggestionId;
    this.clearMessages();
    const edit = this.suggestionEdits[suggestion.emailTaskSuggestionId];
    const request: EmailSuggestionReviewRequest = {
      status,
      reviewNotes: this.clean(this.suggestionNotes[suggestion.emailTaskSuggestionId]),
    };
    if (status === 'approved' && suggestion.actionType !== 'update_existing_task' && edit) {
      request.eventTypeId = edit.eventTypeId ?? undefined;
      request.areaId = edit.areaId ?? undefined;
      request.priorityId = edit.priorityId ?? undefined;
      request.projectId = edit.projectId ?? undefined;
    }
    this.triageService.reviewSuggestion(
      this.selected.emailIntakeId,
      suggestion.emailTaskSuggestionId,
      request,
    ).pipe(finalize(() => this.reviewingSuggestionId = null)).subscribe({
      next: result => {
        if (!result) {
          this.errorMessage = 'The API approved the suggestion but did not apply it. Restart the HomeDiary API, then approve it again.';
          this.loadDetail(this.selected!.emailIntakeId);
          this.load();
          return;
        }
        this.successMessage = result.status === 'created'
          ? `Task #${result.eventId} created.`
          : result.status === 'applied'
            ? `Changes applied to task #${result.eventId}.`
            : `Task suggestion ${result.status}.`;
        this.loadDetail(this.selected!.emailIntakeId);
        this.load();
      },
      error: error => this.errorMessage = this.errorText(error, 'Unable to review the task suggestion.'),
    });
  }

  senderName(item: EmailIntakeSummary): string {
    return item.senderName || item.senderEmail || 'Unknown sender';
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ').replace(/^./, value => value.toUpperCase());
  }

  confidence(value?: number): string {
    return value === undefined || value === null ? 'Not scored' : `${Math.round(value * 100)}% confidence`;
  }

  missingInformation(suggestion: EmailTaskSuggestion): string[] {
    if (!Array.isArray(suggestion.missingInformation)) return [];
    return suggestion.missingInformation.map(value =>
      typeof value === 'string' ? value : JSON.stringify(value),
    );
  }

  evidence(suggestion: EmailTaskSuggestion): string[] {
    if (!Array.isArray(suggestion.evidence)) return [];
    return suggestion.evidence.map(value =>
      typeof value === 'string' ? value : JSON.stringify(value),
    );
  }

  actionLabel(actionType: string): string {
    const labels: Record<string, string> = {
      create_task: 'Create task',
      create_project_task: 'Create project task',
      update_existing_task: 'Update existing task',
    };
    return labels[actionType] ?? this.statusLabel(actionType);
  }

  setSuggestionEdit(
    suggestionId: number,
    field: keyof SuggestionEdit,
    value: number | null,
  ): void {
    const edit = this.suggestionEdits[suggestionId];
    if (edit) edit[field] = value;
  }

  private loadDetail(id: number): void {
    this.detailLoading = true;
    this.errorMessage = '';
    this.triageService.getById(id).pipe(finalize(() => this.detailLoading = false)).subscribe({
      next: detail => {
        if (this.selectedId !== id) return;
        this.selected = detail;
        this.reviewForm.setValue({
          triageSummary: detail.triageSummary ?? '',
          triageReason: detail.triageReason ?? '',
        });
        this.suggestionNotes = Object.fromEntries(
          detail.suggestions.map(item => [item.emailTaskSuggestionId, item.reviewNotes ?? '']),
        );
        const defaultEventTypeId = this.namedId(
          this.eventTypes, 'title', 'eventTypeId', 'maintenance');
        const defaultAreaId = this.namedId(this.areas, 'title', 'areaId', 'house');
        const defaultPriorityId = this.namedId(
          this.priorities, 'title', 'eventPriorityId', 'medium');
        this.suggestionEdits = Object.fromEntries(detail.suggestions.map(item => [
          item.emailTaskSuggestionId,
          {
            eventTypeId: item.eventTypeId ?? defaultEventTypeId ?? this.eventTypes[0]?.eventTypeId ?? null,
            areaId: item.areaId ?? defaultAreaId ?? this.areas[0]?.areaId ?? null,
            priorityId: item.priorityId ?? defaultPriorityId ?? this.priorities[0]?.eventPriorityId ?? null,
            projectId: item.projectId ?? null,
          },
        ]));
      },
      error: error => this.errorMessage = this.errorText(error, 'Unable to load this email.'),
    });
  }

  private clean(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private namedId<T>(
    items: T[],
    titleField: keyof T,
    idField: keyof T,
    title: string,
  ): number | null {
    const item = items.find(value =>
      String(value[titleField] ?? '').trim().toLowerCase() === title);
    const id = item?.[idField];
    return typeof id === 'number' ? id : null;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private errorText(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    return error.error?.detail ?? error.error?.title ?? fallback;
  }
}
