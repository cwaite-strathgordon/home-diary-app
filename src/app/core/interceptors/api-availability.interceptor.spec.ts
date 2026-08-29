import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAvailabilityService } from '../services/api-availability.service';
import { apiAvailabilityInterceptor } from './api-availability.interceptor';

describe('apiAvailabilityInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let availability: ApiAvailabilityService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiAvailabilityInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    availability = TestBed.inject(ApiAvailabilityService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => controller.verify());

  it('exposes a server error for a 500 response', () => {
    http.get(`${environment.apiUrl}/test`).subscribe({ error: () => undefined });

    controller.expectOne(`${environment.apiUrl}/test`).flush(
      { title: 'Unexpected error' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(availability.serverError()).toBe(500);
    expect(availability.unavailable()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/service-unavailable'],
      { replaceUrl: true },
    );
  });

  it('exposes API unavailability for a network failure', () => {
    http.get(`${environment.apiUrl}/test`).subscribe({ error: () => undefined });

    controller.expectOne(`${environment.apiUrl}/test`).error(new ProgressEvent('error'));

    expect(availability.unavailable()).toBeTrue();
    expect(availability.serverError()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/service-unavailable'],
      { replaceUrl: true },
    );
  });
});
