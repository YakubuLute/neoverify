import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';

import { Subject, takeUntil } from 'rxjs';
import { DocumentStatusService } from '../../../core/services/document-status.service';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { VerificationProgressComponent } from '../verification-progress/verification-progress.component';
import {
  Document,
  VerificationStatus,
  VerificationHistoryEntry,
  VerificationProgress,
  RemediationStep
} from '../../models/document.models';

@Component({
  selector: 'app-verification-status-display',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TooltipModule,
    DialogModule,
    MessageModule,

    StatusBadgeComponent,
    VerificationProgressComponent
  ],
  templateUrl: './verification-status-display.component.html',
  styles: [`
    .verification-status-display {
      @apply w-full;
    }

    .verification-status-card {
      @apply shadow-sm;
    }

    .card-header {
      @apply flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700;
    }

    .card-title {
      @apply text-lg font-semibold text-gray-900 dark:text-white;
    }

    .status-actions {
      @apply flex gap-2;
    }

    .verification-steps .step {
      @apply flex items-center gap-2 py-1;
    }

    .verification-steps .step.completed {
      @apply text-green-600 dark:text-green-400;
    }

    .step-number {
      @apply w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center flex-shrink-0;
    }

    .document-info-grid,
    .blockchain-info,
    .forensics-info {
      @apply grid grid-cols-1 md:grid-cols-2 gap-4;
    }

    .info-item {
      @apply flex flex-col gap-1;
    }

    .info-item label {
      @apply text-sm font-medium text-gray-700 dark:text-gray-300;
    }

    .info-item span {
      @apply text-sm text-gray-900 dark:text-white;
    }

    .forensics-flags .flag-item.bg-red-50 {
      @apply dark:bg-red-900/20 border border-red-200 dark:border-red-800;
      background-color: #fef2f2; /* bg-red-50 */
    }

    .forensics-flags .flag-item.bg-yellow-50 {
      @apply dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800;
      background-color: #fffbeb; /* bg-yellow-50 */
    }

    .forensics-flags .flag-item.bg-blue-50 {
      @apply dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800;
      background-color: #eff6ff; /* bg-blue-50 */
    }

    :host ::ng-deep .p-card-content {
      @apply p-4;
    }


  `]
})
export class VerificationStatusDisplayComponent implements OnInit, OnDestroy {
  @Input({ required: true }) document!: Document;

  private readonly statusService = inject(DocumentStatusService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly retrying = signal(false);
  readonly starting = signal(false);
  readonly verificationProgress = signal<VerificationProgress | null>(null);
  readonly verificationHistory = signal<VerificationHistoryEntry[]>([]);
  readonly remediationSteps = signal<RemediationStep[]>([]);

  showHistory = false;
  showRemediation = false;
  showDetails = false;

  // Enum references for template
  readonly VerificationStatus = VerificationStatus;

  ngOnInit(): void {
    this.loadVerificationData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadVerificationData(): void {
    // Load verification progress if in progress
    if (this.document.verificationStatus === VerificationStatus.PENDING) {
      this.loadVerificationProgress();
    }

    // Load verification history
    this.loadVerificationHistory();

    // Load remediation steps if failed
    if (this.document.verificationStatus === VerificationStatus.FAILED) {
      this.loadRemediationSteps();
    }
  }

  private loadVerificationProgress(): void {
    this.statusService.getVerificationProgress(this.document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.verificationProgress.set(progress);
      });
  }

  private loadVerificationHistory(): void {
    this.statusService.getVerificationHistory(this.document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(history => {
        this.verificationHistory.set(history);
      });
  }

  private loadRemediationSteps(): void {
    // Get the error code from the document or latest verification
    const errorCode = this.getLatestErrorCode();
    if (errorCode) {
      this.statusService.getRemediationSteps(this.document.id, errorCode)
        .pipe(takeUntil(this.destroy$))
        .subscribe(steps => {
          this.remediationSteps.set(steps);
        });
    }
  }

  refreshStatus(): void {
    this.loading.set(true);
    this.loadVerificationData();
    setTimeout(() => this.loading.set(false), 1000);
  }

  retryVerification(): void {
    this.retrying.set(true);
    const verificationId = this.getLatestVerificationId();

    this.statusService.retryVerification(this.document.id, verificationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.retrying.set(false);
          this.loadVerificationData();
        },
        error: () => {
          this.retrying.set(false);
        }
      });
  }

  startVerification(): void {
    this.starting.set(true);

    this.statusService.startVerification(this.document.id, { forensicsEnabled: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.starting.set(false);
          this.loadVerificationData();
        },
        error: () => {
          this.starting.set(false);
        }
      });
  }

  downloadCertificate(): void {
    // TODO: Implement certificate download
    console.log('Download certificate for document:', this.document.id);
  }

  executeRemediationAction(step: RemediationStep): void {
    if (step.action) {
      this.statusService.executeRemediationAction(
        this.document.id,
        step.id,
        step.action.parameters
      ).pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.showRemediation = false;
          this.retryVerification();
        });
    }
  }

  // Helper methods
  getStatusDescription(): string {
    switch (this.document.verificationStatus) {
      case VerificationStatus.VERIFIED:
        return 'This document has been successfully verified and is authentic.';
      case VerificationStatus.PENDING:
        return 'Verification is currently in progress. Please wait while we validate your document.';
      case VerificationStatus.FAILED:
        return 'Verification failed. Please review the error details and try again.';
      case VerificationStatus.EXPIRED:
        return 'The verification for this document has expired and needs to be renewed.';
      default:
        return 'Verification status unknown.';
    }
  }

  hasVerificationError(): boolean {
    return this.document.verificationStatus === VerificationStatus.FAILED;
  }

  getErrorMessage(): string {
    // This would typically come from the verification result or latest history entry
    return 'Document verification failed due to integrity check failure.';
  }

  canStartVerification(): boolean {
    return this.document.verificationStatus !== VerificationStatus.PENDING &&
      this.document.verificationStatus !== VerificationStatus.VERIFIED;
  }

  isStepCompleted(step: string): boolean {
    const progress = this.verificationProgress();
    if (!progress || !progress.details) return false;

    const stageMap: Record<string, string> = {
      'preprocessing': 'PREPROCESSING',
      'forensics': 'FORENSIC_ANALYSIS',
      'blockchain': 'BLOCKCHAIN_VERIFICATION',
      'validation': 'FINAL_VALIDATION'
    };

    const stageName = stageMap[step];
    const stageDetail = progress.details.find(d => d.name === stageName);
    return stageDetail?.status === 'completed';
  }

  getStepIcon(step: string): string {
    const baseClass = 'pi mr-2';
    if (this.isStepCompleted(step)) {
      return `${baseClass} pi-check text-green-500`;
    }
    return `${baseClass} pi-circle text-gray-400`;
  }

  trackByHistoryEntry(_index: number, entry: VerificationHistoryEntry): string {
    return entry.id;
  }

  getHistoryEntryTitle(entry: VerificationHistoryEntry): string {
    switch (entry.status) {
      case VerificationStatus.VERIFIED:
        return 'Verification Successful';
      case VerificationStatus.FAILED:
        return 'Verification Failed';
      case VerificationStatus.PENDING:
        return 'Verification Started';
      default:
        return 'Verification Process';
    }
  }

  formatDuration(duration?: number): string {
    if (!duration) return 'Unknown';

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  getRiskScoreClass(): string {
    const score = this.document.forensicsResult?.riskScore || 0;
    if (score < 30) return 'text-green-600 dark:text-green-400';
    if (score < 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  getForensicsStatusClass(): string {
    const status = this.document.forensicsResult?.status;
    switch (status) {
      case 'genuine':
        return 'text-green-600 dark:text-green-400';
      case 'suspicious':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'invalid':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  getFlagSeverityClass(severity: string): string {
    switch (severity) {
      case 'high':
        return 'bg-red-50';
      case 'medium':
        return 'bg-yellow-50';
      case 'low':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  }

  private getLatestErrorCode(): string {
    // This would typically come from the latest verification history entry
    return 'INTEGRITY_CHECK_FAILED';
  }

  private getLatestVerificationId(): string {
    const history = this.verificationHistory();
    return history.length > 0 ? history[0].verificationId : 'current';
  }
}