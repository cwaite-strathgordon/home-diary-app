import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { HomeEventDetail } from '../../core/models/home-event.model';
import { EventsService } from '../../core/services/events.service';

type CalendarView = 'year' | 'month' | 'week';
type CalendarDateType = 'start' | 'target' | 'completed';

interface CalendarMarker {
  eventId: number;
  title: string;
  priority: string;
  area?: string;
  eventType?: string;
  status?: string;
  dateTypes: CalendarDateType[];
}

interface CalendarDay {
  date: Date;
  key: string;
  dayNumber: number;
  otherMonth: boolean;
  today: boolean;
  markers: CalendarMarker[];
}

interface YearMonth {
  label: string;
  month: Date;
  weeks: CalendarDay[][];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private requestId = 0;

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly compactWeekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  readonly view = signal<CalendarView>('month');
  readonly focusDate = signal(this.startOfMonth(new Date()));
  readonly events = signal<HomeEventDetail[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly markersByDate = computed(() => this.buildMarkersByDate());
  readonly periodLabel = computed(() => this.formatPeriodLabel());
  readonly monthWeeks = computed(() => this.buildMonthWeeks(this.focusDate()));
  readonly weekDays = computed(() => this.buildWeekDays());
  readonly yearMonths = computed(() => this.buildYearMonths());

  ngOnInit(): void {
    this.loadEvents();
  }

  setView(view: CalendarView): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.loadEvents();
  }

  previousPeriod(): void {
    this.movePeriod(-1);
  }

  nextPeriod(): void {
    this.movePeriod(1);
  }

  goToToday(): void {
    const today = new Date();
    this.focusDate.set(this.view() === 'week' ? this.startOfWeek(today) : this.startOfMonth(today));
    this.loadEvents();
  }

  openMonth(month: Date): void {
    this.focusDate.set(this.startOfMonth(month));
    this.view.set('month');
    this.loadEvents();
  }

  markerClass(priority: string): string {
    return `priority-${priority.toLowerCase().replace(/\s+/g, '-')}`;
  }

  markerIcon(dateType: CalendarDateType): string {
    return dateType === 'start' ? 'play_circle' : dateType === 'target' ? 'flag' : 'task_alt';
  }

  markerDateLabel(dateType: CalendarDateType): string {
    return dateType === 'start' ? 'Start date' : dateType === 'target' ? 'Target date' : 'Completed date';
  }

  highestPriority(markers: CalendarMarker[]): string {
    return markers[0]?.priority || 'Unassigned';
  }

  markerTooltip(markers: CalendarMarker[]): string {
    return markers.map(marker => `${marker.title} (${marker.priority})`).join('\n');
  }

  fullDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
  }

  shortDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
  }

  shortMonthLabel(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date);
  }

  private movePeriod(direction: -1 | 1): void {
    const current = this.focusDate();
    const view = this.view();
    const next = view === 'year'
      ? new Date(current.getFullYear() + direction, 0, 1)
      : view === 'month'
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : new Date(current.getFullYear(), current.getMonth(), current.getDate() + (direction * 7));
    this.focusDate.set(next);
    this.loadEvents();
  }

  private loadEvents(): void {
    const { from, to } = this.visibleRange();
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set('');

    forkJoin([
      this.eventsService.getByFilter({ eventDateFrom: from, eventDateTo: to }),
      this.eventsService.getByFilter({ targetCompletionDateFrom: from, targetCompletionDateTo: to }),
      this.eventsService.getByFilter({ actualCompletionDateFrom: from, actualCompletionDateTo: to }),
    ]).subscribe({
      next: groups => {
        if (requestId !== this.requestId) return;
        const unique = new Map<number, HomeEventDetail>();
        groups.flat().forEach(event => unique.set(event.eventId, event));
        this.events.set([...unique.values()]);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.requestId) return;
        this.events.set([]);
        this.error.set('Calendar tasks could not be loaded. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private visibleRange(): { from: string; to: string } {
    const date = this.focusDate();
    if (this.view() === 'year') {
      return {
        from: this.dateKey(new Date(date.getFullYear(), 0, 1)),
        to: this.dateKey(new Date(date.getFullYear(), 11, 31)),
      };
    }
    if (this.view() === 'week') {
      const start = this.startOfWeek(date);
      return { from: this.dateKey(start), to: this.dateKey(this.addDays(start, 6)) };
    }
    return {
      from: this.dateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
      to: this.dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
    };
  }

  private buildMarkersByDate(): Map<string, CalendarMarker[]> {
    const markersByDate = new Map<string, CalendarMarker[]>();
    for (const event of this.events()) {
      if (event.actualCompletionDate) {
        this.addMarker(markersByDate, event.actualCompletionDate, event, 'completed');
        continue;
      }
      if (event.eventDate) this.addMarker(markersByDate, event.eventDate, event, 'start');
      if (event.targetCompletionDate) this.addMarker(markersByDate, event.targetCompletionDate, event, 'target');
    }
    markersByDate.forEach(markers => markers.sort(
      (left, right) => this.priorityRank(left.priority) - this.priorityRank(right.priority)
        || left.title.localeCompare(right.title),
    ));
    return markersByDate;
  }

  private addMarker(
    markersByDate: Map<string, CalendarMarker[]>,
    rawDate: string,
    event: HomeEventDetail,
    dateType: CalendarDateType,
  ): void {
    const key = rawDate.slice(0, 10);
    const markers = markersByDate.get(key) ?? [];
    const existing = markers.find(marker => marker.eventId === event.eventId);
    if (existing) {
      if (!existing.dateTypes.includes(dateType)) existing.dateTypes.push(dateType);
    } else {
      markers.push({
        eventId: event.eventId,
        title: event.title,
        priority: event.priorityTitle || 'Unassigned',
        area: event.areaTitle,
        eventType: event.eventTypeTitle,
        status: event.eventStatusTitle,
        dateTypes: [dateType],
      });
    }
    markersByDate.set(key, markers);
  }

  private buildMonthWeeks(month: Date): CalendarDay[][] {
    const firstVisible = this.startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1));
    const days = Array.from({ length: 42 }, (_, index) =>
      this.calendarDay(this.addDays(firstVisible, index), month.getMonth()));
    return Array.from({ length: 6 }, (_, index) => days.slice(index * 7, (index + 1) * 7));
  }

  private buildWeekDays(): CalendarDay[] {
    const start = this.startOfWeek(this.focusDate());
    return Array.from({ length: 7 }, (_, index) => this.calendarDay(this.addDays(start, index), -1));
  }

  private buildYearMonths(): YearMonth[] {
    const year = this.focusDate().getFullYear();
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const month = new Date(year, monthIndex, 1);
      return {
        label: new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(month),
        month,
        weeks: this.buildMonthWeeks(month),
      };
    });
  }

  private calendarDay(date: Date, currentMonth: number): CalendarDay {
    const key = this.dateKey(date);
    return {
      date,
      key,
      dayNumber: date.getDate(),
      otherMonth: currentMonth >= 0 && date.getMonth() !== currentMonth,
      today: key === this.dateKey(new Date()),
      markers: this.markersByDate().get(key) ?? [],
    };
  }

  private formatPeriodLabel(): string {
    const date = this.focusDate();
    if (this.view() === 'year') return String(date.getFullYear());
    if (this.view() === 'month') {
      return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
    }
    const start = this.startOfWeek(date);
    const end = this.addDays(start, 6);
    const startLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(start);
    const endLabel = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(end);
    return `${startLabel} – ${endLabel}`;
  }

  private priorityRank(priority: string): number {
    return ({ Critical: 0, High: 1, Medium: 2, Low: 3, 'Wish List': 4 } as Record<string, number>)[priority] ?? 5;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private startOfWeek(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
