import { Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';
import { NotesService } from '../../../core/services/notes.service';
import { HomeEventDetail } from '../../../core/models/home-event.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, MatDialogModule, MatButtonModule, MatIconModule,
            MatChipsModule, MatDividerModule, MatTooltipModule],
  templateUrl: './event-detail.component.html',
  styleUrl:    './event-detail.component.scss',
})
export class EventDetailComponent implements OnInit {
  contactCount = signal(0);
  noteCount = signal(0);

  constructor(
    private dialogRef: MatDialogRef<EventDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public event: HomeEventDetail,
    private eventsService: EventsService,
    private notesService: NotesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    forkJoin({
      links: this.eventsService.getContactLinks(this.event.eventId),
      notes: this.notesService.getForEvent(this.event.eventId),
    }).subscribe(({ links, notes }) => {
      this.contactCount.set(links.length);
      this.noteCount.set(notes.length);
    });
  }

  expand(): void {
    this.dialogRef.close();
    this.router.navigate(['/events', this.event.eventId]);
  }
  close(): void { this.dialogRef.close(); }

  recurrenceLabel(): string {
    if (!this.event.isRecurring || !this.event.recurrenceInterval || !this.event.recurrenceUnit) return 'Does not repeat';
    return this.event.recurrenceInterval === 1
      ? `Every ${this.event.recurrenceUnit}`
      : `Every ${this.event.recurrenceInterval} ${this.event.recurrenceUnit}s`;
  }
}
