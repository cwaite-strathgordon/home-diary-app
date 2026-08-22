import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AiSettings, UpdateAiSettingsRequest } from '../models/ai-settings.model';

@Injectable({ providedIn: 'root' })
export class AiSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/application-parameters/ai`;

  get(): Observable<AiSettings> {
    return this.http.get<AiSettings>(this.url);
  }

  update(settings: UpdateAiSettingsRequest): Observable<AiSettings> {
    return this.http.put<AiSettings>(this.url, settings);
  }
}
