import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplicationSettings, RecentItem, RecentItemType } from '../models/recent-item.model';

@Injectable({ providedIn: 'root' })
export class RecentItemsService {
  private readonly http = inject(HttpClient);
  private readonly recentItemsUrl = `${environment.apiUrl}/recent-items`;
  private readonly settingsUrl = `${environment.apiUrl}/application-parameters/application`;

  getAll(): Observable<RecentItem[]> {
    return this.http.get<RecentItem[]>(this.recentItemsUrl);
  }

  record(itemType: RecentItemType, itemId: number): Observable<RecentItem> {
    return this.http.post<RecentItem>(`${this.recentItemsUrl}/${itemType}/${itemId}`, {});
  }

  getSettings(): Observable<ApplicationSettings> {
    return this.http.get<ApplicationSettings>(this.settingsUrl);
  }

  updateSettings(recentItemsLimit: number): Observable<ApplicationSettings> {
    return this.http.put<ApplicationSettings>(this.settingsUrl, { recentItemsLimit });
  }
}
