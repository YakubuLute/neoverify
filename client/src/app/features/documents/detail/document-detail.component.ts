import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  SHARED_IMPORTS,
  VerificationStatusDisplayComponent,
  StatusHistoryComponent,
} from '../../../shared';
import { DocumentService } from '../../../core/services/document.service';
import {
  Document,
  DocumentType,
  DocumentStatus,
  VerificationStatus,
} from '../../../shared/models/document.models';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [...SHARED_IMPORTS, VerificationStatusDisplayComponent, StatusHistoryComponent],
  templateUrl: './document-detail.component.html',
  styleUrl: './document-detail.component.scss',
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
    { label: 'Document Details' },
  ];

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
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
      this.documentService
        .downloadDocument(doc.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.originalFileName ?? '';
            a.click();
            window.URL.revokeObjectURL(url);
          },
          error: (error) => {
            console.error('Download failed:', error);
          },
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
    return !!(
      doc?.metadata.recipientName ||
      (doc?.metadata.customFields && Object.keys(doc.metadata.customFields).length > 0)
    );
  }

  getCustomFields(): { key: string; value: unknown }[] {
    const customFields = this.document()?.metadata.customFields;
    if (!customFields) return [];

    return Object.entries(customFields).map(([key, value]) => ({
      key: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
  }

  private getMockDocument(documentId: string): Document | null {
    // Mock document data for development
    if (documentId === '1') {
      return {
        id: '1',
        title: 'Bachelor of Science Degree',
        description: 'A degree certificate for a Bachelor of Science in Computer Science',
        isPublic: true,
        downloadCount: 1,
        viewCount: 1,
        sharingSettings: {
          isPublic: true,
          allowDownload: true,
        },
        userId: 'user123',
        filename: 'degree-certificate.pdf',
        originalName: 'degree-certificate.pdf',
        filePath: '/api/documents/1',
        size: 2048576,
        hash: 'hash123abc456def789',
        canonicalHash: 'hash123abc456def789',
        documentType: DocumentType.DEGREE,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
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
          expiryDate: new Date('2026-06-15'),

          issueDate: new Date('2023-06-15'),
          customFields: {
            university: 'University of Technology',
            major: 'Computer Science',
            gpa: '3.8',
          },
          fileSize: 345678,
          mimeType: 'application/pdf',
          checksum: 'hash123abc456def789',
        },
        blockchainRecord: {
          transactionHash: '0x1234567890abcdef',
          blockNumber: 12345678,
          network: 'Ethereum Mainnet',
          timestamp: new Date('2024-01-16'),
          gasUsed: 21000,
          status: 'confirmed',
        },
        forensicsResult: {
          riskScore: 15,
          status: 'genuine',
          flags: [],
          modelVersion: 'v2.1.0',
          processingTime: 2500,
          confidence: 0.95,
          analysis: {
            metadata: {},
            visual: {},
            statistical: {},
          },
          completedAt: new Date('2024-01-16'),
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canDownload: true,
        },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16'),
      };
    }
    return null;
  }
}
