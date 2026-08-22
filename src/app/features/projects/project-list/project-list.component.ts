import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Project } from '../../../core/models/project.model';
import { ProjectsService } from '../../../core/services/projects.service';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { ProjectListNavigationService } from '../../../core/services/project-list-navigation.service';

@Component({ selector: 'app-project-list', standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule,
    MatButtonToggleModule, MatSlideToggleModule, MatTooltipModule],
  templateUrl: './project-list.component.html', styleUrl: './project-list.component.scss' })
export class ProjectListComponent implements OnInit {
  projects = signal<Project[]>([]); loading = signal(true); includeArchived = signal(false);
  viewMode = signal<'grid' | 'list'>('grid');
  constructor(private service: ProjectsService, private dialog: MatDialog, private router: Router,
    private appDialog: AppDialogService, private projectListNavigation: ProjectListNavigationService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading.set(true); this.service.getAll(this.includeArchived()).subscribe({ next: value => { this.projects.set(value); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  toggleArchived(checked: boolean): void { this.includeArchived.set(checked); this.load(); }
  open(project?: Project, event?: MouseEvent): void {
    event?.stopPropagation();
    const ref = this.dialog.open(ProjectFormComponent, { data: { project }, width: '620px', maxWidth: '94vw' });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }
  view(project: Project): void {
    this.projectListNavigation.setContext(this.projects().map(item => item.projectId), this.router.url);
    this.router.navigate(['/projects', project.projectId], { queryParams: { listNav: 1 } });
  }
  progress(project: Project): number { return project.totalTasks ? Math.round((project.completedTasks ?? 0) * 100 / project.totalTasks) : 0; }
  areaIcon(areaTitle?: string): string {
    const area = areaTitle?.toLowerCase() ?? '';
    if (area.includes('car')) return 'directions_car';
    if (area.includes('house') || area === 'home') return 'home';
    if (area.includes('kitchen')) return 'kitchen';
    if (area.includes('bath')) return 'bathtub';
    if (area.includes('bed')) return 'bed';
    if (area.includes('garden') || area.includes('yard')) return 'yard';
    if (area.includes('garage')) return 'garage';
    if (area.includes('office') || area.includes('study')) return 'desk';
    if (area.includes('living') || area.includes('lounge')) return 'weekend';
    if (area.includes('utility') || area.includes('laundry')) return 'local_laundry_service';
    if (area.includes('exterior') || area.includes('outside')) return 'cottage';
    if (area.includes('whole') || area.includes('general')) return 'home';
    return area ? 'location_on' : 'folder';
  }
  canArchive(project: Project): boolean { return (project.activeTasks ?? 0) === 0; }
  archiveHint(project: Project): string {
    const remaining = project.activeTasks ?? 0;
    return remaining ? `Complete ${remaining} remaining ${remaining === 1 ? 'task' : 'tasks'} before archiving` : 'Archive project';
  }
  archive(project: Project, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.canArchive(project)) return;
    this.appDialog.confirm({ title: 'Archive project?', message: `Archive “${project.title}”?`,
      detail: 'The project will be hidden from the default list. Its completed tasks and documents will remain available.',
      icon: 'archive', confirmText: 'Archive project' }).subscribe(confirmed => {
      if (confirmed) this.service.archive(project.projectId).subscribe({ next: () => this.load(), error: error => this.archiveError(error) });
    });
  }
  restore(project: Project, event: MouseEvent): void {
    event.stopPropagation();
    this.appDialog.confirm({ title: 'Restore project?', message: `Restore “${project.title}” to Active?`,
      icon: 'unarchive', confirmText: 'Restore project' }).subscribe(confirmed => {
      if (confirmed) this.service.restore(project.projectId).subscribe(() => this.load());
    });
  }
  private archiveError(error: { error?: { detail?: string } }): void {
    this.appDialog.alert({ title: 'Project cannot be archived',
      message: error.error?.detail || 'Complete all remaining tasks before archiving this project.', tone: 'warning' }).subscribe();
  }
  remove(project: Project, event: MouseEvent): void {
    event.stopPropagation();
    this.appDialog.confirm({ title: 'Delete project?', message: `Delete “${project.title}”?`,
      detail: 'Its tasks will become ad-hoc tasks. The tasks themselves will not be deleted.',
      tone: 'danger', confirmText: 'Delete project' }).subscribe(confirmed => {
      if (confirmed) this.service.delete(project.projectId).subscribe(() => this.load());
    });
  }
}
