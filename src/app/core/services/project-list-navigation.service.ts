import { Injectable } from '@angular/core';

interface StoredProjectListNavigation {
  projectIds: number[];
  listUrl: string;
  savedAt: number;
}

export interface ProjectListPosition {
  index: number;
  total: number;
  previousProjectId?: number;
  nextProjectId?: number;
  listUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectListNavigationService {
  private readonly storageKey = 'homediary.project-list-navigation';
  private readonly maximumAgeMs = 8 * 60 * 60 * 1000;

  setContext(projectIds: number[], listUrl: string): void {
    const context: StoredProjectListNavigation = {
      projectIds: [...new Set(projectIds.filter(id => Number.isInteger(id) && id > 0))],
      listUrl,
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(context));
    } catch {
      // Navigation remains available until refresh if session storage is blocked.
    }
  }

  position(projectId: number): ProjectListPosition | null {
    const context = this.readContext();
    if (!context) return null;
    const index = context.projectIds.indexOf(projectId);
    if (index < 0) return null;
    return {
      index,
      total: context.projectIds.length,
      previousProjectId: index > 0 ? context.projectIds[index - 1] : undefined,
      nextProjectId: index < context.projectIds.length - 1 ? context.projectIds[index + 1] : undefined,
      listUrl: context.listUrl,
    };
  }

  private readContext(): StoredProjectListNavigation | null {
    try {
      const value = sessionStorage.getItem(this.storageKey);
      if (!value) return null;
      const parsed = JSON.parse(value) as Partial<StoredProjectListNavigation>;
      if (!Array.isArray(parsed.projectIds)
          || typeof parsed.listUrl !== 'string'
          || typeof parsed.savedAt !== 'number'
          || Date.now() - parsed.savedAt > this.maximumAgeMs) {
        sessionStorage.removeItem(this.storageKey);
        return null;
      }
      return parsed as StoredProjectListNavigation;
    } catch {
      return null;
    }
  }
}
