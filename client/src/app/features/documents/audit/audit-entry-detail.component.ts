/* eslint-disable @typescript-eslint/no-explicit-any */
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
  templateUrl: './audit-entry-detail.component.html',
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
      [AuditAction.VERIFICATION_FAILED]: 'Verification Failed',
      [AuditAction.UPLOADED]: 'Uploaded',
      [AuditAction.REJECTED]: 'Rejected',
      [AuditAction.ARCHIVED]: 'Archived',
      [AuditAction.RESTORED]: 'Restored'
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
      [AuditAction.VERIFICATION_FAILED]: 'danger',
      [AuditAction.UPLOADED]: 'info',
      [AuditAction.REJECTED]: 'danger',
      [AuditAction.ARCHIVED]: 'secondary',
      [AuditAction.RESTORED]: 'info'
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

  hasDetails(details: Record<string, any>): boolean {
    return details && Object.keys(details).length > 0;
  }

  formatDetails(details: Record<string, any>): string {
    return JSON.stringify(details, null, 2);
  }
}
