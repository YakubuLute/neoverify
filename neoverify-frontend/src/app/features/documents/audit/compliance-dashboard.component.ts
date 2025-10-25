import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, startWith, switchMap } from 'rxjs/operators';
import { interval } from 'rxjs';

// PrimeNG Imports
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Chart } from 'primeng/chart';
import { Table } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ProgressBar } from 'primeng/progressbar';
import { Tooltip } from 'primeng/tooltip';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { ToggleButton } from 'primeng/togglebutton';
import { Message } from 'primeng/message';

// Services and Models
import { AuditService } from '../../../core/services/audit.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuditAction } from '../../../shared/models/document.models';

interface ComplianceMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface ComplianceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired: boolean;
}

interface RetentionPolicy {
  retentionPeriodYears: number;
  autoDeleteEnabled: boolean;
  lastCleanupDate?: Date;
}

@Component({
  selector: 'app-compliance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Card,
    Button,
    Select,
    DatePicker,
    Chart,
    Table,
    Tag,
    ProgressBar,
    Tooltip,
    Dialog,
    InputText,
    InputNumber,
    ToggleButton,
    Message
  ],
  template: `
    <div class="compliance-dashboard-container p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Compliance Dashboard</h1>
          <p class="text-gray-400">Monitor compliance metrics and audit trail health</p>
        </div>
        <div class="flex gap-3">
          <p-button
            label="View Audit Trail"
            icon="pi pi-list"
            [outlined]="true"
            (click)="navigateToAuditTrail()"
          />
          <p-button
            label="Settings"
            icon="pi pi-cog"
            (click)="showSettingsDialog = true"
          />
        </div>
      </div>

      <!-- Alerts Section -->
      <div class="mb-6" *ngIf="alerts().length > 0">
        <h2 class="text-xl font-semibold text-white mb-4">Active Alerts</h2>
        <div class="grid grid-cols-1 gap-3">
          <div
            *ngFor="let alert of alerts()"
            class="flex items-center justify-between p-4 rounded-lg border"
            [ngClass]="{
              'bg-red-900/20 border-red-500/30': alert.type === 'critical',
              'bg-yellow-900/20 border-yellow-500/30': alert.type === 'warning',
              'bg-blue-900/20 border-blue-500/30': alert.type === 'info'
            }"
          >
            <div class="flex items-center gap-3">
              <i
                class="text-2xl"
                [ngClass]="{
                  'pi pi-exclamation-triangle text-red-400': alert.type === 'critical',
                  'pi pi-exclamation-circle text-yellow-400': alert.type === 'warning',
                  'pi pi-info-circle text-blue-400': alert.type === 'info'
                }"
              ></i>
              <div>
                <h3 class="font-semibold text-white">{{ alert.title }}</h3>
                <p class="text-sm text-gray-300">{{ alert.message }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ alert.timestamp | date:'short' }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <p-button
                label="Acknowledge"
                size="small"
                [outlined]="true"
                (click)="acknowledgeAlert(alert.id)"
                *ngIf="!alert.acknowledged"
              />
              <p-button
                label="Dismiss"
                size="small"
                severity="secondary"
                [text]="true"
                (click)="dismissAlert(alert.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Compliance Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div
          *ngFor="let metric of complianceMetrics()"
          class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">{{ metric.name }}</h3>
            <i
              class="text-2xl"
              [ngClass]="{
                'pi pi-check-circle text-green-400': metric.status === 'good',
                'pi pi-exclamation-triangle text-yellow-400': metric.status === 'warning',
                'pi pi-times-circle text-red-400': metric.status === 'critical'
              }"
            ></i>
          </div>

          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl font-bold text-white">{{ metric.value | number }}</span>
              <span class="text-sm text-gray-400">/ {{ metric.target | number }}</span>
            </div>
            <p-progressBar
              [value]="getProgressPercentage(metric)"
              [showValue]="false"
              styleClass="h-2"
              [ngClass]="{
                'progress-good': metric.status === 'good',
                'progress-warning': metric.status === 'warning',
                'progress-critical': metric.status === 'critical'
              }"
            />
          </div>

          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-400">{{ metric.description }}</p>
            <div class="flex items-center gap-1">
              <i
                class="text-sm"
                [ngClass]="{
                  'pi pi-arrow-up text-green-400': metric.trend === 'up',
                  'pi pi-arrow-down text-red-400': metric.trend === 'down',
                  'pi pi-minus text-gray-400': metric.trend === 'stable'
                }"
              ></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Activity Chart -->
        <p-card header="Audit Activity Trend" styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          <p-chart
            type="line"
            [data]="activityChartData()"
            [options]="chartOptions"
            width="100%"
            height="300px"
          />
        </p-card>

        <!-- Action Distribution -->
        <p-card header="Action Distribution" styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          <p-chart
            type="doughnut"
            [data]="actionDistributionData()"
            [options]="doughnutOptions"
            width="100%"
            height="300px"
          />
        </p-card>
      </div>

      <!-- Compliance Reports -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Recent Reports -->
        <p-card header="Recent Compliance Reports" styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          <p-table [value]="recentReports()" [paginator]="false" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Report Type</th>
                <th>Generated</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-report>
              <tr>
                <td>{{ report.type }}</td>
                <td>{{ report.generatedAt | date:'short' }}</td>
                <td>
                  <p-tag
                    [value]="report.status"
                    [severity]="getReportStatusSeverity(report.status)"
                  />
                </td>
                <td>
                  <p-button
                    icon="pi pi-download"
                    [text]="true"
                    size="small"
                    (click)="downloadReport(report.id)"
                    pTooltip="Download report"
                  />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="4" class="text-center py-4">
                  <p class="text-gray-400">No reports generated yet</p>
                </td>
              </tr>
            </ng-template>
          </p-table>

          <div class="flex justify-end mt-4">
            <p-button
              label="Generate New Report"
              icon="pi pi-plus"
              (click)="showReportDialog = true"
            />
          </div>
        </p-card>

        <!-- Retention Policy Status -->
        <p-card header="Data Retention Policy" styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          <div class="space-y-4" *ngIf="retentionPolicy()">
            <div class="flex justify-between items-center">
              <span class="text-gray-300">Retention Period</span>
              <span class="text-white font-semibold">{{ retentionPolicy()?.retentionPeriodYears }} years</span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-gray-300">Auto-Delete</span>
              <p-tag
                [value]="retentionPolicy()?.autoDeleteEnabled ? 'Enabled' : 'Disabled'"
                [severity]="retentionPolicy()?.autoDeleteEnabled ? 'success' : 'warning'"
              />
            </div>

            <div class="flex justify-between items-center" *ngIf="retentionPolicy()?.lastCleanupDate">
              <span class="text-gray-300">Last Cleanup</span>
              <span class="text-white">{{ retentionPolicy()?.lastCleanupDate | date:'short' }}</span>
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <p-button
                label="Configure"
                [outlined]="true"
                (click)="showRetentionDialog = true"
              />
              <p-button
                label="Run Cleanup"
                severity="warn"
                (click)="runCleanup()"
                [loading]="runningCleanup()"
              />
            </div>
          </div>
        </p-card>
      </div>

      <!-- Threshold Monitoring -->
      <p-card header="Compliance Thresholds" styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let threshold of complianceThresholds()"
            class="p-4 border border-gray-600 rounded-lg"
          >
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-semibold text-white">{{ threshold.name }}</h4>
              <p-tag
                [value]="threshold.status"
                [severity]="getThresholdSeverity(threshold.status)"
              />
            </div>
            <p class="text-sm text-gray-400 mb-3">{{ threshold.description }}</p>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-300">Current: {{ threshold.current }}</span>
              <span class="text-sm text-gray-300">Limit: {{ threshold.limit }}</span>
            </div>
            <p-progressBar
              [value]="(threshold.current / threshold.limit) * 100"
              [showValue]="false"
              styleClass="h-2 mt-2"
            />
          </div>
        </div>
      </p-card>

      <!-- Settings Dialog -->
      <p-dialog
        header="Compliance Settings"
        [(visible)]="showSettingsDialog"
        [modal]="true"
        [style]="{ width: '600px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <form [formGroup]="settingsForm" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Alert Thresholds</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-400">Failed Verifications (%)</label>
                <p-inputNumber
                  formControlName="failedVerificationThreshold"
                  [min]="0"
                  [max]="100"
                  suffix="%"
                  styleClass="w-full"
                />
              </div>
              <div>
                <label class="text-xs text-gray-400">Storage Usage (%)</label>
                <p-inputNumber
                  formControlName="storageThreshold"
                  [min]="0"
                  [max]="100"
                  suffix="%"
                  styleClass="w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Monitoring Settings</label>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-300">Real-time Monitoring</span>
                <p-toggleButton
                  formControlName="realTimeMonitoring"
                  onLabel="Enabled"
                  offLabel="Disabled"
                />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-300">Email Alerts</span>
                <p-toggleButton
                  formControlName="emailAlerts"
                  onLabel="Enabled"
                  offLabel="Disabled"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (click)="showSettingsDialog = false"
            />
            <p-button
              label="Save Settings"
              (click)="saveSettings()"
              [loading]="savingSettings()"
            />
          </div>
        </form>
      </p-dialog>

      <!-- Retention Policy Dialog -->
      <p-dialog
        header="Configure Retention Policy"
        [(visible)]="showRetentionDialog"
        [modal]="true"
        [style]="{ width: '500px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <form [formGroup]="retentionForm" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Retention Period (Years)</label>
            <p-inputNumber
              formControlName="retentionPeriodYears"
              [min]="1"
              [max]="50"
              styleClass="w-full"
            />
            <small class="text-gray-400">Audit logs will be retained for this period</small>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Auto-Delete Expired Logs</label>
              <p class="text-xs text-gray-400">Automatically delete logs older than retention period</p>
            </div>
            <p-toggleButton
              formControlName="autoDeleteEnabled"
              onLabel="Enabled"
              offLabel="Disabled"
            />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (click)="showRetentionDialog = false"
            />
            <p-button
              label="Update Policy"
              (click)="updateRetentionPolicy()"
              [loading]="updatingRetention()"
            />
          </div>
        </form>
      </p-dialog>

      <!-- Report Generation Dialog -->
      <p-dialog
        header="Generate Compliance Report"
        [(visible)]="showReportDialog"
        [modal]="true"
        [style]="{ width: '500px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <form [formGroup]="reportForm" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Report Type</label>
            <p-select
              formControlName="reportType"
              [options]="reportTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select report type"
              styleClass="w-full"
            />
          </div>

          <div *ngIf="reportForm.get('reportType')?.value === 'custom'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Start Date</label>
              <p-datepicker
                formControlName="startDate"
                [showIcon]="true"
                placeholder="Start date"
                styleClass="w-full"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">End Date</label>
              <p-datepicker
                formControlName="endDate"
                [showIcon]="true"
                placeholder="End date"
                styleClass="w-full"
              />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-300">Include Detailed Logs</span>
            <p-toggleButton
              formControlName="includeDetails"
              onLabel="Yes"
              offLabel="No"
            />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (click)="showReportDialog = false"
            />
            <p-button
              label="Generate"
              (click)="generateReport()"
              [loading]="generatingReport()"
            />
          </div>
        </form>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }

    .compliance-dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    ::ng-deep .progress-good .p-progressbar-value {
      background: #10b981 !important;
    }

    ::ng-deep .progress-warning .p-progressbar-value {
      background: #f59e0b !important;
    }

    ::ng-deep .progress-critical .p-progressbar-value {
      background: #ef4444 !important;
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
      background: rgba(31, 41, 55, 0.3) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.2) !important;
    }

    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: rgba(17, 24, 39, 0.5) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
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
export class ComplianceDashboardComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Signals
  complianceMetrics = signal<ComplianceMetric[]>([]);
  alerts = signal<ComplianceAlert[]>([]);
  retentionPolicy = signal<RetentionPolicy | null>(null);
  recentReports = signal<any[]>([]);
  complianceThresholds = signal<any[]>([]);
  activityChartData = signal<any>(null);
  actionDistributionData = signal<any>(null);

  // Loading states
  runningCleanup = signal(false);
  savingSettings = signal(false);
  updatingRetention = signal(false);
  generatingReport = signal(false);

  // Dialog states
  showSettingsDialog = false;
  showRetentionDialog = false;
  showReportDialog = false;

  // Forms
  settingsForm: FormGroup;
  retentionForm: FormGroup;
  reportForm: FormGroup;

  // Chart options
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#f3f4f6'
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      },
      y: {
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      }
    }
  };

  doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#f3f4f6'
        }
      }
    }
  };

  reportTypeOptions = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Annual', value: 'annual' },
    { label: 'Custom Range', value: 'custom' }
  ];

  constructor() {
    this.settingsForm = this.fb.group({
      failedVerificationThreshold: [10],
      storageThreshold: [85],
      realTimeMonitoring: [true],
      emailAlerts: [true]
    });

    this.retentionForm = this.fb.group({
      retentionPeriodYears: [7],
      autoDeleteEnabled: [false]
    });

    this.reportForm = this.fb.group({
      reportType: ['monthly'],
      startDate: [null],
      endDate: [null],
      includeDetails: [false]
    });
  }

  ngOnInit() {
    this.loadDashboardData();
    this.loadRetentionPolicy();
    this.setupRealTimeUpdates();
  }

  loadDashboardData() {
    // Load compliance metrics
    this.loadComplianceMetrics();

    // Load audit statistics for charts
    this.auditService.getAuditStatistics().subscribe({
      next: (stats) => {
        this.updateChartData(stats);
      },
      error: (error) => {
        console.error('Failed to load audit statistics:', error);
      }
    });

    // Load alerts
    this.loadAlerts();

    // Load recent reports
    this.loadRecentReports();

    // Load compliance thresholds
    this.loadComplianceThresholds();
  }

  loadComplianceMetrics() {
    // Mock compliance metrics - in real app, this would come from API
    const metrics: ComplianceMetric[] = [
      {
        id: 'audit-coverage',
        name: 'Audit Coverage',
        value: 98.5,
        target: 100,
        status: 'good',
        trend: 'up',
        description: 'Percentage of operations logged'
      },
      {
        id: 'retention-compliance',
        name: 'Retention Compliance',
        value: 95.2,
        target: 100,
        status: 'good',
        trend: 'stable',
        description: 'Data retention policy adherence'
      },
      {
        id: 'access-violations',
        name: 'Access Violations',
        value: 3,
        target: 0,
        status: 'warning',
        trend: 'down',
        description: 'Unauthorized access attempts'
      },
      {
        id: 'data-integrity',
        name: 'Data Integrity',
        value: 99.8,
        target: 100,
        status: 'good',
        trend: 'up',
        description: 'Audit log integrity score'
      }
    ];

    this.complianceMetrics.set(metrics);
  }

  loadAlerts() {
    // Mock alerts - in real app, this would come from API
    const alerts: ComplianceAlert[] = [
      {
        id: '1',
        type: 'warning',
        title: 'High Failed Verification Rate',
        message: 'Failed verification rate has exceeded 15% in the last 24 hours',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        acknowledged: false,
        actionRequired: true
      },
      {
        id: '2',
        type: 'info',
        title: 'Scheduled Cleanup Complete',
        message: 'Automated audit log cleanup completed successfully',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        acknowledged: false,
        actionRequired: false
      }
    ];

    this.alerts.set(alerts);
  }

  loadRecentReports() {
    // Mock recent reports - in real app, this would come from API
    const reports = [
      {
        id: '1',
        type: 'Monthly Compliance',
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: '2',
        type: 'Quarterly Audit',
        generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'completed'
      }
    ];

    this.recentReports.set(reports);
  }

  loadComplianceThresholds() {
    // Mock thresholds - in real app, this would come from API
    const thresholds = [
      {
        id: 'failed-verifications',
        name: 'Failed Verifications',
        description: 'Daily failed verification rate',
        current: 8,
        limit: 10,
        status: 'good'
      },
      {
        id: 'storage-usage',
        name: 'Storage Usage',
        description: 'Audit log storage utilization',
        current: 78,
        limit: 85,
        status: 'warning'
      },
      {
        id: 'access-attempts',
        name: 'Unauthorized Access',
        description: 'Failed access attempts per hour',
        current: 2,
        limit: 5,
        status: 'good'
      }
    ];

    this.complianceThresholds.set(thresholds);
  }

  loadRetentionPolicy() {
    this.auditService.getRetentionPolicy().subscribe({
      next: (policy) => {
        this.retentionPolicy.set(policy);
        this.retentionForm.patchValue(policy);
      },
      error: (error) => {
        console.error('Failed to load retention policy:', error);
      }
    });
  }

  updateChartData(stats: {
    totalEntries: number;
    actionCounts: Record<AuditAction, number>;
    topUsers: Array<{ userId: string; userEmail: string; count: number }>;
    topDocuments: Array<{ documentId: string; documentTitle: string; count: number }>;
    dailyActivity: Array<{ date: string; count: number }>;
  }) {
    // Activity chart data
    const activityData = {
      labels: stats.dailyActivity?.map((item) => new Date(item.date.date).toLocaleDateString()) || [],
      datasets: [{
        label: 'Daily Activity',
        data: stats.dailyActivity?.map((item: any) => item.count) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }]
    };

    // Action distribution data
    const actionData = {
      labels: Object.keys(stats.actionCounts || {}).map(action => this.getActionLabel(action as AuditAction)),
      datasets: [{
        data: Object.values(stats.actionCounts || {}),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
          '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ]
      }]
    };

    this.activityChartData.set(activityData);
    this.actionDistributionData.set(actionData);
  }

  setupRealTimeUpdates() {
    // Update dashboard every 5 minutes
    interval(5 * 60 * 1000).pipe(
      startWith(0),
      switchMap(() => this.auditService.getAuditStatistics())
    ).subscribe({
      next: (stats) => {
        this.updateChartData(stats);
        this.checkThresholds(stats);
      },
      error: (error) => {
        console.error('Real-time update failed:', error);
      }
    });
  }

  checkThresholds(stats: any) {
    // Check for threshold violations and generate alerts
    // This would be more sophisticated in a real implementation
  }

  navigateToAuditTrail() {
    this.router.navigate(['/documents/audit']);
  }

  acknowledgeAlert(alertId: string) {
    const alerts = this.alerts();
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    this.alerts.set(updatedAlerts);
    this.notificationService.success('Alert acknowledged');
  }

  dismissAlert(alertId: string) {
    const alerts = this.alerts();
    const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
    this.alerts.set(updatedAlerts);
  }

  runCleanup() {
    this.runningCleanup.set(true);

    this.auditService.triggerAuditCleanup().pipe(
      finalize(() => this.runningCleanup.set(false))
    ).subscribe({
      next: (result) => {
        this.notificationService.success(`Cleanup completed. ${result.deletedEntries} entries removed.`);
        this.loadRetentionPolicy(); // Refresh policy data
      },
      error: (error) => {
        console.error('Cleanup failed:', error);
        this.notificationService.error('Cleanup failed. Please try again.');
      }
    });
  }

  saveSettings() {
    this.savingSettings.set(true);

    // Mock save - in real app, this would call API
    setTimeout(() => {
      this.savingSettings.set(false);
      this.showSettingsDialog = false;
      this.notificationService.success('Settings saved successfully');
    }, 1000);
  }

  updateRetentionPolicy() {
    this.updatingRetention.set(true);

    const policy = this.retentionForm.value;
    this.auditService.updateRetentionPolicy(policy).pipe(
      finalize(() => this.updatingRetention.set(false))
    ).subscribe({
      next: () => {
        this.showRetentionDialog = false;
        this.loadRetentionPolicy();
      },
      error: (error) => {
        console.error('Failed to update retention policy:', error);
      }
    });
  }

  generateReport() {
    this.generatingReport.set(true);

    const formValue = this.reportForm.value;
    const params: any = {
      reportType: formValue.reportType,
      includeDetails: formValue.includeDetails
    };

    if (formValue.reportType === 'custom' && formValue.startDate && formValue.endDate) {
      params.dateRange = {
        start: formValue.startDate,
        end: formValue.endDate
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
        this.loadRecentReports(); // Refresh reports list
      },
      error: (error) => {
        console.error('Report generation failed:', error);
      }
    });
  }

  downloadReport(reportId: string) {
    // Mock download - in real app, this would call API
    this.notificationService.success('Report download started');
  }

  getProgressPercentage(metric: ComplianceMetric): number {
    return Math.min((metric.value / metric.target) * 100, 100);
  }

  getReportStatusSeverity(status: string): string {
    const severities: Record<string, string> = {
      'completed': 'success',
      'processing': 'warning',
      'failed': 'danger'
    };
    return severities[status] || 'info';
  }

  getThresholdSeverity(status: string): string {
    const severities: Record<string, string> = {
      'good': 'success',
      'warning': 'warning',
      'critical': 'danger'
    };
    return severities[status] || 'info';
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
}