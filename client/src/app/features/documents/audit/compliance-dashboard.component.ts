/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, startWith, switchMap } from 'rxjs/operators';
import { interval } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageModule } from 'primeng/message';

// Services and Models
import { AuditService } from '../../../core/services/audit.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuditAction, ReportType } from '../../../shared/models/document.models';

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
    CardModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    ChartModule,
    TableModule,
    TagModule,
    ProgressBarModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    ToggleSwitchModule,
    MessageModule
  ],
templateUrl: './compliance-dashboard.component.html',
styleUrls: ['./compliance-dashboard.component.scss'],
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
      labels: stats.dailyActivity?.map((item) => new Date(item.date).toLocaleDateString()) || [],
      datasets: [{
        label: 'Daily Activity',
        data: stats.dailyActivity?.map((item) => item.count) || [],
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

  checkThresholds(stats: {
    totalEntries: number;
    actionCounts: Record<AuditAction, number>;
    topUsers: Array<{ userId: string; userEmail: string; count: number }>;
    topDocuments: Array<{ documentId: string; documentTitle: string; count: number }>;
    dailyActivity: Array<{ date: string; count: number }>;
  }) {
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
    const params: {reportType: ReportType, includeDetails: boolean, dateRange?: { start: Date, end: Date }} = {
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

  getReportStatusSeverity(status: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    const severities: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
      'completed': 'success',
      'processing': 'warn',
      'failed': 'danger'
    };
    return severities[status] || 'info';
  }

  getThresholdSeverity(status: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    const severities: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
      'good': 'success',
      'warning': 'warn',
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
      [AuditAction.VERIFICATION_FAILED]: 'Verification Failed',
      [AuditAction.UPLOADED]: 'Uploaded',
      [AuditAction.REJECTED]: 'Rejected',
      [AuditAction.ARCHIVED]: 'Archived',
      [AuditAction.RESTORED]: 'Restored'
    };
    return labels[action] || action;
  }
}
