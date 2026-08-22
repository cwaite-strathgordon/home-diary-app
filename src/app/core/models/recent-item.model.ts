export type RecentItemType = 'task' | 'project' | 'contact';

export interface RecentItem {
  recentItemViewId: number;
  itemType: RecentItemType;
  itemId: number;
  title: string;
  viewedAt: string;
}

export interface ApplicationSettings {
  recentItemsLimit: number;
}
