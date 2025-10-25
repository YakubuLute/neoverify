import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../shared';
import { Document, DocumentStatus, DocumentType, VerificationStatus } from '../../../../shared/models/document.models';

@Component({
    selector: 'app-document-card',
    standalone: true,
    imports: SHARED_IMPORTS,
    templateUrl: './document-card.component.html',
    styleUrl: './document-card.component.scss'
})
export class DocumentCardComponent {
    @Input({ required: true }) document!: Document;
    @Input() selected = false;
    @Input() canSelect = false;

    @Output() documentClick = new EventEmitter<Document>();
    @Output() selectionChange = new EventEmitter<boolean>();
    @Output() quickAction = new EventEmitter<{ action: string; document: Document }>();

    readonly showMenu = signal(false);

    // Computed properties
    readonly statusSeverity = computed(() => this.getStatusSeverity(this.document.status));
    readonly verificationSeverity = computed(() => this.getVerificationSeverity(this.document.verificationStatus));
    readonly documentTypeSeverity = computed(() => this.getDocumentTypeSeverity(this.document.documentType));
    readonly formattedFileSize = computed(() => this.formatFileSize(this.document.fileSize));
    readonly uploadedDate = computed(() => new Date(this.document.uploadedAt));
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
}