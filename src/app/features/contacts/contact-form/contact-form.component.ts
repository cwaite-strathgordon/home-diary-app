import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Contact } from '../../../core/models/contact.model';
import { ContactsService } from '../../../core/services/contacts.service';

export interface ContactFormData { contact?: Contact; }

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contacts = inject(ContactsService);
  private readonly dialogRef = inject(MatDialogRef<ContactFormComponent>);
  readonly data = inject<ContactFormData>(MAT_DIALOG_DATA);
  readonly isEdit = !!this.data.contact;
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    firstName: [this.data.contact?.firstName ?? '', [Validators.required, Validators.maxLength(255)]],
    lastName: [this.data.contact?.lastName ?? '', Validators.maxLength(255)],
    companyName: [this.data.contact?.companyName ?? '', Validators.maxLength(255)],
    email: [this.data.contact?.email ?? '', [Validators.email, Validators.maxLength(255)]],
    mobile: [this.data.contact?.mobile ?? '', Validators.maxLength(50)],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    const values = this.form.getRawValue();
    const contact: Contact = {
      contactId: this.data.contact?.contactId ?? 0,
      firstName: values.firstName?.trim() || undefined,
      lastName: values.lastName?.trim() || undefined,
      companyName: values.companyName?.trim() || undefined,
      email: values.email?.trim() || undefined,
      mobile: values.mobile?.trim() || undefined,
    };
    const onSaved = { next: () => this.dialogRef.close(true), error: () => {
      this.errorMessage.set('The contact could not be saved. Please check the details and try again.');
      this.saving.set(false);
    }};
    if (this.isEdit) this.contacts.update(contact.contactId, contact).subscribe(onSaved);
    else this.contacts.create(contact).subscribe(onSaved);
  }

  cancel(): void { this.dialogRef.close(false); }
}
