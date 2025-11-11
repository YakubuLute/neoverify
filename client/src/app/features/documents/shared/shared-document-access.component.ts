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
  templateUrl: './shared-document-access.component.html',
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
          this.sharePermissions.set(document.permissions ?? null);
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
          a.download = doc.originalFileName ?? '';
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
