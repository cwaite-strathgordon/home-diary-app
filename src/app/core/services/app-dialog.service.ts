import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { AppMessageDialogComponent, AppMessageTone } from '../../shared/app-message-dialog/app-message-dialog.component';

export interface AppDialogOptions {
  title: string;
  message: string;
  detail?: string;
  icon?: string;
  tone?: AppMessageTone;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({ providedIn: 'root' })
export class AppDialogService {
  private readonly dialog = inject(MatDialog);

  confirm(options: AppDialogOptions): Observable<boolean> {
    return this.open(options, true).pipe(map(result => result === true));
  }

  alert(options: AppDialogOptions): Observable<void> {
    return this.open({ ...options, confirmText: options.confirmText || 'OK' }, false).pipe(map(() => undefined));
  }

  private open(options: AppDialogOptions, showCancel: boolean): Observable<boolean | undefined> {
    const tone = options.tone || 'info';
    return this.dialog.open(AppMessageDialogComponent, {
      data: {
        ...options, tone, showCancel,
        icon: options.icon || this.defaultIcon(tone),
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
      },
      width: '500px', maxWidth: '92vw', autoFocus: false, restoreFocus: true,
      panelClass: 'app-message-dialog-panel',
    }).afterClosed();
  }

  private defaultIcon(tone: AppMessageTone): string {
    return tone === 'danger' ? 'delete_outline' : tone === 'warning' ? 'warning_amber'
      : tone === 'success' ? 'check_circle_outline' : 'info_outline';
  }
}
