import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>🏠 HomeDiary</mat-card-title>
          <mat-card-subtitle>Sign in to manage your home events</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <button mat-flat-button color="primary" class="login-btn" (click)="login()">
            <mat-icon>login</mat-icon>
            Sign in
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #f5f5f5;
    }
    .login-card {
      width: 360px;
      padding: 24px;
      text-align: center;
    }
    mat-card-title    { font-size: 28px; margin-bottom: 4px; }
    mat-card-content  { margin-top: 24px; }
    .login-btn        { width: 100%; height: 48px; font-size: 16px; gap: 8px; }
  `],
})
export class LoginComponent {
  constructor(private auth: AuthService) {}
  login(): void { this.auth.login(); }
}
