import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventDocument } from '../models/event-document.model';

@Injectable({ providedIn: 'root' })
export class EventDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/event-documents`;

  getForEvent(eventId: number): Observable<EventDocument[]> {
    return this.http.get<EventDocument[]>(`${this.base}/by-event/${eventId}`);
  }

  getAll(): Observable<EventDocument[]> {
    return this.http.get<EventDocument[]>(this.base);
  }

  getCount(): Observable<number> {
    return this.http.get<number>(`${this.base}/count`);
  }

  upload(eventId: number, file: File): Observable<EventDocument> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<EventDocument>(`${this.base}/by-event/${eventId}`, form);
  }

  search(query: string, eventId?: number): Observable<EventDocument[]> {
    let params = new HttpParams().set('query', query);
    if (eventId) params = params.set('eventId', eventId);
    return this.http.get<EventDocument[]>(`${this.base}/search`, { params });
  }

  download(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/download`, { responseType: 'blob' });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
