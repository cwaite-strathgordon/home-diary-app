import { Component, Inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { User } from '../../../core/models/user.model';
import { UpdateUserRequest } from '../../../core/services/user-management.service';

export interface UserEditDialogData {
  user: User;
  currentUserId?: number;
}

interface CountryCodeOption {
  country: string;
  flag: string;
  code: string;
}

@Component({
  selector: 'app-user-edit-dialog',
  standalone: true,
  imports: [
    DatePipe, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './user-edit-dialog.component.html',
  styleUrl: './user-edit-dialog.component.scss',
})
export class UserEditDialogComponent {
  readonly countryCodes: CountryCodeOption[] = [
    { country: 'United Kingdom', flag: '🇬🇧', code: '+44' },
    { country: 'Portugal', flag: '🇵🇹', code: '+351' },
    { country: 'Ireland', flag: '🇮🇪', code: '+353' },
    { country: 'France', flag: '🇫🇷', code: '+33' },
    { country: 'Germany', flag: '🇩🇪', code: '+49' },
    { country: 'Spain', flag: '🇪🇸', code: '+34' },
    { country: 'United States', flag: '🇺🇸', code: '+1' },
    { country: 'Australia', flag: '🇦🇺', code: '+61' },
    { country: 'New Zealand', flag: '🇳🇿', code: '+64' },
  ];
  readonly isCurrentUser: boolean;
  readonly form: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: UserEditDialogData,
    private readonly dialogRef: MatDialogRef<UserEditDialogComponent, UpdateUserRequest>,
  ) {
    this.isCurrentUser = data.user.userId === data.currentUserId;
    const parsedMobile = this.parseMobile(data.user.mobileNumber);
    this.form = new FormGroup({
      firstName: new FormControl(data.user.firstName ?? '', { nonNullable: true, validators: [Validators.maxLength(255)] }),
      lastName: new FormControl(data.user.lastName ?? '', { nonNullable: true, validators: [Validators.maxLength(255)] }),
      email: new FormControl(data.user.email ?? '', { nonNullable: true, validators: [Validators.email, Validators.maxLength(255)] }),
      countryCode: new FormControl(parsedMobile.countryCode, { nonNullable: true, validators: [Validators.required] }),
      mobileNumber: new FormControl(parsedMobile.number, { nonNullable: true, validators: [Validators.maxLength(40)] }),
      admin: new FormControl({ value: data.user.admin ?? false, disabled: this.isCurrentUser }, { nonNullable: true }),
      disabled: new FormControl({ value: data.user.disabled ?? false, disabled: this.isCurrentUser }, { nonNullable: true }),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const localNumber = value.mobileNumber.trim();
    this.dialogRef.close({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      mobileNumber: localNumber ? `${value.countryCode} ${localNumber}` : '',
      admin: value.admin,
      disabled: value.disabled,
    });
  }

  private parseMobile(mobileNumber?: string): { countryCode: string; number: string } {
    const value = mobileNumber?.trim() ?? '';
    const match = [...this.countryCodes]
      .sort((a, b) => b.code.length - a.code.length)
      .find(option => value.startsWith(option.code));

    return match
      ? { countryCode: match.code, number: value.slice(match.code.length).trim() }
      : { countryCode: '+44', number: value };
  }
}
