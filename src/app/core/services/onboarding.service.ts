import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import {
  CompleteOnboardingRequest, OnboardingFeatures, OnboardingSuggestions,
} from '../models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);

  suggestions(features: OnboardingFeatures): Observable<OnboardingSuggestions> {
    return this.http.post<OnboardingSuggestions>(`${environment.apiUrl}/onboarding/suggestions`, features);
  }

  complete(request: CompleteOnboardingRequest): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/onboarding/complete`, request);
  }
}
