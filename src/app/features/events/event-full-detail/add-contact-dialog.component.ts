import { Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Contact } from '../../../core/models/contact.model';

@Component({
  selector: 'app-add-contact-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  template: `
    <div mat-dialog-title class="dialog-title">
      <span class="title-icon"><mat-icon>person_add</mat-icon></span>
      <div><h2>Add contact</h2><p>Link an existing contact to this task</p></div>
    </div>
    <mat-dialog-content>
      @if (data.contacts.length) {
        <mat-form-field appearance="outline">
          <mat-label>Contact</mat-label>
          <mat-select [formControl]="contactId">
            @for (contact of data.contacts; track contact.contactId) {
              <mat-option [value]="contact.contactId">
                {{ name(contact) }}
                @if (contact.companyName) { — {{ contact.companyName }} }
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      } @else {
        <div class="empty-dialog"><mat-icon>group_off</mat-icon><p>All available contacts are already linked to this task.</p></div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      @if (data.contacts.length) {
        <button mat-flat-button class="primary-action" (click)="save()" [disabled]="contactId.invalid">
          <mat-icon>link</mat-icon>Link contact
        </button>
      }
    </mat-dialog-actions>
  `,
  styleUrl: './event-action-dialogs.scss',
})
export class AddContactDialogComponent {
  readonly contactId = new FormControl<number | null>(null, Validators.required);

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: { contacts: Contact[] },
    private readonly dialogRef: MatDialogRef<AddContactDialogComponent, number>,
  ) {}

  name(contact: Contact): string {
    return [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unnamed contact';
  }

  save(): void {
    if (this.contactId.value) this.dialogRef.close(this.contactId.value);
  }
}
