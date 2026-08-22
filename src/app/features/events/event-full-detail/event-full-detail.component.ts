import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, map, Subscription } from 'rxjs';
import { HomeEventDetail } from '../../../core/models/home-event.model';
import { Contact } from '../../../core/models/contact.model';
import { Note } from '../../../core/models/note.model';
import { EventDocument } from '../../../core/models/event-document.model';
import { EventImage, EventImageView } from '../../../core/models/event-image.model';
import { ContactsService } from '../../../core/services/contacts.service';
import { EventsService } from '../../../core/services/events.service';
import { NotesService } from '../../../core/services/notes.service';
import { EventDocumentsService } from '../../../core/services/event-documents.service';
import { EventImagesService } from '../../../core/services/event-images.service';
import { EventFormComponent } from '../event-form/event-form.component';
import { AddNoteDialogComponent, AddNoteDialogResult } from './add-note-dialog.component';
import { AddContactDialogComponent } from './add-contact-dialog.component';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { EventListNavigationService } from '../../../core/services/event-list-navigation.service';
import { AuthService } from '../../../core/services/auth.service';
import { RecentItemsService } from '../../../core/services/recent-items.service';

@Component({
  selector: 'app-event-full-detail',
  standalone: true,
  imports: [
    DatePipe, MatButtonModule, MatCardModule,
    MatDialogModule, MatIconModule, MatProgressSpinnerModule, RouterLink,
  ],
  templateUrl: './event-full-detail.component.html',
  styleUrl: './event-full-detail.component.scss',
})
export class EventFullDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialog = inject(MatDialog);
  private readonly eventsService = inject(EventsService);
  private readonly contactsService = inject(ContactsService);
  private readonly notesService = inject(NotesService);
  private readonly documentsService = inject(EventDocumentsService);
  private readonly imagesService = inject(EventImagesService);
  private readonly appDialog = inject(AppDialogService);
  private readonly eventListNavigation = inject(EventListNavigationService);
  private readonly auth = inject(AuthService);
  private readonly recentItems = inject(RecentItemsService);
  private routeSubscription?: Subscription;
  private loadSubscription?: Subscription;
  private transitionSwapTimer?: ReturnType<typeof setTimeout>;
  private transitionEndTimer?: ReturnType<typeof setTimeout>;
  private contactPreviewTimer?: ReturnType<typeof setTimeout>;
  private readonly transitionPhaseMs = 275;

  event = signal<HomeEventDetail | null>(null);
  contacts = signal<Contact[]>([]);
  notes = signal<Note[]>([]);
  documents = signal<EventDocument[]>([]);
  images = signal<EventImageView[]>([]);
  allContacts = signal<Contact[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  documentError = signal('');
  uploadingDocuments = signal(false);
  dragActive = signal(false);
  uploadingImages = signal(false);
  imageDragActive = signal(false);
  imageError = signal('');
  hoveredContact = signal<Contact | null>(null);
  contactPreviewX = signal(0);
  contactPreviewY = signal(0);
  selectedImageIndex = signal<number | null>(null);
  taskTransitioning = signal(false);
  transitionFadeOut = signal(false);
  selectedImage = computed(() => {
    const index = this.selectedImageIndex();
    return index === null ? null : this.images()[index] ?? null;
  });
  listNavigationEnabled = signal(false);
  listNavigation = computed(() => {
    const event = this.event();
    return event && this.listNavigationEnabled()
      ? this.eventListNavigation.position(event.eventId)
      : null;
  });
  timelineMilestones = computed(() => {
    const event = this.event();
    if (!event) return [];
    const createdBy = [event.createdByFirstName, event.createdByLastName].filter(Boolean).join(' ');
    return [
      {
        key: 'created', label: 'Created', date: event.createdDate, icon: 'add_circle',
        complete: !!event.createdDate, emptyText: 'Date unavailable',
        detail: createdBy ? `by ${createdBy}` : '',
      },
      {
        key: 'start', label: 'Start date', date: event.eventDate, icon: 'play_arrow',
        complete: !!event.eventDate, emptyText: 'Not set', detail: '',
      },
      event.actualCompletionDate
        ? {
            key: 'completed', label: 'Actual completion', date: event.actualCompletionDate, icon: 'task_alt',
            complete: true, emptyText: 'Not completed', detail: '',
          }
        : {
            key: 'target', label: 'Target completion', date: event.targetCompletionDate, icon: 'flag',
            complete: false, emptyText: 'Not set', detail: '',
          },
    ];
  });
  timelineProgress = computed(() => {
    const event = this.event();
    if (!event) return 0;
    if (event.actualCompletionDate) return 100;
    if (event.eventDate) return 50;
    if (event.createdDate) return 16.67;
    return 0;
  });

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const eventId = Number(params.get('id'));
      if (!Number.isInteger(eventId) || eventId <= 0) {
        this.router.navigate(['/events']);
        return;
      }
      this.listNavigationEnabled.set(this.route.snapshot.queryParamMap.get('listNav') === '1');
      this.load(eventId);
    });
  }

  load(eventId: number, sequentialTransition = false): void {
    const transitionStartedAt = performance.now();
    if (!sequentialTransition) this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = forkJoin({
      event: this.eventsService.getById(eventId),
      links: this.eventsService.getContactLinks(eventId),
      allContacts: this.contactsService.getAll(),
      notes: this.notesService.getForEvent(eventId),
      documents: this.documentsService.getForEvent(eventId),
      images: this.imagesService.getForEvent(eventId),
    }).subscribe({
      next: result => {
        const showResult = () => {
          const { event, links, allContacts, notes, documents, images } = result;
          this.event.set(event);
          this.recentItems.record('task', event.eventId).subscribe({ error: () => undefined });
          this.contacts.set(links
            .map(link => allContacts.find(contact => contact.contactId === link.contactId))
            .filter((contact): contact is Contact => !!contact));
          this.allContacts.set(allContacts);
          this.notes.set(notes);
          this.documents.set(documents);
          this.loadImageContent(images);
          this.loading.set(false);

          if (sequentialTransition) {
            const tree = this.router.createUrlTree(['/events', event.eventId], {
              queryParams: { listNav: 1 },
            });
            this.location.go(this.router.serializeUrl(tree));
            requestAnimationFrame(() => requestAnimationFrame(() => {
              this.transitionFadeOut.set(false);
              this.transitionEndTimer = setTimeout(
                () => this.taskTransitioning.set(false),
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
        this.taskTransitioning.set(false);
        this.errorMessage.set('Unable to load this task. It may have been removed.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.loadSubscription?.unsubscribe();
    if (this.transitionSwapTimer) clearTimeout(this.transitionSwapTimer);
    if (this.transitionEndTimer) clearTimeout(this.transitionEndTimer);
    if (this.contactPreviewTimer) clearTimeout(this.contactPreviewTimer);
    this.revokeImageUrls(this.images());
  }

  goBack(): void {
    const navigation = this.listNavigation();
    if (navigation) void this.router.navigateByUrl(navigation.listUrl);
    else this.location.back();
  }

  openPreviousEvent(): void {
    const eventId = this.listNavigation()?.previousEventId;
    if (eventId) this.openListEvent(eventId);
  }

  openNextEvent(): void {
    const eventId = this.listNavigation()?.nextEventId;
    if (eventId) this.openListEvent(eventId);
  }

  private openListEvent(eventId: number): void {
    if (this.taskTransitioning()) return;
    this.taskTransitioning.set(true);
    this.transitionFadeOut.set(true);
    this.load(eventId, true);
  }

  edit(): void {
    const event = this.event();
    if (!event) return;
    const ref = this.dialog.open(EventFormComponent, {
      data: { event },
      width: '720px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(event.eventId); });
  }

  addNote(): void {
    const event = this.event();
    if (!event) return;
    const ref = this.dialog.open(AddNoteDialogComponent, {
      width: '560px', maxWidth: '94vw', disableClose: true,
    });
    ref.afterClosed().subscribe((result?: AddNoteDialogResult) => {
      if (!result) return;
      this.notesService.createForEvent(event.eventId, result.subject, result.noteText)
        .subscribe(note => this.notes.update(notes => [note, ...notes]));
    });
  }

  editNote(note: Note): void {
    const ref = this.dialog.open(AddNoteDialogComponent, {
      data: { note }, width: '560px', maxWidth: '94vw', disableClose: true,
    });
    ref.afterClosed().subscribe((result?: AddNoteDialogResult) => {
      if (!result) return;
      if (result.delete) { this.deleteNote(note); return; }
      this.notesService.update(note, result.subject, result.noteText).subscribe(() => {
        this.notes.update(notes => notes.map(item => item.noteId === note.noteId
          ? { ...item, subject: result.subject, noteText: result.noteText, updatedDate: new Date().toISOString() }
          : item));
      });
    });
  }

  deleteNote(note: Note): void {
    this.appDialog.confirm({ title: 'Delete note?', message: `Delete “${note.subject || 'Note'}”?`,
      detail: 'This action cannot be undone.', tone: 'danger', confirmText: 'Delete note' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.notesService.delete(note.noteId).subscribe(() => {
        this.notes.update(notes => notes.filter(item => item.noteId !== note.noteId));
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

  addContact(): void {
    const event = this.event();
    if (!event) return;
    const linkedIds = new Set(this.contacts().map(contact => contact.contactId));
    const available = this.allContacts().filter(contact => !linkedIds.has(contact.contactId));
    const ref = this.dialog.open(AddContactDialogComponent, {
      data: { contacts: available }, width: '560px', maxWidth: '94vw',
    });
    ref.afterClosed().subscribe((contactId?: number) => {
      if (!contactId) return;
      this.eventsService.addContact({ eventId: event.eventId, contactId }).subscribe(() => {
        const contact = this.allContacts().find(item => item.contactId === contactId);
        if (contact) this.contacts.update(contacts => [...contacts, contact]);
      });
    });
  }

  contactName(contact: Contact): string {
    return [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.companyName || 'Unnamed contact';
  }

  contactInitials(contact: Contact): string {
    return `${contact.firstName?.[0] ?? ''}${contact.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

  showContactPreview(contact: Contact, mouseEvent: MouseEvent): void {
    this.cancelContactPreview();
    const row = mouseEvent.currentTarget as HTMLElement;
    this.contactPreviewTimer = setTimeout(() => {
      const bounds = row.getBoundingClientRect();
      const previewWidth = 310;
      const previewHeight = 150;
      this.contactPreviewX.set(Math.max(12, Math.min(bounds.left, window.innerWidth - previewWidth - 12)));
      this.contactPreviewY.set(bounds.bottom + previewHeight + 10 <= window.innerHeight
        ? bounds.bottom + 6
        : Math.max(12, bounds.top - previewHeight - 6));
      this.hoveredContact.set(contact);
      this.contactPreviewTimer = undefined;
    }, 500);
  }

  hideContactPreview(): void {
    this.cancelContactPreview();
    this.hoveredContact.set(null);
  }

  private cancelContactPreview(): void {
    if (!this.contactPreviewTimer) return;
    clearTimeout(this.contactPreviewTimer);
    this.contactPreviewTimer = undefined;
  }

  isCompleted(): boolean { return this.event()?.eventStatusTitle?.toLowerCase() === 'complete'; }

  completeTask(): void {
    const event = this.event();
    if (!event) return;
    this.appDialog.confirm({ title: 'Complete task?', message: `Mark “${event.title}” as complete?`,
      icon: 'task_alt', tone: 'success', confirmText: 'Complete task' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.eventsService.complete(event.eventId).subscribe(result => {
        this.load(event.eventId);
        if (result.nextEventId) this.successMessage.set('Task completed and the next recurring task was created.');
      });
    });
  }

  reopenTask(): void {
    const event = this.event();
    if (!event) return;
    this.appDialog.confirm({ title: 'Reopen task?', message: `Reopen “${event.title}”?`,
      icon: 'replay', confirmText: 'Reopen task' }).subscribe(confirmed => {
      if (confirmed) this.eventsService.reopen(event.eventId).subscribe(() => this.load(event.eventId));
    });
  }

  recurrenceLabel(event: HomeEventDetail): string {
    if (!event.isRecurring || !event.recurrenceInterval || !event.recurrenceUnit) return 'Does not repeat';
    return event.recurrenceInterval === 1
      ? `Every ${event.recurrenceUnit}`
      : `Every ${event.recurrenceInterval} ${event.recurrenceUnit}s`;
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragActive.set(true); }
  onDragLeave(event: DragEvent): void { event.preventDefault(); this.dragActive.set(false); }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    if (event.dataTransfer?.files.length) this.uploadFiles(event.dataTransfer.files);
  }

  onImageDragOver(event: DragEvent): void { event.preventDefault(); this.imageDragActive.set(true); }
  onImageDragLeave(event: DragEvent): void { event.preventDefault(); this.imageDragActive.set(false); }
  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    this.imageDragActive.set(false);
    if (event.dataTransfer?.files.length) this.uploadImages(event.dataTransfer.files);
  }

  imageFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadImages(input.files);
    input.value = '';
  }

  uploadImages(fileList: FileList): void {
    const currentEvent = this.event();
    if (!currentEvent || this.uploadingImages()) return;
    const files = Array.from(fileList);
    const allowed = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
    const invalid = files.find(file =>
      !allowed.has(file.name.split('.').pop()?.toLowerCase() ?? '') || file.size > 20 * 1024 * 1024);
    if (invalid) {
      this.imageError.set('Use JPEG, PNG, GIF, or WebP images no larger than 20 MB.');
      return;
    }

    this.uploadingImages.set(true);
    this.imageError.set('');
    forkJoin(files.map(file => this.imagesService.upload(currentEvent.eventId, file))).subscribe({
      next: uploaded => {
        this.hydrateImages(uploaded, hydrated => {
          this.images.update(images => [...hydrated, ...images]);
          this.uploadingImages.set(false);
          this.successMessage.set(`${hydrated.length} ${hydrated.length === 1 ? 'image' : 'images'} uploaded.`);
        });
      },
      error: () => {
        this.imageError.set('One or more images could not be uploaded.');
        this.uploadingImages.set(false);
      },
    });
  }

  openImage(index: number): void { this.selectedImageIndex.set(index); }
  closeImage(): void { this.selectedImageIndex.set(null); }

  previousImage(event?: MouseEvent): void {
    event?.stopPropagation();
    const count = this.images().length;
    const index = this.selectedImageIndex();
    if (count && index !== null) this.selectedImageIndex.set((index - 1 + count) % count);
  }

  nextImage(event?: MouseEvent): void {
    event?.stopPropagation();
    const count = this.images().length;
    const index = this.selectedImageIndex();
    if (count && index !== null) this.selectedImageIndex.set((index + 1) % count);
  }

  @HostListener('document:keydown', ['$event'])
  galleryKeydown(event: KeyboardEvent): void {
    if (this.selectedImageIndex() === null) return;
    if (event.key === 'Escape') this.closeImage();
    else if (event.key === 'ArrowLeft') this.previousImage();
    else if (event.key === 'ArrowRight') this.nextImage();
  }

  deleteImage(image: EventImageView, event?: MouseEvent): void {
    event?.stopPropagation();
    this.appDialog.confirm({ title: 'Delete image?', message: `Permanently delete “${image.fileName}”?`,
      detail: 'This action cannot be undone.', tone: 'danger', confirmText: 'Delete image' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.imagesService.delete(image.eventImageId).subscribe({
        next: () => { URL.revokeObjectURL(image.objectUrl); this.images.update(images => images.filter(item => item.eventImageId !== image.eventImageId)); this.closeImage(); },
        error: () => this.imageError.set('The image could not be deleted.'),
      });
    });
  }

  private loadImageContent(images: EventImage[]): void {
    this.revokeImageUrls(this.images());
    this.images.set([]);
    if (!images.length) return;
    this.hydrateImages(images, hydrated => this.images.set(hydrated));
  }

  private hydrateImages(images: EventImage[], next: (images: EventImageView[]) => void): void {
    forkJoin(images.map(image => this.imagesService.content(image.eventImageId).pipe(
      map(blob => ({ ...image, objectUrl: URL.createObjectURL(blob) })),
    ))).subscribe({
      next,
      error: () => {
        this.imageError.set('The image previews could not be loaded.');
        this.uploadingImages.set(false);
      },
    });
  }

  private revokeImageUrls(images: EventImageView[]): void {
    images.forEach(image => URL.revokeObjectURL(image.objectUrl));
  }

  filesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadFiles(input.files);
    input.value = '';
  }

  uploadFiles(fileList: FileList): void {
    const currentEvent = this.event();
    if (!currentEvent || this.uploadingDocuments()) return;
    const files = Array.from(fileList);
    const allowed = new Set(['pdf', 'docx', 'txt', 'md', 'csv']);
    const invalid = files.find(file => !allowed.has(file.name.split('.').pop()?.toLowerCase() ?? '') || file.size > 20 * 1024 * 1024);
    if (invalid) {
      this.documentError.set('Use PDF, DOCX, TXT, Markdown, or CSV files no larger than 20 MB.');
      return;
    }
    this.uploadingDocuments.set(true);
    this.documentError.set('');
    forkJoin(files.map(file => this.documentsService.upload(currentEvent.eventId, file))).subscribe({
      next: uploaded => {
        this.documents.update(documents => [...uploaded, ...documents]);
        this.uploadingDocuments.set(false);
        this.successMessage.set(`${uploaded.length} ${uploaded.length === 1 ? 'document' : 'documents'} uploaded and indexed.`);
      },
      error: () => { this.documentError.set('One or more documents could not be uploaded.'); this.uploadingDocuments.set(false); },
    });
  }

  downloadDocument(document: EventDocument): void {
    this.documentsService.download(document.eventDocumentId).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  openDocument(document: EventDocument): void {
    this.documentsService.download(document.eventDocumentId).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  deleteDocument(document: EventDocument): void {
    this.appDialog.confirm({ title: 'Delete document?', message: `Permanently delete “${document.fileName}”?`,
      detail: 'This action cannot be undone.', tone: 'danger', confirmText: 'Delete document' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.documentsService.delete(document.eventDocumentId).subscribe({
        next: () => this.documents.update(items => items.filter(item => item.eventDocumentId !== document.eventDocumentId)),
        error: () => this.documentError.set('The document could not be deleted.'),
      });
    });
  }

  fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fileIcon(document: EventDocument): string {
    const extension = document.fileName.split('.').pop()?.toLowerCase();
    return extension === 'pdf' ? 'picture_as_pdf' : extension === 'docx' ? 'description' : 'text_snippet';
  }
}
