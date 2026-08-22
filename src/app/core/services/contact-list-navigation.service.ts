import { Injectable } from '@angular/core';

interface StoredContactListNavigation {
  contactIds: number[];
  listUrl: string;
  savedAt: number;
}

export interface ContactListPosition {
  index: number;
  total: number;
  previousContactId?: number;
  nextContactId?: number;
  listUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ContactListNavigationService {
  private readonly storageKey = 'homediary.contact-list-navigation';
  private readonly maximumAgeMs = 8 * 60 * 60 * 1000;

  setContext(contactIds: number[], listUrl: string): void {
    const context: StoredContactListNavigation = {
      contactIds: [...new Set(contactIds.filter(id => Number.isInteger(id) && id > 0))],
      listUrl,
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(context));
    } catch {
      // Navigation remains available until refresh if session storage is blocked.
    }
  }

  position(contactId: number): ContactListPosition | null {
    const context = this.readContext();
    if (!context) return null;
    const index = context.contactIds.indexOf(contactId);
    if (index < 0) return null;
    return {
      index,
      total: context.contactIds.length,
      previousContactId: index > 0 ? context.contactIds[index - 1] : undefined,
      nextContactId: index < context.contactIds.length - 1 ? context.contactIds[index + 1] : undefined,
      listUrl: context.listUrl,
    };
  }

  private readContext(): StoredContactListNavigation | null {
    try {
      const value = sessionStorage.getItem(this.storageKey);
      if (!value) return null;
      const parsed = JSON.parse(value) as Partial<StoredContactListNavigation>;
      if (!Array.isArray(parsed.contactIds)
          || typeof parsed.listUrl !== 'string'
          || typeof parsed.savedAt !== 'number'
          || Date.now() - parsed.savedAt > this.maximumAgeMs) {
        sessionStorage.removeItem(this.storageKey);
        return null;
      }
      return parsed as StoredContactListNavigation;
    } catch {
      return null;
    }
  }
}
