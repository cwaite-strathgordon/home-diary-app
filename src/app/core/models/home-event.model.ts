export interface HomeEvent {
  eventId: number;
  title: string;
  description?: string;
  eventDate?: string;
  createdDate?: string;
  createdById?: number;
  updatedDate?: string;
  eventTypeId?: number;
  areaId?: number;
  eventStatusId?: number;
}

export interface HomeEventDetail extends HomeEvent {
  eventTypeTitle?: string;
  areaTitle?: string;
  eventStatusTitle?: string;
  createdByFirstName?: string;
  createdByLastName?: string;
}

export interface HomeEventFilter {
  titleContains?: string;
  descriptionContains?: string;
  eventTypeId?: number;
  areaId?: number;
  eventStatusId?: number;
  createdById?: number;
  eventDateFrom?: string;
  eventDateTo?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  updatedDateFrom?: string;
  updatedDateTo?: string;
}
