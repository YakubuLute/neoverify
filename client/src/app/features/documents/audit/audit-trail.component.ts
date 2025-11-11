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
import { AuditEntry, AuditAction, ExportFormat, ReportType } from '../../../shared/models/document.models';

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
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './audit-trail.component.html',
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }

    .audit-trail-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: rgba(31, 41, 55, 0.5) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: rgba(55, 65, 81, 0.5) !important;
    }

    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: rgba(17, 24, 39, 0.8) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.5) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-panel .p-panel-header {
      background: rgba(31, 41, 55, 0.5) !important;
      border: 1px solid rgba(75, 85, 99, 0.3) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-panel .p-panel-content {
      background: rgba(31, 41, 55, 0.3) !important;
      border: 1px solid rgba(75, 85, 99, 0.3) !important;
      border-top: none !important;
    }

    ::ng-deep .p-card .p-card-body {
      background: transparent !important;
      border: none !important;
    }

    ::ng-deep .p-dialog .p-dialog-header {
      background: rgba(31, 41, 55, 0.95) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-dialog .p-dialog-content {
      background: rgba(31, 41, 55, 0.95) !important;
      color: #f3f4f6 !important;
    }
  `]
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
  actionOptions = Object.values(AuditAction).map(action => ({
    label: this.getActionLabel(action),
    value: action
  }));

  exportFormatOptions = [
    { label: 'CSV', value: 'csv' },
    { label: 'Excel', value: 'excel' },
    { label: 'PDF', value: 'pdf' }
  ];

  reportTypeOptions = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Annual', value: 'annual' },
    { label: 'Custom Range', value: 'custom' }
  ];

  private searchSubject = new Subject<string>();

  constructor() {
    this.filtersForm = this.fb.group({
      query: [''],
      actions: [[]],
      startDate: [null],
      endDate: [null]
    });

    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.currentFilters.query = query;
      this.loadAuditEntries();
    });

    // Watch for form changes
    this.filtersForm.get('query')?.valueChanges.subscribe(value => {
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
      ...this.currentFilters
    };

    this.auditService.searchAuditEntries(this.currentFilters, params).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.auditEntries.set(response.items);
        this.totalRecords.set(response.totalCount!);
      },
      error: (error) => {
        console.error('Failed to load audit entries:', error);
        this.notificationService.error('Failed to load audit entries');
      }
    });
  }

  loadStatistics() {
    this.auditService.getAuditStatistics().subscribe({
      next: (stats) => {
        this.statistics.set(stats);
      },
      error: (error) => {
        console.error('Failed to load audit statistics:', error);
      }
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
      dateRange: formValue.startDate && formValue.endDate ? {
        start: formValue.startDate,
        end: formValue.endDate
      } : undefined
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

    this.auditService.exportAuditTrail(this.currentFilters, this.exportFormat).pipe(
      finalize(() => this.exporting.set(false))
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${this.exportFormat}`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showExportDialog = false;
      },
      error: (error) => {
        console.error('Export failed:', error);
        this.notificationService.error('Export failed. Please try again.');
      }
    });
  }

  generateReport() {
    this.generatingReport.set(true);

    const params: any = {
      reportType: this.reportType
    };

    if (this.reportType === 'custom' && this.reportStartDate && this.reportEndDate) {
      params.dateRange = {
        start: this.reportStartDate,
        end: this.reportEndDate
      };
    }

    this.auditService.generateComplianceReport(params).pipe(
      finalize(() => this.generatingReport.set(false))
    ).subscribe({
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
      }
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
      [AuditAction.ARCHIVED]: 'info',
      [AuditAction.RESTORED]: 'info'
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

    const mostCommon = actions.reduce((a, b) => (a[1] as any )> (b[1] as any )? a : b);
    return this.getActionLabel(mostCommon[0] as AuditAction);
  }
}
