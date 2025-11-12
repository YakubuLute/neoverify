/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { Observable, interval, of, throwError } from 'rxjs';
import { switchMap, catchError, tap, filter } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';

export interface ScheduledReport {
    id: string;
    name: string;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    enabled: boolean;
    schedule: string; // Cron expression
    recipients: string[];
    filters?: {
        organizationId?: string;
        dateRange?: {
            start: Date;
            end: Date;
        };
        actions?: string[];
    };
    format: 'pdf' | 'csv' | 'excel';
    includeDetails: boolean;
    lastRun?: Date;
    nextRun?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReportScheduleConfig {
    name: string;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    schedule: string;
    recipients: string[];
    filters?: any;
    format: 'pdf' | 'csv' | 'excel';
    includeDetails: boolean;
}

export interface ScheduledReportExecution {
    id: string;
    reportId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    error?: string;
    downloadUrl?: string;
    fileSize?: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuditSchedulerService {
    private readonly http = inject(HttpClient);
    private readonly apiService = inject(ApiService);
    private readonly notificationService = inject(NotificationService);

    /**
     * Get all scheduled reports
     */
    getScheduledReports(): Observable<ScheduledReport[]> {
        return this.apiService.get<ScheduledReport[]>('audit/scheduled-reports').pipe(

            catchError(error => {
                console.error('Failed to load scheduled reports:', error);
                this.notificationService.error('Failed to load scheduled reports');
                return throwError(() => error);
            })
        );
    }

    /**
     * Create a new scheduled report
     */
    createScheduledReport(config: ReportScheduleConfig): Observable<ScheduledReport> {
        return this.apiService.post<ScheduledReport>('audit/scheduled-reports', config).pipe(

            tap(() => {
                this.notificationService.success('Scheduled report created successfully');
            }),
            catchError(error => {
                console.error('Failed to create scheduled report:', error);
                this.notificationService.error('Failed to create scheduled report');
                return throwError(() => error);
            })
        );
    }

    /**
     * Update an existing scheduled report
     */
    updateScheduledReport(reportId: string, config: Partial<ReportScheduleConfig>): Observable<ScheduledReport> {
        return this.apiService.put<ScheduledReport>(`audit/scheduled-reports/${reportId}`, config).pipe(

            tap(() => {
                this.notificationService.success('Scheduled report updated successfully');
            }),
            catchError(error => {
                console.error('Failed to update scheduled report:', error);
                this.notificationService.error('Failed to update scheduled report');
                return throwError(() => error);
            })
        );
    }

    /**
     * Delete a scheduled report
     */
    deleteScheduledReport(reportId: string): Observable<void> {
        return this.apiService.delete<void>(`audit/scheduled-reports/${reportId}`).pipe(

            tap(() => {
                this.notificationService.success('Scheduled report deleted successfully');
            }),
            catchError(error => {
                console.error('Failed to delete scheduled report:', error);
                this.notificationService.error('Failed to delete scheduled report');
                return throwError(() => error);
            })
        );
    }

    /**
     * Enable/disable a scheduled report
     */
    toggleScheduledReport(reportId: string, enabled: boolean): Observable<ScheduledReport> {
        return this.apiService.put<ScheduledReport>(`audit/scheduled-reports/${reportId}`, { enabled }).pipe(

            tap(() => {
                this.notificationService.success(
                    `Scheduled report ${enabled ? 'enabled' : 'disabled'} successfully`
                );
            }),
            catchError(error => {
                console.error('Failed to toggle scheduled report:', error);
                this.notificationService.error('Failed to update scheduled report');
                return throwError(() => error);
            })
        );
    }

    /**
     * Manually trigger a scheduled report
     */
    triggerScheduledReport(reportId: string): Observable<ScheduledReportExecution> {
        return this.apiService.post<ScheduledReportExecution>(`audit/scheduled-reports/${reportId}/trigger`, {}).pipe(

            tap(() => {
                this.notificationService.success('Report generation started');
            }),
            catchError(error => {
                console.error('Failed to trigger scheduled report:', error);
                this.notificationService.error('Failed to trigger report generation');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get execution history for a scheduled report
     */
    getReportExecutions(reportId: string, limit: number = 50): Observable<ScheduledReportExecution[]> {
        const params = new HttpParams().set('limit', limit.toString()) as any
        return this.apiService.get<ScheduledReportExecution[]>(
            `audit/scheduled-reports/${reportId}/executions`,
            params
        ).pipe(

            catchError(error => {
                console.error('Failed to load report executions:', error);
                this.notificationService.error('Failed to load report history');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get execution status
     */
    getExecutionStatus(executionId: string): Observable<ScheduledReportExecution> {
        return this.apiService.get<ScheduledReportExecution>(`audit/report-executions/${executionId}`).pipe(

            catchError(error => {
                console.error('Failed to load execution status:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Download a completed report
     */
    downloadReport(executionId: string): Observable<Blob> {
        return this.http.get(`${this.apiService.getBaseUrl()}/audit/report-executions/${executionId}/download`, {
            responseType: 'blob'
        }).pipe(
            tap(() => {
                this.notificationService.success('Report download started');
            }),
            catchError(error => {
                console.error('Failed to download report:', error);
                this.notificationService.error('Failed to download report');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get available schedule templates
     */
    getScheduleTemplates(): Observable<Array<{
        name: string;
        type: string;
        schedule: string;
        description: string;
    }>> {
        return of([
            {
                name: 'Daily at 6 AM',
                type: 'daily',
                schedule: '0 6 * * *',
                description: 'Runs every day at 6:00 AM'
            },
            {
                name: 'Weekly on Monday',
                type: 'weekly',
                schedule: '0 6 * * 1',
                description: 'Runs every Monday at 6:00 AM'
            },
            {
                name: 'Monthly on 1st',
                type: 'monthly',
                schedule: '0 6 1 * *',
                description: 'Runs on the 1st of every month at 6:00 AM'
            },
            {
                name: 'Quarterly',
                type: 'quarterly',
                schedule: '0 6 1 1,4,7,10 *',
                description: 'Runs on the 1st of January, April, July, and October at 6:00 AM'
            },
            {
                name: 'Annually',
                type: 'annual',
                schedule: '0 6 1 1 *',
                description: 'Runs on January 1st at 6:00 AM'
            }
        ]);
    }

    /**
     * Validate cron expression
     */
    validateCronExpression(cronExpression: string): Observable<{
        valid: boolean;
        nextRuns?: Date[];
        error?: string;
    }> {
        return this.apiService.post<{
            valid: boolean;
            nextRuns?: Date[];
            error?: string;
        }>('audit/validate-cron', { expression: cronExpression }).pipe(

            catchError(error => {
                console.error('Failed to validate cron expression:', error);
                return of({ valid: false, error: 'Invalid cron expression' });
            })
        );
    }

    /**
     * Get system-wide audit report settings
     */
    getAuditReportSettings(): Observable<{
        maxRetentionDays: number;
        maxFileSize: number;
        allowedFormats: string[];
        maxRecipientsPerReport: number;
        enableEmailNotifications: boolean;

    }> {
        return this.apiService.get<{
            maxRetentionDays: number;
            maxFileSize: number;
            allowedFormats: string[];
            maxRecipientsPerReport: number;
            enableEmailNotifications: boolean;
        }>('audit/report-settings').pipe(

            catchError(error => {
                console.error('Failed to load audit report settings:', error);
                return of({
                    maxRetentionDays: 90,
                    maxFileSize: 50 * 1024 * 1024, // 50MB
                    allowedFormats: ['pdf', 'csv', 'excel'],
                    maxRecipientsPerReport: 10,
                    enableEmailNotifications: true
                });
            })
        );
    }

    /**
     * Update audit report settings
     */
    updateAuditReportSettings(settings: any): Observable<void> {
        return this.apiService.put<void>('audit/report-settings', settings).pipe(

            tap(() => {
                this.notificationService.success('Audit report settings updated successfully');
            }),
            catchError(error => {
                console.error('Failed to update audit report settings:', error);
                this.notificationService.error('Failed to update settings');
                return throwError(() => error);
            })
        );
    }

    /**
     * Start monitoring scheduled reports (for real-time updates)
     */
    startReportMonitoring(): Observable<ScheduledReportExecution> {
        return interval(30000).pipe( // Check every 30 seconds
            switchMap(() => this.apiService.get<ScheduledReportExecution[]>('audit/active-executions')),

            switchMap(executions => executions),
            filter(execution => execution.status === 'completed' || execution.status === 'failed'),
            tap(execution => {
                if (execution.status === 'completed') {
                    this.notificationService.success(`Report "${execution.reportId}" completed successfully`);
                } else if (execution.status === 'failed') {
                    this.notificationService.error(`Report "${execution.reportId}" failed: ${execution.error}`);
                }
            }),
            catchError(error => {
                console.error('Report monitoring error:', error);
                return of(); // Continue monitoring despite errors
            })
        );
    }

    /**
     * Get report generation statistics
     */
    getReportStatistics(): Observable<{
        totalReports: number;
        activeReports: number;
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageExecutionTime: number;
        lastExecutionDate?: Date;
    }> {
        return this.apiService.get<{
            totalReports: number;
            activeReports: number;
            totalExecutions: number;
            successfulExecutions: number;
            failedExecutions: number;
            averageExecutionTime: number;
            lastExecutionDate?: Date;
        }>('audit/report-statistics').pipe(

            catchError(error => {
                console.error('Failed to load report statistics:', error);
                return of({
                    totalReports: 0,
                    activeReports: 0,
                    totalExecutions: 0,
                    successfulExecutions: 0,
                    failedExecutions: 0,
                    averageExecutionTime: 0
                });
            })
        );
    }

    /**
     * Test email delivery for scheduled reports
     */
    testEmailDelivery(recipients: string[]): Observable<{
        success: boolean;
        results: Array<{
            email: string;
            delivered: boolean;
            error?: string;
        }>;
    }> {
        return this.apiService.post<{
            success: boolean;
            results: Array<{
                email: string;
                delivered: boolean;
                error?: string;
            }>;
        }>('audit/test-email', { recipients }).pipe(

            tap(result => {
                const successful = result.results.filter(r => r.delivered).length;
                const total = result.results.length;
                this.notificationService.success(`Email test completed: ${successful}/${total} delivered`);
            }),
            catchError(error => {
                console.error('Failed to test email delivery:', error);
                this.notificationService.error('Email test failed');
                return throwError(() => error);
            })
        );
    }
}
