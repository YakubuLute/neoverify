import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SHARED_IMPORTS, VerificationStatusDisplayComponent, StatusHistoryComponent } from '../../../shared';
import { DocumentService } from '../../../core/services/document.service';
import { Document, DocumentType, DocumentStatus, VerificationStatus } from '../../../shared/models/document.models';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    VerificationStatusDisplayComponent,
    StatusHistoryComponent
  ],
  template: `
    <div class="document-detail-container">
      
      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-container">
        <div class="flex justify-center items-center py-16">
          <p-progressSpinner></p-progressSpinner>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="error-container">
        <div class="text-center py-16">
          <i class="pi pi-exclamation-triangle text-6xl text-red-400 mb-4 block"></i>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Document Not Found
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mb-8">
            {{ error() }}
          </p>
          <p-button
            label="Back to Documents"
            icon="pi pi-arrow-left"
            routerLink="/documents"
          ></p-button>
        </div>
      </div>

      <!-- Document Content -->
      <div *ngIf="!loading() && !error() && document()" class="document-content">
        
        <!-- Header -->
        <div class="document-header">
          <div class="header-content">
            <div class="breadcrumb-section">
              <p-breadcrumb 
                [model]="breadcrumbItems"
                [home]="{ icon: 'pi pi-home', routerLink: '/dashboard' }"
              ></p-breadcrumb>
            </div>
            
            <div class="title-section">
              <h1 class="document-title">{{ document()!.title }}</h1>
              <p class="document-description" *ngIf="document()!.description">
                {{ document()!.description }}
              </p>
            </div>

            <div class="header-actions">
              <p-button
                icon="pi pi-download"
                severity="secondary"
                [outlined]="true"
                pTooltip="Download Document"
                (onClick)="downloadDocument()"
              ></p-button>
              
              <p-button
                icon="pi pi-share-alt"
                severity="secondary"
                [outlined]="true"
                pTooltip="Share Document"
                (onClick)="shareDocument()"
              ></p-button>
              
              <p-button
                icon="pi pi-ellipsis-v"
                severity="secondary"
                [outlined]="true"
                pTooltip="More Actions"
                (onClick)="showActionsMenu = true"
              ></p-button>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="document-main-content">
          
          <!-- Left Column - Document Info -->
          <div class="document-info-column">
            
            <!-- Document Preview -->
            <div class="document-preview-section">
              <p-card header="Document Preview">
                <div class="preview-container">
                  <div *ngIf="document()!.thumbnailUrl" class="document-thumbnail">
                    <img [src]="document()!.thumbnailUrl" [alt]="document()!.title" />
                  </div>
                  <div *ngIf="!document()!.thumbnailUrl" class="document-placeholder">
                    <i class="pi pi-file text-6xl text-gray-400"></i>
                    <p class="text-gray-500 mt-2">No preview available</p>
                  </div>
                </div>
                
                <div class="document-metadata">
                  <div class="metadata-grid">
                    <div class="metadata-item">
                      <label>File Name:</label>
                      <span>{{ document()!.originalFileName }}</span>
                    </div>
                    <div class="metadata-item">
                      <label>File Size:</label>
                      <span>{{ formatFileSize(document()!.fileSize) }}</span>
                    </div>
                    <div class="metadata-item">
                      <label>Type:</label>
                      <p-tag [value]="document()!.documentType" severity="info"></p-tag>
                    </div>
                    <div class="metadata-item">
                      <label>Upload Date:</label>
                      <span>{{ document()!.uploadedAt | date:'medium' }}</span>
                    </div>
                    <div class="metadata-item" *ngIf="document()!.metadata.issueDate">
                      <label>Issue Date:</label>
                      <span>{{ document()!.metadata.issueDate | date:'mediumDate' }}</span>
                    </div>
                    <div class="metadata-item" *ngIf="document()!.metadata.expiryDate">
                      <label>Expiry Date:</label>
                      <span>{{ document()!.metadata.expiryDate | date:'mediumDate' }}</span>
                    </div>
                  </div>
                </div>
              </p-card>
            </div>

            <!-- Document Tags -->
            <div class="document-tags-section" *ngIf="document()!.tags.length > 0">
              <p-card header="Tags">
                <div class="tags-container">
                  <p-tag 
                    *ngFor="let tag of document()!.tags" 
                    [value]="tag" 
                    severity="secondary"
                    class="mr-2 mb-2"
                  ></p-tag>
                </div>
              </p-card>
            </div>

            <!-- Additional Metadata -->
            <div class="additional-metadata-section" *ngIf="hasAdditionalMetadata()">
              <p-card header="Additional Information">
                <div class="metadata-grid">
                  <div class="metadata-item" *ngIf="document()!.metadata.recipientName">
                    <label>Recipient:</label>
                    <span>{{ document()!.metadata.recipientName }}</span>
                  </div>
                  <div class="metadata-item" *ngFor="let field of getCustomFields()">
                    <label>{{ field.key }}:</label>
                    <span>{{ field.value }}</span>
                  </div>
                </div>
              </p-card>
            </div>
          </div>

          <!-- Right Column - Verification Status -->
          <div class="verification-column">
            <app-verification-status-display 
              [document]="document()!"
            ></app-verification-status-display>
          </div>
        </div>

        <!-- Status History Section -->
        <div class="status-history-section">
          <app-status-history 
            [documentId]="document()!.id"
            [maxItems]="10"
          ></app-status-history>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .document-detail-container {
      @apply min-h-screen bg-gray-50 dark:bg-gray-900;
    }

    .document-header {
      @apply bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4;
    }

    .header-content {
      @apply max-w-7xl mx-auto;
    }

    .breadcrumb-section {
      @apply mb-4;
    }

    .title-section {
      @apply mb-4;
    }

    .document-title {
      @apply text-2xl font-bold text-gray-900 dark:text-white mb-2;
    }

    .document-description {
      @apply text-gray-600 dark:text-gray-400;
    }

    .header-actions {
      @apply flex gap-2;
    }

    .document-main-content {
      @apply max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6;
    }

    .document-info-column {
      @apply lg:col-span-1 space-y-6;
    }

    .verification-column {
      @apply lg:col-span-2;
    }

    .preview-container {
      @apply text-center mb-4;
    }

    .document-thumbnail img {
      @apply max-w-full h-auto rounded-lg shadow-sm;
    }

    .document-placeholder {
      @apply py-8 text-center;
    }

    .metadata-grid {
      @apply grid grid-cols-1 sm:grid-cols-2 gap-4;
    }

    .metadata-item {
      @apply flex flex-col gap-1;
    }

    .metadata-item label {
      @apply text-sm font-medium text-gray-700 dark:text-gray-300;
    }

    .metadata-item span {
      @apply text-sm text-gray-900 dark:text-white;
    }

    .tags-container {
      @apply flex flex-wrap gap-2;
    }

    .status-history-section {
      @apply max-w-7xl mx-auto px-6 pb-6;
    }

    :host ::ng-deep .p-card {
      @apply shadow-sm;
    }

    :host ::ng-deep .p-card .p-card-header {
      @apply bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600;
    }

    :host ::ng-deep .p-card .p-card-content {
      @apply p-4;
    }
  `]
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentService = inject(DocumentService);
  private readonly destroy$ = new Subject<void>();

  readonly document = signal<Document | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  showActionsMenu = false;

  breadcrumbItems = [
    { label: 'Documents', routerLink: '/documents' },
    { label: 'Document Details' }
  ];

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const documentId = params['id'];
        if (documentId) {
          this.loadDocument(documentId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDocument(documentId: string): void {
    this.loading.set(true);
    this.error.set(null);

    // For development, use mock data
    setTimeout(() => {
      const mockDocument = this.getMockDocument(documentId);
      if (mockDocument) {
        this.document.set(mockDocument);
        this.breadcrumbItems[1].label = mockDocument.title;
      } else {
        this.error.set('Document not found');
      }
      this.loading.set(false);
    }, 1000);

    // TODO: Replace with actual API call
    // this.documentService.getDocument(documentId)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (document) => {
    //       this.document.set(document);
    //       this.breadcrumbItems[1].label = document.title;
    //       this.loading.set(false);
    //     },
    //     error: (error) => {
    //       this.error.set('Failed to load document');
    //       this.loading.set(false);
    //     }
    //   });
  }

  downloadDocument(): void {
    const doc = this.document();
    if (doc) {
      this.documentService.downloadDocument(doc.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.originalFileName;
            a.click();
            window.URL.revokeObjectURL(url);
          },
          error: (error) => {
            console.error('Download failed:', error);
          }
        });
    }
  }

  shareDocument(): void {
    // TODO: Implement document sharing
    console.log('Share document:', this.document()?.id);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  hasAdditionalMetadata(): boolean {
    const doc = this.document();
    return !!(doc?.metadata.recipientName ||
      (doc?.metadata.customFields && Object.keys(doc.metadata.customFields).length > 0));
  }

  getCustomFields(): { key: string; value: any }[] {
    const customFields = this.document()?.metadata.customFields;
    if (!customFields) return [];

    return Object.entries(customFields).map(([key, value]) => ({
      key: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  }

  private getMockDocument(documentId: string): Document | null {
    // Mock document data for development
    if (documentId === '1') {
      return {
        id: '1',
        verificationId: 'VER-001',
        title: 'Bachelor of Science Degree',
        description: 'Computer Science degree from University of Technology',
        originalFileName: 'degree-certificate.pdf',
        canonicalHash: 'hash123abc456def789',
        documentType: DocumentType.DEGREE,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        fileUrl: '/api/documents/1/file',
        thumbnailUrl: '/api/documents/1/thumbnail',
        fileSize: 2048576,
        mimeType: 'application/pdf',
        uploadedBy: 'user123',
        uploadedAt: new Date('2024-01-15'),
        verifiedAt: new Date('2024-01-16'),
        tags: ['education', 'degree', 'computer-science'],
        metadata: {
          title: 'Bachelor of Science Degree',
          recipientName: 'John Doe',
          issueDate: new Date('2023-06-15'),
          customFields: {
            university: 'University of Technology',
            major: 'Computer Science',
            gpa: '3.8'
          }
        },
        blockchainRecord: {
          transactionHash: '0x1234567890abcdef',
          blockNumber: 12345678,
          network: 'Ethereum Mainnet',
          timestamp: new Date('2024-01-16'),
          gasUsed: 21000,
          status: 'confirmed'
        },
        forensicsResult: {
          riskScore: 15,
          status: 'genuine',
          flags: [],
          modelVersion: 'v2.1.0',
          processingTime: 2500
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canDownload: true
        },
        auditTrail: [],
        issuerId: 'issuer123',
        organizationId: 'org123',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16')
      };
    }
    return null;
  }
}