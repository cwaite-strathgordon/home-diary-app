import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Area, EventStatus, EventType } from '../models/lookup.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);

  // Cache lookups for the lifetime of the service
  private readonly areas$    = this.http.get<Area[]>(`${environment.apiUrl}/areas`).pipe(shareReplay(1));
  private readonly types$    = this.http.get<EventType[]>(`${environment.apiUrl}/event-types`).pipe(shareReplay(1));
  private readonly statuses$ = this.http.get<EventStatus[]>(`${environment.apiUrl}/event-statuses`).pipe(shareReplay(1));

  getAreas():         Observable<Area[]>        { return this.areas$; }
  getEventTypes():    Observable<EventType[]>    { return this.types$; }
  getEventStatuses(): Observable<EventStatus[]>  { return this.statuses$; }
}
