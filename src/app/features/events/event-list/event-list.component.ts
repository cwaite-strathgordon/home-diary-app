import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule, DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { EventsService } from '../../../core/services/events.service';
import { LookupService } from '../../../core/services/lookup.service';
import { AuthService } from '../../../core/services/auth.service';
import { HomeEventDetail, HomeEventFilter } from '../../../core/models/home-event.model';
import { Area, EventType, EventStatus } from '../../../core/models/lookup.model';
import { EventDetailComponent } from '../event-detail/event-detail.component';
import { EventFormComponent } from '../event-form/event-form.component';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule, DatePipe, ReactiveFormsModule,
    MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatToolbarModule, MatCardModule,
    MatTooltipModule, MatProgressBarModule,
  ],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.scss',
})
export class EventListComponent implements OnInit {
  @ViewChild(MatSort)      sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['eventDate', 'title', 'areaTitle', 'eventTypeTitle', 'eventStatusTitle', 'actions'];
  dataSource = new MatTableDataSource<HomeEventDetail>();
  loading = signal(false);
  showFilters = false;

  filterForm!: FormGroup;
  areas    = signal<Area[]>([]);
  types    = signal<EventType[]>([]);
  statuses = signal<EventStatus[]>([]);

  constructor(
    private fb: FormBuilder,
    private eventsService: EventsService,
    private lookupService: LookupService,
    public  auth: AuthService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      titleContains:   [''],
      eventTypeId:     [null],
      areaId:          [null],
      eventStatusId:   [null],
      eventDateFrom:   [null],
      eventDateTo:     [null],
    });

    forkJoin({
      areas:    this.lookupService.getAreas(),
      types:    this.lookupService.getEventTypes(),
      statuses: this.lookupService.getEventStatuses(),
    }).subscribe(({ areas, types, statuses }) => {
      this.areas.set(areas);
      this.types.set(types);
      this.statuses.set(statuses);
      this.search();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort      = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  search(): void {
    this.loading.set(true);
    const raw = this.filterForm.value;

    const filter: HomeEventFilter = {};
    if (raw.titleContains) filter.titleContains = raw.titleContains;
    if (raw.eventTypeId)   filter.eventTypeId   = raw.eventTypeId;
    if (raw.areaId)        filter.areaId        = raw.areaId;
    if (raw.eventStatusId) filter.eventStatusId = raw.eventStatusId;
    if (raw.eventDateFrom) filter.eventDateFrom = raw.eventDateFrom instanceof Date
      ? raw.eventDateFrom.toISOString().split('T')[0] : raw.eventDateFrom;
    if (raw.eventDateTo)   filter.eventDateTo   = raw.eventDateTo instanceof Date
      ? raw.eventDateTo.toISOString().split('T')[0]   : raw.eventDateTo;

    this.eventsService.getByFilter(filter).subscribe({
      next: events => {
        this.dataSource.data = events;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.search();
  }

  openDetail(event: HomeEventDetail): void {
    const ref = this.dialog.open(EventDetailComponent, {
      data: event,
      width: '640px',
    });
    ref.afterClosed().subscribe(result => {
      if (result === 'edit') this.openForm(event);
    });
  }

  openForm(event?: HomeEventDetail): void {
    const ref = this.dialog.open(EventFormComponent, {
      data: { event },
      width: '640px',
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.search();
    });
  }

  deleteEvent(event: HomeEventDetail, $event: MouseEvent): void {
    $event.stopPropagation();
    if (!confirm(`Delete "${event.title}"?`)) return;
    this.eventsService.delete(event.eventId).subscribe(() => this.search());
  }

  toggleFilters(): void { this.showFilters = !this.showFilters; }

  signOut(): void { this.auth.logout(); }
}
