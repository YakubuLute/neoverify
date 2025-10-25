import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
    AuditEntry,
    AuditAction
} from '../../shared/models/document.models';
import { PaginatedResponse, QueryParams } from '../../shared/models/common.models';

@Injectable({
    providedIn: 'root'
})
export class AuditService {
    private readonly apiService = inject(ApiService);
    private readonly notificationService = inject(NotificationService);

    /**
     * Log audit entry
     */
    logAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Observable<AuditEntry> {
        return this.apiService.post<AuditEntry>('audit/log', entry).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Failed to log audit entry:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Get audit trail for specific document
     */
    getDocumentAuditTrail(documentId: string, params?: QueryParams): Observable<PaginatedResponse<AuditEntry>> {
        return this.apiService.get<PaginatedResponse<AuditEntry>>(`audit/documents/${documentId}`, params as any).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load document audit trail');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get audit trail for specific user
     */
    getUserAuditTrail(userId: string, params?: QueryParams): Observable<PaginatedResponse<AuditEntry>> {
        return this.apiService.get<PaginatedResponse<AuditEntry>>(`audit/users/${userId}`, params as any).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load user audit trail');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get organization audit trail
     */
    getOrganizationAuditTrail(organizationId: string, params?: QueryParams): Observable<PaginatedResponse<AuditEntry>> {
        return this.apiService.get<PaginatedResponse<AuditEntry>>(`audit/organizations/${organizationId}`, params as any).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load organization audit trail');
                return throwError(() => error);
            })
        );
    }

    /**
     * Search audit entries
     */
    searchAuditEntries(searchParams: {
        query?: string;
        actions?: AuditAction[];
        dateRange?: {
            start: Date;
            end: Date;
        };
        userIds?: string[];
        documentIds?: string[];
    }, params?: QueryParams): Observable<PaginatedResponse<AuditEntry>> {
        const requestParams = {
            ...params,
            ...searchParams
        };

        return this.apiService.get<PaginatedResponse<AuditEntry>>('audit/search', requestParams as any).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Audit search failed. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Export audit trail
     */
    exportAuditTrail(filters: {
        documentIds?: string[];
        userIds?: string[];
        actions?: AuditAction[];
        dateRange?: {
            start: Date;
            end: Date;
        };
    }, format: 'csv' | 'excel' | 'pdf'): Observable<Blob> {
        const exportData = {
            ...filters,
            format
        };

        return this.apiService.post<Blob>('audit/export', exportData, { responseType: 'blob' }).pipe(
            tap(() => {
                this.notificationService.success('Audit trail export completed successfully');
            }),
            catchError(error => {
                this.notificationService.error('Audit trail export failed. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get audit statistics
     */
    getAuditStatistics(filters?: {
        dateRange?: {
            start: Date;
            end: Date;
        };
        organizationId?: string;
    }): Observable<{
        totalEntries: number;
        actionCounts: Record<AuditAction, number>;
        topUsers: Array<{ userId: string; userEmail: string; count: number }>;
        topDocuments: Array<{ documentId: string; documentTitle: string; count: number }>;
        dailyActivity: Array<{ date: string; count: number }>;
    }> {
        return this.apiService.get<any>('audit/statistics', filters as any).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load audit statistics');
                return throwError(() => error);
            })
        );
    }

    /**
     * Generate compliance report
     */
    generateComplianceReport(params: {
        reportType: 'monthly' | 'quarterly' | 'annual' | 'custom';
        dateRange?: {
            start: Date;
            end: Date;
        };
        organizationId?: string;
        includeDetails?: boolean;
    }): Observable<Blob> {
        return this.apiService.post<Blob>('audit/compliance-report', params, { responseType: 'blob' }).pipe(
            tap(() => {
                this.notificationService.success('Compliance report generated successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to generate compliance report. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get retention policy settings
     */
    getRetentionPolicy(): Observable<{
        retentionPeriodYears: number;
        autoDeleteEnabled: boolean;
        lastCleanupDate?: Date;
    }> {
        return this.apiService.get<any>('audit/retention-policy').pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load retention policy');
                return throwError(() => error);
            })
        );
    }

    /**
     * Update retention policy settings
     */
    updateRetentionPolicy(policy: {
        retentionPeriodYears: number;
        autoDeleteEnabled: boolean;
    }): Observable<void> {
        return this.apiService.put<void>('audit/retention-policy', policy).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Retention policy updated successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to update retention policy. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Manually trigger audit cleanup
     */
    triggerAuditCleanup(): Observable<{
        deletedEntries: number;
        cleanupDate: Date;
    }> {
        return this.apiService.post<any>('audit/cleanup', {}).pipe(
            map(response => response.data),
            tap(result => {
                this.notificationService.success(`Audit cleanup completed. ${result.deletedEntries} entries removed.`);
            }),
            catchError(error => {
                this.notificationService.error('Audit cleanup failed. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Log document view action
     */
    logDocumentView(documentId: string): Observable<void> {
        return this.logAuditEntry({
            documentId,
            action: AuditAction.VIEWED,
            userId: '', // Will be filled by the service
            userEmail: '', // Will be filled by the service
            details: {
                timestamp: new Date(),
                userAgent: navigator.userAgent
            }
        }).pipe(
            map(() => void 0),
            catchError(() => of(void 0)) // Silent fail for view logging
        );
    }

    /**
     * Log document download action
     */
    logDocumentDownload(documentId: string): Observable<void> {
        return this.logAuditEntry({
            documentId,
            action: AuditAction.DOWNLOADED,
            userId: '', // Will be filled by the service
            userEmail: '', // Will be filled by the service
            details: {
                timestamp: new Date(),
                userAgent: navigator.userAgent
            }
        }).pipe(
            map(() => void 0),
            catchError(() => of(void 0)) // Silent fail for download logging
        );
    }

    /**
     * Log document share action
     */
    logDocumentShare(documentId: string, sharedWithEmails: string[]): Observable<void> {
        return this.logAuditEntry({
            documentId,
            action: AuditAction.SHARED,
            userId: '', // Will be filled by the service
            userEmail: '', // Will be filled by the service
            details: {
                sharedWith: sharedWithEmails,
                timestamp: new Date()
            }
        }).pipe(
            map(() => void 0),
            catchError(() => of(void 0)) // Silent fail for share logging
        );
    }

    /**
     * Log permission change action
     */
    logPermissionChange(documentId: string, changes: any): Observable<void> {
        return this.logAuditEntry({
            documentId,
            action: AuditAction.PERMISSION_CHANGED,
            userId: '', // Will be filled by the service
            userEmail: '', // Will be filled by the service
            details: {
                changes,
                timestamp: new Date()
            }
        }).pipe(
            map(() => void 0),
            catchError(() => of(void 0)) // Silent fail for permission logging
        );
    }
}

// Helper function to import 'of' operator
import { of } from 'rxjs';