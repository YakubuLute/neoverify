import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { SHARED_IMPORTS } from '../../../shared';
import { Document, DocumentStatus } from '../../../shared/models/document.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-6xl mx-auto">
        @if (loading()) {
          <div class="text-center py-8">
            <p-progressSpinner></p-progressSpinner>
          </div>
        } @else if (document()) {
          <!-- Header -->
          <div class="flex justify-between items-start mb-8">
            <div>
              <div class="flex items-center mb-2">
                <p-button
                  icon="pi pi-arrow-left"
                  [text]="true"
                  [rounded]="true"
                  (onClick)="goBack()"
                  class="mr-2"
                ></p-button>
                <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">
                  {{ document()?.metadata.title }}
                </h1>
              </div>
              <div class="flex items-center gap-4">
                <p-tag [value]="document()?.status" [severity]="getStatusSeverity()"></p-tag>
                <p-tag [value]="document()?.documentType" [severity]="getTypeSeverity()"></p-tag>
              </div>
            </div>
            
            <div class="flex gap-2">
              <p-button
                label="Download"
                icon="pi pi-download"
                [outlined]="true"
                (onClick)="downloadDocument()"
              ></p-button>
              
              <p-button
                label="QR Code"
                icon="pi pi-qrcode"
                [outlined]="true"
                (onClick)="showQRCode()"
              ></p-button>
              
              @if (canRevoke()) {
                <p-button
                  label="Revoke"
                  icon="pi pi-ban"
                  severity="danger"
                  [outlined]="true"
                  (onClick)="revokeDocument()"
                ></p-button>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Document Preview -->
            <div class="lg:col-span-2">
              <p-card>
                <ng-template pTemplate="header">
                  <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                    <h2 class="text-xl font-semibold">Document Preview</h2>
                  </div>
                </ng-template>
                
                <div class="text-center py-8">
                  @if (document()?.fileUrl) {
                    <iframe
                      [src]="document()?.fileUrl"
                      class="w-full h-96 border border-surface-200 dark:border-surface-700 rounded"
                    ></iframe>
                  } @else {
                    <div class="text-surface-500">
                      <i class="pi pi-file text-6xl mb-4 block"></i>
                      <p class="text-lg">Document preview not available</p>
                      <p class="text-sm">Download the document to view its contents</p>
                    </div>
                  }
                </div>
              </p-card>
            </div>

            <!-- Document Information -->
            <div class="space-y-6">
              <!-- Basic Information -->
              <p-card>
                <ng-template pTemplate="header">
                  <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                    <h3 class="text-lg font-semibold">Document Information</h3>
                  </div>
                </ng-template>
                
                <div class="space-y-4">
                  <div>
                    <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Verification ID</label>
                    <p class="text-surface-900 dark:text-surface-0 font-mono text-sm break-all">
                      {{ document()?.verificationId }}
                    </p>
                  </div>
                  
                  <div>
                    <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Document Type</label>
                    <p class="text-surface-900 dark:text-surface-0">{{ document()?.documentType }}</p>
                  </div>
                  
                  <div>
                    <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Issue Date</label>
                    <p class="text-surface-900 dark:text-surface-0">{{ formatDate(document()?.metadata.issueDate) }}</p>
                  </div>
                  
                  @if (document()?.metadata.expiryDate) {
                    <div>
                      <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Expiry Date</label>
                      <p class="text-surface-900 dark:text-surface-0">{{ formatDate(document()?.metadata.expiryDate) }}</p>
                    </div>
                  }
                  
                  <div>
                    <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Uploaded</label>
                    <p class="text-surface-900 dark:text-surface-0">{{ formatDate(document()?.createdAt) }}</p>
                  </div>
                  
                  @if (document()?.metadata.description) {
                    <div>
                      <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Description</label>
                      <p class="text-surface-900 dark:text-surface-0">{{ document()?.metadata.description }}</p>
                    </div>
                  }
                </div>
              </p-card>

              <!-- Issuer Information -->
              @if (document()?.metadata.issuer) {
                <p-card>
                  <ng-template pTemplate="header">
                    <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                      <h3 class="text-lg font-semibold">Issuer Information</h3>
                    </div>
                  </ng-template>
                  
                  <div class="space-y-4">
                    <div>
                      <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Organization</label>
                      <p class="text-surface-900 dark:text-surface-0">{{ document()?.metadata.issuer.name }}</p>
                    </div>
                    
                    @if (document()?.metadata.issuer.email) {
                      <div>
                        <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Email</label>
                        <p class="text-surface-900 dark:text-surface-0">{{ document()?.metadata.issuer.email }}</p>
                      </div>
                    }
                    
                    @if (document()?.metadata.issuer.website) {
                      <div>
                        <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Website</label>
                        <a 
                          [href]="document()?.metadata.issuer.website" 
                          target="_blank"
                          class="text-primary-500 hover:underline"
                        >
                          {{ document()?.metadata.issuer.website }}
                        </a>
                      </div>
                    }
                  </div>
                </p-card>
              }

              <!-- Recipient Information -->
              @if (document()?.metadata.recipient) {
                <p-card>
                  <ng-template pTemplate="header">
                    <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                      <h3 class="text-lg font-semibold">Recipient Information</h3>
                    </div>
                  </ng-template>
                  
                  <div class="space-y-4">
                    <div>
                      <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Name</label>
                      <p class="text-surface-900 dark:text-surface-0">{{ document()?.metadata.recipient.name }}</p>
                    </div>
                    
                    @if (document()?.metadata.recipient.email) {
                      <div>
                        <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Email</label>
                        <p class="text-surface-900 dark:text-surface-0">{{ document()?.metadata.recipient.email }}</p>
                      </div>
                    }
                    
                    @if (document()?.metadata.recipient.id) {
                      <div>
                        <label class="text-sm font-medium text-surface-600 dark:text-surface-400">ID</label>
                        <p class="text-surface-900 dark:text-surface-0">{{ document()?.metadata.recipient.id }}</p>
                      </div>
                    }
                  </div>
                </p-card>
              }

              <!-- Blockchain Information -->
              @if (document()?.blockchainTxHash) {
                <p-card>
                  <ng-template pTemplate="header">
                    <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                      <h3 class="text-lg font-semibold">Blockchain Verification</h3>
                    </div>
                  </ng-template>
                  
                  <div class="space-y-4">
                    <div>
                      <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Transaction Hash</label>
                      <p class="text-surface-900 dark:text-surface-0 font-mono text-sm break-all">
                        {{ document()?.blockchainTxHash }}
                      </p>
                    </div>
                    
                    <div>
                      <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Network</label>
                      <p class="text-surface-900 dark:text-surface-0">{{ document()?.blockchainNetwork || 'Ethereum' }}</p>
                    </div>
                    
                    <div>
                      <label class="text-sm font-medium text-surface-600 dark:text-surface-400">Document Hash</label>
                      <p class="text-surface-900 dark:text-surface-0 font-mono text-sm break-all">
                        {{ document()?.fileHash }}
                      </p>
                    </div>
                  </div>
                </p-card>
              }

              <!-- Verification History -->
              @if (verificationHistory().length > 0) {
                <p-card>
                  <ng-template pTemplate="header">
                    <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                      <h3 class="text-lg font-semibold">Verification History</h3>
                    </div>
                  </ng-template>
                  
                  <div class="space-y-3">
                    @for (verification of verificationHistory(); track verification.id) {
                      <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded">
                        <div>
                          <p class="font-medium">{{ verification.type }}</p>
                          <p class="text-sm text-surface-600 dark:text-surface-400">
                            {{ formatDate(verification.timestamp) }}
                          </p>
                        </div>
                        <p-tag [value]="verification.result" [severity]="getVerificationSeverity(verification.result)"></p-tag>
                      </div>
                    }
                  </div>
                </p-card>
              }
            </div>
          </div>
        } @else {
          <div class="text-center py-8">
            <i class="pi pi-exclamation-triangle text-6xl text-orange-500 mb-4 block"></i>
            <h2 class="text-2xl font-bold mb-2">Document Not Found</h2>
            <p class="text-surface-600 dark:text-surface-400 mb-4">
              The requested document could not be found or you don't have permission to view it.
            </p>
            <p-button
              label="Back to Documents"
              icon="pi pi-arrow-left"
              routerLink="/documents"
            ></p-button>
          </div>
        }
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
      @if (document()) {
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
  `]
})
export class DocumentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentService = inject(DocumentService);
  private readonly authService = inject(AuthService);

  readonly document = signal<Document | null>(null);
  readonly loading = signal<boolean>(false);
  readonly verificationHistory = signal<any[]>([]);

  // Dialog states
  showQRDialog = false;

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('id');
    if (documentId) {
      this.loadDocument(documentId);
    }
  }

  loadDocument(id: string): void {
    this.loading.set(true);
    
    this.documentService.getDocument(id).subscribe({
      next: (document) => {
        this.document.set(document);
        this.loadVerificationHistory(id);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load document:', error);
        this.document.set(null);
        this.loading.set(false);
      }
    });
  }

  loadVerificationHistory(documentId: string): void {
    // Mock verification history - replace with actual API call
    this.verificationHistory.set([
      {
        id: '1',
        type: 'Initial Upload',
        result: 'Success',
        timestamp: new Date()
      }
    ]);
  }

  goBack(): void {
    this.router.navigate(['/documents']);
  }

  downloadDocument(): void {
    const doc = this.document();
    if (!doc) return;

    this.documentService.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.metadata.title}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Failed to download document:', error);
      }
    });
  }

  showQRCode(): void {
    this.showQRDialog = true;
  }

  qrCodeUrl(): string {
    const doc = this.document();
    if (!doc) return '';
    
    const verifyUrl = `${window.location.origin}/verify?id=${doc.verificationId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;
  }

  downloadQRCode(): void {
    const doc = this.document();
    if (!doc) return;

    const link = document.createElement('a');
    link.href = this.qrCodeUrl();
    link.download = `qr-code-${doc.verificationId}.png`;
    link.click();
  }

  copyVerificationLink(): void {
    const doc = this.document();
    if (!doc) return;

    const verifyUrl = `${window.location.origin}/verify?id=${doc.verificationId}`;
    navigator.clipboard.writeText(verifyUrl);
  }

  revokeDocument(): void {
    const doc = this.document();
    if (!doc) return;

    // Implementation would show confirmation dialog and call revoke API
    console.log('Revoke document:', doc.id);
  }

  canRevoke(): boolean {
    const user = this.authService.currentUser();
    const doc = this.document();
    
    return (user?.role === UserRole.PLATFORM_ADMIN || 
            user?.role === UserRole.ORG_ADMIN || 
            user?.role === UserRole.ISSUER) && 
           doc?.status === DocumentStatus.ACTIVE;
  }

  getStatusSeverity(): string {
    const status = this.document()?.status;
    switch (status) {
      case DocumentStatus.ACTIVE: return 'success';
      case DocumentStatus.PENDING: return 'warning';
      case DocumentStatus.REVOKED: return 'danger';
      case DocumentStatus.EXPIRED: return 'secondary';
      default: return 'info';
    }
  }

  getTypeSeverity(): string {
    const type = this.document()?.documentType;
    switch (type) {
      case 'certificate': return 'success';
      case 'diploma': return 'info';
      case 'license': return 'warning';
      default: return 'secondary';
    }
  }

  getVerificationSeverity(result: string): string {
    switch (result.toLowerCase()) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'pending': return 'warning';
      default: return 'info';
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}