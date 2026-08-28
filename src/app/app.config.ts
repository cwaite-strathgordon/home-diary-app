import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth0 } from '@auth0/auth0-angular';
import { authHttpInterceptorFn } from '@auth0/auth0-angular';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { apiAvailabilityInterceptor } from './core/interceptors/api-availability.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    provideAnimationsAsync(),
    provideAuth0({
      domain:   environment.auth0.domain,
      clientId: environment.auth0.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience:     environment.auth0.audience,
      },
      httpInterceptor: {
        // Auth0 will attach a bearer token to all requests to our API
        allowedList: [`${environment.apiUrl}/*`],
      },
    }),
    // Auth0's interceptor adds Authorization: Bearer <token> automatically
    provideHttpClient(withInterceptors([apiAvailabilityInterceptor, authHttpInterceptorFn])),
  ],
};
