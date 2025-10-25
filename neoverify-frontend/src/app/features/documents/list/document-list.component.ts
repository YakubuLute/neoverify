import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { SHARED_IMPORTS, StatusManagementDialogComponent, StatusHistoryComponent, HasPermissionDirective } from '../../../shared';
import { DocumentService } from '../../../core/services/document.service';
import { DocumentStatusService } from '../../../core/services/document-status.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { DocumentCardComponent } from '../components/document-card/document-card.component';
import { DocumentSearchComponent } from '../components/document-search/document-search.component';
import { BulkOperationsComponent } from '../components/bulk-operations/bulk-operations.component';
import {
  Document,
  DocumentFilters,
  DocumentStatus,
  DocumentType,
  VerificationStatus,
  BulkAction,
  BulkActionType,
  ExportFormat
} from '../../../shared/models/document.models';
import { UserRole } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    DocumentCardComponent,
    DocumentSearchComponent,
    BulkOperationsComponent,
    StatusManagementDialogComponent,
    StatusHistoryComponent,
    HasPermissionDirective
  ],
  templateUrl: './document-list.component.html',
  styleUrl: './document-list.component.scss'
})
export class DocumentListComponent implements OnInit, OnDestroy {
  private readonly documentService = inject(DocumentService);
  private readonly statusService = inject(DocumentStatusService);
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly documents = signal<Document[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);

  // Search and filter signals
  readonly searchQuery = signal('');
  readonly filters = signal<DocumentFilters>({});
  readonly selectedDocuments = signal<string[]>([]);
  readonly showFilters = signal(false);

  // View mode signals
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly sortBy = signal<string>('uploadedAt');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  // Status management signals
  readonly showStatusDialog = signal(false);
  readonly showHistoryDialog = signal(false);
  readonly selectedDocumentForStatus = signal<Document | null>(null);

  // User permissions
  readonly currentUser = computed(() => this.authService.getCurrentUser());
  readonly userRole = computed(() => this.currentUser()?.role);
  readonly canUpload = computed(() => {
    return this.permissionsService.canPerformDocumentOperation({
      action: AuditAction.CREATED,
      resource: 'document'
    }).allowed;
  });
  readonly canBulkEdit = computed(() => {
    const role = this.userRole();
    return role === UserRole.PLATFORM_ADMIN ||
      role === UserRole.ORG_ADMIN;
  });

  // Computed properties
  readonly filteredDocuments = computed(() => {
    let docs = this.documents();
    const query = this.searchQuery().toLowerCase();
    const currentFilters = this.filters();

    // Apply search
    if (query) {
      docs = docs.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.originalFileName.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (currentFilters.documentType?.length) {
      docs = docs.filter(doc => currentFilters.documentType!.includes(doc.documentType));
    }
    if (currentFilters.status?.length) {
      docs = docs.filter(doc => currentFilters.status!.includes(doc.status));
    }
    if (currentFilters.verificationStatus?.length) {
      docs = docs.filter(doc => currentFilters.verificationStatus!.includes(doc.verificationStatus));
    }
    if (currentFilters.dateRange) {
      docs = docs.filter(doc => {
        const uploadDate = new Date(doc.uploadedAt);
        return uploadDate >= currentFilters.dateRange!.start &&
          uploadDate <= currentFilters.dateRange!.end;
      });
    }

    // Apply sorting
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();
    docs.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Document];
      let bValue: any = b[sortBy as keyof Document];

      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return docs;
  });

  readonly hasSelection = computed(() => this.selectedDocuments().length > 0);
  readonly isAllSelected = computed(() => {
    const filtered = this.filteredDocuments();
    const selected = this.selectedDocuments();
    return filtered.length > 0 && filtered.every(doc => selected.includes(doc.id));
  });

  // Enum references for template
  readonly DocumentType = DocumentType;
  readonly DocumentStatus = DocumentStatus;
  readonly VerificationStatus = VerificationStatus;
  readonly UserRole = UserRole;
  readonly BulkActionType = BulkActionType;

  ngOnInit(): void {
    this.loadDocuments();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    // This would typically be set up with a form control or input observable
    // For now, we'll handle it in the search method
  }

  async loadDocuments(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // For development, use mock data
      const mockDocuments = this.getMockDocuments();

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      this.documents.set(mockDocuments);
      this.totalCount.set(mockDocuments.length);

      // TODO: Replace with actual API call
      // const params = {
      //   page: this.currentPage(),
      //   limit: this.pageSize(),
      //   sortBy: this.sortBy(),
      //   sortOrder: this.sortOrder(),
      //   ...this.filters()
      // };
      // const response = await this.documentService.getDocuments(params).toPromise();
      // if (response) {
      //   this.documents.set(response.items);
      //   this.totalCount.set(response.totalCount);
      // }
    } catch (error) {
      console.error('Failed to load documents:', error);
      this.error.set('Failed to load documents. Please try again.');
      this.documents.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    // In a real implementation, this would be debounced
    this.loadDocuments();
  }

  onFilterChange(newFilters: DocumentFilters): void {
    this.filters.set(newFilters);
    this.currentPage.set(1);
    this.loadDocuments();
  }

  onSortChange(sortBy: string, sortOrder: 'asc' | 'desc'): void {
    this.sortBy.set(sortBy);
    this.sortOrder.set(sortOrder);
    this.loadDocuments();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadDocuments();
  }

  onDocumentSelect(documentId: string, selected: boolean): void {
    const current = this.selectedDocuments();
    if (selected) {
      this.selectedDocuments.set([...current, documentId]);
    } else {
      this.selectedDocuments.set(current.filter(id => id !== documentId));
    }
  }

  onSelectAll(): void {
    const filtered = this.filteredDocuments();
    if (this.isAllSelected()) {
      this.selectedDocuments.set([]);
    } else {
      this.selectedDocuments.set(filtered.map(doc => doc.id));
    }
  }

  onBulkAction(action: BulkActionType, data?: any): void {
    const selectedIds = this.selectedDocuments();
    if (selectedIds.length === 0) return;

    const bulkAction: BulkAction = {
      type: action,
      documentIds: selectedIds,
      data
    };

    this.documentService.bulkOperation(bulkAction).subscribe({
      next: () => {
        this.selectedDocuments.set([]);
        this.loadDocuments();
      },
      error: (error) => {
        console.error('Bulk operation failed:', error);
      }
    });
  }

  onExport(format: ExportFormat): void {
    const selectedIds = this.selectedDocuments();
    const documentsToExport = selectedIds.length > 0 ? selectedIds : this.filteredDocuments().map(doc => doc.id);

    this.documentService.exportDocuments(documentsToExport, format.type, format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents.${format.type}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Export failed:', error);
      }
    });
  }

  onDocumentClick(document: Document): void {
    this.router.navigate(['/documents', document.id]);
  }

  onUploadClick(): void {
    this.router.navigate(['/documents/upload']);
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.filters.set({});
    this.searchQuery.set('');
    this.loadDocuments();
  }

  refreshDocuments(): void {
    this.loadDocuments();
  }

  // Helper methods for template
  getDocumentTypeSeverity(type: DocumentType): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
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

  getStatusSeverity(status: DocumentStatus): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
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

  getVerificationSeverity(status: VerificationStatus): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFilterCount(): number {
    const currentFilters = this.filters();
    return Object.keys(currentFilters).length;
  }

  // Status management methods
  onQuickAction(event: { action: string; document: Document }): void {
    const { action, document } = event;

    switch (action) {
      case 'view':
        this.onDocumentClick(document);
        break;
      case 'download':
        this.downloadDocument(document);
        break;
      case 'share':
        this.shareDocument(document);
        break;
      case 'delete':
        this.deleteDocument(document);
        break;
      case 'change-status':
        this.openStatusDialog(document);
        break;
      case 'retry-verification':
        this.retryVerification(document);
        break;
      case 'view-status-history':
        this.openStatusHistoryDialog(document);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  openStatusDialog(document: Document): void {
    this.selectedDocumentForStatus.set(document);
    this.showStatusDialog.set(true);
  }

  openStatusHistoryDialog(document: Document): void {
    this.selectedDocumentForStatus.set(document);
    this.showHistoryDialog.set(true);
  }

  onStatusChanged(event: { document: Document; newStatus: DocumentStatus; reason?: string }): void {
    // Update the document in the local state
    const documents = this.documents();
    const updatedDocuments = documents.map(doc =>
      doc.id === event.document.id
        ? { ...doc, status: event.newStatus, updatedAt: new Date() }
        : doc
    );
    this.documents.set(updatedDocuments);

    // Close the dialog
    this.showStatusDialog.set(false);
    this.selectedDocumentForStatus.set(null);
  }

  retryVerification(document: Document): void {
    this.statusService.startVerification(document.id, { forensicsEnabled: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (verificationId) => {
          console.log('Verification started:', verificationId);
          // Update document status to processing
          const documents = this.documents();
          const updatedDocuments = documents.map(doc =>
            doc.id === document.id
              ? { ...doc, verificationStatus: VerificationStatus.PENDING, updatedAt: new Date() }
              : doc
          );
          this.documents.set(updatedDocuments);
        },
        error: (error) => {
          console.error('Failed to start verification:', error);
        }
      });
  }

  private downloadDocument(document: Document): void {
    this.documentService.downloadDocument(document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = document.originalFileName;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Download failed:', error);
        }
      });
  }

  private shareDocument(document: Document): void {
    // TODO: Implement document sharing dialog
    console.log('Share document:', document.id);
  }

  private deleteDocument(document: Document): void {
    if (confirm(`Are you sure you want to delete "${document.title}"?`)) {
      this.documentService.deleteDocument(document.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            const documents = this.documents();
            this.documents.set(documents.filter(doc => doc.id !== document.id));
          },
          error: (error) => {
            console.error('Delete failed:', error);
          }
        });
    }
  }

  // Mock data for development
  private getMockDocuments(): Document[] {
    return [
      {
        id: '1',
        verificationId: 'VER-001',
        title: 'Bachelor of Science Degree',
        description: 'Computer Science degree from University of Technology',
        originalFileName: 'degree-certificate.pdf',
        canonicalHash: 'hash123',
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
        tags: ['education', 'degree'],
        metadata: {
          title: 'Bachelor of Science Degree',
          recipientName: 'John Doe',
          issueDate: new Date('2023-06-15'),
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
      },
      {
        id: '2',
        verificationId: 'VER-002',
        title: 'Professional Certificate',
        description: 'AWS Solutions Architect Professional Certificate',
        originalFileName: 'aws-cert.pdf',
        canonicalHash: 'hash456',
        documentType: DocumentType.CERTIFICATE,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.PENDING,
        fileUrl: '/api/documents/2/file',
        thumbnailUrl: '/api/documents/2/thumbnail',
        fileSize: 1024768,
        mimeType: 'application/pdf',
        uploadedBy: 'user123',
        uploadedAt: new Date('2024-01-20'),
        tags: ['certification', 'aws'],
        metadata: {
          title: 'AWS Solutions Architect Professional',
          recipientName: 'John Doe',
          issueDate: new Date('2024-01-15'),
          expiryDate: new Date('2027-01-15'),
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
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      }
    ];
  }
}