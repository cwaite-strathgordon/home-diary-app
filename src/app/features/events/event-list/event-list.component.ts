import { Component, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, forkJoin, Subscription, tap } from 'rxjs';

import { EventsService } from '../../../core/services/events.service';
import { LookupService } from '../../../core/services/lookup.service';
import { AuthService } from '../../../core/services/auth.service';
import { EventTaskSummary, HomeEventDetail, HomeEventFilter } from '../../../core/models/home-event.model';
import { Area, EventType, EventStatus, EventPriority } from '../../../core/models/lookup.model';
import { EventFormComponent } from '../event-form/event-form.component';
import { Project } from '../../../core/models/project.model';
import { ProjectsService } from '../../../core/services/projects.service';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { EventListNavigationService } from '../../../core/services/event-list-navigation.service';

type TaskPanelKey = 'active' | 'overdue' | 'upcoming' | 'critical' | 'completed' | 'created';

interface TaskSummaryPanel {
  key: TaskPanelKey;
  label: string;
  icon: string;
  count: keyof EventTaskSummary;
}

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule, DatePipe, ReactiveFormsModule,
    MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatToolbarModule, MatCardModule,
    MatTooltipModule, MatProgressBarModule, MatCheckboxModule,
  ],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.scss',
})
export class EventListComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort)      sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['title', 'priorityTitle', 'areaTitle', 'eventTypeTitle', 'eventStatusTitle', 'eventDate', 'targetCompletionDate', 'actions'];
  dataSource = new MatTableDataSource<HomeEventDetail>();
  loading = signal(false);
  hoveredEvent = signal<HomeEventDetail | null>(null);
  previewX = signal(0);
  previewY = signal(0);
  showFilters = false;
  showMoreFilters = false;
  private filterChangesSubscription?: Subscription;
  private searchSubscription?: Subscription;
  private previewTimer?: ReturnType<typeof setTimeout>;

  filterForm!: FormGroup;
  areas    = signal<Area[]>([]);
  types    = signal<EventType[]>([]);
  statuses = signal<EventStatus[]>([]);
  priorities = signal<EventPriority[]>([]);
  projects = signal<Project[]>([]);
  taskSummary = signal<EventTaskSummary>({
    allActiveTasks: 0,
    overdueTasks: 0,
    dueNextSevenDays: 0,
    criticalTasks: 0,
    completedLastMonth: 0,
    createdLastSevenDays: 0,
  });
  selectedTaskPanel = signal<TaskPanelKey | null>(null);
  readonly taskPanels: TaskSummaryPanel[] = [
    { key: 'active', label: 'Active Tasks', icon: 'task_alt', count: 'allActiveTasks' },
    { key: 'overdue', label: 'Overdue', icon: 'event_busy', count: 'overdueTasks' },
    { key: 'upcoming', label: 'Due in Next 7 Days', icon: 'upcoming', count: 'dueNextSevenDays' },
    { key: 'critical', label: 'Critical', icon: 'priority_high', count: 'criticalTasks' },
    { key: 'completed', label: 'Completed Last Month', icon: 'check_circle', count: 'completedLastMonth' },
    { key: 'created', label: 'Created Last 7 Days', icon: 'add_task', count: 'createdLastSevenDays' },
  ];

  constructor(
    private fb: FormBuilder,
    private eventsService: EventsService,
    private lookupService: LookupService,
    private projectsService: ProjectsService,
    public  auth: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private appDialog: AppDialogService,
    private eventListNavigation: EventListNavigationService,
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      titleContains:   [''],
      eventTypeId:     [null],
      areaId:          [null],
      eventStatusIds:  [[] as number[]],
      priorityId:      [null],
      projectId:       [null],
      eventDateFrom:   [null],
      eventDateTo:     [null],
      targetCompletionDateFrom: [null],
      targetCompletionDateTo: [null],
      actualCompletionDateFrom: [null],
      actualCompletionDateTo: [null],
      createdDateFrom: [null],
      createdDateTo: [null],
      overdue: [null],
      excludeWishList: [false],
      recurringOnly: [false],
    });
    forkJoin({
      areas:    this.lookupService.getAreas(),
      types:    this.lookupService.getEventTypes(),
      statuses: this.lookupService.getEventStatuses(),
      priorities: this.lookupService.getEventPriorities(),
      taskSummary: this.eventsService.getTaskSummary(),
      projects: this.projectsService.getAll(),
    }).subscribe(({ areas, types, statuses, priorities, taskSummary, projects }) => {
      this.areas.set(areas);
      this.types.set(types);
      this.statuses.set(statuses);
      this.priorities.set(priorities);
      this.projects.set(projects);
      this.taskSummary.set(taskSummary);
      this.filterForm.patchValue(
        { eventStatusIds: this.defaultStatusIds() },
        { emitEvent: false },
      );
      const requestedPanel = this.route.snapshot.queryParamMap.get('taskPanel');
      if (this.isTaskPanelKey(requestedPanel)) this.applyTaskPanel(requestedPanel, false);
      else {
        this.applyQueryFilters();
        this.search();
      }

      this.filterChangesSubscription = this.filterForm.valueChanges.pipe(
        tap(() => this.clearSelectedTaskPanel()),
        debounceTime(300),
        distinctUntilChanged((previous, current) =>
          JSON.stringify(previous) === JSON.stringify(current)),
      ).subscribe(() => this.search());

      // Angular reuses this component when the Tasks navigation link is clicked
      // while already on /events. React to that query-string change as well as
      // to the initial route so the navigation always restores Active Tasks.
      this.route.queryParamMap.subscribe(params => {
        const panel = params.get('taskPanel');
        if (this.isTaskPanelKey(panel) && panel !== this.selectedTaskPanel()) {
          this.applyTaskPanel(panel, false);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.filterChangesSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.cancelPreviewTimer();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort      = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  search(): void {
    this.clearSelectedTaskPanel();
    this.runSearch(this.formFilter());
  }

  private clearSelectedTaskPanel(): void {
    if (this.selectedTaskPanel() === null) return;
    this.selectedTaskPanel.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskPanel: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private formFilter(): HomeEventFilter {
    const raw = this.filterForm.value;

    const filter: HomeEventFilter = {};
    if (raw.titleContains) filter.titleContains = raw.titleContains;
    if (raw.eventTypeId)   filter.eventTypeId   = raw.eventTypeId;
    if (raw.areaId)        filter.areaId        = raw.areaId;
    if (Array.isArray(raw.eventStatusIds)) {
      filter.eventStatusIds = raw.eventStatusIds.length
        ? raw.eventStatusIds
        : [-1];
    }
    if (raw.priorityId)    filter.priorityId    = raw.priorityId;
    if (raw.projectId !== null && raw.projectId !== undefined) filter.projectId = raw.projectId;
    if (raw.eventDateFrom) filter.eventDateFrom = this.filterDate(raw.eventDateFrom);
    if (raw.eventDateTo)   filter.eventDateTo   = this.filterDate(raw.eventDateTo);
    for (const field of ['targetCompletionDateFrom', 'targetCompletionDateTo', 'actualCompletionDateFrom', 'actualCompletionDateTo'] as const) {
      const value = raw[field];
      if (value) filter[field] = this.filterDate(value);
    }
    if (raw.createdDateFrom) filter.createdDateFrom = this.filterDate(raw.createdDateFrom);
    if (raw.createdDateTo) filter.createdDateTo = this.filterDate(raw.createdDateTo);
    if (raw.overdue === true) filter.overdue = true;
    if (raw.excludeWishList === true) filter.excludeWishList = true;
    if (raw.recurringOnly === true) filter.recurringOnly = true;

    return filter;
  }

  private runSearch(filter: HomeEventFilter): void {
    this.loading.set(true);
    this.searchSubscription?.unsubscribe();
    this.searchSubscription = this.eventsService.getByFilter(filter).subscribe({
      next: events => {
        this.dataSource.data = events;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  clearFilters(): void {
    this.resetFilterForm();
    this.selectedTaskPanel.set(null);
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.search();
  }

  clearTitle(): void {
    this.filterForm.get('titleContains')?.setValue('');
  }

  statusSelected(statusId: number): boolean {
    const selected = this.filterForm.get('eventStatusIds')?.value as number[] | null;
    return selected?.includes(statusId) ?? false;
  }

  toggleStatus(statusId: number, checked: boolean): void {
    const control = this.filterForm.get('eventStatusIds');
    const selected = new Set<number>((control?.value as number[] | null) ?? []);
    if (checked) selected.add(statusId);
    else selected.delete(statusId);

    control?.setValue(
      this.statuses()
        .map(status => status.eventStatusId)
        .filter(id => selected.has(id)),
    );
  }

  summaryCount(panel: TaskSummaryPanel): number {
    return this.taskSummary()[panel.count];
  }

  applyTaskPanel(panel: TaskPanelKey, updateUrl = true): void {
    if (this.selectedTaskPanel() === panel) {
      this.resetFilterForm();
      this.showFilters = false;
      this.showMoreFilters = false;
      this.clearSelectedTaskPanel();
      this.runSearch(this.formFilter());
      return;
    }

    this.reflectTaskPanelInForm(panel);
    this.showFilters = false;
    this.showMoreFilters = false;
    this.selectedTaskPanel.set(panel);
    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { taskPanel: panel },
        replaceUrl: true,
      });
    }
    this.runSearch(this.taskPanelFilter(panel));
  }

  private taskPanelFilter(panel: TaskPanelKey): HomeEventFilter {
    const today = new Date();
    const sevenDaysAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const oneMonthAgo = this.subtractOneMonth(today);
    const criticalPriority = this.priorities().find(priority => priority.title?.toLowerCase() === 'critical');

    switch (panel) {
      case 'active': return { activeOnly: true, excludeWishList: true };
      case 'overdue': return { overdue: true };
      case 'upcoming': return {
        activeOnly: true,
        targetCompletionDateFrom: this.filterDate(today),
        targetCompletionDateTo: this.filterDate(sevenDaysAhead),
      };
      case 'critical': return { activeOnly: true, priorityId: criticalPriority?.eventPriorityId ?? -1 };
      case 'completed': return {
        actualCompletionDateFrom: this.filterDate(oneMonthAgo),
        actualCompletionDateTo: this.filterDate(today),
      };
      case 'created': return {
        createdDateFrom: this.filterDate(sevenDaysAgo),
        createdDateTo: this.filterDate(today),
      };
    }
  }

  private refreshCurrentView(): void {
    const panel = this.selectedTaskPanel();
    this.runSearch(panel ? this.taskPanelFilter(panel) : this.formFilter());
  }

  private refreshTaskSummary(): void {
    this.eventsService.getTaskSummary().subscribe(summary => this.taskSummary.set(summary));
  }

  private refreshAfterMutation(): void {
    this.refreshCurrentView();
    this.refreshTaskSummary();
  }

  private isTaskPanelKey(value: string | null): value is TaskPanelKey {
    return !!value && this.taskPanels.some(panel => panel.key === value);
  }

  private subtractOneMonth(date: Date): Date {
    const result = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(date.getDate(), lastDay));
    return result;
  }

  private applyQueryFilters(): void {
    const params = this.route.snapshot.queryParamMap;
    const values: Record<string, unknown> = {};
    const dateFields = [
      'eventDateFrom', 'eventDateTo', 'targetCompletionDateFrom',
      'targetCompletionDateTo', 'actualCompletionDateFrom', 'actualCompletionDateTo',
      'createdDateFrom', 'createdDateTo',
    ];
    for (const field of dateFields) {
      const value = params.get(field);
      if (value) values[field] = this.parseLocalDate(value);
    }
    if (params.get('overdue') === 'true') values['overdue'] = true;
    if (params.get('recurringOnly') === 'true') values['recurringOnly'] = true;
    if (Object.keys(values).length) {
      this.filterForm.patchValue(values, { emitEvent: false });
      this.showFilters = true;
      this.showMoreFilters = values['recurringOnly'] === true
        || dateFields.some(field => values[field] !== undefined);
    }
  }

  private defaultStatusIds(): number[] {
    return this.statuses()
      .filter(status => !['complete', 'completed'].includes(status.title?.trim().toLowerCase() ?? ''))
      .map(status => status.eventStatusId);
  }

  private completedStatusIds(): number[] {
    return this.statuses()
      .filter(status => ['complete', 'completed'].includes(status.title?.trim().toLowerCase() ?? ''))
      .map(status => status.eventStatusId);
  }

  private activeStatusIds(): number[] {
    return this.statuses()
      .filter(status => !['complete', 'completed', 'wish list'].includes(
        status.title?.trim().toLowerCase() ?? '',
      ))
      .map(status => status.eventStatusId);
  }

  private reflectTaskPanelInForm(panel: TaskPanelKey): void {
    this.resetFilterForm();
    const today = new Date();
    const sevenDaysAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const criticalPriority = this.priorities()
      .find(priority => priority.title?.trim().toLowerCase() === 'critical');

    switch (panel) {
      case 'overdue':
        this.filterForm.patchValue({ overdue: true }, { emitEvent: false });
        break;
      case 'upcoming':
        this.filterForm.patchValue({
          targetCompletionDateFrom: today,
          targetCompletionDateTo: sevenDaysAhead,
        }, { emitEvent: false });
        break;
      case 'critical':
        this.filterForm.patchValue(
          { priorityId: criticalPriority?.eventPriorityId ?? -1 },
          { emitEvent: false },
        );
        break;
      case 'completed':
        this.filterForm.patchValue({
          eventStatusIds: this.completedStatusIds(),
          actualCompletionDateFrom: this.subtractOneMonth(today),
          actualCompletionDateTo: today,
        }, { emitEvent: false });
        break;
      case 'created':
        this.filterForm.patchValue({
          eventStatusIds: this.statuses().map(status => status.eventStatusId),
          createdDateFrom: sevenDaysAgo,
          createdDateTo: today,
        }, { emitEvent: false });
        break;
      case 'active':
        this.filterForm.patchValue({
          eventStatusIds: this.activeStatusIds(),
          excludeWishList: true,
        }, { emitEvent: false });
        break;
    }
  }

  private resetFilterForm(): void {
    this.filterForm.reset({
      titleContains: '',
      eventTypeId: null,
      areaId: null,
      eventStatusIds: this.defaultStatusIds(),
      priorityId: null,
      projectId: null,
      eventDateFrom: null,
      eventDateTo: null,
      targetCompletionDateFrom: null,
      targetCompletionDateTo: null,
      actualCompletionDateFrom: null,
      actualCompletionDateTo: null,
      createdDateFrom: null,
      createdDateTo: null,
      overdue: false,
      excludeWishList: false,
      recurringOnly: false,
    }, { emitEvent: false });
  }

  private parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  private filterDate(value: Date | string): string {
    if (!(value instanceof Date)) return value;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  openFullDetail(event: HomeEventDetail): void {
    const rows = [...this.dataSource.filteredData];
    const orderedRows = this.dataSource.sort
      ? this.dataSource.sortData(rows, this.dataSource.sort)
      : rows;
    this.eventListNavigation.setContext(
      orderedRows.map(row => row.eventId),
      this.router.url,
    );
    this.router.navigate(['/events', event.eventId], { queryParams: { listNav: 1 } });
  }

  showPreview(event: HomeEventDetail, mouseEvent: MouseEvent): void {
    this.cancelPreviewTimer();
    this.hoveredEvent.set(null);
    const row = mouseEvent.currentTarget as HTMLElement;
    this.previewTimer = setTimeout(() => {
      const bounds = row.getBoundingClientRect();
      const width = 390;
      const height = 275;
      this.previewX.set(Math.max(12, Math.min(bounds.left + 36, window.innerWidth - width - 12)));
      this.previewY.set(bounds.bottom + height + 8 <= window.innerHeight
        ? bounds.bottom + 5
        : Math.max(12, bounds.top - height - 5));
      this.hoveredEvent.set(event);
      this.previewTimer = undefined;
    }, 500);
  }

  hidePreview(): void {
    this.cancelPreviewTimer();
    this.hoveredEvent.set(null);
  }

  private cancelPreviewTimer(): void {
    if (this.previewTimer === undefined) return;
    clearTimeout(this.previewTimer);
    this.previewTimer = undefined;
  }

  recurrenceLabel(event: HomeEventDetail): string {
    if (!event.isRecurring || !event.recurrenceInterval || !event.recurrenceUnit) return '';
    return event.recurrenceInterval === 1
      ? `Repeats every ${event.recurrenceUnit}`
      : `Repeats every ${event.recurrenceInterval} ${event.recurrenceUnit}s`;
  }

  areaIcon(areaTitle: string): string {
    const area = areaTitle.toLowerCase();
    if (area.includes('car')) return 'directions_car';
    if (area.includes('house') || area === 'home') return 'home';
    if (area.includes('kitchen')) return 'kitchen';
    if (area.includes('bath')) return 'bathtub';
    if (area.includes('bed')) return 'bed';
    if (area.includes('garden') || area.includes('yard')) return 'yard';
    if (area.includes('garage')) return 'garage';
    if (area.includes('office') || area.includes('study')) return 'desk';
    if (area.includes('living') || area.includes('lounge')) return 'weekend';
    if (area.includes('utility') || area.includes('laundry')) return 'local_laundry_service';
    if (area.includes('exterior') || area.includes('outside')) return 'cottage';
    if (area.includes('whole') || area.includes('general')) return 'home';
    return 'location_on';
  }

  openForm(event?: HomeEventDetail): void {
    const ref = this.dialog.open(EventFormComponent, {
      data: { event },
      width: '720px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.refreshAfterMutation();
    });
  }

  deleteEvent(event: HomeEventDetail, $event: MouseEvent): void {
    $event.stopPropagation();
    this.appDialog.confirm({ title: 'Delete task?', message: `Delete “${event.title}”?`,
      detail: 'Attached images, documents and notes will be permanently deleted. Contact links will also be removed.',
      tone: 'danger', confirmText: 'Delete task' }).subscribe(confirmed => {
      if (confirmed) this.eventsService.delete(event.eventId).subscribe(() => this.refreshAfterMutation());
    });
  }

  toggleFilters(): void { this.showFilters = !this.showFilters; }

  toggleMoreFilters(): void { this.showMoreFilters = !this.showMoreFilters; }

  isCompleted(event: HomeEventDetail): boolean { return event.eventStatusTitle?.toLowerCase() === 'complete'; }

  isOverdue(event: HomeEventDetail): boolean {
    if (!event.targetCompletionDate || event.actualCompletionDate) return false;
    return event.targetCompletionDate < new Date().toISOString().split('T')[0];
  }

  completeTask(event: HomeEventDetail, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    this.appDialog.confirm({ title: 'Complete task?', message: `Mark “${event.title}” as complete?`,
      icon: 'task_alt', tone: 'success', confirmText: 'Complete task' }).subscribe(confirmed => {
      if (confirmed) this.eventsService.complete(event.eventId).subscribe(() => this.refreshAfterMutation());
    });
  }

  reopenTask(event: HomeEventDetail, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    this.appDialog.confirm({ title: 'Reopen task?', message: `Reopen “${event.title}”?`,
      icon: 'replay', confirmText: 'Reopen task' }).subscribe(confirmed => {
      if (confirmed) this.eventsService.reopen(event.eventId).subscribe(() => this.refreshAfterMutation());
    });
  }

  signOut(): void { this.auth.logout(); }
}
