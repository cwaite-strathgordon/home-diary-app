import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  admin: boolean;
  disabled: boolean;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  mobileNumber?: string;
}

export interface ClientInvitation {
  clientInvitationId: number; email: string; admin: boolean;
  invitationToken: string; expiresAt: string; acceptedAt?: string;
  sentAt?: string; sesMessageId?: string; deliveryError?: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/profile`);
  }

  updateProfile(profile: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/auth/profile`, profile);
  }

  updateUser(id: number, user: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/users/${id}`, user);
  }

  getInvitations(): Observable<ClientInvitation[]> {
    return this.http.get<ClientInvitation[]>(`${environment.apiUrl}/users/invitations`);
  }

  inviteUser(email: string, admin: boolean): Observable<ClientInvitation> {
    return this.http.post<ClientInvitation>(`${environment.apiUrl}/users/invitations`, { email, admin });
  }

  revokeInvitation(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/invitations/${id}`);
  }
}
