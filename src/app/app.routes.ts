import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated$.pipe(
    take(1),
    map(isAuth => isAuth ? true : router.createUrlTree(['/login'])),
  );
};

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then(m => m.OnboardingComponent),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-list/project-list.component').then(m => m.ProjectListComponent),
  },
  {
    path: 'projects/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-detail/project-detail.component').then(m => m.ProjectDetailComponent),
  },
  {
    path: 'events',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/events/event-list/event-list.component').then(m => m.EventListComponent),
  },
  {
    path: 'events/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/events/event-full-detail/event-full-detail.component')
        .then(m => m.EventFullDetailComponent),
  },
  {
    path: 'contacts',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/contacts/contact-list/contact-list.component')
        .then(m => m.ContactListComponent),
  },
  {
    path: 'contacts/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/contacts/contact-detail/contact-detail.component')
        .then(m => m.ContactDetailComponent),
  },
  {
    path: 'calendar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
  },
  {
    path: 'documents',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/documents/document-list/document-list.component').then(m => m.DocumentListComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'settings/areas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/area-management/area-management.component')
        .then(m => m.AreaManagementComponent),
  },
  {
    path: 'settings/property',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/property-settings/property-settings.component').then(m => m.PropertySettingsComponent),
  },
  {
    path: 'settings/event-types',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/event-type-management/event-type-management.component')
        .then(m => m.EventTypeManagementComponent),
  },
  {
    path: 'settings/users',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/user-management/user-management.component')
        .then(m => m.UserManagementComponent),
  },
  {
    path: 'settings/email-triage',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/email-triage/email-triage.component')
        .then(m => m.EmailTriageComponent),
  },
  {
    path: 'settings/ai',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/ai-settings/ai-settings.component')
        .then(m => m.AiSettingsComponent),
  },
  {
    path: 'settings/application',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/application-settings/application-settings.component')
        .then(m => m.ApplicationSettingsComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
