import { CommonModule, Location } from '@angular/common';
import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { HomeEventDetail } from '../../../core/models/home-event.model';
import { Project } from '../../../core/models/project.model';
import { EventsService } from '../../../core/services/events.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { EventFormComponent } from '../../events/event-form/event-form.component';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { ProjectListNavigationService } from '../../../core/services/project-list-navigation.service';
import { RecentItemsService } from '../../../core/services/recent-items.service';

@Component({ selector: 'app-project-detail', standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './project-detail.component.html', styleUrl: './project-detail.component.scss' })
export class ProjectDetailComponent implements OnInit, OnDestroy {
  project = signal<Project|null>(null); tasks = signal<HomeEventDetail[]>([]); loading = signal(true);
  listNavigationEnabled = signal(false);
  projectTransitioning = signal(false);
  transitionFadeOut = signal(false);
  listNavigation = computed(() => {
    const project = this.project();
    return project && this.listNavigationEnabled()
      ? this.projectListNavigation.position(project.projectId)
      : null;
  });
  private routeSubscription?: Subscription;
  private loadSubscription?: Subscription;
  private transitionSwapTimer?: ReturnType<typeof setTimeout>;
  private transitionEndTimer?: ReturnType<typeof setTimeout>;
  private readonly transitionPhaseMs = 275;

  constructor(private route: ActivatedRoute, private router: Router, private location: Location,
    private projects: ProjectsService, private events: EventsService, private dialog: MatDialog,
    private appDialog: AppDialogService, private projectListNavigation: ProjectListNavigationService,
    private recentItems: RecentItemsService) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) { this.router.navigate(['/projects']); return; }
      this.listNavigationEnabled.set(this.route.snapshot.queryParamMap.get('listNav') === '1');
      this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.loadSubscription?.unsubscribe();
    if (this.transitionSwapTimer) clearTimeout(this.transitionSwapTimer);
    if (this.transitionEndTimer) clearTimeout(this.transitionEndTimer);
  }

  load(id: number, sequentialTransition = false): void {
    const transitionStartedAt = performance.now();
    if (!sequentialTransition) this.loading.set(true);
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = forkJoin({
      project: this.projects.getById(id),
      tasks: this.events.getByFilter({ projectId: id }),
    }).subscribe({
      next: result => {
        const showResult = () => {
          this.project.set(result.project);
          this.recentItems.record('project', result.project.projectId).subscribe({ error: () => undefined });
          this.tasks.set(result.tasks);
          this.loading.set(false);
          if (sequentialTransition) {
            const tree = this.router.createUrlTree(['/projects', result.project.projectId], {
              queryParams: { listNav: 1 },
            });
            this.location.go(this.router.serializeUrl(tree));
            requestAnimationFrame(() => requestAnimationFrame(() => {
              this.transitionFadeOut.set(false);
              this.transitionEndTimer = setTimeout(
                () => this.projectTransitioning.set(false),
                this.transitionPhaseMs,
              );
            }));
          }
        };
        if (sequentialTransition) {
          const remainingFadeOut = Math.max(0, this.transitionPhaseMs - (performance.now() - transitionStartedAt));
          this.transitionSwapTimer = setTimeout(showResult, remainingFadeOut);
        } else {
          showResult();
        }
      },
      error: () => this.router.navigate(['/projects']),
    });
  }

  goBack(): void {
    const navigation = this.listNavigation();
    if (navigation) void this.router.navigateByUrl(navigation.listUrl);
    else this.location.back();
  }

  openPreviousProject(): void {
    const projectId = this.listNavigation()?.previousProjectId;
    if (projectId) this.openListProject(projectId);
  }

  openNextProject(): void {
    const projectId = this.listNavigation()?.nextProjectId;
    if (projectId) this.openListProject(projectId);
  }

  private openListProject(projectId: number): void {
    if (this.projectTransitioning()) return;
    this.projectTransitioning.set(true);
    this.transitionFadeOut.set(true);
    this.load(projectId, true);
  }

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
  edit(): void { const project=this.project(); if (!project) return; const ref=this.dialog.open(ProjectFormComponent,{data:{project},width:'620px',maxWidth:'94vw'}); ref.afterClosed().subscribe(saved=>{if(saved)this.load(project.projectId)}); }
  addTask(): void { const project=this.project(); if (!project)return; const ref=this.dialog.open(EventFormComponent,{data:{projectId:project.projectId},width:'720px',maxWidth:'94vw',maxHeight:'92vh',disableClose:true}); ref.afterClosed().subscribe(saved=>{if(saved)this.load(project.projectId)}); }
  viewTask(task: HomeEventDetail): void { this.router.navigate(['/events',task.eventId]); }
  canArchive(project: Project): boolean { return (project.activeTasks ?? 0) === 0; }
  archiveHint(project: Project): string { const remaining=project.activeTasks??0; return remaining ? `Complete ${remaining} remaining ${remaining===1?'task':'tasks'} before archiving` : 'Archive project'; }
  archive(): void { const project=this.project(); if(!project||!this.canArchive(project))return; this.appDialog.confirm({title:'Archive project?',message:`Archive “${project.title}”?`,detail:'It will be hidden from the default project list. Completed tasks, notes and documents will be retained.',icon:'archive',confirmText:'Archive project'}).subscribe(confirmed=>{if(confirmed)this.projects.archive(project.projectId).subscribe({next:()=>this.load(project.projectId),error:error=>this.appDialog.alert({title:'Project cannot be archived',message:error.error?.detail||'Complete all remaining tasks before archiving.',tone:'warning'}).subscribe()})}); }
  restore(): void { const project=this.project(); if(!project)return; this.appDialog.confirm({title:'Restore project?',message:`Restore “${project.title}” to Active?`,icon:'unarchive',confirmText:'Restore project'}).subscribe(confirmed=>{if(confirmed)this.projects.restore(project.projectId).subscribe(()=>this.load(project.projectId))}); }
}
