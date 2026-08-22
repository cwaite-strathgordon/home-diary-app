import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly base = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getAll(includeArchived = false): Observable<Project[]> {
    return this.http.get<Project[]>(this.base, { params: { includeArchived } });
  }
  getById(id: number): Observable<Project> { return this.http.get<Project>(`${this.base}/${id}`); }
  create(project: Partial<Project>): Observable<Project> { return this.http.post<Project>(this.base, project); }
  update(id: number, project: Project): Observable<void> { return this.http.put<void>(`${this.base}/${id}`, project); }
  archive(id: number): Observable<void> { return this.http.post<void>(`${this.base}/${id}/archive`, {}); }
  restore(id: number): Observable<void> { return this.http.post<void>(`${this.base}/${id}/restore`, {}); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}
