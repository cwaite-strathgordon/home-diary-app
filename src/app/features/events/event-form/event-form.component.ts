import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, Observable } from 'rxjs';

class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override parse(value: string | null): Date | null {
    if (typeof value === 'string' && value.trim()) {
      const parts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (parts) {
        const d = new Date(+parts[3], +parts[2] - 1, +parts[1]);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: unknown): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }
}

const DD_MM_YYYY_FORMATS = {
  parse:   { dateInput: 'dd/MM/yyyy' },
  display: {
    dateInput:         'dd/MM/yyyy',
    monthYearLabel:    'MMM yyyy',
    dateA11yLabel:     'dd/MM/yyyy',
    monthYearA11yLabel:'MMMM yyyy',
  },
};

import { EventsService } from '../../../core/services/events.service';
import { LookupService } from '../../../core/services/lookup.service';
import { AuthService } from '../../../core/services/auth.service';
import { HomeEventDetail } from '../../../core/models/home-event.model';
import { Area, EventType, EventStatus, EventPriority } from '../../../core/models/lookup.model';
import { Project } from '../../../core/models/project.model';
import { ProjectsService } from '../../../core/services/projects.service';

export interface EventFormData {
  event?: HomeEventDetail;
  projectId?: number;
}

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
    MatCheckboxModule,
  ],
  providers: [
    { provide: DateAdapter,      useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS  },
  ],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
})
export class EventFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  saving = signal(false);

  areas    = signal<Area[]>([]);
  types    = signal<EventType[]>([]);
  statuses = signal<EventStatus[]>([]);
  priorities = signal<EventPriority[]>([]);
  projects = signal<Project[]>([]);

  isCompleted = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EventFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EventFormData,
    private eventsService: EventsService,
    private lookupService: LookupService,
    private projectsService: ProjectsService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data?.event;
    const ev = this.data?.event;
    this.isCompleted = ev?.eventStatusTitle?.toLowerCase() === 'complete';

    this.form = this.fb.group({
      eventId:       [ev?.eventId ?? 0],
      title:         [ev?.title ?? '',   Validators.required],
      description:   [ev?.description ?? ''],
      eventDate:     [ev?.eventDate ? new Date(ev.eventDate) : null],
      targetCompletionDate: [ev?.targetCompletionDate ? new Date(ev.targetCompletionDate) : null],
      actualCompletionDate: [ev?.actualCompletionDate ?? null],
      eventTypeId:   [ev?.eventTypeId ?? null,   Validators.required],
      areaId:        [ev?.areaId ?? null,         Validators.required],
      eventStatusId: [ev?.eventStatusId ?? null,  Validators.required],
      priorityId:    [ev?.priorityId ?? 3,         Validators.required],
      projectId:     [ev?.projectId ?? this.data?.projectId ?? null],
      isRecurring:   [ev?.isRecurring ?? false],
      recurrencePreset: [this.recurrencePreset(ev)],
      recurrenceInterval: [ev?.recurrenceInterval ?? 1, Validators.min(1)],
      recurrenceUnit: [ev?.recurrenceUnit ?? 'day'],
      createdById:   [ev?.createdById ?? this.auth.currentUser()?.userId],
    });

    forkJoin({
      areas:    this.lookupService.getAreas(),
      types:    this.lookupService.getEventTypes(),
      statuses: this.lookupService.getEventStatuses(),
      priorities: this.lookupService.getEventPriorities(),
      projects: this.projectsService.getAll(),
    }).subscribe(({ areas, types, statuses, priorities, projects }) => {
      this.areas.set(areas);
      this.types.set(types);
      this.statuses.set(statuses);
      this.priorities.set(priorities);
      this.projects.set(projects);
    });

    this.form.get('recurrencePreset')?.valueChanges.subscribe(preset => this.applyRecurrencePreset(preset));

  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload = { ...this.form.value };
    if (payload.eventDate instanceof Date) {
      payload.eventDate = payload.eventDate.toISOString().split('T')[0];
    }
    if (payload.targetCompletionDate instanceof Date) {
      payload.targetCompletionDate = payload.targetCompletionDate.toISOString().split('T')[0];
    }
    delete payload.recurrencePreset;
    if (!payload.isRecurring) {
      payload.recurrenceInterval = null;
      payload.recurrenceUnit = null;
    }

    const op: Observable<any> = this.isEdit
      ? this.eventsService.update(payload.eventId, payload)
      : this.eventsService.create(payload);

    op.subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  openFullDetails(): void {
    const eventId = this.data?.event?.eventId;
    if (!eventId) return;
    this.dialogRef.close(false);
    this.router.navigate(['/events', eventId]);
  }

  private recurrencePreset(event?: HomeEventDetail): string {
    if (!event?.isRecurring) return 'daily';
    const key = `${event.recurrenceInterval}:${event.recurrenceUnit}`;
    return ({ '1:day': 'daily', '1:week': 'weekly', '1:month': 'monthly',
      '1:year': 'annual', '6:month': 'biannual' } as Record<string, string>)[key]
      ?? (event.recurrenceUnit === 'month' ? 'custom-months' : 'custom-days');
  }

  private applyRecurrencePreset(preset: string): void {
    const values: Record<string, { interval: number; unit: string }> = {
      daily: { interval: 1, unit: 'day' }, weekly: { interval: 1, unit: 'week' },
      monthly: { interval: 1, unit: 'month' }, annual: { interval: 1, unit: 'year' },
      biannual: { interval: 6, unit: 'month' },
    };
    const value = values[preset];
    if (value) this.form.patchValue({ recurrenceInterval: value.interval, recurrenceUnit: value.unit }, { emitEvent: false });
    else if (preset === 'custom-days') this.form.patchValue({ recurrenceUnit: 'day' }, { emitEvent: false });
    else if (preset === 'custom-months') this.form.patchValue({ recurrenceUnit: 'month' }, { emitEvent: false });
  }
}
