import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type AppMessageTone = 'info' | 'warning' | 'danger' | 'success';

export interface AppMessageDialogData {
  title: string;
  message: string;
  detail?: string;
  icon?: string;
  tone: AppMessageTone;
  confirmText: string;
  cancelText?: string;
  showCancel: boolean;
}

@Component({
  selector: 'app-message-dialog', standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './app-message-dialog.component.html',
  styleUrl: './app-message-dialog.component.scss',
})
export class AppMessageDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: AppMessageDialogData) {}
}
