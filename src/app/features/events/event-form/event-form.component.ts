import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { forkJoin, Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override parse(value: string | null): Date | null {
    if (typeof value === 'string' && value.trim()) {
      const parts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (parts) {
        const d = new Date(+parts[3], +parts[2] - 1, +parts[1]);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: unknown): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }
}

const DD_MM_YYYY_FORMATS = {
  parse:   { dateInput: 'dd/MM/yyyy' },
  display: {
    dateInput:         'dd/MM/yyyy',
    monthYearLabel:    'MMM yyyy',
    dateA11yLabel:     'dd/MM/yyyy',
    monthYearA11yLabel:'MMMM yyyy',
  },
};

import { EventsService } from '../../../core/services/events.service';
import { LookupService } from '../../../core/services/lookup.service';
import { ContactsService } from '../../../core/services/contacts.service';
import { AuthService } from '../../../core/services/auth.service';
import { HomeEventDetail } from '../../../core/models/home-event.model';
import { Area, EventType, EventStatus } from '../../../core/models/lookup.model';
import { Contact, EventContactLink } from '../../../core/models/contact.model';

export interface EventFormData {
  event?: HomeEventDetail;
}

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatListModule, MatAutocompleteModule,
    MatChipsModule, MatDividerModule,
  ],
  providers: [
    { provide: DateAdapter,      useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS  },
  ],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
})
export class EventFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  saving = signal(false);

  areas    = signal<Area[]>([]);
  types    = signal<EventType[]>([]);
  statuses = signal<EventStatus[]>([]);

  linkedContacts = signal<Contact[]>([]);
  allContacts    = signal<Contact[]>([]);
  filteredContacts = signal<Contact[]>([]);
  contactSearch  = new FormControl('');
  showNewContact = false;
  newContactForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EventFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EventFormData,
    private eventsService: EventsService,
    private lookupService: LookupService,
    private contactsService: ContactsService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data?.event;
    const ev = this.data?.event;

    this.form = this.fb.group({
      eventId:       [ev?.eventId ?? 0],
      title:         [ev?.title ?? '',   Validators.required],
      description:   [ev?.description ?? ''],
      eventDate:     [ev?.eventDate ? new Date(ev.eventDate) : null],
      eventTypeId:   [ev?.eventTypeId ?? null,   Validators.required],
      areaId:        [ev?.areaId ?? null,         Validators.required],
      eventStatusId: [ev?.eventStatusId ?? null,  Validators.required],
      createdById:   [ev?.createdById ?? this.auth.currentUser()?.userId],
    });

    this.newContactForm = this.fb.group({
      firstName:   ['', Validators.required],
      lastName:    [''],
      email:       ['', Validators.email],
      mobile:      [''],
      companyName: [''],
    });

    forkJoin({
      areas:    this.lookupService.getAreas(),
      types:    this.lookupService.getEventTypes(),
      statuses: this.lookupService.getEventStatuses(),
      contacts: this.contactsService.getAll(),
    }).subscribe(({ areas, types, statuses, contacts }) => {
      this.areas.set(areas);
      this.types.set(types);
      this.statuses.set(statuses);
      this.allContacts.set(contacts);
      this.filteredContacts.set(contacts);
    });

    if (this.isEdit && ev?.eventId) {
      this.loadLinkedContacts(ev.eventId);
    }

    this.contactSearch.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
    ).subscribe(term => {
      const t = (term ?? '').toLowerCase();
      this.filteredContacts.set(
        this.allContacts().filter(c =>
          `${c.firstName} ${c.lastName} ${c.companyName ?? ''}`.toLowerCase().includes(t)
        )
      );
    });
  }

  private loadLinkedContacts(eventId: number): void {
    this.eventsService.getContactLinks(eventId).subscribe(links => {
      const linked = links
        .map(l => this.allContacts().find(c => c.contactId === l.contactId))
        .filter((c): c is Contact => !!c);
      this.linkedContacts.set(linked);
    });
  }

  displayContact(contact: Contact): string {
    return contact ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : '';
  }

  addContact(contact: Contact): void {
    if (this.linkedContacts().some(c => c.contactId === contact.contactId)) return;
    const eventId = this.form.value.eventId;
    if (eventId) {
      this.eventsService.addContact({ contactId: contact.contactId, eventId }).subscribe(() => {
        this.linkedContacts.update(list => [...list, contact]);
      });
    } else {
      // New event — queue the link to be created after save
      this.linkedContacts.update(list => [...list, contact]);
    }
    this.contactSearch.reset();
  }

  removeContact(contact: Contact): void {
    const eventId = this.form.value.eventId;
    if (eventId) {
      this.eventsService.removeContact(contact.contactId, eventId).subscribe(() => {
        this.linkedContacts.update(list => list.filter(c => c.contactId !== contact.contactId));
      });
    } else {
      this.linkedContacts.update(list => list.filter(c => c.contactId !== contact.contactId));
    }
  }

  toggleNewContact(): void {
    this.showNewContact = !this.showNewContact;
    if (!this.showNewContact) this.newContactForm.reset();
  }

  saveNewContact(): void {
    if (this.newContactForm.invalid) return;
    this.contactsService.create(this.newContactForm.value).subscribe(contact => {
      this.allContacts.update(list => [...list, contact]);
      this.addContact(contact);
      this.showNewContact = false;
      this.newContactForm.reset();
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload = { ...this.form.value };
    if (payload.eventDate instanceof Date) {
      payload.eventDate = payload.eventDate.toISOString().split('T')[0];
    }

    const pendingContacts = this.isEdit ? [] : [...this.linkedContacts()];

    const op: Observable<any> = this.isEdit
      ? this.eventsService.update(payload.eventId, payload)
      : this.eventsService.create(payload);

    op.subscribe({
      next: (result: any) => {
        const eventId = this.isEdit ? payload.eventId : result?.eventId;
        if (!this.isEdit && pendingContacts.length && eventId) {
          const links = pendingContacts.map(c =>
            this.eventsService.addContact({ contactId: c.contactId, eventId })
          );
          forkJoin(links).subscribe(() => this.dialogRef.close(true));
        } else {
          this.dialogRef.close(true);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
