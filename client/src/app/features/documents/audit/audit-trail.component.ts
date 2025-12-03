/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

// Services and Models
import { AuditService } from '../../../core/services/audit.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  AuditEntry,
  AuditAction,
  ExportFormat,
  ReportType,
} from '../../../shared/models/document.models';

interface AuditFilters {
  query?: string;
  actions?: AuditAction[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userIds?: string[];
  documentIds?: string[];
}

interface Statistics {
  totalEntries: number;
  dailyActivity: { date: string; count: number }[];
  topUsers: { userEmail: string; count: number }[];
  actionCounts: { [key: string]: number };
}
@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    MultiSelectModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    CardModule,
    PanelModule,
    DialogModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: `./audit-trail.component.html`,
  styles: [
    `
/* Page background */
:host {
  @apply block min-h-screen bg-gray-50;
}

/* Main container */
.audit-trail-container {
  @apply max-w-7xl mx-auto px-4 md:px-6 py-6;
}

/* ------------------------------------------------------------------
 * Typography & quick color overrides (convert dark text to light theme)
 * ------------------------------------------------------------------ */



.audit-trail-container .text-gray-300 {
  @apply text-gray-600;
}

/* ------------------------------------------------------------------
 * Cards: stats + table wrapper (were using bg-gray-800/50)
 * ------------------------------------------------------------------ */

.audit-trail-container .bg-gray-800 {
  @apply bg-white border border-gray-200 rounded-2xl shadow-sm;
}

.audit-trail-container .border-gray-700 {
  @apply border-gray-200;
}

.audit-trail-container .backdrop-blur-sm {
  @apply backdrop-blur-none;
}

/* ------------------------------------------------------------------
 * Buttons (primary cyan, outlined neutral)
 * ------------------------------------------------------------------ */

:host ::ng-deep .audit-trail-container .p-button:not(.p-button-text):not(.p-button-outlined),
:host ::ng-deep .audit-trail-container .p-button:not(.p-button-text)[outlined="false"] {
  @apply bg-cyan-500 border-cyan-500 text-white
         hover:bg-cyan-600 hover:border-cyan-600;
}

:host ::ng-deep .audit-trail-container .p-button.p-button-outlined,
:host ::ng-deep .audit-trail-container .p-button[outlined="true"] {
  @apply bg-transparent border-gray-300 text-gray-700
         hover:bg-gray-50 hover:border-gray-400;
}

/* Export / report icon-only buttons inside table rows */
:host ::ng-deep .audit-trail-container .p-button.p-button-text {
  @apply text-gray-500 hover:text-gray-900 hover:bg-gray-100;
}

/* ------------------------------------------------------------------
 * Filters panel (p-panel)
 * ------------------------------------------------------------------ */

:host ::ng-deep .p-panel {
  @apply bg-transparent border-none;
}

:host ::ng-deep .p-panel .p-panel-header {
  @apply bg-white border border-gray-200 rounded-t-2xl text-gray-900
         px-4 py-3;
}

:host ::ng-deep .p-panel .p-panel-content {
  @apply bg-gray-50 border-x border-b border-gray-200 rounded-b-2xl
         text-gray-800;
}

/* Inputs in filters */
:host ::ng-deep
  .audit-trail-container .p-inputtext,
:host ::ng-deep
  .audit-trail-container .p-multiselect,
:host ::ng-deep
  .audit-trail-container .p-calendar,
:host ::ng-deep
  .audit-trail-container .p-dropdown,
:host ::ng-deep
  .audit-trail-container .p-select {
  @apply w-full bg-white border border-gray-300 text-gray-900 text-sm
         rounded-lg;
}

:host ::ng-deep
  .audit-trail-container .p-inputtext:enabled:focus,
:host ::ng-deep
  .audit-trail-container .p-multiselect.p-focus,
:host ::ng-deep
  .audit-trail-container .p-calendar .p-inputtext:enabled:focus,
:host ::ng-deep
  .audit-trail-container .p-dropdown.p-focus,
:host ::ng-deep
  .audit-trail-container .p-select.p-focus {
  @apply border-cyan-500 ring-2 ring-cyan-500/20 outline-none;
}

:host ::ng-deep
  .audit-trail-container .p-input-icon-left > i {
  @apply text-gray-400;
}

/* Multiselect tokens */
:host ::ng-deep
  .audit-trail-container .p-multiselect-token {
  @apply bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 text-xs;
}

/* ------------------------------------------------------------------
 * Statistics cards (they already use the bg-gray-800/50 class,
 * so background is handled above – only tweak inner text)
 * ------------------------------------------------------------------ */

.audit-trail-container .grid.grid-cols-1.md\:grid-cols-4.gap-4.mb-6 p {
  @apply text-sm text-gray-500;
}

.audit-trail-container .grid.grid-cols-1.md:grid-cols-4.gap-4.mb-6 p {
  @apply text-2xl font-semibold text-gray-900;
}

/* ------------------------------------------------------------------
 * Audit table (p-card + p-table)
 * ------------------------------------------------------------------ */

:host ::ng-deep .p-card {
  @apply bg-white border border-gray-200 rounded-2xl shadow-sm;
}

:host ::ng-deep .p-card .p-card-body {
  @apply bg-transparent border-none;
}

/* Table header */
:host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
  @apply bg-gray-50 border-b border-gray-200 text-gray-600
         font-medium text-xs uppercase tracking-wide;
}

/* Table body rows */
:host ::ng-deep .p-datatable .p-datatable-tbody > tr {
  @apply bg-white border-b border-gray-100 transition-colors;
}

:host ::ng-deep .p-datatable .p-datatable-tbody > tr:nth-child(even) {
  @apply bg-gray-50;
}

:host ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
  @apply bg-cyan-50/40;
}

:host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
  @apply text-sm text-gray-800 align-top;
}

/* Sort icons */
:host ::ng-deep .p-sortable-column .p-sortable-column-icon {
  @apply text-gray-400 ml-1;
}

/* Paginator */
:host ::ng-deep .p-paginator {
  @apply bg-transparent border-t border-gray-200 mt-2 pt-3 text-xs text-gray-500;
}

:host ::ng-deep .p-paginator .p-paginator-page {
  @apply text-gray-600 rounded hover:bg-gray-100;
}

:host ::ng-deep .p-paginator .p-paginator-page.p-highlight {
  @apply bg-cyan-500 text-white;
}

:host ::ng-deep .p-paginator .p-paginator-prev,
:host ::ng-deep .p-paginator .p-paginator-next {
  @apply text-gray-600 rounded hover:bg-gray-100;
}

/* Tags for actions */
:host ::ng-deep .p-tag {
  @apply text-xs font-medium rounded-full px-2.5 py-1;
}

/* Empty state icon & text */
:host ::ng-deep .p-datatable .p-datatable-emptymessage {
  @apply bg-white;
}

/* ------------------------------------------------------------------
 * Dialogs: details / export / report
 * ------------------------------------------------------------------ */

:host ::ng-deep .p-dialog {
  @apply rounded-2xl overflow-hidden;
}

:host ::ng-deep .p-dialog .p-dialog-header {
  @apply bg-white border-b border-gray-200 text-gray-900 px-4 py-3;
}

:host ::ng-deep .p-dialog .p-dialog-content {
  @apply bg-white text-gray-800 px-4 py-4;
}

:host ::ng-deep .p-dialog .p-dialog-header-icon {
  @apply text-gray-500 hover:text-gray-900 hover:bg-gray-100;
}

/* Buttons inside dialogs reuse global button styles */

/* Details <pre> block */
:host ::ng-deep pre {
  @apply bg-gray-900 text-gray-100 rounded-lg text-xs p-3 max-h-60 overflow-auto;
}

    `,
  ],
})
export class AuditTrailComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  // Signals
  auditEntries = signal<AuditEntry[]>([]);
  loading = signal(false);
  exporting = signal(false);
  generatingReport = signal(false);
  totalRecords = signal(0);
  statistics = signal<Statistics>({} as Statistics);
  selectedEntry = signal<AuditEntry | null>(null);

  // Form and filters
  filtersForm: FormGroup;
  currentFilters: AuditFilters = {};
  pageSize = 25;
  currentPage = 0;

  // Dialog states
  showDetailsDialog = false;
  showExportDialog = false;
  showReportDialog = false;

  // Export/Report options
  exportFormat: ExportFormat = ExportFormat.CSV;
  reportType: ReportType = ReportType.MONTHLY;
  reportStartDate: Date | null = null;
  reportEndDate: Date | null = null;

  // Options
  actionOptions = Object.values(AuditAction).map((action) => ({
    label: this.getActionLabel(action),
    value: action,
  }));

  exportFormatOptions = [
    { label: 'CSV', value: 'csv' },
    { label: 'Excel', value: 'excel' },
    { label: 'PDF', value: 'pdf' },
  ];

  reportTypeOptions = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Annual', value: 'annual' },
    { label: 'Custom Range', value: 'custom' },
  ];

  private searchSubject = new Subject<string>();

  constructor() {
    this.filtersForm = this.fb.group({
      query: [''],
      actions: [[]],
      startDate: [null],
      endDate: [null],
    });

    // Setup search debouncing
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((query) => {
      this.currentFilters.query = query;
      this.loadAuditEntries();
    });

    // Watch for form changes
    this.filtersForm.get('query')?.valueChanges.subscribe((value) => {
      this.searchSubject.next(value || '');
    });
  }

  ngOnInit() {
    this.loadAuditEntries();
    this.loadStatistics();
  }

  loadAuditEntries() {
    this.loading.set(true);

    const params = {
      page: this.currentPage + 1,
      limit: this.pageSize,
      ...this.currentFilters,
    };

    this.auditService
      .searchAuditEntries(this.currentFilters, params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.auditEntries.set(response.items);
          this.totalRecords.set(response.totalCount!);
        },
        error: (error) => {
          console.error('Failed to load audit entries:', error);
          this.notificationService.error('Failed to load audit entries');
        },
      });
  }

  loadStatistics() {
    this.auditService.getAuditStatistics().subscribe({
      next: (stats) => {
        this.statistics.set(stats);
      },
      error: (error) => {
        console.error('Failed to load audit statistics:', error);
      },
    });
  }

  onLazyLoad(event: any) {
    this.currentPage = Math.floor(event.first / event.rows);
    this.pageSize = event.rows;
    this.loadAuditEntries();
  }

  applyFilters() {
    const formValue = this.filtersForm.value;

    this.currentFilters = {
      query: formValue.query || undefined,
      actions: formValue.actions?.length ? formValue.actions : undefined,
      dateRange:
        formValue.startDate && formValue.endDate
          ? {
              start: formValue.startDate,
              end: formValue.endDate,
            }
          : undefined,
    };

    this.currentPage = 0;
    this.loadAuditEntries();
  }

  clearFilters() {
    this.filtersForm.reset();
    this.currentFilters = {};
    this.currentPage = 0;
    this.loadAuditEntries();
  }

  viewDetails(entry: AuditEntry) {
    this.selectedEntry.set(entry);
    this.showDetailsDialog = true;
  }

  viewDocument(documentId: string) {
    this.router.navigate(['/documents', documentId]);
  }

  copyEntryId(entryId: string) {
    navigator.clipboard.writeText(entryId).then(() => {
      this.notificationService.success('Entry ID copied to clipboard');
    });
  }

  exportAuditTrail() {
    this.exporting.set(true);

    this.auditService
      .exportAuditTrail(this.currentFilters, this.exportFormat)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${
            this.exportFormat
          }`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showExportDialog = false;
        },
        error: (error) => {
          console.error('Export failed:', error);
          this.notificationService.error('Export failed. Please try again.');
        },
      });
  }

  generateReport() {
    this.generatingReport.set(true);

    const params: any = {
      reportType: this.reportType,
    };

    if (this.reportType === 'custom' && this.reportStartDate && this.reportEndDate) {
      params.dateRange = {
        start: this.reportStartDate,
        end: this.reportEndDate,
      };
    }

    this.auditService
      .generateComplianceReport(params)
      .pipe(finalize(() => this.generatingReport.set(false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showReportDialog = false;
        },
        error: (error) => {
          console.error('Report generation failed:', error);
          this.notificationService.error('Report generation failed. Please try again.');
        },
      });
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
      [AuditAction.RESTORED]: 'Restored',
    };
    return labels[action] || action;
  }

  getActionSeverity(
    action: AuditAction
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<
      AuditAction,
      'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
    > = {
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
      [AuditAction.ARCHIVED]: 'info',
      [AuditAction.RESTORED]: 'info',
    };
    return severities[action] || 'info';
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

  getTodayActivity(): number {
    const stats = this.statistics();
    if (!stats?.dailyActivity) return 0;

    const today = new Date().toISOString().split('T')[0];
    const todayActivity = stats.dailyActivity.find((activity: any) => activity.date === today);
    return todayActivity?.count || 0;
  }

  getMostActiveUser(): string {
    const stats = this.statistics();
    if (!stats?.topUsers?.length) return 'N/A';
    return stats.topUsers[0].userEmail;
  }

  getMostCommonAction(): string {
    const stats = this.statistics();
    if (!stats?.actionCounts) return 'N/A';

    const actions = Object.entries(stats.actionCounts);
    if (!actions.length) return 'N/A';

    const mostCommon = actions.reduce((a, b) => ((a[1] as any) > (b[1] as any) ? a : b));
    return this.getActionLabel(mostCommon[0] as AuditAction);
  }
}
