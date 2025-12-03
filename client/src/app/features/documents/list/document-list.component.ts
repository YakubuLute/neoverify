/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SHARED_IMPORTS, StatusManagementDialogComponent, StatusHistoryComponent, HasPermissionDirective, DocumentSharingDialogComponent } from '../../../shared';
import { DocumentService } from '../../../core/services/document.service';
import { DocumentStatusService } from '../../../core/services/document-status.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { CacheService } from '../../../core/services/cache.service';
import { LazyLoadingService } from '../../../core/services/lazy-loading.service';
import { SearchService } from '../../../core/services/search.service';
import { VirtualScrollDirective, VirtualScrollViewport } from '../../../shared/directives/virtual-scroll.directive';
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
  AuditAction,
  ExportOptions
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
    HasPermissionDirective,
    DocumentSharingDialogComponent,
    VirtualScrollDirective
  ],
  templateUrl: './document-list.component.html',
  styleUrl: './document-list.component.scss'
})
export class DocumentListComponent implements OnInit, OnDestroy {
  private readonly documentService = inject(DocumentService);
  private readonly statusService = inject(DocumentStatusService);
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly cacheService = inject(CacheService);
  private readonly lazyLoadingService = inject(LazyLoadingService);
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly documents = signal<Document[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);

  // Virtual scrolling signals
  readonly virtualScrollConfig = signal({
    itemHeight: 120,
    bufferSize: 5,
    threshold: 100
  });
  readonly virtualViewport = signal<VirtualScrollViewport | null>(null);
  readonly enableVirtualScroll = signal(true);

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

  // Sharing dialog signals
  readonly showSharingDialog = signal(false);
  readonly selectedDocumentForSharing = signal<Document | null>(null);

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
        doc.originalFileName?.toLowerCase().includes(query) ||
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
        const uploadDate = new Date(doc.uploadedAt || '');
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
  readonly AuditAction = AuditAction;

  ngOnInit(): void {
    this.loadDocuments();
    this.setupSearchDebounce();
    this.setupSearchService();
    this.setupPerformanceOptimizations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.lazyLoadingService.destroy();
    this.searchService.destroy();
  }

  private setupSearchDebounce(): void {
    // This would typically be set up with a form control or input observable
    // For now, we'll handle it in the search method
  }

  private setupSearchService(): void {
    // Subscribe to search results
    this.searchService.searchResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.documents.set(results.documents);
        this.totalCount.set(results.totalCount);
      });

    // Subscribe to search loading state
    this.searchService.isSearching
      .pipe(takeUntil(this.destroy$))
      .subscribe(isSearching => {
        this.loading.set(isSearching);
      });

    // Subscribe to search errors
    this.searchService.searchError
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error.set(error);
      });
  }

  private setupPerformanceOptimizations(): void {
    // Enable virtual scrolling for large datasets
    if (this.totalCount() > 20) { // Lower threshold for better performance
      this.enableVirtualScroll.set(true);
    }

    // Preload thumbnails for visible items
    this.preloadVisibleThumbnails();

    // Setup cache optimization interval
    setInterval(() => {
      this.cacheService.clearExpired();
      this.lazyLoadingService.optimizeCache();
      this.searchService.optimizeSearchPerformance();
    }, 3 * 60 * 1000); // Every 3 minutes

    // Setup performance monitoring
    this.setupPerformanceMonitoring();

    // Warm up cache with frequently accessed items
    this.warmUpCache();
  }

  private setupPerformanceMonitoring(): void {
    // Monitor cache performance
    this.cacheService.getStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe(stats => {
      if (stats.hitRate < 50) { // Less than 50% hit rate
        console.warn('Low cache hit rate detected:', stats.hitRate);
        // Could trigger cache optimization here
      }
    });

    // Monitor search performance
    this.searchService.getPerformanceMetrics().pipe(
      takeUntil(this.destroy$)
    ).subscribe(metrics => {
      if (metrics.averageSearchTime > 1000) { // More than 1 second
        console.warn('Slow search performance detected:', metrics.averageSearchTime);
      }
    });
  }

  private warmUpCache(): void {
    // Preload common document types and statuses
    const commonFilters = [
      { documentType: [DocumentType.DEGREE] },
      { documentType: [DocumentType.CERTIFICATE] },
      { status: [DocumentStatus.ACTIVE] },
      { verificationStatus: [VerificationStatus.VERIFIED] }
    ];

    commonFilters.forEach(filter => {
      // const cacheKey = `documents:1:${this.pageSize()}:${JSON.stringify(filter)}`;
      // Warm up cache in background
      setTimeout(() => {
        this.filters.set(filter);
        this.loadDocuments();
      }, Math.random() * 5000); // Stagger requests
    });
  }

  private preloadVisibleThumbnails(): void {
    const viewport = this.virtualViewport();
    if (!viewport) return;

    const visibleDocuments = viewport.visibleItems as Document[];
    const lazyLoadItems = visibleDocuments.map(doc => ({
      id: doc.id,
      type: 'thumbnail' as const,
      priority: 1
    }));

    this.lazyLoadingService.preload(lazyLoadItems);
  }

  async loadDocuments(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const cacheKey = `documents:${this.currentPage()}:${this.pageSize()}:${JSON.stringify(this.filters())}`;

      // Try to get from cache first
      const cachedResult = this.cacheService.getSync<{ documents: Document[], totalCount: number }>(cacheKey);
      if (cachedResult) {
        this.documents.set(cachedResult.documents);
        this.totalCount.set(cachedResult.totalCount);
        this.loading.set(false);
        return;
      }

      // For development, use mock data
      const mockDocuments = this.getMockDocuments();

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay

      const result = { documents: mockDocuments, totalCount: mockDocuments.length };

      // Cache the result
      this.cacheService.set(cacheKey, result, { ttl: 2 * 60 * 1000 }); // 2 minutes

      this.documents.set(result.documents);
      this.totalCount.set(result.totalCount);

      // Preload thumbnails for visible documents
      this.preloadDocumentAssets(result.documents.slice(0, 10)); // First 10 items

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
      //   const result = { documents: response.items, totalCount: response.totalCount };
      //   this.cacheService.set(cacheKey, result, { ttl: 2 * 60 * 1000 });
      //   this.documents.set(response.items);
      //   this.totalCount.set(response.totalCount);
      //   this.preloadDocumentAssets(response.items.slice(0, 10));
      // }
    } catch (error) {
      console.error('Failed to load documents:', error);
      this.error.set('Failed to load documents. Please try again.');
      this.documents.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private preloadDocumentAssets(documents: Document[]): void {
    const lazyLoadItems = documents.flatMap(doc => [
      { id: doc.id, type: 'thumbnail' as const, priority: 2 },
      { id: doc.id, type: 'metadata' as const, priority: 1 }
    ]);

    this.lazyLoadingService.preload(lazyLoadItems);
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);

    // Use optimized search service with predictive caching
    this.searchService.setSearchQuery(query);
    this.searchService.setSearchFilters(this.filters());

    // Prefetch related search results
    if (query.length >= 3) {
      const predictiveSuggestions = this.searchService.getPredictiveSearchSuggestions(query);
      predictiveSuggestions.slice(0, 2).forEach(suggestion => {
        // Prefetch in background
        setTimeout(() => {
          this.searchService.instantSearch(suggestion, this.filters()).subscribe();
        }, 500);
      });
    }
  }

  onFilterChange(newFilters: DocumentFilters): void {
    this.filters.set(newFilters);
    this.currentPage.set(1);

    // Invalidate cache when filters change
    this.cacheService.invalidatePattern('^documents:');

    // Update search service
    this.searchService.setSearchFilters(newFilters);

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

onExport(options: ExportOptions) {
    const selectedIds = this.selectedDocuments();
    const documentsToExport = selectedIds.length > 0 ? selectedIds : this.filteredDocuments().map(doc => doc.id);

    this.documentService.exportDocuments(documentsToExport, options.format, options).subscribe({
        next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `documents.${options.format}`;
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
    // Clear cache before refreshing
    this.cacheService.invalidatePattern('^documents:');
    this.lazyLoadingService.clearQueue();
    this.loadDocuments();
  }

  // Virtual scroll event handlers
  onVirtualScrollViewportChange(viewport: VirtualScrollViewport): void {
    this.virtualViewport.set(viewport);
    this.preloadVisibleThumbnails();

    // Predictive preloading based on scroll direction
    const currentIndex = Math.floor(viewport.startIndex + viewport.visibleItems.length / 2);
    this.lazyLoadingService.preloadViewport(
      viewport.visibleItems,
      this.filteredDocuments(),
      currentIndex
    );
  }

  onVirtualScrollPerformanceMetrics(metrics: {renderTime: number}): void {
    // Monitor virtual scroll performance
    if (metrics.renderTime > 16) { // More than one frame (60fps)
      console.warn('Virtual scroll render time exceeded 16ms:', metrics.renderTime);
    }
  }

  onVirtualScrollEnd(): void {
    // Load more documents if available
    if (this.documents().length < this.totalCount()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadMoreDocuments();
    }
  }

  private async loadMoreDocuments(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);

    try {
      // const cacheKey = `documents:${this.currentPage()}:${this.pageSize()}:${JSON.stringify(this.filters())}`;

      // For development, simulate loading more documents
      await new Promise(resolve => setTimeout(resolve, 300));

      const moreDocuments = this.getMockDocuments().slice(0, 5); // Simulate pagination
      const currentDocs = this.documents();
      const updatedDocs = [...currentDocs, ...moreDocuments];

      this.documents.set(updatedDocs);

      // Preload assets for new documents
      this.preloadDocumentAssets(moreDocuments);

    } catch (error) {
      console.error('Failed to load more documents:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // Performance monitoring methods
  getCacheStats(): void {
    this.cacheService.getStats().subscribe(stats => {
      console.log('Cache Statistics:', stats);
    });
  }

  getSearchAnalytics(): void {
    this.searchService.getSearchAnalytics().subscribe(analytics => {
      console.log('Search Analytics:', analytics);
    });
  }

  // Lazy loading helpers
  getThumbnailUrl(document: Document): string {
    const cached = this.lazyLoadingService.isCached(document.id, 'thumbnail');
    if (cached) {
      return document.thumbnailUrl || '/assets/images/document-placeholder.svg';
    }

    // Trigger lazy loading
    this.lazyLoadingService.preload([{
      id: document.id,
      type: 'thumbnail',
      priority: 1
    }]);

    return '/assets/images/document-placeholder.svg';
  }

  isDocumentLoading(document: Document): boolean {
    return this.lazyLoadingService.isLoading(document.id, 'thumbnail') ||
      this.lazyLoadingService.isLoading(document.id, 'metadata');
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

  // Permission checking methods
  canViewDocument(document: Document): boolean {
    return this.permissionsService.canPerformDocumentOperation(
      { action: AuditAction.VIEWED, resource: 'document' },
      document
    ).allowed;
  }

  canEditDocument(document: Document): boolean {
    return this.permissionsService.canPerformDocumentOperation(
      { action: AuditAction.UPDATED, resource: 'document' },
      document
    ).allowed;
  }

  canDeleteDocument(document: Document): boolean {
    return this.permissionsService.canPerformDocumentOperation(
      { action: AuditAction.DELETED, resource: 'document' },
      document
    ).allowed;
  }

  canShareDocument(document: Document): boolean {
    return this.permissionsService.canPerformDocumentOperation(
      { action: AuditAction.SHARED, resource: 'document' },
      document
    ).allowed;
  }

  canDownloadDocument(document: Document): boolean {
    return this.permissionsService.canPerformDocumentOperation(
      { action: AuditAction.DOWNLOADED, resource: 'document' },
      document
    ).allowed;
  }

  canPerformBulkOperation(operation: string): boolean {
    const selectedDocs = this.documents().filter(doc =>
      this.selectedDocuments().includes(doc.id)
    );
    return this.permissionsService.canPerformBulkOperation(operation, selectedDocs).allowed;
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
        this.openSharingDialog(document);
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

  openSharingDialog(document: Document): void {
    this.selectedDocumentForSharing.set(document);
    this.showSharingDialog.set(true);
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
          const a = window.document.createElement('a');
          a.href = url;
          a.download = document.originalFileName ?? '';
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Download failed:', error);
        }
      });
  }

  onDocumentShared(): void {
    // Refresh the documents list to show updated sharing status
    this.loadDocuments();
    this.showSharingDialog.set(false);
    this.selectedDocumentForSharing.set(null);
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
        title: 'Bachelor of Science Degree',
        description: 'Computer Science degree from University of Technology',
        originalFileName: 'degree-certificate.pdf',
        canonicalHash: 'hash123',
        userId: 'user123',
        hash: 'hash123',
        sharingSettings: {
          isPublic: true,
          allowDownload: true,
        },
        filename: 'degree-certificate.pdf',
        isPublic: true,
        downloadCount: 0,
        viewCount: 0,
        filePath: '/api/documents/1/file',
        size: 2048576,
        documentType: DocumentType.DEGREE,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
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
          expiryDate: new Date('2028-06-15'),
          fileSize: 2048576,
          mimeType: 'application/pdf',
          checksum: 'hash123'
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canDownload: true
        },
        originalName: 'degree-certificate.pdf',
        organizationId: 'org123',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16')
      },
      {
        id: '2',
        userId: 'user123',
        filename: 'aws-cert.pdf',
        originalName: 'aws-cert.pdf',
        filePath: '/api/documents/2/file',
        size: 1024768,
        hash: 'hash456',
        sharingSettings: {
          isPublic:true,
          allowDownload: true,
        },
        downloadCount: 0,
        viewCount: 0,
        isPublic: true,
        title: 'Professional Certificate',
        description: 'AWS Solutions Architect Professional Certificate',
        canonicalHash: 'hash456',
        documentType: DocumentType.CERTIFICATE,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.PENDING,
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
          fileSize: 1024768,
          mimeType: 'application/pdf',
          checksum: 'hash456'
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canDownload: true
        },

        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      }
    ];
  }
}
