import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HomeEvent, HomeEventDetail, HomeEventFilter } from '../models/home-event.model';
import { EventContactLink } from '../models/contact.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly base = `${environment.apiUrl}/home-events`;

  constructor(private http: HttpClient) {}

  getByFilter(filter: HomeEventFilter): Observable<HomeEventDetail[]> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<HomeEventDetail[]>(this.base, { params });
  }

  getById(id: number): Observable<HomeEventDetail> {
    return this.http.get<HomeEventDetail>(`${this.base}/${id}`);
  }

  create(event: Partial<HomeEvent>): Observable<HomeEvent> {
    return this.http.post<HomeEvent>(this.base, event);
  }

  update(id: number, event: Partial<HomeEvent>): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, event);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getContactLinks(eventId: number): Observable<EventContactLink[]> {
    return this.http.get<EventContactLink[]>(
      `${environment.apiUrl}/event-contact-links/by-event/${eventId}`
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
