import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SHARED_IMPORTS } from '../../../../shared';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { VerificationProgressComponent } from '../../../../shared/components/verification-progress/verification-progress.component';
import { DocumentStatusService } from '../../../../core/services/document-status.service';
import { Document, DocumentType, VerificationStatus, DocumentStatus, VerificationProgress } from '../../../../shared/models/document.models';

@Component({
    selector: 'app-document-card',
    standalone: true,
    imports: [
        ...SHARED_IMPORTS,
        StatusBadgeComponent,
        VerificationProgressComponent
    ],
    templateUrl: './document-card.component.html',
    styleUrl: './document-card.component.scss'
})
export class DocumentCardComponent implements OnInit, OnDestroy {
    @Input({ required: true }) document!: Document;
    @Input() selected = false;
    @Input() canSelect = false;
    @Input() showVerificationProgress = true;

    @Output() documentClick = new EventEmitter<Document>();
    @Output() selectionChange = new EventEmitter<boolean>();
    @Output() quickAction = new EventEmitter<{ action: string; document: Document }>();

    private readonly statusService = inject(DocumentStatusService);
    private readonly destroy$ = new Subject<void>();

    readonly showMenu = signal(false);
    readonly verificationProgress = signal<VerificationProgress | null>(null);

    // Computed properties
    readonly statusSeverity = computed(() => this.getStatusSeverity(this.document.status));
    readonly verificationSeverity = computed(() => this.getVerificationSeverity(this.document.verificationStatus));
    readonly documentTypeSeverity = computed(() => this.getDocumentTypeSeverity(this.document.documentType));
    readonly formattedFileSize = computed(() => this.formatFileSize(this.document.size));
    readonly uploadedDate = computed(() => new Date(this.document.createdAt));
    readonly isExpiringSoon = computed(() => {
        if (!this.document.metadata.expiryDate) return false;
        const expiryDate = new Date(this.document.metadata.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
    });

    // Enum references for template
    readonly DocumentStatus = DocumentStatus;
    readonly VerificationStatus = VerificationStatus;

    ngOnInit(): void {
        // Load verification progress if document is being processed
        if (this.showVerificationProgress && this.isProcessing()) {
            this.loadVerificationProgress();
        }

        // Subscribe to verification progress updates
        this.statusService.verificationProgress$
            .pipe(takeUntil(this.destroy$))
            .subscribe(progressMap => {
                const progress = progressMap.get(this.document.id);
                this.verificationProgress.set(progress || null);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onCardClick(event: Event): void {
        // Don't trigger card click if clicking on interactive elements
        const target = event.target as HTMLElement;
        if (target.closest('.card-actions') || target.closest('.selection-checkbox') || target.closest('.quick-actions-menu')) {
            return;
        }
        this.documentClick.emit(this.document);
    }

    onSelectionChange(selected: boolean): void {
        this.selectionChange.emit(selected);
    }

    onQuickAction(action: string, event: Event): void {
        event.stopPropagation();
        this.quickAction.emit({ action, document: this.document });
        this.showMenu.set(false);
    }

    toggleMenu(event: Event): void {
        event.stopPropagation();
        this.showMenu.set(!this.showMenu());
    }

    getFileExtension(filename: string): string {
        const extension = filename.split('.').pop()?.toUpperCase();
        return extension || 'FILE';
    }

    private getStatusSeverity(status: DocumentStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        switch (status) {
            case DocumentStatus.ACTIVE:
                return 'success';
            case DocumentStatus.PENDING:
                return 'warn';
            case DocumentStatus.REVOKED:
                return 'danger';
            case DocumentStatus.EXPIRED:
                return 'secondary';
            default:
                return 'contrast';
        }
    }

    private getVerificationSeverity(status: VerificationStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        switch (status) {
            case VerificationStatus.VERIFIED:
                return 'success';
            case VerificationStatus.PENDING:
                return 'warn';
            case VerificationStatus.FAILED:
                return 'danger';
            case VerificationStatus.EXPIRED:
                return 'secondary';
            default:
                return 'contrast';
        }
    }

    private getDocumentTypeSeverity(type: DocumentType): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        switch (type) {
            case DocumentType.DEGREE:
                return 'success';
            case DocumentType.CERTIFICATE:
                return 'info';
            case DocumentType.LICENSE:
                return 'warn';
            case DocumentType.TRANSCRIPT:
                return 'secondary';
            default:
                return 'contrast';
        }
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private isProcessing(): boolean {
        return this.document.status === DocumentStatus.PROCESSING ||
            this.document.verificationStatus === VerificationStatus.PENDING;
    }

    private loadVerificationProgress(): void {
        this.statusService.getVerificationProgress(this.document.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(progress => {
                this.verificationProgress.set(progress);
            });
    }

    // New methods for status tracking
    onStatusChange(newStatus: DocumentStatus): void {
        this.quickAction.emit({ action: 'change-status', document: { ...this.document, status: newStatus } });
    }

    onRetryVerification(): void {
        this.quickAction.emit({ action: 'retry-verification', document: this.document });
    }

    onViewStatusHistory(): void {
        this.quickAction.emit({ action: 'view-status-history', document: this.document });
    }
}