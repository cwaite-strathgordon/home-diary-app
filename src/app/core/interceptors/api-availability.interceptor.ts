import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiAvailabilityService } from '../services/api-availability.service';

const apiRoot = environment.apiUrl.replace(/\/+$/, '');
const unavailableStatuses = new Set([0, 502, 503, 504]);

export const apiAvailabilityInterceptor: HttpInterceptorFn = (request, next) => {
  const availability = inject(ApiAvailabilityService);
  const isApiRequest = request.url === apiRoot || request.url.startsWith(`${apiRoot}/`);

  if (!isApiRequest) return next(request);

  return next(request).pipe(
    tap({
      next: () => availability.markAvailable(),
      error: error => {
        if (!(error instanceof HttpErrorResponse)) return;

        if (unavailableStatuses.has(error.status)) {
          availability.markUnavailable();
        } else {
          availability.markAvailable();
          if (error.status >= 500 && error.status <= 599)
            availability.markServerError(error.status);
        }
      },
    }),
  );
};
