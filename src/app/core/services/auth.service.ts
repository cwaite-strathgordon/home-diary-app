import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { filter, switchMap, take } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly accessDenied = signal(false);
  readonly userResolved = signal(false);
  readonly invitationError = signal('');
  private static readonly invitationStorageKey = 'homediary_invitation_token';

  constructor(
    private auth0: Auth0Service,
    private http: HttpClient,
    private router: Router,
  ) {
    this.captureInvitationToken();
    // When Auth0 confirms authentication (including after the callback redirect),
    // sync the Auth0 profile into our HomeDiary user table.
    this.auth0.isAuthenticated$.pipe(
      filter(Boolean),
      switchMap(() => this.auth0.user$),
      filter(Boolean),
      take(1),
    ).subscribe(profile => {
      const stored = localStorage.getItem('hd_user');
      if (stored) {
        try {
          this.currentUser.set(JSON.parse(stored));
        } catch {
          localStorage.removeItem('hd_user');
        }
      }

      // Always reconcile with the API. This creates a first-time Auth0 user and
      // refreshes profile data for returning users.
      this.syncUser(profile);
    });
  }

  private syncUser(profile: any): void {
    const email = profile.email ?? '';
    const profileName = typeof profile.name === 'string' && profile.name !== email
      ? profile.name.trim()
      : '';
    const nameParts = profileName.split(/\s+/).filter(Boolean);
    const nickname = typeof profile.nickname === 'string' && !profile.nickname.includes('@')
      ? profile.nickname.trim()
      : '';

    this.http.post<User>(`${environment.apiUrl}/auth/upsert-oauth-user`, {
      email,
      firstName: profile.given_name ?? nameParts[0] ?? nickname,
      lastName:  profile.family_name ?? nameParts.slice(1).join(' '),
      invitationToken: sessionStorage.getItem(AuthService.invitationStorageKey),
    }).subscribe({
      next: user => {
        this.accessDenied.set(false);
        this.currentUser.set(user);
        localStorage.setItem('hd_user', JSON.stringify(user));
        this.userResolved.set(true);
        this.invitationError.set('');
        if (user.clientId) sessionStorage.removeItem(AuthService.invitationStorageKey);
        if (!user.clientId && !this.router.url.startsWith('/onboarding'))
          void this.router.navigate(['/onboarding']);
        else if (user.clientId && this.router.url.startsWith('/onboarding'))
          void this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 403) {
          this.currentUser.set(null);
          localStorage.removeItem('hd_user');
          this.accessDenied.set(true);
        }
        if (error.status === 409) {
          this.currentUser.set(null);
          localStorage.removeItem('hd_user');
          this.invitationError.set(error.error?.detail ?? 'The invitation could not be accepted.');
          void this.router.navigate(['/login']);
        }
        this.userResolved.set(true);
      },
    });
  }

  login(): void {
    this.invitationError.set('');
    this.auth0.loginWithRedirect({ authorizationParams: { prompt: 'login' } });
  }

  logout(): void {
    this.currentUser.set(null);
    this.accessDenied.set(false);
    this.userResolved.set(false);
    localStorage.removeItem('hd_user');
    // Return to the registered app origin. The router then displays the branded
    // login page without requiring an additional Auth0 Allowed Logout URL.
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  updateCurrentUser(user: User): void {
    this.currentUser.set(user);
    localStorage.setItem('hd_user', JSON.stringify(user));
  }

  get isAuthenticated$() { return this.auth0.isAuthenticated$; }

  private captureInvitationToken(): void {
    const token = new URLSearchParams(window.location.search).get('invitation');
    if (token && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token))
      sessionStorage.setItem(AuthService.invitationStorageKey, token);
  }
}
