import { Component, Input, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { Subject, takeUntil } from 'rxjs';
import { DocumentStatusService } from '../../../core/services/document-status.service';
import {
    VerificationProgress,
    VerificationStage,
    VerificationStageDetail,
    VerificationError,
    RemediationStep
} from '../../models/document.models';

@Component({
    selector: 'app-verification-progress',
    standalone: true,
    imports: [
        CommonModule,
        ProgressBarModule,
        ButtonModule,
        TooltipModule,
        DialogModule
    ],
    template: `
    <div class="verification-progress" *ngIf="progress">
      <!-- Main Progress Bar -->
      <div class="flex items-center gap-3 mb-4">
        <div class="flex-1">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ progress.message }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ progress.progress }}%
            </span>
          </div>
          <p-progressBar 
            [value]="progress.progress"
            [showValue]="false"
            styleClass="h-2"
          ></p-progressBar>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-2">
          <p-button
            icon="pi pi-info-circle"
            severity="secondary"
            size="small"
            [outlined]="true"
            (onClick)="showDetails = true"
            pTooltip="View Details"
            tooltipPosition="top"
          ></p-button>
          
          <p-button
            icon="pi pi-times"
            severity="danger"
            size="small"
            [outlined]="true"
            (onClick)="cancelVerification()"
            pTooltip="Cancel Verification"
            tooltipPosition="top"
            *ngIf="canCancel()"
          ></p-button>
        </div>
      </div>

      <!-- Stage Indicators -->
      <div class="flex items-center gap-2 mb-4" *ngIf="stageDetails().length > 0">
        <div 
          *ngFor="let stage of stageDetails(); trackBy: trackByStage"
          class="flex-1"
        >
          <div 
            class="stage-indicator"
            [class.completed]="stage.status === 'completed'"
            [class.in-progress]="stage.status === 'in_progress'"
            [class.failed]="stage.status === 'failed'"
            [class.pending]="stage.status === 'pending'"
            [pTooltip]="getStageTooltip(stage)"
            tooltipPosition="top"
          >
            <i [class]="getStageIcon(stage)"></i>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div class="error-display" *ngIf="hasError()">
        <div class="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <i class="pi pi-exclamation-triangle text-red-500 mt-0.5"></i>
          <div class="flex-1">
            <h4 class="font-medium text-red-800 dark:text-red-300 mb-1">
              Verification Failed
            </h4>
            <p class="text-sm text-red-700 dark:text-red-400 mb-2">
              {{ getErrorMessage() }}
            </p>
            <div class="flex gap-2">
              <p-button
                label="Retry"
                icon="pi pi-refresh"
                size="small"
                severity="danger"
                [outlined]="true"
                (onClick)="retryVerification()"
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
        </div>
      </div>

      <!-- Estimated Completion -->
      <div class="text-xs text-gray-500 dark:text-gray-400 mt-2" *ngIf="progress.estimatedCompletion">
        Estimated completion: {{ formatEstimatedTime(progress.estimatedCompletion) }}
      </div>
    </div>

    <!-- Details Dialog -->
    <p-dialog
      header="Verification Details"
      [(visible)]="showDetails"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '600px' }"
    >
      <div class="verification-details" *ngIf="progress">
        <div class="mb-4">
          <h4 class="font-medium mb-2">Overall Progress</h4>
          <p-progressBar [value]="progress.progress" [showValue]="true"></p-progressBar>
        </div>

        <div class="mb-4">
          <h4 class="font-medium mb-2">Stage Details</h4>
          <div class="space-y-3">
            <div 
              *ngFor="let stage of stageDetails(); trackBy: trackByStage"
              class="stage-detail p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium">{{ getStageName(stage.stage) }}</span>
                <span 
                  class="status-badge"
                  [class]="'status-' + stage.status"
                >
                  {{ stage.status.replace('_', ' ') | titlecase }}
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {{ stage.message }}
              </p>
              <p-progressBar 
                [value]="stage.progress" 
                [showValue]="false"
                styleClass="h-1"
              ></p-progressBar>
              <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span *ngIf="stage.startedAt">
                  Started: {{ formatTime(stage.startedAt) }}
                </span>
                <span *ngIf="stage.completedAt">
                  Completed: {{ formatTime(stage.completedAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="progress.startedAt">
          <h4 class="font-medium mb-2">Timeline</h4>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <p>Started: {{ formatTime(progress.startedAt) }}</p>
            <p>Duration: {{ getDuration() }}</p>
          </div>
        </div>
      </div>
    </p-dialog>

    <!-- Remediation Dialog -->
    <p-dialog
      header="Remediation Steps"
      [(visible)]="showRemediation"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '700px' }"
    >
      <div class="remediation-steps" *ngIf="remediationSteps().length > 0">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Follow these steps to resolve the verification issues:
        </p>
        
        <div class="space-y-4">
          <div 
            *ngFor="let step of remediationSteps(); let i = index"
            class="remediation-step p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div class="flex items-start gap-3">
              <div class="step-number">
                {{ i + 1 }}
              </div>
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
  `,
    styles: [`
    .verification-progress {
      @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4;
    }

    .stage-indicator {
      @apply w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-200;
    }

    .stage-indicator.pending {
      @apply border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500;
    }

    .stage-indicator.in-progress {
      @apply border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/20;
      animation: pulse 2s infinite;
    }

    .stage-indicator.completed {
      @apply border-green-500 text-green-500 bg-green-50 dark:bg-green-900/20;
    }

    .stage-indicator.failed {
      @apply border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20;
    }

    .status-badge {
      @apply px-2 py-1 rounded-full text-xs font-medium;
    }

    .status-pending {
      @apply bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300;
    }

    .status-in_progress {
      @apply bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300;
    }

    .status-completed {
      @apply bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300;
    }

    .status-failed {
      @apply bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300;
    }

    .step-number {
      @apply w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center flex-shrink-0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `]
})
export class VerificationProgressComponent implements OnInit, OnDestroy {
    @Input() documentId!: string;
    @Input() progress: VerificationProgress | null = null;

    private readonly statusService = inject(DocumentStatusService);
    private readonly destroy$ = new Subject<void>();

    showDetails = false;
    showRemediation = false;

    private _remediationSteps: RemediationStep[] = [];

    ngOnInit(): void {
        if (this.documentId && !this.progress) {
            this.loadVerificationProgress();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    stageDetails = computed(() => {
        return this.progress?.details || [];
    });

    remediationSteps = computed(() => {
        return this._remediationSteps;
    });

    private loadVerificationProgress(): void {
        this.statusService.getVerificationProgress(this.documentId)
            .pipe(takeUntil(this.destroy$))
            .subscribe(progress => {
                this.progress = progress;
                if (this.hasError()) {
                    this.loadRemediationSteps();
                }
            });
    }

    private loadRemediationSteps(): void {
        const error = this.getError();
        if (error) {
            this.statusService.getRemediationSteps(this.documentId, error.code)
                .pipe(takeUntil(this.destroy$))
                .subscribe(steps => {
                    this._remediationSteps = steps;
                });
        }
    }

    canCancel(): boolean {
        if (!this.progress) return false;
        return this.progress.stage !== VerificationStage.COMPLETED &&
            this.progress.stage !== VerificationStage.FAILED;
    }

    hasError(): boolean {
        return this.progress?.stage === VerificationStage.FAILED ||
            this.stageDetails().some(stage => stage.status === 'failed');
    }

    getError(): VerificationError | null {
        const failedStage = this.stageDetails().find(stage => stage.status === 'failed');
        return failedStage?.error || null;
    }

    getErrorMessage(): string {
        const error = this.getError();
        return error?.message || 'Verification failed due to an unknown error.';
    }

    cancelVerification(): void {
        if (this.progress && this.documentId) {
            // Assuming we have a verification ID in the progress object
            const verificationId = (this.progress as any).verificationId || 'current';
            this.statusService.cancelVerification(this.documentId, verificationId)
                .pipe(takeUntil(this.destroy$))
                .subscribe();
        }
    }

    retryVerification(): void {
        if (this.documentId) {
            const verificationId = (this.progress as any)?.verificationId || 'current';
            this.statusService.retryVerification(this.documentId, verificationId)
                .pipe(takeUntil(this.destroy$))
                .subscribe();
        }
    }

    executeRemediationAction(step: RemediationStep): void {
        if (step.action) {
            this.statusService.executeRemediationAction(
                this.documentId,
                step.id,
                step.action.parameters
            ).pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    this.showRemediation = false;
                    // Optionally restart verification
                    this.retryVerification();
                });
        }
    }

    trackByStage(index: number, stage: VerificationStageDetail): string {
        return stage.stage;
    }

    getStageIcon(stage: VerificationStageDetail): string {
        const baseClass = 'pi';

        switch (stage.status) {
            case 'completed':
                return `${baseClass} pi-check`;
            case 'in_progress':
                return `${baseClass} pi-spin pi-spinner`;
            case 'failed':
                return `${baseClass} pi-times`;
            case 'skipped':
                return `${baseClass} pi-minus`;
            default:
                return `${baseClass} pi-circle`;
        }
    }

    getStageTooltip(stage: VerificationStageDetail): string {
        return `${this.getStageName(stage.stage)}: ${stage.message}`;
    }

    getStageName(stage: VerificationStage): string {
        switch (stage) {
            case VerificationStage.QUEUED:
                return 'Queued';
            case VerificationStage.PREPROCESSING:
                return 'Preprocessing';
            case VerificationStage.FORENSIC_ANALYSIS:
                return 'Forensic Analysis';
            case VerificationStage.BLOCKCHAIN_VERIFICATION:
                return 'Blockchain Verification';
            case VerificationStage.SIGNATURE_VALIDATION:
                return 'Signature Validation';
            case VerificationStage.METADATA_EXTRACTION:
                return 'Metadata Extraction';
            case VerificationStage.FINAL_VALIDATION:
                return 'Final Validation';
            case VerificationStage.COMPLETED:
                return 'Completed';
            case VerificationStage.FAILED:
                return 'Failed';
            default:
                return 'Unknown';
        }
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString();
    }

    formatEstimatedTime(date: Date): string {
        const now = new Date();
        const estimated = new Date(date);
        const diff = estimated.getTime() - now.getTime();

        if (diff <= 0) return 'Any moment now';

        const minutes = Math.ceil(diff / (1000 * 60));
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;

        const hours = Math.ceil(minutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    getDuration(): string {
        if (!this.progress?.startedAt) return 'Unknown';

        const start = new Date(this.progress.startedAt);
        const now = new Date();
        const diff = now.getTime() - start.getTime();

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}