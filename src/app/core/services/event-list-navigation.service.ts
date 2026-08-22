import { Injectable } from '@angular/core';

interface StoredEventListNavigation {
  eventIds: number[];
  listUrl: string;
  savedAt: number;
}

export interface EventListPosition {
  index: number;
  total: number;
  previousEventId?: number;
  nextEventId?: number;
  listUrl: string;
}

@Injectable({ providedIn: 'root' })
export class EventListNavigationService {
  private readonly storageKey = 'homediary.event-list-navigation';
  private readonly maximumAgeMs = 8 * 60 * 60 * 1000;

  setContext(eventIds: number[], listUrl: string): void {
    const context: StoredEventListNavigation = {
      eventIds: [...new Set(eventIds.filter(id => Number.isInteger(id) && id > 0))],
      listUrl,
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(context));
    } catch {
      // Navigation still works; only refresh persistence is unavailable.
    }
  }

  position(eventId: number): EventListPosition | null {
    const context = this.readContext();
    if (!context) return null;
    const index = context.eventIds.indexOf(eventId);
    if (index < 0) return null;
    return {
      index,
      total: context.eventIds.length,
      previousEventId: index > 0 ? context.eventIds[index - 1] : undefined,
      nextEventId: index < context.eventIds.length - 1 ? context.eventIds[index + 1] : undefined,
      listUrl: context.listUrl,
    };
  }

  private readContext(): StoredEventListNavigation | null {
    try {
      const value = sessionStorage.getItem(this.storageKey);
      if (!value) return null;
      const parsed = JSON.parse(value) as Partial<StoredEventListNavigation>;
      if (!Array.isArray(parsed.eventIds)
          || typeof parsed.listUrl !== 'string'
          || typeof parsed.savedAt !== 'number'
          || Date.now() - parsed.savedAt > this.maximumAgeMs) {
        sessionStorage.removeItem(this.storageKey);
        return null;
      }
      return parsed as StoredEventListNavigation;
    } catch {
      return null;
    }
  }
}
