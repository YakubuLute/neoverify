import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

export type NotificationType = 'success' | 'info' | 'warn' | 'error';

export interface NotificationConfig {
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
  sticky?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly messageService = inject(MessageService);

  /**
   * Show a success notification
   */
  success(message: string, title = 'Success', duration = 5000): void {
    this.show({
      type: 'success',
      title,
      message,
      duration
    });
  }

  /**
   * Show an error notification
   */
  error(message: string, title = 'Error', sticky = true): void {
    this.show({
      type: 'error',
      title,
      message,
      sticky
    });
  }

  /**
   * Show an info notification
   */
  info(message: string, title = 'Information', duration = 5000): void {
    this.show({
      type: 'info',
      title,
      message,
      duration
    });
  }

  /**
   * Show a warning notification
   */
  warn(message: string, title = 'Warning', duration = 7000): void {
    this.show({
      type: 'warn',
      title,
      message,
      duration
    });
  }

  /**
   * Show a custom notification
   */
  show(config: NotificationConfig): void {
    this.messageService.add({
      severity: config.type,
      summary: config.title,
      detail: config.message,
      life: config.sticky ? undefined : config.duration,
      sticky: config.sticky
    });
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.messageService.clear();
  }
}