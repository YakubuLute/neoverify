import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, throwError, timer } from 'rxjs';
import { map, catchError, tap, switchMap, takeUntil } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
    DocumentStatus,
    DocumentStatusHistory,
    StatusTransition,
    StatusTrigger,
    VerificationProgress,
    VerificationStage,
    VerificationHistoryEntry,
    StatusNotification,
    NotificationType,
    VerificationError,
    RemediationStep
} from '../../shared/models/document.models';

@Injectable({
    providedIn: 'root'
})
export class DocumentStatusService {
    private readonly apiService = inject(ApiService);
    private readonly notificationService = inject(NotificationService);

    // Status tracking signals
    private readonly statusHistorySubject = new BehaviorSubject<DocumentStatusHistory[]>([]);
    private readonly verificationProgressSubject = new BehaviorSubject<Map<string, VerificationProgress>>(new Map());
    private readonly notificationsSubject = new BehaviorSubject<StatusNotification[]>([]);

    // Public observables
    readonly statusHistory$ = this.statusHistorySubject.asObservable();
    readonly verificationProgress$ = this.verificationProgressSubject.asObservable();
    readonly notifications$ = this.notificationsSubject.asObservable();

    // Signals for reactive UI
    readonly activeVerifications = signal<Map<string, VerificationProgress>>(new Map());
    readonly unreadNotifications = signal<number>(0);

    constructor() {
        this.initializeStatusTracking();
    }

    /**
     * Initialize status tracking and start polling for updates
     */
    private initializeStatusTracking(): void {
        // Poll for verification progress updates every 5 seconds
        timer(0, 5000).pipe(
            switchMap(() => this.pollVerificationProgress()),
            catchError(error => {
                console.error('Error polling verification progress:', error);
                return [];
            })
        ).subscribe();

        // Poll for notifications every 30 seconds
        timer(0, 30000).pipe(
            switchMap(() => this.pollNotifications()),
            catchError(error => {
                console.error('Error polling notifications:', error);
                return [];
            })
        ).subscribe();
    }

    /**
     * Update document status with validation and history tracking
     */
    updateDocumentStatus(
        documentId: string,
        newStatus: DocumentStatus,
        reason?: string,
        metadata?: Record<string, any>
    ): Observable<void> {
        const updateData = {
            status: newStatus,
            reason,
            metadata,
            triggeredBy: StatusTrigger.MANUAL
        };

        return this.apiService.put<void>(`documents/${documentId}/status`, updateData).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Document status updated successfully');
                this.refreshStatusHistory(documentId);
            }),
            catchError(error => {
                this.notificationService.error('Failed to update document status. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get status history for a document
     */
    getDocumentStatusHistory(documentId: string): Observable<DocumentStatusHistory[]> {
        return this.apiService.get<DocumentStatusHistory[]>(`documents/${documentId}/status-history`).pipe(
            map(response => response.data),
            tap(history => {
                this.statusHistorySubject.next(history);
            }),
            catchError(error => {
                this.notificationService.error('Failed to load status history');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get allowed status transitions for a document
     */
    getAllowedStatusTransitions(documentId: string, currentStatus: DocumentStatus): Observable<StatusTransition[]> {
        return this.apiService.get<StatusTransition[]>(`documents/${documentId}/allowed-transitions`, {
            currentStatus
        } as any).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Failed to load allowed transitions:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Start verification process for a document
     */
    startVerification(documentId: string, options?: { forensicsEnabled?: boolean }): Observable<string> {
        return this.apiService.post<{ verificationId: string }>(`documents/${documentId}/verify`, options || {}).pipe(
            map(response => response.data.verificationId),
            tap(verificationId => {
                this.notificationService.info('Verification process started');
                this.startVerificationTracking(documentId, verificationId);
            }),
            catchError(error => {
                this.notificationService.error('Failed to start verification. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get verification progress for a document
     */
    getVerificationProgress(documentId: string): Observable<VerificationProgress | null> {
        return this.apiService.get<VerificationProgress>(`documents/${documentId}/verification-progress`).pipe(
            map(response => response.data),
            tap(progress => {
                if (progress) {
                    const currentProgress = this.verificationProgressSubject.value;
                    currentProgress.set(documentId, progress);
                    this.verificationProgressSubject.next(currentProgress);
                    this.activeVerifications.set(currentProgress);
                }
            }),
            catchError(error => {
                console.error('Failed to get verification progress:', error);
                return throwError(() => null);
            })
        );
    }

    /**
     * Get verification history for a document
     */
    getVerificationHistory(documentId: string): Observable<VerificationHistoryEntry[]> {
        return this.apiService.get<VerificationHistoryEntry[]>(`documents/${documentId}/verification-history`).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load verification history');
                return throwError(() => error);
            })
        );
    }

    /**
     * Retry failed verification
     */
    retryVerification(documentId: string, verificationId: string): Observable<string> {
        return this.apiService.post<{ verificationId: string }>(`documents/${documentId}/verification/${verificationId}/retry`, {}).pipe(
            map(response => response.data.verificationId),
            tap(newVerificationId => {
                this.notificationService.info('Verification retry initiated');
                this.startVerificationTracking(documentId, newVerificationId);
            }),
            catchError(error => {
                this.notificationService.error('Failed to retry verification. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Cancel ongoing verification
     */
    cancelVerification(documentId: string, verificationId: string): Observable<void> {
        return this.apiService.post<void>(`documents/${documentId}/verification/${verificationId}/cancel`, {}).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Verification cancelled');
                this.stopVerificationTracking(documentId);
            }),
            catchError(error => {
                this.notificationService.error('Failed to cancel verification. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get remediation steps for verification errors
     */
    getRemediationSteps(documentId: string, errorCode: string): Observable<RemediationStep[]> {
        return this.apiService.get<RemediationStep[]>(`documents/${documentId}/remediation`, {
            errorCode
        } as any).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Failed to get remediation steps:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Execute remediation action
     */
    executeRemediationAction(documentId: string, actionId: string, parameters?: Record<string, any>): Observable<void> {
        return this.apiService.post<void>(`documents/${documentId}/remediation/${actionId}/execute`, parameters || {}).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Remediation action executed successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to execute remediation action. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get status notifications for the current user
     */
    getStatusNotifications(): Observable<StatusNotification[]> {
        return this.apiService.get<StatusNotification[]>('notifications/status').pipe(
            map(response => response.data),
            tap(notifications => {
                this.notificationsSubject.next(notifications);
                this.updateUnreadCount(notifications);
            }),
            catchError(error => {
                console.error('Failed to load notifications:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Mark notification as read
     */
    markNotificationAsRead(notificationId: string): Observable<void> {
        return this.apiService.put<void>(`notifications/${notificationId}/read`, {}).pipe(
            map(response => response.data),
            tap(() => {
                this.refreshNotifications();
            }),
            catchError(error => {
                console.error('Failed to mark notification as read:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Dismiss notification
     */
    dismissNotification(notificationId: string): Observable<void> {
        return this.apiService.put<void>(`notifications/${notificationId}/dismiss`, {}).pipe(
            map(response => response.data),
            tap(() => {
                this.refreshNotifications();
            }),
            catchError(error => {
                console.error('Failed to dismiss notification:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Bulk update document statuses
     */
    bulkUpdateStatus(
        documentIds: string[],
        newStatus: DocumentStatus,
        reason?: string
    ): Observable<{ successCount: number; failureCount: number; errors: any[] }> {
        const updateData = {
            documentIds,
            status: newStatus,
            reason,
            triggeredBy: StatusTrigger.MANUAL
        };

        return this.apiService.post<{ successCount: number; failureCount: number; errors: any[] }>('documents/bulk-status-update', updateData).pipe(
            map(response => response.data),
            tap(result => {
                this.notificationService.success(`Bulk status update completed. ${result.successCount} documents updated successfully.`);
            }),
            catchError(error => {
                this.notificationService.error('Bulk status update failed. Please try again.');
                return throwError(() => error);
            })
        );
    }

    // Private helper methods

    private startVerificationTracking(documentId: string, verificationId: string): void {
        // Start polling for this specific verification
        const pollInterval = timer(0, 2000).pipe(
            switchMap(() => this.getVerificationProgress(documentId)),
            takeUntil(timer(300000)) // Stop after 5 minutes
        );

        pollInterval.subscribe(progress => {
            if (progress && (progress.stage === VerificationStage.COMPLETED || progress.stage === VerificationStage.FAILED)) {
                this.stopVerificationTracking(documentId);
            }
        });
    }

    private stopVerificationTracking(documentId: string): void {
        const currentProgress = this.verificationProgressSubject.value;
        currentProgress.delete(documentId);
        this.verificationProgressSubject.next(currentProgress);
        this.activeVerifications.set(currentProgress);
    }

    private pollVerificationProgress(): Observable<any> {
        return this.apiService.get<Map<string, VerificationProgress>>('documents/verification-progress/active').pipe(
            map(response => response.data),
            tap(progressMap => {
                this.verificationProgressSubject.next(progressMap);
                this.activeVerifications.set(progressMap);
            })
        );
    }

    private pollNotifications(): Observable<any> {
        return this.getStatusNotifications();
    }

    private refreshStatusHistory(documentId: string): void {
        this.getDocumentStatusHistory(documentId).subscribe();
    }

    private refreshNotifications(): void {
        this.getStatusNotifications().subscribe();
    }

    private updateUnreadCount(notifications: StatusNotification[]): void {
        const unreadCount = notifications.filter(n => n.status === 'unread').length;
        this.unreadNotifications.set(unreadCount);
    }
}