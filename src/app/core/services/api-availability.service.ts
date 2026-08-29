import { computed, Injectable, signal } from '@angular/core';

type ApiFailure =
  | { kind: 'unavailable' }
  | { kind: 'server-error'; status: number };

@Injectable({ providedIn: 'root' })
export class ApiAvailabilityService {
  private readonly failureState = signal<ApiFailure | null>(null);
  private readonly returnUrlState = signal('/dashboard');

  readonly hasFailure = computed(() => this.failureState() !== null);
  readonly unavailable = computed(() => this.failureState()?.kind === 'unavailable');
  readonly serverError = computed(() => {
    const failure = this.failureState();
    return failure?.kind === 'server-error' ? failure.status : null;
  });
  readonly returnUrl = this.returnUrlState.asReadonly();

  markUnavailable(returnUrl: string): void {
    this.captureFailure({ kind: 'unavailable' }, returnUrl);
  }

  markServerError(status: number, returnUrl: string): void {
    this.captureFailure({ kind: 'server-error', status }, returnUrl);
  }

  private captureFailure(failure: ApiFailure, returnUrl: string): void {
    // Keep the first failure visible until the user explicitly retries. A later
    // background request must not hide an operation that may not have completed.
    if (this.failureState() !== null) return;

    if (returnUrl && !returnUrl.startsWith('/service-unavailable'))
      this.returnUrlState.set(returnUrl);
    this.failureState.set(failure);
  }
}
