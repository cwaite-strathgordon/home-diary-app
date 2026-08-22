import { Component, Input, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LookupService } from '../../../core/services/lookup.service';
import { AppDialogService } from '../../../core/services/app-dialog.service';

export type LookupKind = 'areas' | 'event-types';

interface LookupRow {
  id: number;
  title: string;
  description: string;
}

@Component({
  selector: 'app-lookup-management',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule,
  ],
  templateUrl: './lookup-management.component.html',
  styleUrl: './lookup-management.component.scss',
})
export class LookupManagementComponent implements OnInit {
  private readonly lookupService = inject(LookupService);
  private readonly appDialog = inject(AppDialogService);

  @Input({ required: true }) kind!: LookupKind;
  @Input({ required: true }) heading = '';
  @Input({ required: true }) singularName = '';
  @Input() description = '';

  rows: LookupRow[] = [];
  editingId: number | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const request: Observable<LookupRow[]> = this.kind === 'areas'
      ? this.lookupService.getAreas().pipe(map(values => values.map(value => ({
          id: value.areaId,
          title: value.title ?? '',
          description: value.description ?? '',
        }))))
      : this.lookupService.getEventTypes().pipe(map(values => values.map(value => ({
          id: value.eventTypeId,
          title: value.title ?? '',
          description: value.description ?? '',
        }))));

    request.pipe(finalize(() => this.loading = false)).subscribe({
      next: values => this.rows = values,
      error: error => this.errorMessage = this.getErrorMessage(error, `Unable to load ${this.heading.toLowerCase()}.`),
    });
  }

  edit(row: LookupRow): void {
    this.editingId = row.id;
    this.form.setValue({ title: row.title, description: row.description });
    this.clearMessages();
  }

  cancel(): void {
    this.editingId = null;
    this.form.reset();
    this.clearMessages();
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = { title: value.title.trim(), description: value.description.trim() };
    if (!payload.title) {
      this.form.controls.title.setErrors({ required: true });
      return;
    }

    this.saving = true;
    this.clearMessages();
    const isEditing = this.editingId !== null;
    const request: Observable<unknown> = this.kind === 'areas'
      ? (isEditing
          ? this.lookupService.updateArea({ areaId: this.editingId!, ...payload })
          : this.lookupService.createArea(payload))
      : (isEditing
          ? this.lookupService.updateEventType({ eventTypeId: this.editingId!, ...payload })
          : this.lookupService.createEventType(payload));

    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.successMessage = `${this.singularName} ${isEditing ? 'updated' : 'created'} successfully.`;
        this.editingId = null;
        this.form.reset();
        this.load();
      },
      error: error => this.errorMessage = this.getErrorMessage(error, `Unable to save this ${this.singularName.toLowerCase()}.`),
    });
  }

  remove(row: LookupRow): void {
    this.appDialog.confirm({ title: `Delete ${this.singularName.toLowerCase()}?`,
      message: `Delete “${row.title}”?`, detail: 'This action cannot be undone.',
      tone: 'danger', confirmText: 'Delete' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.clearMessages();
      const request = this.kind === 'areas' ? this.lookupService.deleteArea(row.id) : this.lookupService.deleteEventType(row.id);
      request.subscribe({
        next: () => { if (this.editingId === row.id) this.cancel(); this.successMessage = `${this.singularName} deleted successfully.`; this.load(); },
        error: error => this.errorMessage = this.getErrorMessage(error, `Unable to delete this ${this.singularName.toLowerCase()}.`),
      });
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    if (error.error?.detail) return error.error.detail;
    if (error.error?.title) return error.error.title;
    return fallback;
  }
}
