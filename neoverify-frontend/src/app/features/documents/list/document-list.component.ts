import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { SHARED_IMPORTS } from '../../../shared';
import { Document as DocumentModel, DocumentStatus } from '../../../shared/models/document.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
              My Documents
            </h1>
            <p class="text-surface-600 dark:text-surface-400">
              Manage and track your verified documents
            </p>
          </div>
          
          @if (canUpload()) {
            <p-button
              label="Upload Document"
              icon="pi pi-upload"
              routerLink="/documents/upload"
            ></p-button>
          }
        </div>

        <!-- Filters -->
        <p-card class="mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="field">
              <label for="search" class="block text-sm font-medium mb-2">Search</label>
              <input
                id="search"
                type="text"
                pInputText
                placeholder="Search documents..."
                [(ngModel)]="searchTerm"
                (input)="onSearch()"
                class="w-full"
              />
            </div>
            
            <div class="field">
              <label for="status" class="block text-sm font-medium mb-2">Status</label>
              <p-dropdown
                id="status"
                [options]="statusOptions"
                [(ngModel)]="selectedStatus"
                (onChange)="onFilterChange()"
                placeholder="All Statuses"
                optionLabel="label"
                optionValue="value"
                [showClear]="true"
                class="w-full"
              ></p-dropdown>
            </div>
            
            <div class="field">
              <label for="type" class="block text-sm font-medium mb-2">Type</label>
              <p-dropdown
                id="type"
                [options]="typeOptions"
                [(ngModel)]="selectedType"
                (onChange)="onFilterChange()"
                placeholder="All Types"
                optionLabel="label"
                optionValue="value"
                [showClear]="true"
                class="w-full"
              ></p-dropdown>
            </div>
            
            <div class="field">
              <label for="dateRange" class="block text-sm font-medium mb-2">Date Range</label>
              <p-calendar
                id="dateRange"
                [(ngModel)]="dateRange"
                (onSelect)="onFilterChange()"
                selectionMode="range"
                [readonlyInput]="true"
                placeholder="Select date range"
                class="w-full"
              ></p-calendar>
            </div>
          </div>
        </p-card>

        <!-- Documents Table -->
        <p-card>
          <p-table
            [value]="filteredDocuments()"
            [loading]="loading()"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[10, 25, 50]"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} documents"
            [globalFilterFields]="['metadata.title', 'documentType', 'verificationId']"
            responsiveLayout="scroll"
          >
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="metadata.title">
                  Title <p-sortIcon field="metadata.title"></p-sortIcon>
                </th>
                <th pSortableColumn="documentType">
                  Type <p-sortIcon field="documentType"></p-sortIcon>
                </th>
                <th pSortableColumn="status">
                  Status <p-sortIcon field="status"></p-sortIcon>
                </th>
                <th pSortableColumn="metadata.issueDate">
                  Issue Date <p-sortIcon field="metadata.issueDate"></p-sortIcon>
                </th>
                <th pSortableColumn="createdAt">
                  Uploaded <p-sortIcon field="createdAt"></p-sortIcon>
                </th>
                <th>Actions</th>
              </tr>
            </ng-template>
            
            <ng-template pTemplate="body" let-document>
              <tr>
                <td>
                  <div class="flex items-center">
                    <i [class]="getDocumentIcon(document.documentType)" class="mr-2 text-primary-500"></i>
                    <div>
                      <div class="font-medium">{{ document.metadata.title }}</div>
                      <div class="text-sm text-surface-600 dark:text-surface-400">
                        ID: {{ document.verificationId }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <p-tag [value]="document.documentType" [severity]="getTypeSeverity(document.documentType)"></p-tag>
                </td>
                <td>
                  <p-tag [value]="document.status" [severity]="getStatusSeverity(document.status)"></p-tag>
                </td>
                <td>{{ formatDate(document.metadata.issueDate) }}</td>
                <td>{{ formatDate(document.createdAt) }}</td>
                <td>
                  <div class="flex gap-2">
                    <p-button
                      icon="pi pi-eye"
                      [text]="true"
                      [rounded]="true"
                      pTooltip="View Details"
                      (onClick)="viewDocument(document)"
                    ></p-button>
                    
                    <p-button
                      icon="pi pi-download"
                      [text]="true"
                      [rounded]="true"
                      pTooltip="Download"
                      (onClick)="downloadDocument(document)"
                    ></p-button>
                    
                    <p-button
                      icon="pi pi-qrcode"
                      [text]="true"
                      [rounded]="true"
                      pTooltip="Show QR Code"
                      (onClick)="showQRCode(document)"
                    ></p-button>
                    
                    @if (canRevoke(document)) {
                      <p-button
                        icon="pi pi-ban"
                        [text]="true"
                        [rounded]="true"
                        severity="danger"
                        pTooltip="Revoke Document"
                        (onClick)="revokeDocument(document)"
                      ></p-button>
                    }
                  </div>
                </td>
              </tr>
            </ng-template>
            
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="6" class="text-center py-8">
                  <div class="text-surface-500">
                    <i class="pi pi-inbox text-4xl mb-4 block"></i>
                    <p class="text-lg mb-2">No documents found</p>
                    <p class="text-sm">
                      @if (canUpload()) {
                        <a routerLink="/documents/upload" class="text-primary-500 hover:underline">
                          Upload your first document
                        </a>
                      } @else {
                        Contact your administrator to upload documents
                      }
                    </p>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    </div>

    <!-- QR Code Dialog -->
    <p-dialog
      [(visible)]="showQRDialog"
      header="Document QR Code"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '400px' }"
    >
      @if (selectedDocument()) {
        <div class="text-center">
          <div class="mb-4">
            <img [src]="qrCodeUrl()" alt="QR Code" class="mx-auto" />
          </div>
          <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
            Scan this QR code to verify the document
          </p>
          <div class="flex gap-2 justify-center">
            <p-button
              label="Download QR"
              icon="pi pi-download"
              [outlined]="true"
              (onClick)="downloadQRCode()"
            ></p-button>
            <p-button
              label="Copy Link"
              icon="pi pi-copy"
              [outlined]="true"
              (onClick)="copyVerificationLink()"
            ></p-button>
          </div>
        </div>
      }
    </p-dialog>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .field {
      margin-bottom: 1rem;
    }
  `]
})
export class DocumentListComponent implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly documents = signal<DocumentModel[]>([]);
  readonly filteredDocuments = signal<DocumentModel[]>([]);
  readonly loading = signal<boolean>(false);
  readonly selectedDocument = signal<Document | null>(null);

  // Filters
  searchTerm = '';
  selectedStatus: DocumentModelStatus | null = null;
  selectedType: string | null = null;
  dateRange: Date[] | null = null;

  // Dialog states
  showQRDialog = false;

  readonly statusOptions = [
    { label: 'Active', value: DocumentModelStatus.ACTIVE },
    { label: 'Pending', value: DocumentModelStatus.PENDING },
    { label: 'Revoked', value: DocumentModelStatus.REVOKED },
    { label: 'Expired', value: DocumentModelStatus.EXPIRED }
  ];

  readonly typeOptions = [
    { label: 'Certificate', value: 'certificate' },
    { label: 'Diploma', value: 'diploma' },
    { label: 'License', value: 'license' },
    { label: 'ID Card', value: 'id_card' },
    { label: 'Other', value: 'other' }
  ];

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading.set(true);
    
    this.documentService.getDocuments().subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load documents:', error);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.documents()];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        (doc.metadata.title || '').toLowerCase().includes(term) ||
        doc.documentType.toLowerCase().includes(term) ||
        doc.verificationId.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(doc => doc.status === this.selectedStatus);
    }

    // Type filter
    if (this.selectedType) {
      filtered = filtered.filter(doc => doc.documentType === this.selectedType);
    }

    // Date range filter
    if (this.dateRange && this.dateRange.length === 2) {
      const [start, end] = this.dateRange;
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.createdAt);
        return docDate >= start && docDate <= end;
      });
    }

    this.filteredDocuments.set(filtered);
  }

  viewDocument(document: DocumentModel): void {
    this.router.navigate(['/documents', document.id]);
  }

  downloadDocument(document: DocumentModel): void {
    this.documentService.downloadDocument(document.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.metadata.title || 'document'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Failed to download document:', error);
      }
    });
  }

  showQRCode(document: DocumentModel): void {
    this.selectedDocument.set(document);
    this.showQRDialog = true;
  }

  qrCodeUrl(): string {
    const doc = this.selectedDocument();
    if (!doc) return '';
    
    const verifyUrl = `${window.location.origin}/verify?id=${doc.verificationId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;
  }

  downloadQRCode(): void {
    const doc = this.selectedDocument();
    if (!doc) return;

    const link = window.document.createElement('a');
    link.href = this.qrCodeUrl();
    link.download = `qr-code-${doc.verificationId}.png`;
    link.click();
  }

  copyVerificationLink(): void {
    const doc = this.selectedDocument();
    if (!doc) return;

    const verifyUrl = `${window.location.origin}/verify?id=${doc.verificationId}`;
    navigator.clipboard.writeText(verifyUrl);
  }

  revokeDocument(document: DocumentModel): void {
    // Implementation would show confirmation dialog and call revoke API
    console.log('Revoke document:', document.id);
  }

  canUpload(): boolean {
    const user = this.authService.currentUser();
    return user?.role === UserRole.PLATFORM_ADMIN || 
           user?.role === UserRole.ORG_ADMIN || 
           user?.role === UserRole.ISSUER;
  }

  canRevoke(document: DocumentModel): boolean {
    const user = this.authService.currentUser();
    return (user?.role === UserRole.PLATFORM_ADMIN || 
            user?.role === UserRole.ORG_ADMIN || 
            user?.role === UserRole.ISSUER) && 
           document.status === DocumentStatus.ACTIVE;
  }

  getDocumentIcon(type: string): string {
    switch (type) {
      case 'certificate': return 'pi pi-award';
      case 'diploma': return 'pi pi-book';
      case 'license': return 'pi pi-id-card';
      case 'id_card': return 'pi pi-user';
      default: return 'pi pi-file';
    }
  }

  getStatusSeverity(status: DocumentModelStatus): string {
    switch (status) {
      case DocumentStatus.ACTIVE: return 'success';
      case DocumentStatus.PENDING: return 'warning';
      case DocumentStatus.REVOKED: return 'danger';
      case DocumentStatus.EXPIRED: return 'secondary';
      default: return 'info';
    }
  }

  getTypeSeverity(type: string): string {
    switch (type) {
      case 'certificate': return 'success';
      case 'diploma': return 'info';
      case 'license': return 'warning';
      default: return 'secondary';
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}