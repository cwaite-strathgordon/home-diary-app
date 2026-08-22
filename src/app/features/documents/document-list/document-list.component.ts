import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { EventDocument } from '../../../core/models/event-document.model';
import { EventDocumentsService } from '../../../core/services/event-documents.service';

interface DocumentProject {
  projectId: number; title: string; documentCount: number; taskCount: number;
  latestDate: string; totalSize: number;
}
interface DocumentTask {
  eventId: number; title: string; projectId?: number; projectTitle?: string;
  documentCount: number; latestDate: string; totalSize: number;
}
type RootNode =
  | { key: string; kind: 'project'; title: string; location: string; latestDate: string; totalSize: number; project: DocumentProject }
  | { key: string; kind: 'task'; title: string; location: string; latestDate: string; totalSize: number; task: DocumentTask };
type SortField = 'name' | 'location' | 'date' | 'size';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-document-list', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatInputModule,
    MatFormFieldModule, MatProgressBarModule, MatSlideToggleModule],
  templateUrl: './document-list.component.html', styleUrl: './document-list.component.scss',
})
export class DocumentListComponent implements OnInit, OnDestroy {
  private readonly service = inject(EventDocumentsService);
  private readonly destroy$ = new Subject<void>();
  documents = signal<EventDocument[]>([]);
  loading = signal(true);
  error = signal('');
  flatView = signal(false);
  sortField = signal<SortField>('date');
  sortDirection = signal<SortDirection>('desc');
  expandedProjects = signal<Set<number>>(new Set());
  expandedTasks = signal<Set<number>>(new Set());
  searchControl = new FormControl('', { nonNullable: true });

  projects = computed<DocumentProject[]>(() => {
    const groups = new Map<number, { title: string; docs: number; tasks: Set<number>; latestDate: string; totalSize: number }>();
    for (const document of this.documents()) {
      if (!document.projectId) continue;
      const group = groups.get(document.projectId) ?? { title: document.projectTitle || 'Untitled project', docs: 0, tasks: new Set<number>(), latestDate: '', totalSize: 0 };
      group.docs++; group.tasks.add(document.eventId); group.totalSize += document.fileSize;
      if (document.createdDate > group.latestDate) group.latestDate = document.createdDate;
      groups.set(document.projectId, group);
    }
    return this.sortItems([...groups.entries()].map(([projectId, value]) => ({
      projectId, title: value.title, documentCount: value.docs, taskCount: value.tasks.size,
      latestDate: value.latestDate, totalSize: value.totalSize,
    })), item => item.title, item => item.title, item => item.latestDate, item => item.totalSize);
  });

  adHocTasks = computed(() => this.buildTasks(this.documents().filter(document => !document.projectId)));
  rootNodes = computed<RootNode[]>(() => this.sortItems([
    ...this.projects().map(project => ({ key: `project-${project.projectId}`, kind: 'project' as const,
      title: project.title, location: 'Project', latestDate: project.latestDate, totalSize: project.totalSize, project })),
    ...this.adHocTasks().map(task => ({ key: `task-${task.eventId}`, kind: 'task' as const,
      title: task.title, location: 'Ad-hoc task', latestDate: task.latestDate, totalSize: task.totalSize, task })),
  ], item => item.title, item => item.location, item => item.latestDate, item => item.totalSize));
  sortedDocuments = computed(() => this.sortDocumentList(this.documents()));

  ngOnInit(): void {
    this.loadAll();
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(query => query.trim() ? this.search(query.trim()) : this.loadAll(false));
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  setFlatView(flat: boolean): void { this.flatView.set(flat); }
  toggleProject(projectId: number): void { this.toggleSet(this.expandedProjects, projectId); }
  toggleTask(eventId: number): void { this.toggleSet(this.expandedTasks, eventId); }
  isProjectExpanded(projectId: number): boolean { return this.expandedProjects().has(projectId); }
  isTaskExpanded(eventId: number): boolean { return this.expandedTasks().has(eventId); }
  projectTasks(projectId: number): DocumentTask[] { return this.buildTasks(this.documents().filter(document => document.projectId === projectId)); }
  taskDocuments(eventId: number): EventDocument[] { return this.sortDocumentList(this.documents().filter(document => document.eventId === eventId)); }

  setSort(field: SortField): void {
    if (this.sortField() === field) this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
    else { this.sortField.set(field); this.sortDirection.set(field === 'date' ? 'desc' : 'asc'); }
  }
  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'unfold_more';
    return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  openDocument(document: EventDocument): void {
    this.service.download(document.eventDocumentId).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }
  fileIcon(document: EventDocument): string {
    const extension = document.fileName.split('.').pop()?.toLowerCase();
    return extension === 'pdf' ? 'picture_as_pdf' : extension === 'docx' ? 'description' : 'draft';
  }
  fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private loadAll(resetError = true): void {
    this.loading.set(true); if (resetError) this.error.set('');
    this.service.getAll().subscribe({
      next: documents => { this.documents.set(documents); this.loading.set(false); },
      error: () => { this.error.set('Documents could not be loaded.'); this.loading.set(false); },
    });
  }
  private search(query: string): void {
    this.loading.set(true); this.error.set('');
    this.service.search(query).subscribe({
      next: documents => {
        this.documents.set(documents);
        this.expandedProjects.set(new Set(documents.flatMap(document => document.projectId ? [document.projectId] : [])));
        this.expandedTasks.set(new Set(documents.map(document => document.eventId)));
        this.loading.set(false);
      },
      error: () => { this.error.set('Document search could not be completed.'); this.loading.set(false); },
    });
  }
  private buildTasks(documents: EventDocument[]): DocumentTask[] {
    const groups = new Map<number, DocumentTask>();
    for (const document of documents) {
      const task = groups.get(document.eventId) ?? {
        eventId: document.eventId, title: document.eventTitle || 'Untitled task',
        projectId: document.projectId, projectTitle: document.projectTitle,
        documentCount: 0, latestDate: '', totalSize: 0,
      };
      task.documentCount++; task.totalSize += document.fileSize;
      if (document.createdDate > task.latestDate) task.latestDate = document.createdDate;
      groups.set(document.eventId, task);
    }
    return this.sortItems([...groups.values()], item => item.title, item => item.projectTitle || 'Ad-hoc task', item => item.latestDate, item => item.totalSize);
  }
  private sortDocumentList(documents: EventDocument[]): EventDocument[] {
    return this.sortItems([...documents], item => item.fileName, item => `${item.projectTitle || 'Ad-hoc'} ${item.eventTitle || ''}`, item => item.createdDate, item => item.fileSize);
  }
  private sortItems<T>(items: T[], name: (item: T) => string, location: (item: T) => string,
    date: (item: T) => string, size: (item: T) => number): T[] {
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    const field = this.sortField();
    return items.sort((left, right) => {
      const result = field === 'size' ? size(left) - size(right)
        : field === 'date' ? date(left).localeCompare(date(right))
        : field === 'location' ? location(left).localeCompare(location(right))
        : name(left).localeCompare(name(right));
      return result * direction || name(left).localeCompare(name(right));
    });
  }
  private toggleSet(target: { (): Set<number>; set(value: Set<number>): void }, id: number): void {
    const next = new Set(target());
    next.has(id) ? next.delete(id) : next.add(id);
    target.set(next);
  }
}
