import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin } from 'rxjs';
import { EventsService } from '../../core/services/events.service';
import { HomeEventDetail } from '../../core/models/home-event.model';
import { EventDocumentsService } from '../../core/services/event-documents.service';
import { PropertyWeather } from '../../core/models/property-setting.model';
import { PropertySettingsService } from '../../core/services/property-settings.service';
import { AuthService } from '../../core/services/auth.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WeatherForecastDialogComponent } from './weather-forecast-dialog.component';
import { RecentItem } from '../../core/models/recent-item.model';
import { RecentItemsService } from '../../core/services/recent-items.service';

interface CalendarMarker {
  eventId: number;
  title: string;
  priority: string;
  dateTypes: CalendarDateType[];
}

type CalendarDateType = 'start' | 'target' | 'completed';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  otherMonth: boolean;
  today: boolean;
  markers: CalendarMarker[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatDialogModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly documentsService = inject(EventDocumentsService);
  private readonly propertySettings = inject(PropertySettingsService);
  readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly recentItemsService = inject(RecentItemsService);
  private calendarRequestId = 0;

  homeHealthScore = 92;
  calendarMonth = signal(this.startOfMonth(new Date()));
  calendarEvents = signal<HomeEventDetail[]>([]);
  calendarLoading = signal(false);
  calendarError = signal('');
  calendarMonthLabel = computed(() => new Intl.DateTimeFormat('en-GB', {
    month: 'long', year: 'numeric',
  }).format(this.calendarMonth()));
  calendarWeeks = computed(() => this.buildCalendarWeeks());
  upcomingTasks = signal<HomeEventDetail[]>([]);
  upcomingTaskCount = signal(0);
  overdueTaskCount = signal(0);
  taskWidgetLoading = signal(false);
  taskWidgetError = signal('');
  maintenanceTasks = signal<HomeEventDetail[]>([]);
  recurringTaskCount = signal(0);
  maintenanceLoading = signal(false);
  maintenanceError = signal('');
  documentCount = signal(0);
  weather = signal<PropertyWeather | null>(null);
  weatherLoading = signal(true);
  weatherError = signal('');
  greeting = computed(() => {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const name = this.auth.currentUser()?.firstName?.trim() || 'there';
    return `Good ${period}, ${name}!`;
  });
  weatherEmoji = computed(() => this.weatherSymbol(this.weather()));
  weatherScene = computed(() => this.weatherSceneFor(this.weather()));
  upcomingMoreCount = computed(() => Math.max(0, this.upcomingTaskCount() - this.upcomingTasks().length));
  upcomingListParams = { taskPanel: 'upcoming' };
  overdueListParams = { taskPanel: 'overdue' };

  recentActivity = signal<RecentItem[]>([]);
  recentActivityLoading = signal(false);
  recentActivityError = signal('');

  quickActions = [
    { icon: 'add_task',          label: 'Add Task',      link: '/events',   bg: '#2a7a7a' },
    { icon: 'person_add',        label: 'Add Contact',   link: '/contacts', bg: '#2a7a7a' },
    { icon: 'create_new_folder', label: 'Add Project',   link: '/projects', bg: '#e07820' },
    { icon: 'calendar_month',    label: 'View Calendar', link: '/calendar', bg: '#e07820' },
  ];

  ngOnInit(): void {
    this.loadCalendar();
    this.loadTaskWidgets();
    this.loadMaintenanceWidget();
    this.loadRecentActivity();
    this.documentsService.getCount().subscribe({ next: count => this.documentCount.set(count), error: () => this.documentCount.set(0) });
    this.loadWeather();
  }

  recentItemLink(item: RecentItem): (string | number)[] {
    const collection = item.itemType === 'task' ? 'events' : `${item.itemType}s`;
    return [`/${collection}`, item.itemId];
  }

  recentItemIcon(item: RecentItem): string {
    return item.itemType === 'task' ? 'task_alt'
      : item.itemType === 'project' ? 'folder_open'
      : 'person';
  }

  recentItemLabel(item: RecentItem): string {
    return item.itemType[0].toUpperCase() + item.itemType.slice(1);
  }

  private loadRecentActivity(): void {
    this.recentActivityLoading.set(true);
    this.recentActivityError.set('');
    this.recentItemsService.getAll().subscribe({
      next: items => {
        this.recentActivity.set(items);
        this.recentActivityLoading.set(false);
      },
      error: () => {
        this.recentActivity.set([]);
        this.recentActivityError.set('Recent items could not be loaded.');
        this.recentActivityLoading.set(false);
      },
    });
  }

  weatherDescription(code: number): string {
    if (code === 0) return 'Clear sky';
    if ([1, 2].includes(code)) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if ([45, 48].includes(code)) return 'Foggy';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([95, 96, 99].includes(code)) return 'Thunderstorms';
    return 'Current conditions';
  }

  openForecast(): void {
    const weather = this.weather();
    if (!weather?.forecast?.length) return;
    this.dialog.open(WeatherForecastDialogComponent, {
      data: weather, width: '650px', maxWidth: '94vw', maxHeight: '90vh', autoFocus: false,
    });
  }

  private weatherSymbol(weather: PropertyWeather | null): string {
    if (!weather) return new Date().getHours() >= 7 && new Date().getHours() < 19 ? '☀️' : '🌙';
    const code = weather.weatherCode;
    if ([95, 96, 99].includes(code)) return '⛈️';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
    if ([45, 48].includes(code)) return '🌫️';
    if (code === 3) return '☁️';
    if (code === 1 || code === 2) return weather.isDay ? '🌤️' : '☁️';
    return weather.isDay ? '☀️' : '🌙';
  }

  private weatherSceneFor(weather: PropertyWeather | null): string {
    const isDay = weather?.isDay ?? (new Date().getHours() >= 7 && new Date().getHours() < 19);
    const period = isDay ? 'day' : 'night';
    const code = weather?.weatherCode ?? 0;

    if ([71, 73, 75, 77, 85, 86].includes(code)) return `snow-${period}`;
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
      return `rain-${period}`;
    }
    if ([1, 2, 3, 45, 48].includes(code)) return `cloudy-${period}`;
    return `clear-${period}`;
  }

  private loadWeather(): void {
    this.weatherLoading.set(true); this.weatherError.set('');
    this.propertySettings.getWeather().subscribe({
      next: weather => { this.weather.set(weather); this.weatherLoading.set(false); },
      error: error => { this.weather.set(null); this.weatherError.set(error.status === 404 ? 'Add the property address to see local weather.' : 'Weather is temporarily unavailable.'); this.weatherLoading.set(false); },
    });
  }

  previousMonth(): void {
    const month = this.calendarMonth();
    this.calendarMonth.set(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    this.loadCalendar();
  }

  nextMonth(): void {
    const month = this.calendarMonth();
    this.calendarMonth.set(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    this.loadCalendar();
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

  private loadTaskWidgets(): void {
    this.taskWidgetLoading.set(true);
    this.taskWidgetError.set('');
    forkJoin({
      upcoming: this.eventsService.getByFilter({ ...this.upcomingDateParams(), activeOnly: true }),
      overdue: this.eventsService.getByFilter({ overdue: true }),
    }).subscribe({
      next: ({ upcoming, overdue }) => {
        const sortedUpcoming = upcoming
          .filter(event => !event.actualCompletionDate && !!event.targetCompletionDate)
          .sort((left, right) =>
            (left.targetCompletionDate || '').localeCompare(right.targetCompletionDate || '')
              || this.priorityRank(left.priorityTitle || 'Unassigned') - this.priorityRank(right.priorityTitle || 'Unassigned')
              || left.title.localeCompare(right.title));
        this.upcomingTaskCount.set(sortedUpcoming.length);
        this.upcomingTasks.set(sortedUpcoming.slice(0, 5));
        this.overdueTaskCount.set(overdue.filter(event => !event.actualCompletionDate).length);
        this.taskWidgetLoading.set(false);
      },
      error: () => {
        this.upcomingTasks.set([]);
        this.upcomingTaskCount.set(0);
        this.overdueTaskCount.set(0);
        this.taskWidgetError.set('Task information could not be loaded.');
        this.taskWidgetLoading.set(false);
      },
    });
  }

  maintenanceDueDate(task: HomeEventDetail): string | undefined {
    return task.targetCompletionDate || task.eventDate;
  }

  maintenanceFrequency(task: HomeEventDetail): string {
    if (!task.recurrenceInterval || !task.recurrenceUnit) return 'Recurring schedule';
    const unit = task.recurrenceInterval === 1
      ? task.recurrenceUnit
      : `${task.recurrenceUnit}s`;
    return `Every ${task.recurrenceInterval} ${unit}`;
  }

  maintenanceIcon(task: HomeEventDetail): string {
    const area = task.areaTitle?.toLowerCase() ?? '';
    const type = task.eventTypeTitle?.toLowerCase() ?? '';
    if (area.includes('car')) return 'directions_car';
    if (area.includes('garden')) return 'yard';
    if (type.includes('repair')) return 'build';
    if (type.includes('maintenance')) return 'handyman';
    return 'event_repeat';
  }

  private loadMaintenanceWidget(): void {
    this.maintenanceLoading.set(true);
    this.maintenanceError.set('');
    this.eventsService.getByFilter({ activeOnly: true, recurringOnly: true }).subscribe({
      next: events => {
        const farFuture = '9999-12-31';
        const scheduledEvents = events
          .filter(event => event.isRecurring
            && !!event.recurrenceInterval
            && !!event.recurrenceUnit
            && !!this.maintenanceDueDate(event));
        this.recurringTaskCount.set(scheduledEvents.length);
        this.maintenanceTasks.set(scheduledEvents
          .sort((left, right) =>
            (this.maintenanceDueDate(left) || farFuture)
              .localeCompare(this.maintenanceDueDate(right) || farFuture)
              || left.title.localeCompare(right.title))
          .slice(0, 4));
        this.maintenanceLoading.set(false);
      },
      error: () => {
        this.maintenanceTasks.set([]);
        this.recurringTaskCount.set(0);
        this.maintenanceError.set('Recurring task information could not be loaded.');
        this.maintenanceLoading.set(false);
      },
    });
  }

  private upcomingDateParams(): { targetCompletionDateFrom: string; targetCompletionDateTo: string } {
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    return {
      targetCompletionDateFrom: this.dateKey(today),
      targetCompletionDateTo: this.dateKey(endDate),
    };
  }

  private loadCalendar(): void {
    const month = this.calendarMonth();
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const requestId = ++this.calendarRequestId;
    this.calendarLoading.set(true);
    this.calendarError.set('');
    const firstDate = this.dateKey(month);
    const lastDate = this.dateKey(lastDay);
    forkJoin([
      this.eventsService.getByFilter({ eventDateFrom: firstDate, eventDateTo: lastDate }),
      this.eventsService.getByFilter({ targetCompletionDateFrom: firstDate, targetCompletionDateTo: lastDate }),
      this.eventsService.getByFilter({ actualCompletionDateFrom: firstDate, actualCompletionDateTo: lastDate }),
    ]).subscribe({
      next: eventGroups => {
        if (requestId !== this.calendarRequestId) return;
        const uniqueEvents = new Map<number, HomeEventDetail>();
        eventGroups.flat().forEach(event => uniqueEvents.set(event.eventId, event));
        this.calendarEvents.set([...uniqueEvents.values()]);
        this.calendarLoading.set(false);
      },
      error: () => {
        if (requestId !== this.calendarRequestId) return;
        this.calendarEvents.set([]);
        this.calendarError.set('Calendar tasks could not be loaded.');
        this.calendarLoading.set(false);
      },
    });
  }

  private buildCalendarWeeks(): CalendarDay[][] {
    const month = this.calendarMonth();
    const firstVisibleDate = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
    const todayKey = this.dateKey(new Date());
    const markersByDate = new Map<string, CalendarMarker[]>();

    for (const event of this.calendarEvents()) {
      if (event.actualCompletionDate) {
        this.addCalendarMarker(markersByDate, event.actualCompletionDate, event, 'completed');
        continue;
      }
      if (event.eventDate)
        this.addCalendarMarker(markersByDate, event.eventDate, event, 'start');
      if (event.targetCompletionDate)
        this.addCalendarMarker(markersByDate, event.targetCompletionDate, event, 'target');
    }

    markersByDate.forEach(markers => markers.sort(
      (left, right) => this.priorityRank(left.priority) - this.priorityRank(right.priority)
        || left.title.localeCompare(right.title),
    ));

    const days = Array.from({ length: 42 }, (_, offset) => {
      const date = new Date(firstVisibleDate.getFullYear(), firstVisibleDate.getMonth(), firstVisibleDate.getDate() + offset);
      const key = this.dateKey(date);
      return {
        date,
        dayNumber: date.getDate(),
        otherMonth: date.getMonth() !== month.getMonth(),
        today: key === todayKey,
        markers: markersByDate.get(key) ?? [],
      } satisfies CalendarDay;
    });

    return Array.from({ length: 6 }, (_, week) => days.slice(week * 7, week * 7 + 7));
  }

  private addCalendarMarker(
    markersByDate: Map<string, CalendarMarker[]>,
    date: string,
    event: HomeEventDetail,
    dateType: CalendarDateType,
  ): void {
    const markers = markersByDate.get(date) ?? [];
    const existing = markers.find(marker => marker.eventId === event.eventId);
    if (existing) {
      if (!existing.dateTypes.includes(dateType)) existing.dateTypes.push(dateType);
    } else {
      markers.push({
        eventId: event.eventId,
        title: event.title,
        priority: event.priorityTitle || 'Unassigned',
        dateTypes: [dateType],
      });
    }
    markersByDate.set(date, markers);
  }

  private priorityRank(priority: string): number {
    return ({ Critical: 0, High: 1, Medium: 2, Low: 3, 'Wish List': 4 } as Record<string, number>)[priority] ?? 5;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  badgeClass(priority: string): string {
    const map: Record<string, string> = {
      Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium',
      Low: 'badge-low', 'Wish List': 'badge-wish-list',
    };
    return map[priority] ?? '';
  }
}
