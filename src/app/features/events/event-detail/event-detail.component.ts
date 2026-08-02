import { Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule, DatePipe } from '@angular/common';
import { EventsService } from '../../../core/services/events.service';
import { ContactsService } from '../../../core/services/contacts.service';
import { HomeEventDetail } from '../../../core/models/home-event.model';
import { Contact } from '../../../core/models/contact.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, MatDialogModule, MatButtonModule, MatIconModule,
            MatChipsModule, MatDividerModule],
  templateUrl: './event-detail.component.html',
  styleUrl:    './event-detail.component.scss',
})
export class EventDetailComponent implements OnInit {
  contacts = signal<Contact[]>([]);

  constructor(
    private dialogRef: MatDialogRef<EventDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public event: HomeEventDetail,
    private eventsService: EventsService,
    private contactsService: ContactsService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      links:    this.eventsService.getContactLinks(this.event.eventId),
      contacts: this.contactsService.getAll(),
    }).subscribe(({ links, contacts }) => {
      const linked = links
        .map(l => contacts.find(c => c.contactId === l.contactId))
        .filter((c): c is Contact => !!c);
      this.contacts.set(linked);
    });
  }

  edit(): void  { this.dialogRef.close('edit'); }
  close(): void { this.dialogRef.close(); }
}
