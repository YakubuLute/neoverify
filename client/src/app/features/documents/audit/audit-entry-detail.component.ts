import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { TimelineModule } from 'primeng/timeline';

// Services and Models
import { AuditService } from '../../../core/services/audit.service';
import { DocumentService } from '../../../core/services/document.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuditEntry, AuditAction, Document } from '../../../shared/models/document.models';

@Component({
  selector: 'app-audit-entry-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    DividerModule,
    TimelineModule
  ],
  template: `
    <div class="audit-entry-detail-container p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <p-button
              icon="pi pi-arrow-left"
              [text]="true"
              (onClick)="goBack()"
              pTooltip="Go back"
            />
            <h1 class="text-3xl font-bold text-white">Audit Entry Details</h1>
          </div>
          <p class="text-gray-400">Detailed information about this audit entry</p>
        </div>
        <div class="flex gap-3">
          @if (auditEntry()) {
            <p-button
              label="Copy Entry ID"
              icon="pi pi-copy"
              [outlined]="true"
              (onClick)="copyEntryId()"
            />
          }
          @if (auditEntry()?.documentId) {
            <p-button
              label="View Document"
              icon="pi pi-external-link"
              (onClick)="viewDocument()"
            />
          }
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex justify-center items-center py-12">
          <p-progressSpinner />
        </div>
      }

      <!-- Entry Details -->
      @if (auditEntry() && !loading()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Basic Information -->
          <p-card header="Basic Information" class="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">Entry ID</label>
                <p class="text-white font-mono text-sm bg-gray-900 p-2 rounded">{{ auditEntry()?.id }}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">Timestamp</label>
                <div class="space-y-1">
                  <p class="text-white">{{ auditEntry()?.timestamp | date:'full' }}</p>
                  <p class="text-sm text-gray-400">{{ getRelativeTime(auditEntry()?.timestamp!) }}</p>
                </div>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">Action</label>
                <p-tag
                  [value]="getActionLabel(auditEntry()?.action!)"
                  [severity]="getActionSeverity(auditEntry()?.action!)"
                  class="text-sm"
                />
              </div>

              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">User</label>
                <div class="space-y-1">
                  <p class="text-white">{{ auditEntry()?.userEmail }}</p>
                  <p class="text-sm text-gray-400 font-mono">{{ auditEntry()?.userId }}</p>
                </div>
              </div>

              @if (auditEntry()?.documentId) {
                <div>
                  <label class="text-sm font-medium text-gray-300 mb-2 block">Document ID</label>
                  <div class="flex items-center gap-2">
                    <p class="text-white font-mono text-sm">{{ auditEntry()?.documentId }}</p>
                    <p-button
                      icon="pi pi-external-link"
                      [text]="true"
                      size="small"
                      (onClick)="viewDocument()"
                      pTooltip="View document"
                    />
                  </div>
                </div>
              }

              @if (auditEntry()?.ipAddress) {
                <div>
                  <label class="text-sm font-medium text-gray-300 mb-2 block">IP Address</label>
                  <p class="text-white font-mono">{{ auditEntry()?.ipAddress }}</p>
                </div>
              }
            </div>
          </p-card>

          <!-- Status Changes -->
          @if (auditEntry()?.previousStatus || auditEntry()?.newStatus) {
            <p-card 
              header="Status Changes" 
              class="bg-gray-800/50 backdrop-blur-sm border border-gray-700"
            >
              <div class="flex items-center justify-center gap-4">
                @if (auditEntry()?.previousStatus) {
                  <div class="text-center">
                    <label class="text-sm font-medium text-gray-300 mb-2 block">Previous Status</label>
                    <p-tag
                      [value]="auditEntry()?.previousStatus!"
                      severity="secondary"
                      class="text-sm"
                    />
                  </div>
                }

                @if (auditEntry()?.previousStatus && auditEntry()?.newStatus) {
                  <i class="pi pi-arrow-right text-gray-400 text-xl"></i>
                }

                @if (auditEntry()?.newStatus) {
                  <div class="text-center">
                    <label class="text-sm font-medium text-gray-300 mb-2 block">New Status</label>
                    <p-tag
                      [value]="auditEntry()?.newStatus!"
                      severity="success"
                      class="text-sm"
                    />
                  </div>
                }
              </div>

              @if (auditEntry()?.reason) {
                <div class="mt-4">
                  <label class="text-sm font-medium text-gray-300 mb-2 block">Reason</label>
                  <p class="text-white bg-gray-900 p-3 rounded">{{ auditEntry()?.reason }}</p>
                </div>
              }
            </p-card>
          }

          <!-- Technical Details -->
          <p-card header="Technical Details" class="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
            <div class="space-y-4">
              @if (auditEntry()?.userAgent) {
                <div>
                  <label class="text-sm font-medium text-gray-300 mb-2 block">User Agent</label>
                  <p class="text-white text-sm bg-gray-900 p-3 rounded break-all">{{ auditEntry()?.userAgent }}</p>
                </div>
              }

              @if (auditEntry()?.details && hasDetails(auditEntry()?.details!)) {
                <div>
                  <label class="text-sm font-medium text-gray-300 mb-2 block">Additional Details</label>
                  <pre class="text-white text-sm bg-gray-900 p-3 rounded overflow-auto max-h-60">{{ formatDetails(auditEntry()?.details!) }}</pre>
                </div>
              }
            </div>
          </p-card>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Document Information -->
          @if (document()) {
            <p-card 
              header="Document Information" 
              class="bg-gray-800/50 backdrop-blur-sm border border-gray-700"
            >
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">Title</label>
                <p class="text-white">{{ document()?.title }}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">Type</label>
                <p-tag [value]="document()?.documentType!" severity="info" />
              </div>

              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">Status</label>
                <p-tag [value]="document()?.status!" [severity]="getDocumentStatusSeverity(document()?.status!)" />
              </div>

              <div>
                <label class="text-sm font-medium text-gray-300 mb-2 block">Uploaded</label>
                <p class="text-white text-sm">{{ document()?.uploadedAt | date:'short' }}</p>
              </div>

              <p-divider />

              <p-button
                label="View Full Document"
                icon="pi pi-external-link"
                [outlined]="true"
                class="w-full"
                (onClick)="viewDocument()"
              />
              </div>
            </p-card>
          }

          <!-- Related Entries -->
          @if (relatedEntries().length > 0) {
            <p-card 
              header="Related Entries" 
              class="bg-gray-800/50 backdrop-blur-sm border border-gray-700"
            >
            <p-timeline [value]="relatedEntries()" class="w-full">
              <ng-template pTemplate="content" let-entry>
                <div class="p-3 bg-gray-900/50 rounded cursor-pointer hover:bg-gray-900/70 transition-colors"
                     (click)="viewRelatedEntry(entry.id)">
                  <div class="flex items-center justify-between mb-2">
                    <p-tag
                      [value]="getActionLabel(entry.action)"
                      [severity]="getActionSeverity(entry.action)"
                      class="text-xs"
                    />
                    <span class="text-xs text-gray-400">{{ entry.timestamp | date:'short' }}</span>
                  </div>
                  <p class="text-sm text-white">{{ entry.userEmail }}</p>
                </div>
              </ng-template>
            </p-timeline>

            @if (relatedEntries().length >= 5) {
              <div class="mt-4">
                <p-button
                  label="View All Related"
                  [text]="true"
                  class="w-full"
                  (onClick)="viewAllRelated()"
                />
              </div>
            }
            </p-card>
          }

          <!-- Quick Actions -->
          <p-card header="Quick Actions" class="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
            <div class="space-y-3">
              <p-button
                label="Export Entry"
                icon="pi pi-download"
                [outlined]="true"
                class="w-full"
                (onClick)="exportEntry()"
              />

              @if (auditEntry()?.userId) {
                <p-button
                  label="View User Activity"
                  icon="pi pi-user"
                  [outlined]="true"
                  class="w-full"
                  (onClick)="viewUserActivity()"
                />
              }

              <p-button
                label="Search Similar"
                icon="pi pi-search"
                [outlined]="true"
                class="w-full"
                (onClick)="searchSimilar()"
              />
            </div>
          </p-card>
        </div>
        </div>
      }

      <!-- Error State -->
      @if (error() && !loading()) {
        <div class="text-center py-12">
          <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
          <h3 class="text-xl font-semibold text-white mb-2">Entry Not Found</h3>
          <p class="text-gray-400 mb-4">The requested audit entry could not be found.</p>
          <p-button
            label="Go Back"
            icon="pi pi-arrow-left"
            (onClick)="goBack()"
          />
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }

    .audit-entry-detail-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    ::ng-deep .p-card .p-card-header {
      background: rgba(31, 41, 55, 0.5) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-card .p-card-body {
      background: transparent !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-timeline .p-timeline-event-content {
      background: transparent !important;
    }

    ::ng-deep .p-timeline .p-timeline-event-marker {
      background: #3b82f6 !important;
      border-color: #1e40af !important;
    }

    ::ng-deep .p-timeline .p-timeline-event-connector {
      background: rgba(75, 85, 99, 0.3) !important;
    }
  `]
})
export class AuditEntryDetailComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly documentService = inject(DocumentService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Signals
  auditEntry = signal<AuditEntry | null>(null);
  document = signal<Document | null>(null);
  relatedEntries = signal<AuditEntry[]>([]);
  loading = signal(false);
  error = signal(false);

  // Input for entry ID
  entryId = input<string>();

  ngOnInit() {
    const entryId = this.route.snapshot.paramMap.get('id');
    if (entryId) {
      this.loadAuditEntry(entryId);
    } else {
      this.error.set(true);
    }
  }

  loadAuditEntry(entryId: string) {
    this.loading.set(true);
    this.error.set(false);

    // Since we don't have a direct getAuditEntry method, we'll search for it
    this.auditService.searchAuditEntries({ query: entryId }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        const entry = response.items.find(item => item.id === entryId);
        if (entry) {
          this.auditEntry.set(entry);
          this.loadRelatedData(entry);
        } else {
          this.error.set(true);
        }
      },
      error: (error) => {
        console.error('Failed to load audit entry:', error);
        this.error.set(true);
      }
    });
  }

  loadRelatedData(entry: AuditEntry) {
    // Load document information if available
    if (entry.documentId) {
      this.documentService.getDocument(entry.documentId).subscribe({
        next: (document) => {
          this.document.set(document);
        },
        error: (error) => {
          console.error('Failed to load document:', error);
        }
      });

      // Load related audit entries for the same document
      this.auditService.getDocumentAuditTrail(entry.documentId, { limit: 10 }).subscribe({
        next: (response) => {
          const related = response.items.filter(item => item.id !== entry.id);
          this.relatedEntries.set(related);
        },
        error: (error) => {
          console.error('Failed to load related entries:', error);
        }
      });
    }
  }

  goBack() {
    window.history.back();
  }

  copyEntryId() {
    const entry = this.auditEntry();
    if (entry) {
      navigator.clipboard.writeText(entry.id).then(() => {
        this.notificationService.success('Entry ID copied to clipboard');
      });
    }
  }

  viewDocument() {
    const entry = this.auditEntry();
    if (entry?.documentId) {
      this.router.navigate(['/documents', entry.documentId]);
    }
  }

  viewRelatedEntry(entryId: string) {
    this.router.navigate(['/documents/audit/entry', entryId]);
  }

  viewAllRelated() {
    const entry = this.auditEntry();
    if (entry?.documentId) {
      this.router.navigate(['/documents/audit'], {
        queryParams: { documentId: entry.documentId }
      });
    }
  }

  exportEntry() {
    const entry = this.auditEntry();
    if (entry) {
      const exportData = {
        ...entry,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-entry-${entry.id}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.notificationService.success('Audit entry exported successfully');
    }
  }

  viewUserActivity() {
    const entry = this.auditEntry();
    if (entry?.userId) {
      this.router.navigate(['/documents/audit'], {
        queryParams: { userId: entry.userId }
      });
    }
  }

  searchSimilar() {
    const entry = this.auditEntry();
    if (entry) {
      this.router.navigate(['/documents/audit'], {
        queryParams: {
          action: entry.action,
          userId: entry.userId
        }
      });
    }
  }

  getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      [AuditAction.CREATED]: 'Created',
      [AuditAction.VIEWED]: 'Viewed',
      [AuditAction.UPDATED]: 'Updated',
      [AuditAction.DELETED]: 'Deleted',
      [AuditAction.SHARED]: 'Shared',
      [AuditAction.DOWNLOADED]: 'Downloaded',
      [AuditAction.VERIFIED]: 'Verified',
      [AuditAction.REVOKED]: 'Revoked',
      [AuditAction.PERMISSION_CHANGED]: 'Permission Changed',
      [AuditAction.STATUS_CHANGED]: 'Status Changed',
      [AuditAction.VERIFICATION_STARTED]: 'Verification Started',
      [AuditAction.VERIFICATION_COMPLETED]: 'Verification Completed',
      [AuditAction.VERIFICATION_FAILED]: 'Verification Failed'
    };
    return labels[action] || action;
  }

  getActionSeverity(action: AuditAction): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
    const severities: Record<AuditAction, "success" | "info" | "warn" | "danger" | "secondary" | "contrast"> = {
      [AuditAction.CREATED]: 'success',
      [AuditAction.VIEWED]: 'info',
      [AuditAction.UPDATED]: 'warn',
      [AuditAction.DELETED]: 'danger',
      [AuditAction.SHARED]: 'info',
      [AuditAction.DOWNLOADED]: 'info',
      [AuditAction.VERIFIED]: 'success',
      [AuditAction.REVOKED]: 'danger',
      [AuditAction.PERMISSION_CHANGED]: 'warn',
      [AuditAction.STATUS_CHANGED]: 'warn',
      [AuditAction.VERIFICATION_STARTED]: 'info',
      [AuditAction.VERIFICATION_COMPLETED]: 'success',
      [AuditAction.VERIFICATION_FAILED]: 'danger'
    };
    return severities[action] || 'info';
  }

  getDocumentStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
    const severities: Record<string, "success" | "info" | "warn" | "danger" | "secondary" | "contrast"> = {
      'verified': 'success',
      'processing': 'warn',
      'rejected': 'danger',
      'expired': 'secondary',
      'uploaded': 'info'
    };
    return severities[status] || 'info';
  }

  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  hasDetails(details: any): boolean {
    return details && Object.keys(details).length > 0;
  }

  formatDetails(details: any): string {
    return JSON.stringify(details, null, 2);
  }
}