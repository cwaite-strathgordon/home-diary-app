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
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { finalize } from 'rxjs/operators';
import { AiProviderName, AiSettings } from '../../../core/models/ai-settings.model';
import { AiSettingsService } from '../../../core/services/ai-settings.service';

@Component({
  selector: 'app-ai-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './ai-settings.component.html',
  styleUrl: './ai-settings.component.scss',
})
export class AiSettingsComponent implements OnInit {
  private readonly service = inject(AiSettingsService);

  readonly providers: { value: AiProviderName; label: string }[] = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'deepseek', label: 'DeepSeek' },
  ];

  readonly form = new FormGroup({
    enabled: new FormControl(false, { nonNullable: true }),
    primaryProvider: new FormControl<AiProviderName>('openai', { nonNullable: true }),
    parallelEnabled: new FormControl(false, { nonNullable: true }),
    parallelProvider: new FormControl<AiProviderName>('deepseek', { nonNullable: true }),
    openAiModel: new FormControl('gpt-5.6-sol', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    deepSeekModel: new FormControl('deepseek-v4-flash', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    openAiApiKey: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    deepSeekApiKey: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  loading = true;
  saving = false;
  openAiKeyConfigured = false;
  deepSeekKeyConfigured = false;
  clearOpenAiKey = false;
  clearDeepSeekKey = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.get().pipe(finalize(() => this.loading = false)).subscribe({
      next: settings => this.apply(settings),
      error: error => this.errorMessage = this.errorText(error, 'Unable to load AI settings.'),
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.parallelEnabled && value.primaryProvider === value.parallelProvider) {
      this.errorMessage = 'The parallel provider must differ from the primary provider.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.service.update({
      enabled: value.enabled,
      primaryProvider: value.primaryProvider,
      parallelEnabled: value.parallelEnabled,
      parallelProvider: value.parallelProvider,
      openAiModel: value.openAiModel.trim(),
      deepSeekModel: value.deepSeekModel.trim(),
      openAiApiKey: value.openAiApiKey.trim() || undefined,
      deepSeekApiKey: value.deepSeekApiKey.trim() || undefined,
      clearOpenAiApiKey: this.clearOpenAiKey,
      clearDeepSeekApiKey: this.clearDeepSeekKey,
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: settings => {
        this.apply(settings);
        this.successMessage = 'AI processing settings saved.';
      },
      error: error => this.errorMessage = this.errorText(error, 'Unable to save AI settings.'),
    });
  }

  removeOpenAiKey(): void {
    this.clearOpenAiKey = true;
    this.openAiKeyConfigured = false;
    this.form.controls.openAiApiKey.setValue('');
  }

  removeDeepSeekKey(): void {
    this.clearDeepSeekKey = true;
    this.deepSeekKeyConfigured = false;
    this.form.controls.deepSeekApiKey.setValue('');
  }

  private apply(settings: AiSettings): void {
    this.form.setValue({
      enabled: settings.enabled,
      primaryProvider: settings.primaryProvider,
      parallelEnabled: settings.parallelEnabled,
      parallelProvider: settings.parallelProvider,
      openAiModel: settings.openAiModel,
      deepSeekModel: settings.deepSeekModel,
      openAiApiKey: '',
      deepSeekApiKey: '',
    });
    this.openAiKeyConfigured = settings.openAiApiKeyConfigured;
    this.deepSeekKeyConfigured = settings.deepSeekApiKeyConfigured;
    this.clearOpenAiKey = false;
    this.clearDeepSeekKey = false;
  }

  private errorText(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    return error.error?.detail ?? error.error?.title ?? fallback;
  }
}
