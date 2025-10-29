import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Subject, takeUntil } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationHistoryItem } from '../../../shared/models/notification.models';

@Component({
    selector: 'app-notification-history-dialog',
    standalone: true,
    imports: [SHARED_IMPORTS],
    template: `
    <div class="notification-history-dialog">
      <!-- Header with filters -->
      <div class="mb-4 p-4 border-b border-surface-200 dark:border-surface-700">
        <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold mb-1">Notification History</h3>
            <p class="text-sm text-surface-600 dark:text-surface-400">
              View all your recent notifications and their delivery status
            </p>
          </div>
          
          <div class="flex gap-2">
            <p-select
              [(ngModel)]="selectedChannel"
              [options]="channelOptions"
              placeholder="All Channels"
              [showClear]="true"
              (onChange)="filterHistory()"
              class="w-32"
            ></p-select>
            
            <p-select
              [(ngModel)]="selectedStatus"
              [options]="statusOptions"
              placeholder="All Status"
              [showClear]="true"
              (onChange)="filterHistory()"
              class="w-32"
            ></p-select>
          </div>
        </div>
      </div>

      <!-- History List -->
      <div class="notification-history-content" style="max-height: 500px; overflow-y: auto;">
        @if (loading()) {
          <div class="flex justify-center py-8">
            <p-progressSpinner [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
          </div>
        } @else if (filteredHistory().length === 0) {
          <div class="text-center py-8 text-surface-600 dark:text-surface-400">
            <i class="pi pi-bell-slash text-3xl mb-3"></i>
            <p class="text-lg font-medium mb-2">No notifications found</p>
            <p class="text-sm">
              @if (hasFilters()) {
                Try adjusting your filters to see more results
              } @else {
                You haven't received any notifications yet
              }
            </p>
          </div>
        } @else {
          <div class="space-y-3 p-4">
            @for (item of filteredHistory(); track item.id) {
              <div class="notification-item">
                <div class="flex items-start gap-4 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                  <!-- Status Icon -->
                  <div class="notification-status-icon">
                    @switch (item.status) {
                      @case ('delivered') {
                        <i class="pi pi-check-circle text-green-500 text-xl"></i>
                      }
                      @case ('failed') {
                        <i class="pi pi-times-circle text-red-500 text-xl"></i>
                      }
                      @case ('pending') {
                        <i class="pi pi-clock text-yellow-500 text-xl"></i>
                      }
                      @case ('sent') {
                        <i class="pi pi-send text-blue-500 text-xl"></i>
                      }
                      @default {
                        <i class="pi pi-circle text-surface-400 text-xl"></i>
                      }
                    }
                  </div>

                  <!-- Notification Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between mb-2">
                      <h4 class="font-semibold text-surface-900 dark:text-surface-0 truncate">
                        {{ item.subject }}
                      </h4>
                      <span class="text-xs text-surface-500 whitespace-nowrap ml-2">
                        {{ formatDetailedDate(item.sentAt) }}
                      </span>
                    </div>

                    <div class="flex items-center gap-3 mb-2">
                      <p-tag 
                        [value]="item.category" 
                        severity="info"
                        size="small"
                      ></p-tag>
                      
                      <p-tag 
                        [value]="item.channel" 
                        [severity]="item.channel === 'email' ? 'secondary' : 'success'"
                        size="small"
                      ></p-tag>
                      
                      <p-tag 
                        [value]="item.status" 
                        [severity]="getStatusSeverity(item.status)"
                        size="small"
                      ></p-tag>
                    </div>

                    @if (item.deliveredAt && item.status === 'delivered') {
                      <p class="text-xs text-surface-600 dark:text-surface-400">
                        <i class="pi pi-check text-green-500 mr-1"></i>
                        Delivered {{ formatDetailedDate(item.deliveredAt) }}
                      </p>
                    }

                    @if (item.errorMessage) {
                      <p class="text-xs text-red-500 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <i class="pi pi-exclamation-triangle mr-1"></i>
                        {{ item.errorMessage }}
                      </p>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center p-4 border-t border-surface-200 dark:border-surface-700">
        <p class="text-sm text-surface-600 dark:text-surface-400">
          Showing {{ filteredHistory().length }} of {{ allHistory().length }} notifications
        </p>
        
        <div class="flex gap-2">
          <p-button
            label="Refresh"
            icon="pi pi-refresh"
            [outlined]="true"
            size="small"
            [loading]="loading()"
            (onClick)="loadHistory()"
          ></p-button>
          
          <p-button
            label="Close"
            icon="pi pi-times"
            size="small"
            (onClick)="close()"
          ></p-button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }

    .notification-history-dialog {
      min-width: 600px;
      max-width: 800px;
    }

    .notification-item {
      transition: all 0.2s;
    }

    .notification-item:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-2);
    }

    .notification-status-icon {
      margin-top: 0.125rem;
    }

    @media (max-width: 768px) {
      .notification-history-dialog {
        min-width: 90vw;
      }
    }
  `]
})
export class NotificationHistoryDialogComponent implements OnInit, OnDestroy {
    private readonly notificationService = inject(NotificationService);
    private readonly dialogRef = inject(DynamicDialogRef);
    private readonly destroy$ = new Subject<void>();

    readonly loading = signal<boolean>(false);
    readonly allHistory = signal<NotificationHistoryItem[]>([]);
    readonly filteredHistory = signal<NotificationHistoryItem[]>([]);

    selectedChannel: string | null = null;
    selectedStatus: string | null = null;

    readonly channelOptions = [
        { label: 'Email', value: 'email' },
        { label: 'In-App', value: 'inApp' }
    ];

    readonly statusOptions = [
        { label: 'Delivered', value: 'delivered' },
        { label: 'Failed', value: 'failed' },
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' }
    ];

    ngOnInit(): void {
        this.loadHistory();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadHistory(): void {
        this.loading.set(true);

        this.notificationService.getNotificationHistory(100).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (history) => {
                this.allHistory.set(history);
                this.filterHistory();
                this.loading.set(false);
            },
            error: (error) => {
                this.notificationService.error('Failed to load notification history');
                this.loading.set(false);
            }
        });
    }

    filterHistory(): void {
        let filtered = this.allHistory();

        if (this.selectedChannel) {
            filtered = filtered.filter(item => item.channel === this.selectedChannel);
        }

        if (this.selectedStatus) {
            filtered = filtered.filter(item => item.status === this.selectedStatus);
        }

        this.filteredHistory.set(filtered);
    }

    hasFilters(): boolean {
        return !!(this.selectedChannel || this.selectedStatus);
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (status) {
            case 'delivered':
                return 'success';
            case 'failed':
                return 'danger';
            case 'pending':
                return 'warn';
            case 'sent':
                return 'info';
            default:
                return 'secondary';
        }
    }

    formatDetailedDate(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hours ago`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}