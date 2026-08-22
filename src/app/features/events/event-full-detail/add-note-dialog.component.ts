import { Component, Inject, Optional } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Note } from '../../../core/models/note.model';

export interface AddNoteDialogResult {
  subject: string;
  noteText: string;
  delete?: boolean;
}

@Component({
  selector: 'app-add-note-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div mat-dialog-title class="dialog-title">
      <span class="title-icon orange"><mat-icon>{{ isEdit ? 'edit_note' : 'note_add' }}</mat-icon></span>
      <div><h2>{{ isEdit ? 'Edit note' : 'Add note' }}</h2><p>{{ isEdit ? 'Update this note' : 'Record an update or additional information' }}</p></div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Subject</mat-label>
          <input matInput formControlName="subject" maxlength="255" />
          @if (form.controls.subject.hasError('required')) { <mat-error>Subject is required</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Note (optional)</mat-label>
          <textarea matInput formControlName="noteText" rows="6" maxlength="10000"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (isEdit) {
        <button mat-button class="delete-action" type="button" (click)="deleteNote()"><mat-icon>delete</mat-icon>Delete note</button>
        <span class="action-spacer"></span>
      }
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button class="primary-action" (click)="save()" [disabled]="form.invalid">
        <mat-icon>{{ isEdit ? 'save' : 'add' }}</mat-icon>{{ isEdit ? 'Save changes' : 'Add note' }}
      </button>
    </mat-dialog-actions>
  `,
  styleUrl: './event-action-dialogs.scss',
})
export class AddNoteDialogComponent {
  readonly isEdit: boolean;
  readonly form = new FormGroup({
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    noteText: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(10000)] }),
  });

  constructor(
    private readonly dialogRef: MatDialogRef<AddNoteDialogComponent, AddNoteDialogResult>,
    @Optional() @Inject(MAT_DIALOG_DATA) data: { note?: Note } | null,
  ) {
    this.isEdit = !!data?.note;
    if (data?.note) {
      this.form.setValue({ subject: data.note.subject ?? '', noteText: data.note.noteText ?? '' });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.dialogRef.close({ subject: value.subject.trim(), noteText: value.noteText.trim() });
  }

  deleteNote(): void {
    const value = this.form.getRawValue();
    this.dialogRef.close({ subject: value.subject.trim(), noteText: value.noteText.trim(), delete: true });
  }
}
