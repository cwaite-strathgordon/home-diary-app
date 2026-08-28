import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiAvailabilityService {
  private readonly unavailableState = signal(false);
  private readonly serverErrorState = signal<number | null>(null);

  readonly unavailable = this.unavailableState.asReadonly();
  readonly serverError = this.serverErrorState.asReadonly();

  markUnavailable(): void {
    this.unavailableState.set(true);
  }

  markAvailable(): void {
    this.unavailableState.set(false);
  }

  markServerError(status: number): void {
    // Keep the first failure visible until the user explicitly retries. A later
    // background request must not hide an operation that may not have completed.
    if (this.serverErrorState() === null) this.serverErrorState.set(status);
  }
}
