import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Area, EventPriority, EventStatus, EventType } from '../models/lookup.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);

  // Statuses are read-only in the current UI, so they can remain cached.
  private readonly statuses$ = this.http.get<EventStatus[]>(`${environment.apiUrl}/event-statuses`).pipe(shareReplay(1));
  private readonly priorities$ = this.http.get<EventPriority[]>(`${environment.apiUrl}/event-priorities`).pipe(shareReplay(1));

  getAreas(): Observable<Area[]> {
    return this.http.get<Area[]>(`${environment.apiUrl}/areas`);
  }

  createArea(area: Omit<Area, 'areaId'>): Observable<Area> {
    return this.http.post<Area>(`${environment.apiUrl}/areas`, area);
  }

  updateArea(area: Area): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/areas/${area.areaId}`, area);
  }

  deleteArea(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/areas/${id}`);
  }

  getEventTypes(): Observable<EventType[]> {
    return this.http.get<EventType[]>(`${environment.apiUrl}/event-types`);
  }

  createEventType(type: Omit<EventType, 'eventTypeId'>): Observable<EventType> {
    return this.http.post<EventType>(`${environment.apiUrl}/event-types`, type);
  }

  updateEventType(type: EventType): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/event-types/${type.eventTypeId}`, type);
  }

  deleteEventType(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/event-types/${id}`);
  }

  getEventStatuses(): Observable<EventStatus[]>  { return this.statuses$; }
  getEventPriorities(): Observable<EventPriority[]> { return this.priorities$; }
}
