import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStatus, VerificationStatus } from '../../models/document.models';

@Component({
    selector: 'app-status-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
    <span 
      [class]="badgeClasses()"
      [title]="tooltip()"
    >
      <i [class]="iconClass()" *ngIf="showIcon"></i>
      {{ displayText() }}
    </span>
  `,
    styles: [`
    .status-badge {
      @apply inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200;
    }
    
    .status-uploaded {
      @apply bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300;
    }
    
    .status-processing {
      @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300;
      animation: pulse 2s infinite;
    }
    
    .status-verified {
      @apply bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300;
    }
    
    .status-rejected {
      @apply bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300;
    }
    
    .status-expired {
      @apply bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300;
    }
    
    .status-pending {
      @apply bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300;
    }
    
    .status-active {
      @apply bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300;
    }
    
    .status-revoked {
      @apply bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300;
    }
    
    .verification-pending {
      @apply bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300;
    }
    
    .verification-verified {
      @apply bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300;
    }
    
    .verification-failed {
      @apply bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300;
    }
    
    .verification-expired {
      @apply bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300;
    }
    
    .size-sm {
      @apply px-1.5 py-0.5 text-xs;
    }
    
    .size-md {
      @apply px-2 py-1 text-sm;
    }
    
    .size-lg {
      @apply px-3 py-1.5 text-base;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `]
})
export class StatusBadgeComponent {
    @Input() status!: DocumentStatus | VerificationStatus;
    @Input() type: 'document' | 'verification' = 'document';
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
    @Input() showIcon: boolean = true;
    @Input() customText?: string;

    badgeClasses = computed(() => {
        const baseClasses = ['status-badge', `size-${this.size}`];

        if (this.type === 'document') {
            baseClasses.push(`status-${this.status}`);
        } else {
            baseClasses.push(`verification-${this.status}`);
        }

        return baseClasses.join(' ');
    });

    iconClass = computed(() => {
        const baseClass = 'w-3 h-3';

        if (this.type === 'document') {
            switch (this.status as DocumentStatus) {
                case DocumentStatus.UPLOADED:
                    return `${baseClass} pi pi-upload`;
                case DocumentStatus.PROCESSING:
                    return `${baseClass} pi pi-spin pi-spinner`;
                case DocumentStatus.VERIFIED:
                    return `${baseClass} pi pi-check-circle`;
                case DocumentStatus.REJECTED:
                    return `${baseClass} pi pi-times-circle`;
                case DocumentStatus.EXPIRED:
                    return `${baseClass} pi pi-clock`;
                case DocumentStatus.PENDING:
                    return `${baseClass} pi pi-hourglass`;
                case DocumentStatus.ACTIVE:
                    return `${baseClass} pi pi-check`;
                case DocumentStatus.REVOKED:
                    return `${baseClass} pi pi-ban`;
                default:
                    return `${baseClass} pi pi-info-circle`;
            }
        } else {
            switch (this.status as VerificationStatus) {
                case VerificationStatus.PENDING:
                    return `${baseClass} pi pi-hourglass`;
                case VerificationStatus.VERIFIED:
                    return `${baseClass} pi pi-shield`;
                case VerificationStatus.FAILED:
                    return `${baseClass} pi pi-exclamation-triangle`;
                case VerificationStatus.EXPIRED:
                    return `${baseClass} pi pi-clock`;
                default:
                    return `${baseClass} pi pi-info-circle`;
            }
        }
    });

    displayText = computed(() => {
        if (this.customText) {
            return this.customText;
        }

        if (this.type === 'document') {
            switch (this.status as DocumentStatus) {
                case DocumentStatus.UPLOADED:
                    return 'Uploaded';
                case DocumentStatus.PROCESSING:
                    return 'Processing';
                case DocumentStatus.VERIFIED:
                    return 'Verified';
                case DocumentStatus.REJECTED:
                    return 'Rejected';
                case DocumentStatus.EXPIRED:
                    return 'Expired';
                case DocumentStatus.PENDING:
                    return 'Pending';
                case DocumentStatus.ACTIVE:
                    return 'Active';
                case DocumentStatus.REVOKED:
                    return 'Revoked';
                default:
                    return 'Unknown';
            }
        } else {
            switch (this.status as VerificationStatus) {
                case VerificationStatus.PENDING:
                    return 'Pending';
                case VerificationStatus.VERIFIED:
                    return 'Verified';
                case VerificationStatus.FAILED:
                    return 'Failed';
                case VerificationStatus.EXPIRED:
                    return 'Expired';
                default:
                    return 'Unknown';
            }
        }
    });

    tooltip = computed(() => {
        const statusText = this.displayText();
        const typeText = this.type === 'document' ? 'Document Status' : 'Verification Status';
        return `${typeText}: ${statusText}`;
    });
}