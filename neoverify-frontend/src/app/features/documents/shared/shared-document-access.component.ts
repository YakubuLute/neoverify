import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import { DocumentSharingService } from '../../../core/services/document-sharing.service';
import { DocumentService } from '../../../core/services/document.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Document, SharePermissions } from '../../../shared/models/document.models';

@Component({
  selector: 'app-shared-document-access',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    PasswordModule,
    ProgressSpinnerModule,
    MessageModule,
    TagModule,
    DividerModule
  ],
  template: `
    <div class="shared-document-access">
      <div class="access-container">
        
        <!-- Loading State -->
        <div class="loading-card" *ngIf="loading()">
          <p-card>
            <div class="loading-content">
              <p-progressSpinner></p-progressSpinner>
              <h3>Loading shared document...</h3>
              <p>Please wait while we verify the share link.</p>
            </div>
          </p-card>
        </div>

        <!-- Password Required -->
        <div class="password-card" *ngIf="!loading() && requiresPassword() && !document()">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header">
                <i class="pi pi-lock header-icon"></i>
                <h2>Password Required</h2>
              </div>
            </ng-template>

            <div class="password-content">
              <p class="password-message">
                This shared document is password protected. Please enter the password to access it.
              </p>

              <div class="password-form">
                <div class="password-field">
                  <label for="sharePassword">Password:</label>
                  <p-password
                    id="sharePassword"
                    [(ngModel)]="password"
                    placeholder="Enter password"
                    [feedback]="false"
                    [toggleMask]="true"
                    class="w-full"
                    (keyup.enter)="accessDocument()">
                  </p-password>
                </div>

                <div class="password-actions">
                  <p-button 
                    label="Access Document" 
                    icon="pi pi-unlock"
                    (onClick)="accessDocument()"
                    [loading]="accessing()"
                    [disabled]="!password"
                    class="w-full">
                  </p-button>
                </div>
              </div>

              <div class="error-message" *ngIf="error()">
                <p-message severity="error" [text]="error() || undefined"></p-message>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Document Access -->
        <div class="document-card" *ngIf="!loading() && document()">
          <p-card>
            <ng-template pTemplate="header">
              <div class="document-header">
                <div class="document-icon">
                  <i class="pi pi-file"></i>
                </div>
                <div class="document-info">
                  <h2>{{ document()?.title }}</h2>
                  <p class="document-filename">{{ document()?.originalFileName }}</p>
                  <div class="document-meta">
                    <p-tag [value]="document()?.documentType" severity="info"></p-tag>
                    <span class="file-size">{{ formatFileSize(document()?.fileSize || 0) }}</span>
                  </div>
                </div>
              </div>
            </ng-template>

            <div class="document-content">
              <div class="document-description" *ngIf="document()?.description">
                <h4>Description</h4>
                <p>{{ document()?.description }}</p>
              </div>

              <div class="document-details">
                <div class="detail-row">
                  <span class="detail-label">Document Type:</span>
                  <span class="detail-value">{{ document()?.documentType }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">File Size:</span>
                  <span class="detail-value">{{ formatFileSize(document()?.fileSize || 0) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Upload Date:</span>
                  <span class="detail-value">{{ document()?.uploadedAt | date:'medium' }}</span>
                </div>
                <div class="detail-row" *ngIf="document()?.verificationStatus">
                  <span class="detail-label">Verification Status:</span>
                  <p-tag 
                    [value]="document()?.verificationStatus" 
                    [severity]="getVerificationSeverity(document()?.verificationStatus)">
                  </p-tag>
                </div>
              </div>

              <p-divider></p-divider>

              <div class="share-permissions">
                <h4>Your Permissions</h4>
                <div class="permissions-list">
                  <div class="permission-item" *ngIf="sharePermissions()?.canView">
                    <i class="pi pi-eye permission-icon"></i>
                    <span>View document details</span>
                  </div>
                  <div class="permission-item" *ngIf="sharePermissions()?.canDownload">
                    <i class="pi pi-download permission-icon"></i>
                    <span>Download document</span>
                  </div>
                  <div class="permission-item" *ngIf="sharePermissions()?.canEdit">
                    <i class="pi pi-pencil permission-icon"></i>
                    <span>Edit document metadata</span>
                  </div>
                </div>
              </div>
            </div>

            <ng-template pTemplate="footer">
              <div class="document-actions">
                <p-button 
                  label="Download" 
                  icon="pi pi-download"
                  (onClick)="downloadDocument()"
                  [loading]="downloading()"
                  [disabled]="!sharePermissions()?.canDownload"
                  severity="success">
                </p-button>

                <p-button 
                  label="View Details" 
                  icon="pi pi-info-circle"
                  [text]="true"
                  (onClick)="viewDocumentDetails()"
                  [disabled]="!sharePermissions()?.canView">
                </p-button>
              </div>
            </ng-template>
          </p-card>
        </div>

        <!-- Error State -->
        <div class="error-card" *ngIf="!loading() && error() && !requiresPassword()">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header error-header">
                <i class="pi pi-exclamation-triangle header-icon"></i>
                <h2>Access Error</h2>
              </div>
            </ng-template>

            <div class="error-content">
              <p-message severity="error" [text]="error() || undefined"></p-message>
              
              <div class="error-actions">
                <p-button 
                  label="Try Again" 
                  icon="pi pi-refresh"
                  (onClick)="retryAccess()"
                  [text]="true">
                </p-button>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Share Info -->
        <div class="share-info" *ngIf="document()">
          <p-card>
            <div class="share-details">
              <h4>About This Share</h4>
              <p class="share-message">
                This document has been shared with you. You can access it according to the permissions granted by the document owner.
              </p>
              
              <div class="share-warning" *ngIf="isExpiringSoon()">
                <p-message 
                  severity="warn" 
                  text="This share link will expire soon. Make sure to download or view the document before it expires.">
                </p-message>
              </div>
            </div>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styleUrl: './shared-document-access.component.scss'
})
export class SharedDocumentAccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sharingService = inject(DocumentSharingService);
  private readonly documentService = inject(DocumentService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly loading = signal(true);
  readonly accessing = signal(false);
  readonly downloading = signal(false);
  readonly requiresPassword = signal(false);
  readonly document = signal<Document | null>(null);
  readonly sharePermissions = signal<SharePermissions | null>(null);
  readonly error = signal<string | null>(null);

  // Form data
  password = '';
  private shareToken = '';

  ngOnInit() {
    this.shareToken = this.route.snapshot.params['token'];
    if (this.shareToken) {
      this.accessDocument();
    } else {
      this.error.set('Invalid share link');
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  accessDocument() {
    if (this.requiresPassword() && !this.password) {
      return;
    }

    this.accessing.set(true);
    this.error.set(null);

    this.sharingService.accessDocumentViaLink(this.shareToken, this.password ? this.password : undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (document) => {
          this.document.set(document);
          this.sharePermissions.set(document.permissions);
          this.loading.set(false);
          this.accessing.set(false);
          this.requiresPassword.set(false);
        },
        error: (error) => {
          this.accessing.set(false);
          this.loading.set(false);

          if (error.status === 401) {
            this.requiresPassword.set(true);
            this.error.set('Invalid password. Please try again.');
          } else if (error.status === 404) {
            this.error.set('This share link is not valid or has expired.');
          } else if (error.status === 403) {
            this.error.set('This share link has reached its maximum usage limit.');
          } else {
            this.error.set('Failed to access the shared document. Please try again.');
          }
        }
      });
  }

  downloadDocument() {
    const doc = this.document();
    if (!doc || !this.sharePermissions()?.canDownload) {
      return;
    }

    this.downloading.set(true);

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
          this.downloading.set(false);
        },
        error: () => {
          this.downloading.set(false);
          this.notificationService.error('Failed to download document');
        }
      });
  }

  viewDocumentDetails() {
    const doc = this.document();
    if (!doc || !this.sharePermissions()?.canView) {
      return;
    }

    // Navigate to document details page if user has access
    this.router.navigate(['/documents', doc.id]);
  }

  retryAccess() {
    this.loading.set(true);
    this.error.set(null);
    this.requiresPassword.set(false);
    this.password = '';
    this.accessDocument();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getVerificationSeverity(status: string | undefined): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warn';
      case 'failed':
        return 'danger';
      case 'expired':
        return 'secondary';
      default:
        return 'contrast';
    }
  }

  isExpiringSoon(): boolean {
    // This would typically check the share link expiration
    // For now, return false as we don't have expiration info in the component
    return false;
  }
}