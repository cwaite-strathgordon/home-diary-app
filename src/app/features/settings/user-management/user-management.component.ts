import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ClientInvitation, UserManagementService } from '../../../core/services/user-management.service';
import { UserEditDialogComponent } from './user-edit-dialog.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    DatePipe, RouterLink, MatButtonModule, MatCardModule, MatChipsModule,
    MatDialogModule, MatIconModule, MatProgressSpinnerModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatCheckboxModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private readonly usersService = inject(UserManagementService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  users: User[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  invitations: ClientInvitation[] = [];
  inviting = false;
  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]], admin: [false],
  });

  ngOnInit(): void { this.load(); this.loadInvitations(); }

  loadInvitations(): void {
    this.usersService.getInvitations().subscribe({ next: values => this.invitations = values });
  }

  invite(): void {
    if (this.inviteForm.invalid || this.inviting) { this.inviteForm.markAllAsTouched(); return; }
    this.inviting = true; this.errorMessage = ''; const value = this.inviteForm.getRawValue();
    this.usersService.inviteUser(value.email.trim(), value.admin).pipe(finalize(() => this.inviting = false)).subscribe({
      next: () => { this.successMessage = `Invitation emailed to ${value.email.trim()}.`; this.inviteForm.reset({ email: '', admin: false }); this.loadInvitations(); },
      error: error => this.errorMessage = this.errorText(error, 'Unable to create the invitation.'),
    });
  }

  revoke(invitation: ClientInvitation): void {
    this.usersService.revokeInvitation(invitation.clientInvitationId).subscribe({ next: () => this.loadInvitations() });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.usersService.getUsers().pipe(finalize(() => this.loading = false)).subscribe({
      next: users => this.users = users,
      error: error => this.errorMessage = this.errorText(error, 'Unable to load users. Administrator access is required.'),
    });
  }

  edit(user: User): void {
    const ref = this.dialog.open(UserEditDialogComponent, {
      data: { user, currentUserId: this.auth.currentUser()?.userId },
      autoFocus: 'first-tabbable',
      width: '680px',
      maxWidth: '94vw',
    });
    ref.afterClosed().subscribe(value => {
      if (!value) return;
      this.errorMessage = '';
      this.successMessage = '';
      this.usersService.updateUser(user.userId, value).subscribe({
        next: () => {
          this.successMessage = `${user.firstName || user.email || 'User'} updated successfully.`;
          this.load();
        },
        error: error => this.errorMessage = this.errorText(error, 'Unable to update this user.'),
      });
    });
  }

  displayName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unnamed user';
  }

  private errorText(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    return error.error?.detail ?? error.error?.title ?? fallback;
  }
}
