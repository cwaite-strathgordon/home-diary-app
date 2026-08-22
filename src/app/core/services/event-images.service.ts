import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventImage } from '../models/event-image.model';

@Injectable({ providedIn: 'root' })
export class EventImagesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/event-images`;

  getForEvent(eventId: number): Observable<EventImage[]> {
    return this.http.get<EventImage[]>(`${this.base}/by-event/${eventId}`);
  }

  upload(eventId: number, file: File): Observable<EventImage> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<EventImage>(`${this.base}/by-event/${eventId}`, form);
  }

  content(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/content`, { responseType: 'blob' });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
