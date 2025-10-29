import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import { SHARED_IMPORTS } from '../../../shared';
import { NotificationService } from '../../../core/services/notification.service';
import {
  NotificationPreferences,
  NotificationCategory,
  NotificationTestRequest,
  NotificationHistoryItem,
  DigestFrequency
} from '../../../shared/models/notification.models';
import { NotificationHistoryDialogComponent } from './notification-history-dialog.component';

@Component({
  selector: 'app-notification-tab',
  standalone: true,
  imports: [SHARED_IMPORTS, NotificationHistoryDialogComponent],
  template: `
    <div class="notification-preferences-container">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">
          Notification Preferences
        </h2>
        <p class="text-surface-600 dark:text-surface-400">
          Customize how and when you receive notifications from NeoVerify
        </p>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Main Preferences -->
        <div class="xl:col-span-2 space-y-6">
          <!-- Notification Categories -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h3 class="text-lg font-semibold">Notification Categories</h3>
                <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                  Choose which notifications you want to receive via email and in-app
                </p>
              </div>
            </ng-template>

            <form [formGroup]="preferencesForm" class="space-y-6">
              @for (category of notificationCategories; track category.id) {
                <div class="notification-category">
                  <div class="flex items-start gap-3 mb-4">
                    <i [class]="category.icon" class="text-xl text-primary-500 mt-1"></i>
                    <div class="flex-1">
                      <h4 class="font-semibold text-surface-900 dark:text-surface-0">
                        {{ category.label }}
                      </h4>
                      <p class="text-sm text-surface-600 dark:text-surface-400 mb-3">
                        {{ category.description }}
                      </p>
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Email Toggle -->
                        <div class="flex items-center justify-between p-3 border border-surface-200 dark:border-surface-700 rounded-lg">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-envelope text-surface-600"></i>
                            <span class="text-sm font-medium">Email</span>
                          </div>
                          <p-toggleSwitch
                            [formControlName]="'email.' + category.emailKey"
                            [disabled]="updating()"
                          ></p-toggleSwitch>
                        </div>

                        <!-- In-App Toggle -->
                        <div class="flex items-center justify-between p-3 border border-surface-200 dark:border-surface-700 rounded-lg">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-bell text-surface-600"></i>
                            <span class="text-sm font-medium">In-App</span>
                          </div>
                          <p-toggleSwitch
                            [formControlName]="'inApp.' + category.inAppKey"
                            [disabled]="updating()"
                          ></p-toggleSwitch>
                        </div>
                      </div>

                      <!-- Test Notification Buttons -->
                      <div class="flex gap-2 mt-3">
                        <p-button
                          label="Test Email"
                          icon="pi pi-envelope"
                          size="small"
                          [outlined]="true"
                          severity="secondary"
                          [loading]="testingNotification() === category.id + '_email'"
                          [disabled]="!getEmailEnabled(category.emailKey) || updating()"
                          (onClick)="testNotification(category.id, 'email')"
                        ></p-button>
                        <p-button
                          label="Test In-App"
                          icon="pi pi-bell"
                          size="small"
                          [outlined]="true"
                          severity="secondary"
                          [loading]="testingNotification() === category.id + '_inApp'"
                          [disabled]="!getInAppEnabled(category.inAppKey) || updating()"
                          (onClick)="testNotification(category.id, 'inApp')"
                        ></p-button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </form>
          </p-card>

          <!-- Digest and Quiet Hours Settings -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h3 class="text-lg font-semibold">Delivery Settings</h3>
                <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                  Configure when and how often you receive notifications
                </p>
              </div>
            </ng-template>

            <div class="space-y-6">
              <!-- Digest Frequency -->
              <div>
                <label class="block text-sm font-medium mb-3">Email Digest Frequency</label>
                <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
                  Receive a summary of your notifications at regular intervals
                </p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  @for (frequency of digestFrequencies; track frequency.value) {
                    <div 
                      class="digest-option"
                      [class.selected]="preferencesForm.get('digestFrequency')?.value === frequency.value"
                      (click)="selectDigestFrequency(frequency.value)"
                    >
                      <i [class]="frequency.icon" class="text-lg mb-2"></i>
                      <span class="text-sm font-medium">{{ frequency.label }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Quiet Hours -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <label class="block text-sm font-medium">Quiet Hours</label>
                    <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                      Pause non-urgent notifications during specific hours
                    </p>
                  </div>
                  <p-toggleSwitch
                    formControlName="quietHours.enabled"
                    [disabled]="updating()"
                  ></p-toggleSwitch>
                </div>

                @if (preferencesForm.get('quietHours.enabled')?.value) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <div>
                      <label class="block text-sm font-medium mb-2">Start Time</label>
                      <input
                        type="time"
                        pInputText
                        formControlName="quietHours.start"
                        class="w-full"
                        [disabled]="updating()"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-2">End Time</label>
                      <input
                        type="time"
                        pInputText
                        formControlName="quietHours.end"
                        class="w-full"
                        [disabled]="updating()"
                      />
                    </div>
                  </div>
                }
              </div>
            </div>
          </p-card>

          <!-- Save Button -->
          <div class="flex justify-end">
            <p-button
              label="Save Preferences"
              icon="pi pi-save"
              [loading]="updating()"
              [disabled]="preferencesForm.invalid || !hasChanges()"
              (onClick)="savePreferences()"
            ></p-button>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Quick Actions -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h3 class="text-lg font-semibold">Quick Actions</h3>
              </div>
            </ng-template>

            <div class="space-y-3">
              <p-button
                label="Enable All Email"
                icon="pi pi-envelope"
                [outlined]="true"
                size="small"
                class="w-full"
                [disabled]="updating()"
                (onClick)="enableAllEmail()"
              ></p-button>
              <p-button
                label="Disable All Email"
                icon="pi pi-envelope"
                [outlined]="true"
                severity="secondary"
                size="small"
                class="w-full"
                [disabled]="updating()"
                (onClick)="disableAllEmail()"
              ></p-button>
              <p-button
                label="Reset to Defaults"
                icon="pi pi-refresh"
                [outlined]="true"
                severity="warn"
                size="small"
                class="w-full"
                [disabled]="updating()"
                (onClick)="resetToDefaults()"
              ></p-button>
            </div>
          </p-card>

          <!-- Notification History -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h3 class="text-lg font-semibold">Recent Notifications</h3>
              </div>
            </ng-template>

            @if (loadingHistory()) {
              <div class="flex justify-center py-4">
                <p-progressSpinner [style]="{ width: '30px', height: '30px' }"></p-progressSpinner>
              </div>
            } @else if (notificationHistory().length === 0) {
              <div class="text-center py-6 text-surface-600 dark:text-surface-400">
                <i class="pi pi-bell-slash text-2xl mb-2"></i>
                <p class="text-sm">No recent notifications</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (item of notificationHistory().slice(0, 5); track item.id) {
                  <div class="notification-history-item">
                    <div class="flex items-start gap-3">
                      <div class="notification-status">
                        @switch (item.status) {
                          @case ('delivered') {
                            <i class="pi pi-check-circle text-green-500"></i>
                          }
                          @case ('failed') {
                            <i class="pi pi-times-circle text-red-500"></i>
                          }
                          @case ('pending') {
                            <i class="pi pi-clock text-yellow-500"></i>
                          }
                          @default {
                            <i class="pi pi-circle text-surface-400"></i>
                          }
                        }
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-surface-900 dark:text-surface-0 truncate">
                          {{ item.subject }}
                        </p>
                        <div class="flex items-center gap-2 mt-1">
                          <p-tag 
                            [value]="item.channel" 
                            [severity]="item.channel === 'email' ? 'info' : 'success'"
                            size="small"
                          ></p-tag>
                          <span class="text-xs text-surface-500">
                            {{ formatDate(item.sentAt) }}
                          </span>
                        </div>
                        @if (item.errorMessage) {
                          <p class="text-xs text-red-500 mt-1">{{ item.errorMessage }}</p>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            <ng-template pTemplate="footer">
              <p-button
                label="View All History"
                icon="pi pi-external-link"
                [text]="true"
                size="small"
                class="w-full"
                (onClick)="viewFullHistory()"
              ></p-button>
            </ng-template>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .notification-category {
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--surface-200);
    }

    .notification-category:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .digest-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      border: 2px solid var(--surface-200);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .digest-option:hover {
      border-color: var(--primary-color);
      background: var(--primary-50);
    }

    .digest-option.selected {
      border-color: var(--primary-color);
      background: var(--primary-color);
      color: var(--primary-color-text);
    }

    .notification-history-item {
      padding: 0.75rem;
      border: 1px solid var(--surface-200);
      border-radius: var(--border-radius);
      background: var(--surface-50);
    }

    .notification-status {
      margin-top: 0.125rem;
    }

    /* Dark mode adjustments */
    :host-context(.dark) .digest-option {
      border-color: var(--surface-700);
    }

    :host-context(.dark) .digest-option:hover {
      background: var(--primary-900);
    }

    :host-context(.dark) .notification-history-item {
      border-color: var(--surface-700);
      background: var(--surface-800);
    }
  `]
})
export class NotificationTabComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(DialogService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = signal<boolean>(false);
  readonly updating = signal<boolean>(false);
  readonly loadingHistory = signal<boolean>(false);
  readonly testingNotification = signal<string | null>(null);
  readonly notificationHistory = signal<NotificationHistoryItem[]>([]);

  readonly notificationCategories = this.notificationService.notificationCategories;

  readonly digestFrequencies = [
    { value: 'never' as DigestFrequency, label: 'Never', icon: 'pi pi-ban' },
    { value: 'daily' as DigestFrequency, label: 'Daily', icon: 'pi pi-calendar' },
    { value: 'weekly' as DigestFrequency, label: 'Weekly', icon: 'pi pi-calendar-plus' },
    { value: 'monthly' as DigestFrequency, label: 'Monthly', icon: 'pi pi-calendar-times' }
  ];

  readonly preferencesForm = this.fb.group({
    email: this.fb.group({
      documentVerified: [true],
      documentExpiring: [true],
      organizationUpdates: [false],
      securityAlerts: [true],
      weeklyDigest: [true]
    }),
    inApp: this.fb.group({
      documentVerified: [true],
      documentExpiring: [true],
      organizationUpdates: [true],
      securityAlerts: [true]
    }),
    digestFrequency: ['weekly' as DigestFrequency, Validators.required],
    quietHours: this.fb.group({
      enabled: [false],
      start: ['22:00', Validators.required],
      end: ['08:00', Validators.required],
      timezone: [Intl.DateTimeFormat().resolvedOptions().timeZone, Validators.required]
    })
  });

  private initialFormValue: any = null;

  ngOnInit(): void {
    this.loadPreferences();
    this.loadNotificationHistory();
    this.setupFormChangeTracking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPreferences(): void {
    this.loading.set(true);

    this.notificationService.getPreferences().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (preferences) => {
        this.preferencesForm.patchValue(preferences);
        this.initialFormValue = this.preferencesForm.value;
        this.loading.set(false);
      },
      error: (error) => {
        this.notificationService.error('Failed to load notification preferences');
        this.loading.set(false);
      }
    });
  }

  private loadNotificationHistory(): void {
    this.loadingHistory.set(true);

    this.notificationService.getNotificationHistory(10).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (history) => {
        this.notificationHistory.set(history);
        this.loadingHistory.set(false);
      },
      error: (error) => {
        this.loadingHistory.set(false);
      }
    });
  }

  private setupFormChangeTracking(): void {
    this.preferencesForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Form change tracking for hasChanges() method
    });
  }

  savePreferences(): void {
    if (this.preferencesForm.invalid) {
      this.notificationService.warn('Please fix the validation errors before saving');
      return;
    }

    // Validate quiet hours if enabled
    const quietHours = this.preferencesForm.get('quietHours');
    if (quietHours?.get('enabled')?.value) {
      const start = quietHours.get('start')?.value;
      const end = quietHours.get('end')?.value;

      if (!start || !end) {
        this.notificationService.warn('Please set both start and end times for quiet hours');
        return;
      }
    }

    this.updating.set(true);
    const preferences = this.preferencesForm.value as NotificationPreferences;

    this.notificationService.updatePreferences({ preferences }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.updating.set(false);
        if (response.success) {
          this.notificationService.success('Notification preferences saved successfully');
          this.initialFormValue = this.preferencesForm.value;
        } else {
          this.notificationService.error(response.message);
        }
      },
      error: (error) => {
        this.updating.set(false);
        this.notificationService.error('Failed to save notification preferences');
      }
    });
  }

  testNotification(categoryId: string, channel: 'email' | 'inApp'): void {
    // Validate that the notification type is enabled before testing
    const isEnabled = channel === 'email'
      ? this.getEmailEnabled(categoryId)
      : this.getInAppEnabled(categoryId);

    if (!isEnabled) {
      this.notificationService.warn(`Please enable ${channel} notifications for this category first`);
      return;
    }

    const testKey = `${categoryId}_${channel}`;
    this.testingNotification.set(testKey);

    const request: NotificationTestRequest = {
      category: categoryId as keyof NotificationPreferences['email'],
      channel
    };

    this.notificationService.testNotification(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.testingNotification.set(null);
        if (response.success) {
          this.notificationService.success(response.message);
          // Refresh notification history to show the test notification
          this.loadNotificationHistory();
        } else {
          this.notificationService.error(response.message);
        }
      },
      error: (error) => {
        this.testingNotification.set(null);
        this.notificationService.error('Failed to send test notification');
      }
    });
  }

  selectDigestFrequency(frequency: DigestFrequency): void {
    this.preferencesForm.patchValue({ digestFrequency: frequency });
  }

  enableAllEmail(): void {
    const emailGroup = this.preferencesForm.get('email');
    if (emailGroup) {
      Object.keys(emailGroup.controls).forEach(key => {
        emailGroup.get(key)?.setValue(true);
      });
    }
  }

  disableAllEmail(): void {
    const emailGroup = this.preferencesForm.get('email');
    if (emailGroup) {
      Object.keys(emailGroup.controls).forEach(key => {
        emailGroup.get(key)?.setValue(false);
      });
    }
  }

  resetToDefaults(): void {
    this.preferencesForm.reset();
    this.loadPreferences();
  }

  viewFullHistory(): void {
    const dialogRef = this.dialogService.open(NotificationHistoryDialogComponent, {
      header: 'Notification History',
      width: '90vw',
      maxWidth: '800px',
      modal: true,
      closable: true,
      dismissableMask: true
    });

    dialogRef.onClose.subscribe(() => {
      // Refresh the recent history when dialog closes
      this.loadNotificationHistory();
    });
  }

  hasChanges(): boolean {
    return JSON.stringify(this.preferencesForm.value) !== JSON.stringify(this.initialFormValue);
  }

  getEmailEnabled(key: string): boolean {
    return this.preferencesForm.get(`email.${key}`)?.value || false;
  }

  getInAppEnabled(key: string): boolean {
    return this.preferencesForm.get(`inApp.${key}`)?.value || false;
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}