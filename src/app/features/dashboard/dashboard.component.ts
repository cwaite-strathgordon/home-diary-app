import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';

interface CalDay { d: number; other?: boolean; today?: boolean; event?: boolean; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatCheckboxModule, MatProgressBarModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  homeHealthScore = 92;

  tasks = [
    { title: 'Change HVAC Air Filter',   priority: 'High',   dueDate: 'May 24', done: false },
    { title: 'Inspect Smoke Detectors',  priority: 'High',   dueDate: 'May 25', done: false },
    { title: 'Clean Kitchen Range Hood', priority: 'Medium', dueDate: 'May 27', done: false },
    { title: 'Test Sprinkler System',    priority: 'Low',    dueDate: 'May 30', done: false },
    { title: 'Clean Gutters',            priority: 'Low',    dueDate: 'Jun 2',  done: false },
  ];

  maintenance = [
    { title: 'HVAC System Tune-up', frequency: 'Every 6 months',  nextDate: 'Jun 15, 2025', icon: 'ac_unit'      },
    { title: 'Water Heater Flush',  frequency: 'Every 12 months', nextDate: 'Jul 10, 2025', icon: 'water_drop'   },
    { title: 'Roof Inspection',     frequency: 'Every 12 months', nextDate: 'Aug 5, 2025',  icon: 'roofing'      },
    { title: 'Exterior Painting',   frequency: 'Every 5 years',   nextDate: 'Nov 1, 2025',  icon: 'format_paint' },
  ];

  recentActivity = [
    { icon: 'build',          bg: '#e8f4f4', color: '#2a7a7a', title: 'HVAC filter replaced',     date: 'May 18, 2025', user: 'Alex' },
    { icon: 'task_alt',       bg: '#fdf0e0', color: '#e07820', title: 'Added new task',            date: 'May 17, 2025', user: 'Alex' },
    { icon: 'folder',         bg: '#fdf0e0', color: '#e07820', title: 'Uploaded document',         date: 'May 16, 2025', user: 'Alex' },
    { icon: 'calendar_month', bg: '#e8f4f4', color: '#2a7a7a', title: 'Scheduled roof inspection', date: 'May 15, 2025', user: 'Alex' },
  ];

  quickActions = [
    { icon: 'add_circle',     label: 'Add Task',        link: '/events',      bg: '#2a7a7a' },
    { icon: 'build',          label: 'Log Maintenance', link: '/maintenance', bg: '#2a7a7a' },
    { icon: 'folder',         label: 'Add Document',    link: '/documents',   bg: '#e07820' },
    { icon: 'calendar_month', label: 'View Calendar',   link: '/calendar',    bg: '#e07820' },
  ];

  calendarWeeks: CalDay[][] = [
    [{ d: 27, other: true }, { d: 28, other: true }, { d: 29, other: true }, { d: 30, other: true },
     { d: 1 }, { d: 2 }, { d: 3 }],
    [{ d: 4 }, { d: 5 }, { d: 6 }, { d: 7 }, { d: 8 }, { d: 9 }, { d: 10 }],
    [{ d: 11 }, { d: 12 }, { d: 13 }, { d: 14 }, { d: 15 }, { d: 16 }, { d: 17 }],
    [{ d: 18 }, { d: 19 }, { d: 20 }, { d: 21 }, { d: 22, today: true }, { d: 23 }, { d: 24 }],
    [{ d: 25 }, { d: 26 }, { d: 27, event: true }, { d: 28 }, { d: 29 }, { d: 30 }, { d: 31 }],
  ];

  badgeClass(priority: string): string {
    const map: Record<string, string> = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
    return map[priority] ?? '';
  }
}
