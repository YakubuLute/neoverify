import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ChipsModule } from 'primeng/chips';
import { InputTextareaModule } from 'primeng/inputtextarea';

// Services and Models
import { AuditSchedulerService, ScheduledReport, ReportScheduleConfig } from '../../../core/services/audit-scheduler.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
    selector: 'app-scheduled-reports',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        TableModule,
        DialogModule,
        InputTextModule,
        DropdownModule,
        MultiSelectModule,
        ToggleButtonModule,
        CalendarModule,
        TagModule,
        TooltipModule,
        ConfirmDialogModule,
        ChipsModule,
        InputTextareaModule
    ],
    providers: [ConfirmationService],
    template: `
    <div class="scheduled-reports-container p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Scheduled Reports</h1>
          <p class="text-gray-400">Automate compliance report generation and delivery</p>
        </div>
        <div class="flex gap-3">
          <p-button
            label="Test Email"
            icon="pi pi-send"
            [outlined]="true"
            (onClick)="showEmailTestDialog = true"
          />
          <p-button
            label="New Schedule"
            icon="pi pi-plus"
            (onClick)="openCreateDialog()"
          />
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" *ngIf="statistics()">
        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Total Reports</p>
              <p class="text-2xl font-bold text-white">{{ statistics()?.totalReports || 0 }}</p>
            </div>
            <i class="pi pi-file text-blue-400 text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Active Schedules</p>
              <p class="text-2xl font-bold text-white">{{ statistics()?.activeReports || 0 }}</p>
            </div>
            <i class="pi pi-clock text-green-400 text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Success Rate</p>
              <p class="text-2xl font-bold text-white">{{ getSuccessRate() }}%</p>
            </div>
            <i class="pi pi-check-circle text-purple-400 text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">Last Execution</p>
              <p class="text-lg font-semibold text-white">{{ getLastExecutionTime() }}</p>
            </div>
            <i class="pi pi-calendar text-orange-400 text-2xl"></i>
          </div>
        </div>
      </div>

      <!-- Scheduled Reports Table -->
      <p-card header="Scheduled Reports" styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
        <p-table
          [value]="scheduledReports()"
          [loading]="loading()"
          styleClass="p-datatable-sm"
          [scrollable]="true"
          scrollHeight="600px"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Schedule</th>
              <th>Recipients</th>
              <th>Status</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-report>
            <tr>
              <td>
                <div class="flex flex-col">
                  <span class="font-medium text-white">{{ report.name }}</span>
                  <span class="text-sm text-gray-400">{{ report.format.toUpperCase() }}</span>
                </div>
              </td>
              <td>
                <p-tag [value]="report.type" severity="info" />
              </td>
              <td>
                <span class="text-sm text-gray-300 font-mono">{{ report.schedule }}</span>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <span
                    *ngFor="let recipient of report.recipients.slice(0, 2)"
                    class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                  >
                    {{ recipient }}
                  </span>
                  <span
                    *ngIf="report.recipients.length > 2"
                    class="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded"
                  >
                    +{{ report.recipients.length - 2 }}
                  </span>
                </div>
              </td>
              <td>
                <p-tag
                  [value]="report.enabled ? 'Active' : 'Disabled'"
                  [severity]="report.enabled ? 'success' : 'secondary'"
                />
              </td>
              <td>
                <span class="text-sm text-gray-300" *ngIf="report.lastRun">
                  {{ report.lastRun | date:'short' }}
                </span>
                <span class="text-sm text-gray-400" *ngIf="!report.lastRun">Never</span>
              </td>
              <td>
                <span class="text-sm text-gray-300" *ngIf="report.nextRun && report.enabled">
                  {{ report.nextRun | date:'short' }}
                </span>
                <span class="text-sm text-gray-400" *ngIf="!report.enabled">-</span>
              </td>
              <td>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-play"
                    [text]="true"
                    size="small"
                    (onClick)="triggerReport(report.id)"
                    pTooltip="Run now"
                    [disabled]="!report.enabled"
                  />
                  <p-button
                    [icon]="report.enabled ? 'pi pi-pause' : 'pi pi-play'"
                    [text]="true"
                    size="small"
                    (onClick)="toggleReport(report.id, !report.enabled)"
                    [pTooltip]="report.enabled ? 'Disable' : 'Enable'"
                  />
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    size="small"
                    (onClick)="editReport(report)"
                    pTooltip="Edit"
                  />
                  <p-button
                    icon="pi pi-history"
                    [text]="true"
                    size="small"
                    (onClick)="viewHistory(report.id)"
                    pTooltip="View history"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    size="small"
                    severity="danger"
                    (onClick)="deleteReport(report.id)"
                    pTooltip="Delete"
                  />
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8" class="text-center py-8">
                <div class="flex flex-col items-center gap-3">
                  <i class="pi pi-calendar text-4xl text-gray-500"></i>
                  <p class="text-gray-400">No scheduled reports configured</p>
                  <p-button
                    label="Create First Schedule"
                    icon="pi pi-plus"
                    (onClick)="openCreateDialog()"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Create/Edit Dialog -->
      <p-dialog
        [header]="editingReport() ? 'Edit Scheduled Report' : 'Create Scheduled Report'"
        [(visible)]="showCreateDialog"
        [modal]="true"
        [style]="{ width: '700px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <form [formGroup]="reportForm" class="space-y-4">
          <!-- Basic Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Report Name</label>
              <input
                pInputText
                formControlName="name"
                placeholder="Enter report name"
                class="w-full"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Report Type</label>
              <p-dropdown
                formControlName="type"
                [options]="reportTypes"
                optionLabel="label"
                optionValue="value"
                placeholder="Select type"
                styleClass="w-full"
                (onChange)="onTypeChange($event)"
              />
            </div>
          </div>

          <!-- Schedule Configuration -->
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Schedule</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p-dropdown
                [(ngModel)]="selectedScheduleTemplate"
                [ngModelOptions]="{standalone: true}"
                [options]="scheduleTemplates()"
                optionLabel="name"
                optionValue="schedule"
                placeholder="Select template"
                styleClass="w-full"
                (onChange)="onScheduleTemplateChange($event)"
              />
              <input
                pInputText
                formControlName="schedule"
                placeholder="Custom cron expression"
                class="w-full font-mono"
              />
            </div>
            <small class="text-gray-400">
              Use cron expression format (e.g., "0 6 * * *" for daily at 6 AM)
            </small>
          </div>

          <!-- Recipients -->
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Email Recipients</label>
            <p-chips
              formControlName="recipients"
              placeholder="Enter email addresses"
              styleClass="w-full"
              [allowDuplicate]="false"
            />
            <small class="text-gray-400">
              Press Enter to add each email address
            </small>
          </div>

          <!-- Format and Options -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Format</label>
              <p-dropdown
                formControlName="format"
                [options]="formatOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select format"
                styleClass="w-full"
              />
            </div>

            <div class="flex items-center justify-between pt-6">
              <span class="text-sm text-gray-300">Include Detailed Logs</span>
              <p-toggleButton
                formControlName="includeDetails"
                onLabel="Yes"
                offLabel="No"
              />
            </div>
          </div>

          <!-- Filters (Optional) -->
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Filters (Optional)</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-400">Start Date</label>
                <p-calendar
                  formControlName="startDate"
                  [showIcon]="true"
                  placeholder="Filter start date"
                  styleClass="w-full"
                />
              </div>
              <div>
                <label class="text-xs text-gray-400">End Date</label>
                <p-calendar
                  formControlName="endDate"
                  [showIcon]="true"
                  placeholder="Filter end date"
                  styleClass="w-full"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (onClick)="closeCreateDialog()"
            />
            <p-button
              [label]="editingReport() ? 'Update Schedule' : 'Create Schedule'"
              (onClick)="saveReport()"
              [loading]="saving()"
              [disabled]="reportForm.invalid"
            />
          </div>
        </form>
      </p-dialog>

      <!-- Email Test Dialog -->
      <p-dialog
        header="Test Email Delivery"
        [(visible)]="showEmailTestDialog"
        [modal]="true"
        [style]="{ width: '500px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Test Recipients</label>
            <p-chips
              [(ngModel)]="testEmails"
              placeholder="Enter email addresses"
              styleClass="w-full"
              [allowDuplicate]="false"
            />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (onClick)="showEmailTestDialog = false"
            />
            <p-button
              label="Send Test"
              (onClick)="sendTestEmail()"
              [loading]="testingEmail()"
              [disabled]="!testEmails || testEmails.length === 0"
            />
          </div>
        </div>
      </p-dialog>

      <!-- Confirmation Dialog -->
      <p-confirmDialog />
    </div>
  `,
    styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }

    .scheduled-reports-container {
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

    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: rgba(31, 41, 55, 0.5) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
    }

    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: rgba(17, 24, 39, 0.8) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.5) !important;
      color: #f3f4f6 !important;
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
export class ScheduledReportsComponent implements OnInit {
    private readonly schedulerService = inject(AuditSchedulerService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly fb = inject(FormBuilder);

    // Signals
    scheduledReports = signal<ScheduledReport[]>([]);
    scheduleTemplates = signal<any[]>([]);
    statistics = signal<any>(null);
    loading = signal(false);
    saving = signal(false);
    testingEmail = signal(false);
    editingReport = signal<ScheduledReport | null>(null);

    // Dialog states
    showCreateDialog = false;
    showEmailTestDialog = false;

    // Form and data
    reportForm: FormGroup;
    selectedScheduleTemplate: string = '';
    testEmails: string[] = [];

    // Options
    reportTypes = [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Annual', value: 'annual' }
    ];

    formatOptions = [
        { label: 'PDF', value: 'pdf' },
        { label: 'CSV', value: 'csv' },
        { label: 'Excel', value: 'excel' }
    ];

    constructor() {
        this.reportForm = this.fb.group({
            name: ['', Validators.required],
            type: ['monthly', Validators.required],
            schedule: ['', Validators.required],
            recipients: [[], Validators.required],
            format: ['pdf', Validators.required],
            includeDetails: [false],
            startDate: [null],
            endDate: [null]
        });
    }

    ngOnInit() {
        this.loadScheduledReports();
        this.loadScheduleTemplates();
        this.loadStatistics();
    }

    loadScheduledReports() {
        this.loading.set(true);

        this.schedulerService.getScheduledReports().pipe(
            finalize(() => this.loading.set(false))
        ).subscribe({
            next: (reports) => {
                this.scheduledReports.set(reports);
            },
            error: (error) => {
                console.error('Failed to load scheduled reports:', error);
            }
        });
    }

    loadScheduleTemplates() {
        this.schedulerService.getScheduleTemplates().subscribe({
            next: (templates) => {
                this.scheduleTemplates.set(templates);
            },
            error: (error) => {
                console.error('Failed to load schedule templates:', error);
            }
        });
    }

    loadStatistics() {
        this.schedulerService.getReportStatistics().subscribe({
            next: (stats) => {
                this.statistics.set(stats);
            },
            error: (error) => {
                console.error('Failed to load statistics:', error);
            }
        });
    }

    openCreateDialog() {
        this.editingReport.set(null);
        this.reportForm.reset({
            type: 'monthly',
            format: 'pdf',
            includeDetails: false
        });
        this.selectedScheduleTemplate = '';
        this.showCreateDialog = true;
    }

    editReport(report: ScheduledReport) {
        this.editingReport.set(report);
        this.reportForm.patchValue({
            name: report.name,
            type: report.type,
            schedule: report.schedule,
            recipients: report.recipients,
            format: report.format,
            includeDetails: report.includeDetails,
            startDate: report.filters?.dateRange?.start || null,
            endDate: report.filters?.dateRange?.end || null
        });
        this.showCreateDialog = true;
    }

    closeCreateDialog() {
        this.showCreateDialog = false;
        this.editingReport.set(null);
        this.reportForm.reset();
    }

    saveReport() {
        if (this.reportForm.invalid) return;

        this.saving.set(true);
        const formValue = this.reportForm.value;

        const config: ReportScheduleConfig = {
            name: formValue.name,
            type: formValue.type,
            schedule: formValue.schedule,
            recipients: formValue.recipients,
            format: formValue.format,
            includeDetails: formValue.includeDetails,
            filters: formValue.startDate && formValue.endDate ? {
                dateRange: {
                    start: formValue.startDate,
                    end: formValue.endDate
                }
            } : undefined
        };

        const operation = this.editingReport()
            ? this.schedulerService.updateScheduledReport(this.editingReport()!.id, config)
            : this.schedulerService.createScheduledReport(config);

        operation.pipe(
            finalize(() => this.saving.set(false))
        ).subscribe({
            next: () => {
                this.closeCreateDialog();
                this.loadScheduledReports();
                this.loadStatistics();
            },
            error: (error) => {
                console.error('Failed to save scheduled report:', error);
            }
        });
    }

    triggerReport(reportId: string) {
        this.schedulerService.triggerScheduledReport(reportId).subscribe({
            next: () => {
                this.notificationService.success('Report generation started');
            },
            error: (error) => {
                console.error('Failed to trigger report:', error);
            }
        });
    }

    toggleReport(reportId: string, enabled: boolean) {
        this.schedulerService.toggleScheduledReport(reportId, enabled).subscribe({
            next: () => {
                this.loadScheduledReports();
            },
            error: (error) => {
                console.error('Failed to toggle report:', error);
            }
        });
    }

    deleteReport(reportId: string) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete this scheduled report?',
            header: 'Confirm Deletion',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.schedulerService.deleteScheduledReport(reportId).subscribe({
                    next: () => {
                        this.loadScheduledReports();
                        this.loadStatistics();
                    },
                    error: (error) => {
                        console.error('Failed to delete report:', error);
                    }
                });
            }
        });
    }

    viewHistory(reportId: string) {
        // Navigate to history view or open dialog
        console.log('View history for report:', reportId);
    }

    sendTestEmail() {
        if (!this.testEmails || this.testEmails.length === 0) return;

        this.testingEmail.set(true);

        this.schedulerService.testEmailDelivery(this.testEmails).pipe(
            finalize(() => this.testingEmail.set(false))
        ).subscribe({
            next: (result) => {
                this.showEmailTestDialog = false;
                this.testEmails = [];
            },
            error: (error) => {
                console.error('Email test failed:', error);
            }
        });
    }

    onTypeChange(event: any) {
        // Update schedule template based on type
        const templates = this.scheduleTemplates();
        const template = templates.find(t => t.type === event.value);
        if (template) {
            this.selectedScheduleTemplate = template.schedule;
            this.reportForm.patchValue({ schedule: template.schedule });
        }
    }

    onScheduleTemplateChange(event: any) {
        if (event.value) {
            this.reportForm.patchValue({ schedule: event.value });
        }
    }

    getSuccessRate(): number {
        const stats = this.statistics();
        if (!stats || stats.totalExecutions === 0) return 0;
        return Math.round((stats.successfulExecutions / stats.totalExecutions) * 100);
    }

    getLastExecutionTime(): string {
        const stats = this.statistics();
        if (!stats?.lastExecutionDate) return 'Never';

        const date = new Date(stats.lastExecutionDate);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}