import { Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { PropertySetting } from '../../../core/models/property-setting.model';
import { PropertySettingsService } from '../../../core/services/property-settings.service';
import { AppDialogService } from '../../../core/services/app-dialog.service';

@Component({ selector: 'app-property-settings', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule, MatCheckboxModule, MatSelectModule],
  templateUrl: './property-settings.component.html', styleUrl: './property-settings.component.scss' })
export class PropertySettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PropertySettingsService);
  private readonly location = inject(Location);
  private readonly dialog = inject(AppDialogService);
  loading = signal(true); saving = signal(false); error = signal(''); setting = signal<PropertySetting | null>(null);
  readonly form = this.fb.nonNullable.group({
    propertyName: ['', [Validators.required, Validators.maxLength(255)]],
    addressLine1: ['', [Validators.required, Validators.maxLength(255)]],
    addressLine2: ['', Validators.maxLength(255)], city: ['', [Validators.required, Validators.maxLength(120)]],
    region: ['', Validators.maxLength(120)], postcode: ['', [Validators.required, Validators.maxLength(30)]],
    country: ['', [Validators.required, Validators.maxLength(120)]],
    propertyType: ['House', Validators.required], constructionYear: [null as number | null],
    bedroomCount: [null as number | null], bathroomCount: [null as number | null],
    hasGarden: [false], hasGarage: [false], hasAirConditioning: [false],
    hasGasBoiler: [false], hasSolarPanels: [false], hasPool: [false],
  });

  ngOnInit(): void {
    this.service.get().subscribe({ next: setting => { this.setting.set(setting); if (setting) this.form.patchValue(setting); this.loading.set(false); },
      error: () => { this.error.set('Property details could not be loaded.'); this.loading.set(false); } });
  }
  goBack(): void { this.location.back(); }
  save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    const value = this.form.getRawValue();
    this.service.save({ ...this.setting(), ...value, settingId: this.setting()?.settingId ?? 0,
      constructionYear: value.constructionYear ?? undefined,
      bedroomCount: value.bedroomCount ?? undefined,
      bathroomCount: value.bathroomCount ?? undefined }).subscribe({
      next: setting => {
        this.setting.set(setting); this.form.markAsPristine(); this.saving.set(false);
        this.dialog.alert({ title: 'Property saved', message: 'The property address and coordinates have been updated.',
          detail: 'Dashboard weather will now use this location.', tone: 'success', icon: 'home_pin' }).subscribe();
      },
      error: (response: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(typeof response.error === 'string' ? response.error : 'The property could not be saved or located.');
      },
    });
  }
}
