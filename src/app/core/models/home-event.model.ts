export interface HomeEvent {
  eventId: number;
  title: string;
  description?: string;
  eventDate?: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  isRecurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: 'day' | 'week' | 'month' | 'year';
  createdDate?: string;
  createdById?: number;
  updatedDate?: string;
  eventTypeId?: number;
  areaId?: number;
  eventStatusId?: number;
  priorityId?: number;
  projectId?: number;
}

export interface HomeEventDetail extends HomeEvent {
  eventTypeTitle?: string;
  areaTitle?: string;
  eventStatusTitle?: string;
  priorityTitle?: string;
  projectTitle?: string;
  createdByFirstName?: string;
  createdByLastName?: string;
}

export interface HomeEventFilter {
  titleContains?: string;
  descriptionContains?: string;
  eventTypeId?: number;
  areaId?: number;
  eventStatusId?: number;
  eventStatusIds?: number[];
  priorityId?: number;
  projectId?: number;
  createdById?: number;
  eventDateFrom?: string;
  eventDateTo?: string;
  targetCompletionDateFrom?: string;
  targetCompletionDateTo?: string;
  actualCompletionDateFrom?: string;
  actualCompletionDateTo?: string;
  overdue?: boolean;
  activeOnly?: boolean;
  excludeWishList?: boolean;
  recurringOnly?: boolean;
  createdDateFrom?: string;
  createdDateTo?: string;
  updatedDateFrom?: string;
  updatedDateTo?: string;
}

export interface EventTaskSummary {
  allActiveTasks: number;
  overdueTasks: number;
  dueNextSevenDays: number;
  criticalTasks: number;
  completedLastMonth: number;
  createdLastSevenDays: number;
}

export interface CompleteEventResult {
  completedEventId: number;
  nextEventId?: number;
}
