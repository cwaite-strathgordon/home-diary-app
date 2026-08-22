import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GlobalSearchResult } from '../models/global-search-result.model';

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<GlobalSearchResult[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<GlobalSearchResult[]>(`${environment.apiUrl}/search`, { params });
  }
}
