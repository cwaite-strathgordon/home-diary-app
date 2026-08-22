import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { UserManagementService } from '../../core/services/user-management.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserManagementService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.maxLength(255)],
    lastName: ['', Validators.maxLength(255)],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    mobileNumber: ['', Validators.maxLength(50)],
  });

  ngOnInit(): void {
    this.users.getProfile().subscribe({
      next: user => {
        this.auth.updateCurrentUser(user);
        this.form.patchValue({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? '',
          mobileNumber: user.mobileNumber ?? '',
        });
        this.form.markAsPristine();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Your profile could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    const value = this.form.getRawValue();
    this.users.updateProfile({
      firstName: value.firstName.trim() || undefined,
      lastName: value.lastName.trim() || undefined,
      email: value.email.trim(),
      mobileNumber: value.mobileNumber.trim() || undefined,
    }).subscribe({
      next: user => {
        this.auth.updateCurrentUser(user);
        this.form.patchValue({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? '',
          mobileNumber: user.mobileNumber ?? '',
        });
        this.form.markAsPristine();
        this.success.set('Your profile has been updated.');
        this.saving.set(false);
      },
      error: (response: HttpErrorResponse) => {
        this.error.set(response.error?.detail ?? response.error?.title ?? 'Your profile could not be updated.');
        this.saving.set(false);
      },
    });
  }

  initials(): string {
    const user = this.auth.currentUser();
    const first = user?.firstName?.trim().charAt(0) ?? '';
    const last = user?.lastName?.trim().charAt(0) ?? '';
    return (first + last || user?.email?.charAt(0) || '?').toUpperCase();
  }
}
