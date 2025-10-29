import { Component, Input, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { DocumentStatusService } from '../../../core/services/document-status.service';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import {
    DocumentStatusHistory,
    StatusTrigger,
    DocumentStatus
} from '../../models/document.models';

@Component({
    selector: 'app-status-history',
    standalone: true,
    imports: [
        CommonModule,
        TimelineModule,
        CardModule,
        ButtonModule,
        TooltipModule,
        StatusBadgeComponent
    ],
    template: `
    <div class="status-history">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Status History
        </h3>
        <p-button
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          [outlined]="true"
          (onClick)="refreshHistory()"
          pTooltip="Refresh History"
          tooltipPosition="top"
        ></p-button>
      </div>

      <div *ngIf="loading" class="flex justify-center py-8">
        <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
      </div>

      <div *ngIf="!loading && statusHistory().length === 0" class="text-center py-8">
        <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400">No status history available</p>
      </div>

      <p-timeline 
        *ngIf="!loading && statusHistory().length > 0"
        [value]="statusHistory()" 
        layout="vertical"
        align="left"
      >
        <ng-template pTemplate="marker" let-event>
          <div class="timeline-marker" [class]="getMarkerClass(event)">
            <i [class]="getMarkerIcon(event)"></i>
          </div>
        </ng-template>

        <ng-template pTemplate="content" let-event>
          <div class="timeline-content">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-3">
                <app-status-badge
                  [status]="event.newStatus"
                  type="document"
                  size="sm"
                ></app-status-badge>
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ getStatusChangeText(event) }}
                </span>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatTimestamp(event.timestamp) }}
              </span>
            </div>

            <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <div class="flex items-center gap-2 mb-1">
                <i [class]="getTriggerIcon(event.triggeredBy)"></i>
                <span>{{ getTriggerText(event.triggeredBy) }}</span>
                <span *ngIf="event.userEmail" class="text-xs">
                  by {{ event.userEmail }}
                </span>
              </div>
            </div>

            <div *ngIf="event.reason" class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>Reason:</strong> {{ event.reason }}
            </div>

            <div *ngIf="event.metadata && hasMetadata(event.metadata)" class="metadata-section">
              <button 
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                (click)="toggleMetadata(event.id)"
              >
                {{ isMetadataExpanded(event.id) ? 'Hide' : 'Show' }} Details
              </button>
              
              <div *ngIf="isMetadataExpanded(event.id)" class="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                <div *ngFor="let item of getMetadataEntries(event.metadata)" class="flex justify-between py-1">
                  <span class="font-medium">{{ item.key }}:</span>
                  <span>{{ item.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </ng-template>
      </p-timeline>

      <!-- Load More Button -->
      <div *ngIf="hasMore" class="text-center mt-6">
        <p-button
          label="Load More"
          icon="pi pi-chevron-down"
          severity="secondary"
          [outlined]="true"
          (onClick)="loadMore()"
          [loading]="loadingMore"
        ></p-button>
      </div>
    </div>
  `,
    styles: [`
    .status-history {
      @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6;
    }

    .timeline-marker {
      @apply w-8 h-8 rounded-full flex items-center justify-center text-white text-sm;
    }

    .timeline-marker.status-change {
      @apply bg-blue-500;
    }

    .timeline-marker.verification {
      @apply bg-green-500;
    }

    .timeline-marker.error {
      @apply bg-red-500;
    }

    .timeline-marker.system {
      @apply bg-gray-500;
    }

    .timeline-content {
      @apply ml-4 pb-6;
    }

    .metadata-section {
      @apply mt-2 pt-2 border-t border-gray-200 dark:border-gray-700;
    }

    :host ::ng-deep .p-timeline-event-content {
      @apply p-0;
    }

    :host ::ng-deep .p-timeline-event-marker {
      @apply border-0 p-0;
    }

    :host ::ng-deep .p-timeline-event-connector {
      @apply bg-gray-300 dark:bg-gray-600;
    }
  `]
})
export class StatusHistoryComponent implements OnInit, OnDestroy {
    @Input() documentId!: string;
    @Input() maxItems: number = 10;

    private readonly statusService = inject(DocumentStatusService);
    private readonly destroy$ = new Subject<void>();

    private _statusHistory: DocumentStatusHistory[] = [];
    private _expandedMetadata = new Set<string>();

    loading = false;
    loadingMore = false;
    hasMore = false;
    currentPage = 1;

    ngOnInit(): void {
        this.loadStatusHistory();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    statusHistory = computed(() => {
        return this._statusHistory;
    });

    private loadStatusHistory(): void {
        this.loading = true;
        this.statusService.getDocumentStatusHistory(this.documentId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (history) => {
                    this._statusHistory = history.slice(0, this.maxItems);
                    this.hasMore = history.length > this.maxItems;
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    refreshHistory(): void {
        this.currentPage = 1;
        this._expandedMetadata.clear();
        this.loadStatusHistory();
    }

    loadMore(): void {
        this.loadingMore = true;
        // In a real implementation, this would load the next page
        // For now, we'll simulate loading more items
        setTimeout(() => {
            this.currentPage++;
            this.loadingMore = false;
            // Update hasMore based on actual data
            this.hasMore = false; // Simulate no more data
        }, 1000);
    }

    getMarkerClass(event: DocumentStatusHistory): string {
        switch (event.triggeredBy) {
            case StatusTrigger.VERIFICATION_RESULT:
                return 'verification';
            case StatusTrigger.SYSTEM:
            case StatusTrigger.AUTOMATED:
                return 'system';
            case StatusTrigger.MANUAL:
                return 'status-change';
            default:
                return 'status-change';
        }
    }

    getMarkerIcon(event: DocumentStatusHistory): string {
        switch (event.triggeredBy) {
            case StatusTrigger.VERIFICATION_RESULT:
                return 'pi pi-shield';
            case StatusTrigger.SYSTEM:
                return 'pi pi-cog';
            case StatusTrigger.AUTOMATED:
                return 'pi pi-bolt';
            case StatusTrigger.MANUAL:
                return 'pi pi-user';
            default:
                return 'pi pi-info-circle';
        }
    }

    getTriggerIcon(trigger: StatusTrigger): string {
        switch (trigger) {
            case StatusTrigger.VERIFICATION_RESULT:
                return 'pi pi-shield text-green-500';
            case StatusTrigger.SYSTEM:
                return 'pi pi-cog text-gray-500';
            case StatusTrigger.AUTOMATED:
                return 'pi pi-bolt text-blue-500';
            case StatusTrigger.MANUAL:
                return 'pi pi-user text-purple-500';
            case StatusTrigger.SCHEDULED:
                return 'pi pi-clock text-orange-500';
            default:
                return 'pi pi-info-circle text-gray-500';
        }
    }

    getTriggerText(trigger: StatusTrigger): string {
        switch (trigger) {
            case StatusTrigger.VERIFICATION_RESULT:
                return 'Verification Result';
            case StatusTrigger.SYSTEM:
                return 'System';
            case StatusTrigger.AUTOMATED:
                return 'Automated';
            case StatusTrigger.MANUAL:
                return 'Manual';
            case StatusTrigger.SCHEDULED:
                return 'Scheduled';
            default:
                return 'Unknown';
        }
    }

    getStatusChangeText(event: DocumentStatusHistory): string {
        if (event.previousStatus) {
            return `Changed from ${this.formatStatus(event.previousStatus)} to ${this.formatStatus(event.newStatus)}`;
        }
        return `Status set to ${this.formatStatus(event.newStatus)}`;
    }

    formatStatus(status: DocumentStatus): string {
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    formatTimestamp(timestamp: Date): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInHours * 60);
            return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 168) { // 7 days
            const days = Math.floor(diffInHours / 24);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    hasMetadata(metadata: Record<string, any>): boolean {
        return metadata && Object.keys(metadata).length > 0;
    }

    toggleMetadata(eventId: string): void {
        if (this._expandedMetadata.has(eventId)) {
            this._expandedMetadata.delete(eventId);
        } else {
            this._expandedMetadata.add(eventId);
        }
    }

    isMetadataExpanded(eventId: string): boolean {
        return this._expandedMetadata.has(eventId);
    }

    getMetadataEntries(metadata: Record<string, any>): { key: string; value: string }[] {
        return Object.entries(metadata).map(([key, value]) => ({
            key: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        }));
    }
}