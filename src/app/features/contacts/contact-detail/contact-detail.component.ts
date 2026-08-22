import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, map, of, Subscription, switchMap } from 'rxjs';
import { Contact } from '../../../core/models/contact.model';
import { HomeEventDetail } from '../../../core/models/home-event.model';
import { Note } from '../../../core/models/note.model';
import { ContactsService } from '../../../core/services/contacts.service';
import { EventsService } from '../../../core/services/events.service';
import { NotesService } from '../../../core/services/notes.service';
import { AddNoteDialogComponent, AddNoteDialogResult } from '../../events/event-full-detail/add-note-dialog.component';
import { ContactFormComponent } from '../contact-form/contact-form.component';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { ContactListNavigationService } from '../../../core/services/contact-list-navigation.service';
import { AuthService } from '../../../core/services/auth.service';
import { RecentItemsService } from '../../../core/services/recent-items.service';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './contact-detail.component.html',
  styleUrl: './contact-detail.component.scss',
})
export class ContactDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialog = inject(MatDialog);
  private readonly contactsService = inject(ContactsService);
  private readonly eventsService = inject(EventsService);
  private readonly notesService = inject(NotesService);
  private readonly appDialog = inject(AppDialogService);
  private readonly contactListNavigation = inject(ContactListNavigationService);
  private readonly auth = inject(AuthService);
  private readonly recentItems = inject(RecentItemsService);
  private routeSubscription?: Subscription;
  private loadSubscription?: Subscription;
  private transitionSwapTimer?: ReturnType<typeof setTimeout>;
  private transitionEndTimer?: ReturnType<typeof setTimeout>;
  private readonly transitionPhaseMs = 275;

  readonly contact = signal<Contact | null>(null);
  readonly events = signal<HomeEventDetail[]>([]);
  readonly notes = signal<Note[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly listNavigationEnabled = signal(false);
  readonly contactTransitioning = signal(false);
  readonly transitionFadeOut = signal(false);
  readonly listNavigation = computed(() => {
    const contact = this.contact();
    return contact && this.listNavigationEnabled()
      ? this.contactListNavigation.position(contact.contactId)
      : null;
  });

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) { this.router.navigate(['/contacts']); return; }
      this.listNavigationEnabled.set(this.route.snapshot.queryParamMap.get('listNav') === '1');
      this.load(id);
    });
  }

  load(contactId: number, sequentialTransition = false): void {
    const transitionStartedAt = performance.now();
    if (!sequentialTransition) this.loading.set(true);
    this.errorMessage.set('');
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = forkJoin({
      contact: this.contactsService.getById(contactId),
      links: this.eventsService.getEventLinksForContact(contactId),
      notes: this.notesService.getForContact(contactId),
    }).pipe(
      switchMap(({ contact, links, notes }) => {
        if (!links.length) return of({ contact, events: [] as HomeEventDetail[], notes });
        return forkJoin(links.map(link => this.eventsService.getById(link.eventId)))
          .pipe(map(events => ({ contact, events, notes })));
      }),
    ).subscribe({
      next: result => {
        const showResult = () => {
          const { contact, events, notes } = result;
          this.contact.set(contact);
          this.recentItems.record('contact', contact.contactId).subscribe({ error: () => undefined });
          this.events.set(events.sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? '')));
          this.notes.set(notes);
          this.loading.set(false);

          if (sequentialTransition) {
            const tree = this.router.createUrlTree(['/contacts', contact.contactId], {
              queryParams: { listNav: 1 },
            });
            this.location.go(this.router.serializeUrl(tree));
            requestAnimationFrame(() => requestAnimationFrame(() => {
              this.transitionFadeOut.set(false);
              this.transitionEndTimer = setTimeout(
                () => this.contactTransitioning.set(false),
                this.transitionPhaseMs,
              );
            }));
          }
        };

        if (sequentialTransition) {
          const remainingFadeOut = Math.max(
            0,
            this.transitionPhaseMs - (performance.now() - transitionStartedAt),
          );
          this.transitionSwapTimer = setTimeout(showResult, remainingFadeOut);
        } else {
          showResult();
        }
      },
      error: () => {
        this.transitionFadeOut.set(false);
        this.contactTransitioning.set(false);
        this.errorMessage.set('Unable to load this contact. They may have been removed.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.loadSubscription?.unsubscribe();
    if (this.transitionSwapTimer) clearTimeout(this.transitionSwapTimer);
    if (this.transitionEndTimer) clearTimeout(this.transitionEndTimer);
  }

  name(contact: Contact): string { return [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.companyName || 'Unnamed contact'; }
  initials(contact: Contact): string { return `${contact.firstName?.[0] ?? ''}${contact.lastName?.[0] ?? ''}`.toUpperCase() || '?'; }

  goBack(): void {
    const navigation = this.listNavigation();
    if (navigation) void this.router.navigateByUrl(navigation.listUrl);
    else this.location.back();
  }

  openPreviousContact(): void {
    const contactId = this.listNavigation()?.previousContactId;
    if (contactId) this.openListContact(contactId);
  }

  openNextContact(): void {
    const contactId = this.listNavigation()?.nextContactId;
    if (contactId) this.openListContact(contactId);
  }

  private openListContact(contactId: number): void {
    if (this.contactTransitioning()) return;
    this.contactTransitioning.set(true);
    this.transitionFadeOut.set(true);
    this.load(contactId, true);
  }

  addNote(): void {
    const contact = this.contact();
    if (!contact) return;
    const ref = this.dialog.open(AddNoteDialogComponent, {
      width: '560px', maxWidth: '94vw', disableClose: true,
    });
    ref.afterClosed().subscribe((result?: AddNoteDialogResult) => {
      if (!result) return;
      this.notesService.createForContact(contact.contactId, result.subject, result.noteText)
        .subscribe({
          next: note => this.notes.update(notes => [note, ...notes]),
          error: () => this.errorMessage.set('The note could not be added.'),
        });
    });
  }

  editNote(note: Note): void {
    const ref = this.dialog.open(AddNoteDialogComponent, {
      data: { note }, width: '560px', maxWidth: '94vw', disableClose: true,
    });
    ref.afterClosed().subscribe((result?: AddNoteDialogResult) => {
      if (!result) return;
      if (result.delete) { this.deleteNote(note); return; }
      this.notesService.update(note, result.subject, result.noteText).subscribe({
        next: () => this.notes.update(notes => notes.map(item => item.noteId === note.noteId
          ? { ...item, subject: result.subject, noteText: result.noteText, updatedDate: new Date().toISOString() }
          : item)),
        error: () => this.errorMessage.set('The note could not be updated.'),
      });
    });
  }

  deleteNote(note: Note): void {
    this.appDialog.confirm({ title: 'Delete note?', message: `Delete “${note.subject || 'Note'}”?`,
      detail: 'This action cannot be undone.', tone: 'danger', confirmText: 'Delete note' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.notesService.delete(note.noteId).subscribe({
        next: () => this.notes.update(notes => notes.filter(item => item.noteId !== note.noteId)),
        error: () => this.errorMessage.set('The note could not be deleted.'),
      });
    });
  }

  noteCreator(note: Note): string {
    const storedName = [note.createdByFirstName, note.createdByLastName].filter(Boolean).join(' ');
    if (storedName) return storedName;
    const currentUser = this.auth.currentUser();
    if (note.createdById && currentUser?.userId === note.createdById) {
      return [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ')
        || currentUser.email
        || note.createdByEmail
        || 'Unknown user';
    }
    return note.createdByEmail || (note.createdById ? `User ${note.createdById}` : 'Unknown user');
  }

  edit(): void {
    const contact = this.contact();
    if (!contact) return;
    const ref = this.dialog.open(ContactFormComponent, {
      data: { contact }, width: '680px', maxWidth: '94vw', maxHeight: '92vh', disableClose: true,
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(contact.contactId); });
  }

  deleteContact(): void {
    const contact = this.contact();
    if (!contact) return;
    this.appDialog.confirm({ title: 'Delete contact?', message: `Delete ${this.name(contact)}?`,
      detail: 'Their links to tasks will also be removed.', tone: 'danger', confirmText: 'Delete contact' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.contactsService.delete(contact.contactId).subscribe({
        next: () => this.router.navigate(['/contacts']), error: () => this.errorMessage.set('The contact could not be deleted.'),
      });
    });
  }
}
