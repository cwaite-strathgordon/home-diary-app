import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { filter, switchMap, take } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);

  constructor(
    private auth0: Auth0Service,
    private http: HttpClient,
  ) {
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
        this.currentUser.set(JSON.parse(stored));
      } else {
        this.syncUser(profile);
      }
    });
  }

  private syncUser(profile: any): void {
    this.http.post<User>(`${environment.apiUrl}/auth/upsert-oauth-user`, {
      provider:  'auth0',
      oauthId:   profile.sub,
      email:     profile.email,
      firstName: profile.given_name  ?? profile.name?.split(' ')[0]              ?? '',
      lastName:  profile.family_name ?? profile.name?.split(' ').slice(1).join(' ') ?? '',
    }).subscribe(user => {
      this.currentUser.set(user);
      localStorage.setItem('hd_user', JSON.stringify(user));
    });
  }

  login(): void {
    this.auth0.loginWithRedirect();
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('hd_user');
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  get isAuthenticated$() { return this.auth0.isAuthenticated$; }
}
