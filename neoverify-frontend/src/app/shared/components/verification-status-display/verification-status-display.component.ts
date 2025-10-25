import { Component, Input, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
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
  VerificationError,
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
  template: `
    <div class="verification-status-display">
      
      <!-- Main Status Card -->
      <p-card styleClass="verification-status-card">
        <ng-template pTemplate="header">
          <div class="card-header">
            <h3 class="card-title">Verification Status</h3>
            <div class="status-actions">
              <p-button
                icon="pi pi-refresh"
                severity="secondary"
                size="small"
                [outlined]="true"
                (onClick)="refreshStatus()"
                pTooltip="Refresh Status"
                tooltipPosition="top"
                [loading]="loading()"
              ></p-button>
              
              <p-button
                icon="pi pi-history"
                severity="secondary"
                size="small"
                [outlined]="true"
                (onClick)="showHistory = true"
                pTooltip="View History"
                tooltipPosition="top"
              ></p-button>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="content">
          <div class="status-content">
            
            <!-- Current Status -->
            <div class="current-status-section">
              <div class="flex items-center justify-between mb-4">
                <app-status-badge 
                  [status]="document.verificationStatus" 
                  type="verification" 
                  size="lg">
                </app-status-badge>
                
                <div class="status-timestamp" *ngIf="document.verifiedAt">
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    Verified {{ document.verifiedAt | date:'medium' }}
                  </span>
                </div>
              </div>

              <!-- Status Description -->
              <div class="status-description mb-4">
                <p class="text-gray-700 dark:text-gray-300">
                  {{ getStatusDescription() }}
                </p>
              </div>

              <!-- Verification Progress -->
              <div *ngIf="verificationProgress()" class="verification-progress-section mb-4">
                <app-verification-progress 
                  [documentId]="document.id"
                  [progress]="verificationProgress()">
                </app-verification-progress>
              </div>

              <!-- Error Display -->
              <div *ngIf="hasVerificationError()" class="verification-error-section mb-4">
                <p-message 
                  severity="error" 
                  styleClass="w-full"
                >
                  <ng-template pTemplate>
                    <div class="flex flex-col gap-2">
                      <div class="font-medium">Verification Failed</div>
                      <div class="text-sm">{{ getErrorMessage() }}</div>
                      <div class="flex gap-2 mt-2">
                        <p-button
                          label="Retry Verification"
                          icon="pi pi-refresh"
                          size="small"
                          severity="danger"
                          [outlined]="true"
                          (onClick)="retryVerification()"
                          [loading]="retrying()"
                        ></p-button>
                        
                        <p-button
                          label="View Solutions"
                          icon="pi pi-lightbulb"
                          size="small"
                          severity="secondary"
                          [outlined]="true"
                          (onClick)="showRemediation = true"
                          *ngIf="remediationSteps().length > 0"
                        ></p-button>
                      </div>
                    </div>
                  </ng-template>
                </p-message>
              </div>

              <!-- Success Details -->
              <div *ngIf="document.verificationStatus === VerificationStatus.VERIFIED" class="verification-success-section">
                <div class="success-details p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div class="flex items-start gap-3">
                    <i class="pi pi-check-circle text-green-500 text-xl mt-0.5"></i>
                    <div class="flex-1">
                      <h4 class="font-medium text-green-800 dark:text-green-300 mb-2">
                        Document Successfully Verified
                      </h4>
                      <div class="text-sm text-green-700 dark:text-green-400 space-y-1">
                        <p>✓ Document integrity confirmed</p>
                        <p>✓ Blockchain record validated</p>
                        <p>✓ Issuer signature verified</p>
                        <p *ngIf="document.forensicsResult">✓ Forensic analysis passed</p>
                      </div>
                      
                      <div class="mt-3">
                        <p-button
                          label="Download Certificate"
                          icon="pi pi-download"
                          size="small"
                          severity="success"
                          [outlined]="true"
                          (onClick)="downloadCertificate()"
                        ></p-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Pending Details -->
              <div *ngIf="document.verificationStatus === VerificationStatus.PENDING" class="verification-pending-section">
                <div class="pending-details p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div class="flex items-start gap-3">
                    <i class="pi pi-clock text-blue-500 text-xl mt-0.5"></i>
                    <div class="flex-1">
                      <h4 class="font-medium text-blue-800 dark:text-blue-300 mb-2">
                        Verification in Progress
                      </h4>
                      <p class="text-sm text-blue-700 dark:text-blue-400 mb-3">
                        Your document is being processed. This typically takes 2-5 minutes.
                      </p>
                      
                      <div class="verification-steps text-sm text-blue-600 dark:text-blue-400">
                        <div class="step" [class.completed]="isStepCompleted('preprocessing')">
                          <i [class]="getStepIcon('preprocessing')"></i>
                          <span>Document preprocessing</span>
                        </div>
                        <div class="step" [class.completed]="isStepCompleted('forensics')">
                          <i [class]="getStepIcon('forensics')"></i>
                          <span>Forensic analysis</span>
                        </div>
                        <div class="step" [class.completed]="isStepCompleted('blockchain')">
                          <i [class]="getStepIcon('blockchain')"></i>
                          <span>Blockchain verification</span>
                        </div>
                        <div class="step" [class.completed]="isStepCompleted('validation')">
                          <i [class]="getStepIcon('validation')"></i>
                          <span>Final validation</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="verification-actions mt-4">
                <div class="flex gap-2 flex-wrap">
                  <p-button
                    *ngIf="document.verificationStatus === VerificationStatus.FAILED"
                    label="Retry Verification"
                    icon="pi pi-refresh"
                    severity="danger"
                    [outlined]="true"
                    (onClick)="retryVerification()"
                    [loading]="retrying()"
                  ></p-button>
                  
                  <p-button
                    *ngIf="canStartVerification()"
                    label="Start Verification"
                    icon="pi pi-play"
                    severity="success"
                    (onClick)="startVerification()"
                    [loading]="starting()"
                  ></p-button>
                  
                  <p-button
                    label="View Details"
                    icon="pi pi-info-circle"
                    severity="secondary"
                    [outlined]="true"
                    (onClick)="showDetails = true"
                  ></p-button>
                </div>
              </div>
            </div>
          </div>
        </ng-template>
      </p-card>
    </div>

    <!-- Verification History Dialog -->
    <p-dialog
      header="Verification History"
      [(visible)]="showHistory"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '900px', maxHeight: '90vh' }"
    >
      <div class="verification-history" *ngIf="verificationHistory().length > 0">
        <div class="space-y-4">
          <div 
            *ngFor="let entry of verificationHistory(); trackBy: trackByHistoryEntry"
            class="history-entry p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-3">
                <app-status-badge 
                  [status]="entry.status" 
                  type="verification" 
                  size="sm">
                </app-status-badge>
                <span class="font-medium">{{ getHistoryEntryTitle(entry) }}</span>
              </div>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ entry.startedAt | date:'medium' }}
              </span>
            </div>
            
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <p>Duration: {{ formatDuration(entry.duration) }}</p>
              <p>Triggered by: {{ entry.triggeredBy === 'system' ? 'System' : 'User' }}</p>
            </div>
            
            <div *ngIf="entry.error" class="error-details mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
              <strong class="text-red-800 dark:text-red-300">Error:</strong>
              <span class="text-red-700 dark:text-red-400">{{ entry.error.message }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div *ngIf="verificationHistory().length === 0" class="text-center py-8">
        <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
        <p class="text-gray-500 dark:text-gray-400">No verification history available</p>
      </div>
    </p-dialog>

    <!-- Remediation Steps Dialog -->
    <p-dialog
      header="Remediation Steps"
      [(visible)]="showRemediation"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '700px' }"
    >
      <div class="remediation-content" *ngIf="remediationSteps().length > 0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Follow these steps to resolve the verification issues:
        </p>
        
        <div class="space-y-4">
          <div 
            *ngFor="let step of remediationSteps(); let i = index"
            class="remediation-step p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div class="flex items-start gap-3">
              <div class="step-number">{{ i + 1 }}</div>
              <div class="flex-1">
                <h4 class="font-medium mb-2">{{ step.title }}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {{ step.description }}
                </p>
                <p-button
                  *ngIf="step.action"
                  [label]="step.action.label"
                  size="small"
                  severity="secondary"
                  [outlined]="true"
                  (onClick)="executeRemediationAction(step)"
                ></p-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </p-dialog>

    <!-- Detailed Status Dialog -->
    <p-dialog
      header="Verification Details"
      [(visible)]="showDetails"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '800px' }"
    >
      <div class="verification-details">
        <div class="details-sections space-y-4">
          <!-- Document Information -->
          <p-card header="Document Information">
            <div class="document-info-grid">
              <div class="info-item">
                <label>Document ID:</label>
                <span>{{ document.id }}</span>
              </div>
              <div class="info-item">
                <label>Verification ID:</label>
                <span>{{ document.verificationId }}</span>
              </div>
              <div class="info-item">
                <label>File Hash:</label>
                <span class="font-mono text-sm">{{ document.canonicalHash }}</span>
              </div>
              <div class="info-item">
                <label>Upload Date:</label>
                <span>{{ document.uploadedAt | date:'medium' }}</span>
              </div>
            </div>
          </p-card>
          
          <!-- Blockchain Record -->
          <p-card header="Blockchain Record" *ngIf="document.blockchainRecord">
            <div class="blockchain-info">
              <div class="info-item">
                <label>Transaction Hash:</label>
                <span class="font-mono text-sm">{{ document.blockchainRecord.transactionHash }}</span>
              </div>
              <div class="info-item">
                <label>Block Number:</label>
                <span>{{ document.blockchainRecord.blockNumber }}</span>
              </div>
              <div class="info-item">
                <label>Network:</label>
                <span>{{ document.blockchainRecord.network }}</span>
              </div>
              <div class="info-item">
                <label>Timestamp:</label>
                <span>{{ document.blockchainRecord.timestamp | date:'medium' }}</span>
              </div>
            </div>
          </p-card>
          
          <!-- Forensic Analysis -->
          <p-card header="Forensic Analysis" *ngIf="document.forensicsResult">
            <div class="forensics-info">
              <div class="info-item">
                <label>Risk Score:</label>
                <span [class]="getRiskScoreClass()">{{ document.forensicsResult.riskScore }}/100</span>
              </div>
              <div class="info-item">
                <label>Status:</label>
                <span [class]="getForensicsStatusClass()">{{ document.forensicsResult.status }}</span>
              </div>
              <div class="info-item">
                <label>Processing Time:</label>
                <span>{{ document.forensicsResult.processingTime }}ms</span>
              </div>
              <div class="info-item">
                <label>Model Version:</label>
                <span>{{ document.forensicsResult.modelVersion }}</span>
              </div>
            </div>
            
            <div *ngIf="document.forensicsResult.flags.length > 0" class="forensics-flags mt-4">
              <h4 class="font-medium mb-2">Detected Issues:</h4>
              <div class="space-y-2">
                <div 
                  *ngFor="let flag of document.forensicsResult.flags"
                  class="flag-item p-2 rounded"
                  [class]="getFlagSeverityClass(flag.severity)"
                >
                  <div class="flex justify-between items-start">
                    <span class="font-medium">{{ flag.type }}</span>
                    <span class="text-xs">{{ flag.confidence }}% confidence</span>
                  </div>
                  <p class="text-sm mt-1">{{ flag.description }}</p>
                </div>
              </div>
            </div>
          </p-card>
        </div>
      </div>
    </p-dialog>
  `,
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
      @apply bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800;
    }

    .forensics-flags .flag-item.bg-yellow-50 {
      @apply bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800;
    }

    .forensics-flags .flag-item.bg-blue-50 {
      @apply bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800;
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
    const stageDetail = progress.details.find(d => d.stage.toString() === stageName);
    return stageDetail?.status === 'completed';
  }

  getStepIcon(step: string): string {
    const baseClass = 'pi mr-2';
    if (this.isStepCompleted(step)) {
      return `${baseClass} pi-check text-green-500`;
    }
    return `${baseClass} pi-circle text-gray-400`;
  }

  trackByHistoryEntry(index: number, entry: VerificationHistoryEntry): string {
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