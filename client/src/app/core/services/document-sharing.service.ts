/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {  catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { PermissionsService } from './permissions.service';
import {
  Document,
  SharedUser,
  SharePermissions,
  AuditAction,
} from '../../shared/models/document.models';
import { User } from '../../shared/models/auth.models';

export interface ShareDocumentRequest {
  documentId: string;
  userEmails: string[];
  permissions: SharePermissions;
  message?: string;
  expiresAt?: Date;
}

export interface ShareLinkRequest {
  documentId: string;
  permissions: SharePermissions;
  expiresAt?: Date;
  password?: string;
  maxDownloads?: number;
}

export interface ShareLink {
  id: string;
  documentId: string;
  token: string;
  url: string;
  permissions: SharePermissions;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  password?: string;
  maxDownloads?: number;
  downloadCount: number;
  isActive: boolean;
  lastAccessedAt?: Date;
}

export interface ShareNotification {
  id: string;
  documentId: string;
  documentTitle: string;
  sharedBy: string;
  sharedByName: string;
  sharedWith: string;
  permissions: SharePermissions;
  message?: string;
  shareUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentSharingService {
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);

  /**
   * Share document with specific users
   */
  shareDocument(request: ShareDocumentRequest): Observable<SharedUser[]> {
    // Check permissions first
    const permissionCheck = this.permissionsService.canPerformDocumentOperation({
      action: AuditAction.SHARED,
      resource: 'document',
    });

    if (!permissionCheck.allowed) {
      return throwError(
        () => new Error(permissionCheck.reason || 'No permission to share documents')
      );
    }

    return this.apiService
      .post<SharedUser[]>(`documents/${request.documentId}/share`, {
        userEmails: request.userEmails,
        permissions: request.permissions,
        message: request.message,
        expiresAt: request.expiresAt,
      })
      .pipe(
        tap(() => {
          this.notificationService.success(
            `Document shared with ${request.userEmails.length} user(s) successfully`
          );
        }),
        catchError((error) => {
          this.notificationService.error('Failed to share document. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Update sharing permissions for a user
   */
  updateSharePermissions(
    documentId: string,
    userId: string,
    permissions: SharePermissions
  ): Observable<SharedUser> {
    return this.apiService
      .put<SharedUser>(`documents/${documentId}/share/${userId}`, {
        permissions,
      })
      .pipe(
        tap(() => {
          this.notificationService.success('Share permissions updated successfully');
        }),
        catchError((error) => {
          this.notificationService.error('Failed to update share permissions. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Remove user from document sharing
   */
  removeUserFromSharing(documentId: string, userId: string): Observable<void> {
    return this.apiService.delete<void>(`documents/${documentId}/share/${userId}`).pipe(
      tap(() => {
        this.notificationService.success('User removed from document sharing');
      }),
      catchError((error) => {
        this.notificationService.error('Failed to remove user from sharing. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get users who have access to a document
   */
  getDocumentSharedUsers(documentId: string): Observable<SharedUser[]> {
    return this.apiService.get<SharedUser[]>(`documents/${documentId}/shared-users`).pipe(
      catchError((error) => {
        this.notificationService.error('Failed to load shared users');
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a shareable link for a document
   */
  createShareLink(request: ShareLinkRequest): Observable<ShareLink> {
    const permissionCheck = this.permissionsService.canPerformDocumentOperation({
      action: AuditAction.SHARED,
      resource: 'document',
    });

    if (!permissionCheck.allowed) {
      return throwError(
        () => new Error(permissionCheck.reason || 'No permission to create share links')
      );
    }

    return this.apiService
      .post<ShareLink>(`documents/${request.documentId}/share-links`, {
        permissions: request.permissions,
        expiresAt: request.expiresAt,
        password: request.password,
        maxDownloads: request.maxDownloads,
      })
      .pipe(
        tap(() => {
          this.notificationService.success('Share link created successfully');
        }),
        catchError((error) => {
          this.notificationService.error('Failed to create share link. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get all share links for a document
   */
  getDocumentShareLinks(documentId: string): Observable<ShareLink[]> {
    return this.apiService.get<ShareLink[]>(`documents/${documentId}/share-links`).pipe(
      catchError((error) => {
        this.notificationService.error('Failed to load share links');
        return throwError(() => error);
      })
    );
  }

  /**
   * Revoke a share link
   */
  revokeShareLink(documentId: string, linkId: string): Observable<void> {
    return this.apiService.delete<void>(`documents/${documentId}/share-links/${linkId}`).pipe(
      tap(() => {
        this.notificationService.success('Share link revoked successfully');
      }),
      catchError((error) => {
        this.notificationService.error('Failed to revoke share link. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Access document via share link
   */
  accessDocumentViaLink(token: string, password?: string): Observable<Document> {
    return this.apiService
      .post<Document>(`documents/shared/${token}/access`, {
        password,
      })
      .pipe(
        catchError((error) => {
          if (error.status === 401) {
            this.notificationService.error('Invalid password for shared document');
          } else if (error.status === 404) {
            this.notificationService.error('Share link not found or has expired');
          } else if (error.status === 403) {
            this.notificationService.error('Share link has reached maximum download limit');
          } else {
            this.notificationService.error('Failed to access shared document');
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Search for users to share with (within organization)
   */
  searchUsersForSharing(query: string): Observable<User[]> {
    return this.apiService
      .get<User[]>('users/search', {
        query,
        limit: 10,
        excludeSelf: true,
      } as any)
      .pipe(
        catchError((error) => {
          console.error('Failed to search users:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get sharing notifications for current user
   */
  getSharingNotifications(): Observable<ShareNotification[]> {
    return this.apiService.get<ShareNotification[]>('documents/sharing/notifications').pipe(
      catchError((error) => {
        console.error('Failed to load sharing notifications:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Mark sharing notification as read
   */
  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.apiService
      .put<void>(`documents/sharing/notifications/${notificationId}/read`, {})
      .pipe(
        catchError((error) => {
          console.error('Failed to mark notification as read:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get documents shared with current user
   */
  getSharedWithMeDocuments(): Observable<Document[]> {
    return this.apiService.get<Document[]>('documents/shared-with-me').pipe(
      catchError((error) => {
        this.notificationService.error('Failed to load shared documents');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get documents shared by current user
   */
  getSharedByMeDocuments(): Observable<Document[]> {
    return this.apiService.get<Document[]>('documents/shared-by-me').pipe(
      catchError((error) => {
        this.notificationService.error('Failed to load shared documents');
        return throwError(() => error);
      })
    );
  }

  /**
   * Bulk share documents with users
   */
  bulkShareDocuments(
    documentIds: string[],
    userEmails: string[],
    permissions: SharePermissions,
    message?: string
  ): Observable<{ successCount: number; failureCount: number; results: any[] }> {
    return this.apiService
      .post<any>('documents/bulk-share', {
        documentIds,
        userEmails,
        permissions,
        message,
      })
      .pipe(
        tap((result) => {
          this.notificationService.success(
            `Bulk sharing completed. ${result.successCount} documents shared successfully.`
          );
        }),
        catchError((error) => {
          this.notificationService.error('Bulk sharing failed. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Check if current user can share a document
   */
  canShareDocument(document?: Document): boolean {
    const permissionCheck = this.permissionsService.canPerformDocumentOperation(
      { action: AuditAction.SHARED, resource: 'document' },
      document
    );
    return permissionCheck.allowed;
  }

  /**
   * Get share link URL for frontend routing
   */
  getShareLinkUrl(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/documents/shared/${token}`;
  }

  /**
   * Copy share link to clipboard
   */
  async copyShareLinkToClipboard(shareLink: ShareLink): Promise<void> {
    try {
      const url = this.getShareLinkUrl(shareLink.token);
      await navigator.clipboard.writeText(url);
      this.notificationService.success('Share link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.notificationService.error('Failed to copy share link to clipboard');
    }
  }

  /**
   * Validate share permissions
   */
  validateSharePermissions(permissions: SharePermissions): boolean {
    // At least one permission must be granted
    return permissions.canView || permissions.canEdit || permissions.canDownload;
  }

  /**
   * Get default share permissions based on user role
   */
  getDefaultSharePermissions(): SharePermissions {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return {
        canView: true,
        canEdit: false,
        canDownload: false,
        canShare: false,
      };
    }

    // Default permissions based on sharing user's role
    switch (user.role) {
      case 'platform_admin':
      case 'org_admin':
        return {
          canView: true,
          canEdit: true,
          canDownload: true,
          canShare: false,
        };
      case 'issuer':
        return {
          canView: true,
          canEdit: false,
          canDownload: true,
          canShare: false,
        };
      default:
        return {
          canView: true,
          canEdit: false,
          canDownload: false,
          canShare: false,
        };
    }
  }
}
