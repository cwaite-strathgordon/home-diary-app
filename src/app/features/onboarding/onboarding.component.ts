import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingService } from '../../core/services/onboarding.service';
import { OnboardingAreaSuggestion, OnboardingMaintenanceSuggestion } from '../../core/models/onboarding.model';

@Component({
  selector: 'app-onboarding', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatCheckboxModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    MatSelectModule, MatStepperModule],
  templateUrl: './onboarding.component.html', styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly loadingSuggestions = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly areas = signal<OnboardingAreaSuggestion[]>([]);
  readonly maintenanceTasks = signal<OnboardingMaintenanceSuggestion[]>([]);

  readonly personalForm = this.fb.nonNullable.group({
    firstName: [this.auth.currentUser()?.firstName ?? '', Validators.required],
    lastName: [this.auth.currentUser()?.lastName ?? '', Validators.required],
    email: [this.auth.currentUser()?.email ?? '', [Validators.required, Validators.email]],
    mobileNumber: [this.auth.currentUser()?.mobileNumber ?? ''],
    clientName: ['', Validators.required],
  });
  readonly propertyForm = this.fb.nonNullable.group({
    propertyName: ['', Validators.required], addressLine1: ['', Validators.required],
    addressLine2: [''], city: ['', Validators.required], region: [''],
    postcode: ['', Validators.required], country: ['United Kingdom', Validators.required],
    propertyType: ['House', Validators.required], constructionYear: [null as number | null],
    bedroomCount: [null as number | null], bathroomCount: [null as number | null],
    hasGarden: [false], hasGarage: [false], hasAirConditioning: [false],
    hasGasBoiler: [false], hasSolarPanels: [false], hasPool: [false],
  });

  loadSuggestions(): void {
    if (this.propertyForm.invalid) { this.propertyForm.markAllAsTouched(); return; }
    this.loadingSuggestions.set(true); this.error.set('');
    const p = this.propertyForm.getRawValue();
    this.onboarding.suggestions({ propertyType: p.propertyType,
      hasGarden: p.hasGarden, hasGarage: p.hasGarage,
      hasAirConditioning: p.hasAirConditioning, hasGasBoiler: p.hasGasBoiler,
      hasSolarPanels: p.hasSolarPanels, hasPool: p.hasPool }).subscribe({
      next: result => { this.areas.set(result.areas); this.maintenanceTasks.set(result.maintenanceTasks); this.loadingSuggestions.set(false); },
      error: () => { this.error.set('Suggestions could not be loaded.'); this.loadingSuggestions.set(false); },
    });
  }

  toggleArea(index: number, selected: boolean): void {
    this.areas.update(items => items.map((item, i) => i === index ? { ...item, selected } : item));
  }
  toggleTask(index: number, selected: boolean): void {
    this.maintenanceTasks.update(items => items.map((item, i) => i === index ? { ...item, selected } : item));
  }

  complete(): void {
    if (this.personalForm.invalid || this.propertyForm.invalid || this.saving()) return;
    const person = this.personalForm.getRawValue(); const p = this.propertyForm.getRawValue();
    this.saving.set(true); this.error.set('');
    this.onboarding.complete({ ...person, mobileNumber: person.mobileNumber || undefined,
      property: { settingId: 0, ...p, constructionYear: p.constructionYear ?? undefined,
        bedroomCount: p.bedroomCount ?? undefined, bathroomCount: p.bathroomCount ?? undefined },
      areas: this.areas(), maintenanceTasks: this.maintenanceTasks() }).subscribe({
      next: user => { this.auth.updateCurrentUser(user); void this.router.navigate(['/dashboard']); },
      error: (response: HttpErrorResponse) => { this.error.set(response.error?.detail ?? 'HomeDiary setup could not be completed.'); this.saving.set(false); },
    });
  }
}
