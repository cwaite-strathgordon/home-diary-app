import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note } from '../models/note.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly base = `${environment.apiUrl}/notes`;
  private readonly contactLinkType = 1;
  private readonly eventLinkType = 2;

  constructor(private readonly http: HttpClient) {}

  getForEvent(eventId: number): Observable<Note[]> {
    return this.getForLink(this.eventLinkType, eventId);
  }

  getForContact(contactId: number): Observable<Note[]> {
    return this.getForLink(this.contactLinkType, contactId);
  }

  private getForLink(linkObjectTypeId: number, linkObjectId: number): Observable<Note[]> {
    const params = new HttpParams()
      .set('linkObjectTypeId', String(linkObjectTypeId))
      .set('linkObjectId', String(linkObjectId));
    return this.http.get<Note[]>(this.base, { params });
  }

  createForEvent(eventId: number, subject: string, noteText: string): Observable<Note> {
    return this.createForLink(this.eventLinkType, eventId, subject, noteText);
  }

  createForContact(contactId: number, subject: string, noteText: string): Observable<Note> {
    return this.createForLink(this.contactLinkType, contactId, subject, noteText);
  }

  update(note: Note, subject: string, noteText: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${note.noteId}`, {
      linkObjectTypeId: note.linkObjectTypeId,
      linkObjectId: note.linkObjectId,
      subject,
      noteText,
    });
  }

  delete(noteId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${noteId}`);
  }

  private createForLink(linkObjectTypeId: number, linkObjectId: number, subject: string, noteText: string): Observable<Note> {
    return this.http.post<Note>(this.base, {
      linkObjectTypeId,
      linkObjectId,
      subject,
      noteText,
    });
  }
}
