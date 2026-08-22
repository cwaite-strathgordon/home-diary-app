import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CompleteEventResult, EventTaskSummary, HomeEvent, HomeEventDetail, HomeEventFilter } from '../models/home-event.model';
import { EventContactLink } from '../models/contact.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly base = `${environment.apiUrl}/home-events`;
  private readonly taskSummarySubject = new BehaviorSubject<EventTaskSummary | null>(null);
  readonly taskSummary$ = this.taskSummarySubject.asObservable();

  constructor(private http: HttpClient) {}

  getByFilter(filter: HomeEventFilter): Observable<HomeEventDetail[]> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach(value => params = params.append(k, String(value)));
      } else if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<HomeEventDetail[]>(this.base, { params });
  }

  getById(id: number): Observable<HomeEventDetail> {
    return this.http.get<HomeEventDetail>(`${this.base}/${id}`);
  }

  getTaskSummary(): Observable<EventTaskSummary> {
    return this.http.get<EventTaskSummary>(`${this.base}/task-summary`).pipe(
      tap(summary => this.taskSummarySubject.next(summary)),
    );
  }

  create(event: Partial<HomeEvent>): Observable<HomeEvent> {
    return this.http.post<HomeEvent>(this.base, event).pipe(tap(() => this.refreshTaskSummary()));
  }

  update(id: number, event: Partial<HomeEvent>): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, event).pipe(tap(() => this.refreshTaskSummary()));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.refreshTaskSummary()));
  }

  complete(id: number): Observable<CompleteEventResult> {
    return this.http.post<CompleteEventResult>(`${this.base}/${id}/complete`, {}).pipe(
      tap(() => this.refreshTaskSummary()),
    );
  }

  reopen(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reopen`, {}).pipe(tap(() => this.refreshTaskSummary()));
  }

  refreshTaskSummary(): void {
    this.getTaskSummary().subscribe({ error: () => undefined });
  }

  getContactLinks(eventId: number): Observable<EventContactLink[]> {
    return this.http.get<EventContactLink[]>(
      `${environment.apiUrl}/event-contact-links/by-event/${eventId}`
    );
  }

  getEventLinksForContact(contactId: number): Observable<EventContactLink[]> {
    return this.http.get<EventContactLink[]>(
      `${environment.apiUrl}/event-contact-links/by-contact/${contactId}`
    );
  }

  addContact(link: EventContactLink): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/event-contact-links`, link);
  }

  removeContact(contactId: number, eventId: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/event-contact-links/${contactId}/${eventId}`
    );
  }
}
