import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { delay, catchError, tap } from 'rxjs/operators';
import {
  NotificationPreferences,
  NotificationTestRequest,
  NotificationTestResponse,
  NotificationHistoryItem,
  NotificationPreferencesUpdateRequest,
  NotificationPreferencesResponse,
  NotificationCategory
} from '../../shared/models/notification.models';

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
  private readonly http = inject(HttpClient);

  private readonly preferencesSubject = new BehaviorSubject<NotificationPreferences | null>(null);
  readonly preferences$ = this.preferencesSubject.asObservable();

  // Default notification categories
  readonly notificationCategories: NotificationCategory[] = [
    {
      id: 'documentVerified',
      label: 'Document Verification',
      description: 'Notifications when document verification is completed',
      icon: 'pi pi-check-circle',
      emailKey: 'documentVerified',
      inAppKey: 'documentVerified'
    },
    {
      id: 'documentExpiring',
      label: 'Document Expiration',
      description: 'Alerts when documents are about to expire',
      icon: 'pi pi-clock',
      emailKey: 'documentExpiring',
      inAppKey: 'documentExpiring'
    },
    {
      id: 'organizationUpdates',
      label: 'Organization Updates',
      description: 'Updates about your organization and team changes',
      icon: 'pi pi-building',
      emailKey: 'organizationUpdates',
      inAppKey: 'organizationUpdates'
    },
    {
      id: 'securityAlerts',
      label: 'Security Alerts',
      description: 'Important security notifications and alerts',
      icon: 'pi pi-shield',
      emailKey: 'securityAlerts',
      inAppKey: 'securityAlerts'
    }
  ];

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

  /**
   * Get user notification preferences
   */
  getPreferences(): Observable<NotificationPreferences> {
    // Mock API call - replace with actual endpoint
    const mockPreferences: NotificationPreferences = {
      email: {
        documentVerified: true,
        documentExpiring: true,
        organizationUpdates: false,
        securityAlerts: true,
        weeklyDigest: true
      },
      inApp: {
        documentVerified: true,
        documentExpiring: true,
        organizationUpdates: true,
        securityAlerts: true
      },
      digestFrequency: 'weekly',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    return of(mockPreferences).pipe(
      delay(500),
      tap(preferences => this.preferencesSubject.next(preferences)),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Update notification preferences
   */
  updatePreferences(request: NotificationPreferencesUpdateRequest): Observable<NotificationPreferencesResponse> {
    // Mock API call - replace with actual endpoint
    return of({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: request.preferences
    }).pipe(
      delay(800),
      tap(response => {
        if (response.success && response.preferences) {
          this.preferencesSubject.next(response.preferences);
        }
      }),
      catchError(error => throwError(() => ({
        success: false,
        message: error.message || 'Failed to update notification preferences'
      })))
    );
  }

  /**
   * Test notification for a specific category
   */
  testNotification(request: NotificationTestRequest): Observable<NotificationTestResponse> {
    // Mock API call - replace with actual endpoint
    const category = this.notificationCategories.find(cat => cat.id === request.category);

    return of({
      success: true,
      message: `Test ${request.channel} notification sent for ${category?.label || request.category}`,
      testId: `test_${Date.now()}`
    }).pipe(
      delay(1000),
      tap(response => {
        if (response.success && request.channel === 'inApp') {
          // Show the test notification in-app
          this.info(`Test notification: ${category?.label || request.category}`, 'Test Notification');
        }
      }),
      catchError(error => throwError(() => ({
        success: false,
        message: error.message || 'Failed to send test notification'
      })))
    );
  }

  /**
   * Get notification history
   */
  getNotificationHistory(limit = 50): Observable<NotificationHistoryItem[]> {
    // Mock API call - replace with actual endpoint
    const mockHistory: NotificationHistoryItem[] = [
      {
        id: '1',
        category: 'Document Verification',
        channel: 'email',
        status: 'delivered',
        subject: 'Document verification completed',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000) // 30 seconds later
      },
      {
        id: '2',
        category: 'Security Alerts',
        channel: 'inApp',
        status: 'delivered',
        subject: 'New login detected',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1000) // 1 second later
      },
      {
        id: '3',
        category: 'Document Expiration',
        channel: 'email',
        status: 'failed',
        subject: 'Document expiring soon',
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        errorMessage: 'Email delivery failed - invalid address'
      }
    ];

    return of(mockHistory.slice(0, limit)).pipe(
      delay(300),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get current preferences from cache
   */
  getCurrentPreferences(): NotificationPreferences | null {
    return this.preferencesSubject.value;
  }
}