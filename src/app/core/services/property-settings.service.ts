import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PropertySetting, PropertyWeather } from '../models/property-setting.model';

@Injectable({ providedIn: 'root' })
export class PropertySettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/property-settings`;
  get(): Observable<PropertySetting | null> { return this.http.get<PropertySetting | null>(this.base); }
  save(setting: Partial<PropertySetting>): Observable<PropertySetting> { return this.http.put<PropertySetting>(this.base, setting); }
  getWeather(): Observable<PropertyWeather> { return this.http.get<PropertyWeather>(`${this.base}/weather`); }
}
