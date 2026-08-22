import { Component, computed, effect, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/services/auth.service';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GlobalSearchService } from './core/services/global-search.service';
import { GlobalSearchResult } from './core/models/global-search-result.model';
import { EventDocumentsService } from './core/services/event-documents.service';
import { EventsService } from './core/services/events.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatBadgeModule, MatTooltipModule,
    MatMenuModule,
    ReactiveFormsModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private static readonly navigationCookie = 'homediary_nav_collapsed';
  auth = inject(AuthService);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly globalSearch = inject(GlobalSearchService);
  private readonly eventDocuments = inject(EventDocumentsService);
  private readonly events = inject(EventsService);
  isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  activeTaskSummary = toSignal(this.events.taskSummary$, { initialValue: null });
  private readonly activeTaskCountEffect = effect(() => {
    if (this.isAuthenticated()) this.events.refreshTaskSummary();
  });
  isCompactNavigation = toSignal(
    this.breakpoints.observe('(max-width: 899px)').pipe(map(result => result.matches)),
    { initialValue: false },
  );
  navigationOpen = signal(true);
  navigationCollapsed = signal(this.readNavigationCookie());
  desktopNavigationCollapsed = computed(() =>
    !this.isCompactNavigation() && this.navigationCollapsed());
  private readonly navigationLayoutEffect = effect(() => {
    const compact = this.isCompactNavigation();
    this.navigationOpen.set(!compact);
  });
  globalSearchControl = new FormControl('', { nonNullable: true });
  searchOpen = false;
  mobileSearchOpen = false;
  globalSearchResults = toSignal(this.globalSearchControl.valueChanges.pipe(
    debounceTime(250), distinctUntilChanged(),
    switchMap(query => query.trim().length >= 2
      ? this.globalSearch.search(query.trim()).pipe(catchError(() => of([])))
      : of([])),
  ), { initialValue: [] as GlobalSearchResult[] });

  closeNavigation(drawer: MatSidenav): void {
    if (this.isCompactNavigation()) drawer.close();
  }

  toggleNavigation(): void {
    if (this.isCompactNavigation()) {
      this.navigationOpen.update(open => !open);
      return;
    }
    const collapsed = !this.navigationCollapsed();
    this.navigationCollapsed.set(collapsed);
    this.writeNavigationCookie(collapsed);
  }

  showSearch(): void { this.searchOpen = true; this.mobileSearchOpen = true; }
  closeSearch(): void { this.searchOpen = false; this.mobileSearchOpen = false; }
  clearSearch(): void { this.globalSearchControl.setValue(''); this.searchOpen = false; }

  resultIcon(result: GlobalSearchResult): string {
    return ({ event: 'task_alt', contact: 'person', document: 'description',
      'event-note': 'sticky_note_2', 'contact-note': 'sticky_note_2' } as Record<string, string>)[result.resultType] ?? 'search';
  }

  openSearchResult(result: GlobalSearchResult): void {
    this.closeSearch();
    if (result.resultType === 'document') {
      this.eventDocuments.download(result.objectId).subscribe(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      });
      return;
    }
    if (result.resultType === 'contact' || result.resultType === 'contact-note')
      this.router.navigate(['/contacts', result.resultType === 'contact' ? result.objectId : result.parentId]);
    else
      this.router.navigate(['/events', result.resultType === 'event' ? result.objectId : result.parentId]);
  }
  displayName(): string {
    const user = this.auth.currentUser();
    const firstName = this.validNamePart(user?.firstName);
    const lastName = this.validNamePart(user?.lastName);

    if (firstName && lastName)
      return firstName.length > 14 ? `${firstName.charAt(0)}. ${lastName}` : `${firstName} ${lastName}`;

    return firstName || lastName || this.emailLocalPart(user?.email) || 'HomeDiary user';
  }
  fullName(): string {
    const user = this.auth.currentUser();
    const name = [this.validNamePart(user?.firstName), this.validNamePart(user?.lastName)]
      .filter(Boolean)
      .join(' ');
    return name || this.displayName();
  }
  userInitials(): string {
    const user = this.auth.currentUser();
    const firstName = this.validNamePart(user?.firstName);
    const lastName = this.validNamePart(user?.lastName);
    if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    return (firstName || lastName || this.emailLocalPart(user?.email) || '?').charAt(0).toUpperCase();
  }
  private validNamePart(value?: string): string { return value && !value.includes('@') ? value.trim() : ''; }
  private emailLocalPart(email?: string): string {
    const localPart = email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    return localPart ? localPart.replace(/\b\w/g, letter => letter.toUpperCase()) : '';
  }
  private readNavigationCookie(): boolean {
    return document.cookie
      .split('; ')
      .find(cookie => cookie.startsWith(`${App.navigationCookie}=`))
      ?.split('=')[1] === '1';
  }
  private writeNavigationCookie(collapsed: boolean): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${App.navigationCookie}=${collapsed ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }
  signOut() { this.auth.logout(); }
}
