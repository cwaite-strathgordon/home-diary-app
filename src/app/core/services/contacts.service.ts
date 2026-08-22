import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contact } from '../models/contact.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly base = `${environment.apiUrl}/contacts`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Contact[]> {
    return this.http.get<Contact[]>(this.base);
  }

  getById(id: number): Observable<Contact> {
    return this.http.get<Contact>(`${this.base}/${id}`);
  }

  create(contact: Partial<Contact>): Observable<Contact> {
    return this.http.post<Contact>(this.base, contact);
  }

  update(id: number, contact: Contact): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, contact);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
