import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Project } from '../../../core/models/project.model';
import { ProjectsService } from '../../../core/services/projects.service';
import { AuthService } from '../../../core/services/auth.service';
import { Observable } from 'rxjs';
import { LookupService } from '../../../core/services/lookup.service';
import { Area } from '../../../core/models/lookup.model';

class ProjectDateAdapter extends NativeDateAdapter {
  override parse(value: string | null): Date | null {
    if (typeof value === 'string' && value.trim()) {
      const parts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (parts) {
        const date = new Date(+parts[3], +parts[2] - 1, +parts[1]);
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }
    return super.parse(value);
  }

  override format(date: Date, _displayFormat: unknown): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
}

const PROJECT_DATE_FORMATS = {
  parse: { dateInput: 'dd/MM/yyyy' },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

@Component({
  selector: 'app-project-form', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatDatepickerModule,
    MatNativeDateModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  providers: [
    { provide: DateAdapter, useClass: ProjectDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: PROJECT_DATE_FORMATS },
  ],
  templateUrl: './project-form.component.html', styleUrl: './project-form.component.scss',
})
export class ProjectFormComponent implements OnInit {
  saving = signal(false);
  areas = signal<Area[]>([]);
  readonly isEdit: boolean;
  readonly isArchived: boolean;
  readonly statusOptions: Project['status'][] = ['Wish List', 'Active', 'On Hold'];
  readonly form: FormGroup;

  constructor(private fb: FormBuilder, private projects: ProjectsService, private auth: AuthService,
    private lookups: LookupService,
    private dialogRef: MatDialogRef<ProjectFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project?: Project }) {
    this.isEdit = !!data?.project;
    this.isArchived = data?.project?.status === 'Archived';
    this.form = this.fb.group({
      projectId: [data?.project?.projectId ?? 0],
      title: [data?.project?.title ?? '', [Validators.required, Validators.maxLength(255)]],
      description: [data?.project?.description ?? ''],
      areaId: [data?.project?.areaId ?? null],
      startDate: [this.asDate(data?.project?.startDate)],
      targetCompletionDate: [this.asDate(data?.project?.targetCompletionDate)],
      status: [data?.project?.status ?? 'Active', Validators.required],
      createdById: [data?.project?.createdById ?? this.auth.currentUser()?.userId],
    });
    if (this.isArchived) this.form.controls['status'].disable();
  }

  ngOnInit(): void {
    this.lookups.getAreas().subscribe(areas => {
      this.areas.set(areas);
      if (!this.isEdit && !this.form.controls['areaId'].value) {
        const defaultArea = areas.find(area => area.title?.toLowerCase() === 'whole property') ?? areas[0];
        this.form.controls['areaId'].setValue(defaultArea?.areaId ?? null);
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload = {
      ...this.data?.project, ...value,
      title: value.title!,
      startDate: this.toDateOnly(value.startDate),
      targetCompletionDate: this.toDateOnly(value.targetCompletionDate),
    } as Project;
    const request: Observable<Project | void> = this.isEdit
      ? this.projects.update(payload.projectId, payload)
      : this.projects.create(payload);
    request.subscribe({ next: (result: Project | void) => this.dialogRef.close(result || true), error: () => this.saving.set(false) });
  }

  private asDate(value?: string): Date | null { return value ? new Date(`${value}T00:00:00`) : null; }
  private toDateOnly(value: Date | null): string | undefined {
    if (!value) return undefined;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
