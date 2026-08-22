export interface Project {
  projectId: number;
  title: string;
  description?: string;
  areaId?: number | null;
  areaTitle?: string;
  startDate?: string;
  targetCompletionDate?: string;
  createdDate?: string;
  createdById?: number;
  updatedDate?: string;
  status: 'Wish List' | 'Active' | 'On Hold' | 'Archived';
  archivedDate?: string;
  totalTasks?: number;
  activeTasks?: number;
  completedTasks?: number;
  overdueTasks?: number;
}
