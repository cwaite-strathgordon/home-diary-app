import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { RecentItemsService } from '../../../core/services/recent-items.service';

@Component({
  selector: 'app-application-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
  ],
  templateUrl: './application-settings.component.html',
  styleUrl: './application-settings.component.scss',
})
export class ApplicationSettingsComponent implements OnInit {
  private readonly service = inject(RecentItemsService);

  readonly form = new FormGroup({
    recentItemsLimit: new FormControl(20, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100)],
    }),
    inboundEmailAddress: new FormControl('tasks@homediary.app', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    maximumImageUploadMegabytes: new FormControl(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(20)],
    }),
  });

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.service.getSettings().pipe(finalize(() => this.loading = false)).subscribe({
      next: settings => this.form.setValue(settings),
      error: error => this.errorMessage = this.errorText(error, 'Unable to load application settings.'),
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.service.updateSettings(this.form.getRawValue())
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: settings => {
          this.form.setValue(settings);
          this.successMessage = 'Application settings saved.';
        },
        error: error => this.errorMessage = this.errorText(error, 'Unable to save application settings.'),
      });
  }

  private errorText(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    return error.error?.detail ?? error.error?.title ?? fallback;
  }
}
