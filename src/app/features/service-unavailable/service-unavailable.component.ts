import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiAvailabilityService } from '../../core/services/api-availability.service';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './service-unavailable.component.html',
  styleUrl: './service-unavailable.component.scss',
})
export class ServiceUnavailableComponent {
  private readonly availability = inject(ApiAvailabilityService);

  tryAgain(): void {
    const returnUrl = this.availability.returnUrl();
    window.location.assign(returnUrl || '/dashboard');
  }
}
