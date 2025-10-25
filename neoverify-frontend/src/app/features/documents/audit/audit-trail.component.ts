import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, catchError, finalize } from 'rxjs/operators';
import { of, Subject, combineLatest } from 'rxjs';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
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
import { AuditEntry, AuditAction } from '../../../shared/models/document.models';
import { PaginatedResponse } from '../../../shared/models/common.models';

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
    DropdownModule,
    CalendarModule,
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
  template: `
    <div class="audit-trail-container p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Audit Trail</h1>
          <p class="text-gray-400">Track all document activities and compliance events</p>
        </div>
        <div class="flex gap-3">
          <p-button
            label="Export"
            icon="pi pi-download"
            [outlined]="true"
            (onClick)="showExportDialog = true"
            [disabled]="loading()"
          />
          <p-button
            label="Generate Report"
            icon="pi pi-file-pdf"
            (onClick)="showReportDialog = true"
            [disabled]="loading()"
          />
        </div>
      </div>

      <!-- Filters Panel -->
      <p-panel header="Filters" [toggleable]="true" [collapsed]="false" styleClass="mb-6">
        <form [formGroup]="filtersForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search Query -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-gray-300 mb-2">Search</label>
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input
                pInputText
                formControlName="query"
                placeholder="Search audit entries..."
                class="w-full"
              />
            </span>
          </div>

          <!-- Actions Filter -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-gray-300 mb-2">Actions</label>
            <p-multiSelect
              formControlName="actions"
              [options]="actionOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select actions"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>

          <!-- Date Range -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <p-calendar
              formControlName="startDate"
              showIcon="true"
              placeholder="Start date"
              styleClass="w-full"
            />
          </div>

          <div class="flex flex-col">
            <label class="text-sm font-medium text-gray-300 mb-2">End Date</label>
            <p-calendar
              formControlName="endDate"
              showIcon="true"
              placeholder="End date"
              styleClass="w-full"
            />
          </div>
        </form>

        <div class="flex justify-end gap-2 mt-4">
          <p-button
            label="Clear Filters"
            [outlined]="true"
            (onClick)="clearFilters()"
            [disabled]="loading()"
          />
          <p-button
            label="Apply Filters"
            (onClick)="applyFilters()"
            [disabled]="loading()"
          />
        </div>
      </p-panel>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" *ngIf="statistics()">
        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Total Entries</p>
              <p class="text-2xl font-bold text-white">{{ statistics()?.totalEntries | number }}</p>
            </div>
            <i class="pi pi-list text-blue-400 text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Today's Activity</p>
              <p class="text-2xl font-bold text-white">{{ getTodayActivity() | number }}</p>
            </div>
            <i class="pi pi-calendar text-green-400 text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Most Active User</p>
              <p class="text-lg font-semibold text-white truncate">{{ getMostActiveUser() }}</p>
            </div>
            <i class="pi pi-user text-purple-400 text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Most Common Action</p>
              <p class="text-lg font-semibold text-white">{{ getMostCommonAction() }}</p>
            </div>
            <i class="pi pi-cog text-orange-400 text-2xl"></i>
          </div>
        </div>
      </div>

      <!-- Audit Entries Table -->
      <p-card styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
        <p-table
          [value]="auditEntries()"
          [loading]="loading()"
          [paginator]="true"
          [rows]="pageSize"
          [totalRecords]="totalRecords()"
          [lazy]="true"
          (onLazyLoad)="onLazyLoad($event)"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          [rowsPerPageOptions]="[10, 25, 50, 100]"
          styleClass="p-datatable-sm"
          [scrollable]="true"
          scrollHeight="600px"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="timestamp">
                Timestamp
                <p-sortIcon field="timestamp"></p-sortIcon>
              </th>
              <th pSortableColumn="action">
                Action
                <p-sortIcon field="action"></p-sortIcon>
              </th>
              <th pSortableColumn="userEmail">
                User
                <p-sortIcon field="userEmail"></p-sortIcon>
              </th>
              <th>Document</th>
              <th>IP Address</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-entry>
            <tr>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-white">
                    {{ entry.timestamp | date:'short' }}
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ getRelativeTime(entry.timestamp) }}
                  </span>
                </div>
              </td>
              <td>
                <p-tag
                  [value]="getActionLabel(entry.action)"
                  [severity]="getActionSeverity(entry.action)"
                />
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-white">{{ entry.userEmail }}</span>
                  <span class="text-xs text-gray-400">{{ entry.userId }}</span>
                </div>
              </td>
              <td>
                <div class="flex flex-col" *ngIf="entry.documentId">
                  <span class="text-sm text-blue-400 cursor-pointer hover:underline"
                        (click)="viewDocument(entry.documentId)">
                    Document {{ entry.documentId.substring(0, 8) }}...
                  </span>
                </div>
                <span class="text-sm text-gray-400" *ngIf="!entry.documentId">N/A</span>
              </td>
              <td>
                <span class="text-sm text-gray-300">{{ entry.ipAddress || 'N/A' }}</span>
              </td>
              <td>
                <div class="max-w-xs">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    size="small"
                    (onClick)="viewDetails(entry)"
                    pTooltip="View details"
                    *ngIf="entry.details && hasDetails(entry.details)"
                  />
                  <span class="text-sm text-gray-400" *ngIf="!entry.details || !hasDetails(entry.details)">
                    No details
                  </span>
                </div>
              </td>
              <td>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-external-link"
                    [text]="true"
                    size="small"
                    (onClick)="viewDocument(entry.documentId)"
                    pTooltip="View document"
                    *ngIf="entry.documentId"
                  />
                  <p-button
                    icon="pi pi-copy"
                    [text]="true"
                    size="small"
                    (onClick)="copyEntryId(entry.id)"
                    pTooltip="Copy entry ID"
                  />
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-8">
                <div class="flex flex-col items-center gap-3">
                  <i class="pi pi-search text-4xl text-gray-500"></i>
                  <p class="text-gray-400">No audit entries found</p>
                  <p class="text-sm text-gray-500">Try adjusting your filters or search criteria</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Details Dialog -->
      <p-dialog
        header="Audit Entry Details"
        [(visible)]="showDetailsDialog"
        [modal]="true"
        [style]="{ width: '600px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div *ngIf="selectedEntry()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300">Entry ID</label>
              <p class="text-sm text-white font-mono">{{ selectedEntry()?.id }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-300">Timestamp</label>
              <p class="text-sm text-white">{{ selectedEntry()?.timestamp | date:'full' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-300">Action</label>
              <p-tag
                [value]="getActionLabel(selectedEntry()?.action!)"
                [severity]="getActionSeverity(selectedEntry()?.action!)"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-300">User</label>
              <p class="text-sm text-white">{{ selectedEntry()?.userEmail }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-300">IP Address</label>
              <p class="text-sm text-white">{{ selectedEntry()?.ipAddress || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-300">User Agent</label>
              <p class="text-sm text-white break-all">{{ selectedEntry()?.userAgent || 'N/A' }}</p>
            </div>
          </div>

          <div *ngIf="selectedEntry()?.details">
            <label class="text-sm font-medium text-gray-300">Additional Details</label>
            <pre class="bg-gray-900 p-3 rounded text-sm text-gray-300 overflow-auto max-h-60">{{ formatDetails(selectedEntry()?.details!) }}</pre>
          </div>
        </div>
      </p-dialog>

      <!-- Export Dialog -->
      <p-dialog
        header="Export Audit Trail"
        [(visible)]="showExportDialog"
        [modal]="true"
        [style]="{ width: '500px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Export Format</label>
            <p-dropdown
              [(ngModel)]="exportFormat"
              [options]="exportFormatOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select format"
              styleClass="w-full"
            />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (onClick)="showExportDialog = false"
            />
            <p-button
              label="Export"
              (onClick)="exportAuditTrail()"
              [loading]="exporting()"
            />
          </div>
        </div>
      </p-dialog>

      <!-- Report Dialog -->
      <p-dialog
        header="Generate Compliance Report"
        [(visible)]="showReportDialog"
        [modal]="true"
        [style]="{ width: '500px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Report Type</label>
            <p-dropdown
              [(ngModel)]="reportType"
              [options]="reportTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select report type"
              styleClass="w-full"
            />
          </div>

          <div *ngIf="reportType === 'custom'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Start Date</label>
              <p-calendar
                [(ngModel)]="reportStartDate"
                showIcon="true"
                placeholder="Start date"
                styleClass="w-full"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">End Date</label>
              <p-calendar
                [(ngModel)]="reportEndDate"
                showIcon="true"
                placeholder="End date"
                styleClass="w-full"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (onClick)="showReportDialog = false"
            />
            <p-button
              label="Generate"
              (onClick)="generateReport()"
              [loading]="generatingReport()"
            />
          </div>
        </div>
      </p-dialog>
    </div>
  `,
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
  statistics = signal<any>(null);
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
  exportFormat = 'csv';
  reportType = 'monthly';
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
        this.totalRecords.set(response.totalCount);
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

    this.auditService.exportAuditTrail(this.currentFilters, this.exportFormat as any).pipe(
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

    const mostCommon = actions.reduce((a, b) => a[1] > b[1] ? a : b);
    return this.getActionLabel(mostCommon[0] as AuditAction);
  }
}