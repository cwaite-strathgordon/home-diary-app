import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EmailIntakeDetail,
  EmailIntakeReviewRequest,
  EmailIntakeStatus,
  EmailSuggestionReviewRequest,
  EmailSuggestionReviewResult,
  EmailTriagePage,
} from '../models/email-triage.model';

@Injectable({ providedIn: 'root' })
export class EmailTriageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/email-triage`;

  getAll(status: EmailIntakeStatus | null, limit: number, offset: number): Observable<EmailTriagePage> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (status) params = params.set('status', status);
    return this.http.get<EmailTriagePage>(this.base, { params });
  }

  getById(id: number): Observable<EmailIntakeDetail> {
    return this.http.get<EmailIntakeDetail>(`${this.base}/${id}`);
  }

  reviewIntake(id: number, review: EmailIntakeReviewRequest): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/review`, review);
  }

  reviewSuggestion(
    intakeId: number,
    suggestionId: number,
    review: EmailSuggestionReviewRequest,
  ): Observable<EmailSuggestionReviewResult | null> {
    return this.http.patch<EmailSuggestionReviewResult | null>(
      `${this.base}/${intakeId}/suggestions/${suggestionId}/review`,
      review,
    );
  }
}
