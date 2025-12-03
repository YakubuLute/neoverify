/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
  Document as DocumentModel,
  VerificationRequest,
  VerificationResults,
  BulkIssuanceRequest,
  BulkIssuanceResult,
  DocumentMetadata,
  DocumentType,
  DocumentStatus,
  DocumentModelResponse
} from '../../shared/models/document.models';
import { PaginatedResponse, QueryParams } from '../../shared/models/common.models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Upload and register a document
   */
  uploadDocument(file: File, metadata: DocumentMetadata, documentType: DocumentType): Observable<DocumentModel> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('documentType', documentType);

    return this.apiService.post<DocumentModel>('documents/upload', formData).pipe(
      tap(document => {
        this.notificationService.success(`Document "${document.originalFileName}" uploaded successfully`);
      }),
      catchError(error => {
        this.notificationService.error('Failed to upload document. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Register document hash on blockchain
   */
  registerOnChain(documentId: string): Observable<DocumentModel> {
    return this.apiService.post<DocumentModel>(`documents/${documentId}/register`, {}).pipe(
      tap(document => {
        this.notificationService.success('Document registered on blockchain successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to register document on blockchain. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Retry failed blockchain registration
   */
  retryRegistration(documentId: string): Observable<DocumentModel> {
    return this.apiService.post<DocumentModel>(`documents/${documentId}/retry-registration`, {}).pipe(
      tap(() => {
        this.notificationService.info('Retrying blockchain registration...');
      }),
      catchError(error => {
        this.notificationService.error('Failed to retry registration. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Revoke a document
   */
  revokeDocument(documentId: string, reason: string): Observable<DocumentModel> {
    return this.apiService.post<DocumentModel>(`documents/${documentId}/revoke`, { reason }).pipe(
      tap(() => {
        this.notificationService.success('Document revoked successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to revoke document. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): Observable<DocumentModelResponse> {
    return this.apiService.get<DocumentModelResponse>(`documents/${documentId}`).pipe(
      catchError(error => {
        this.notificationService.error('Document not found');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get documents with pagination and filtering
   */
  getDocuments(params?: QueryParams): Observable<PaginatedResponse<DocumentModelResponse>> {
    return this.apiService.get<PaginatedResponse<DocumentModelResponse>>('documents', { params }).pipe(
      catchError(error => {
        this.notificationService.error('Failed to load documents');
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify document by upload, hash, or ID
   */
  verifyDocument(request: VerificationRequest): Observable<VerificationResults> {
    const endpoint = 'verify';
    let body: any = {};

    const formData = new FormData();
    switch (request.type) {
      case 'file':
        formData.append('file', request.file!);
        formData.append('runForensics', String(request.runForensics || false));
        return this.apiService.post<VerificationResults>(`${endpoint}/file`, formData);

      case 'hash':
        body = {
          hash: request.hash,
          runForensics: request.runForensics || false
        };
        break;

      case 'id':
        body = {
          verificationId: request.verificationId,
          runForensics: request.runForensics || false
        };
        break;
    }

    return this.apiService.post<VerificationResults>(`${endpoint}/${request.type}`, body).pipe(
      catchError(error => {
        this.notificationService.error('Verification failed. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Bulk document issuance
   */
  bulkIssuance(request: BulkIssuanceRequest): Observable<BulkIssuanceResult> {
    const formData = new FormData();

    request.documents.forEach((doc, index) => {
      formData.append(`files[${index}]`, doc.file);
      formData.append(`metadata[${index}]`, JSON.stringify(doc.metadata));
    });

    formData.append('documentType', request.documentType);
    if (request.template) {
      formData.append('template', JSON.stringify(request.template));
    }

    return this.apiService.post<BulkIssuanceResult>('documents/bulk-upload', formData).pipe(
      tap(result => {
        const total = (result.processedCount ?? 0) + (result.failedCount ?? 0);
        this.notificationService.success(`Bulk upload initiated. Processing ${total} documents.`);
      }),
      catchError(error => {
        this.notificationService.error('Bulk upload failed. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get bulk issuance job status
   */
  getBulkJobStatus(jobId: string): Observable<BulkIssuanceResult> {
    return this.apiService.get<BulkIssuanceResult>(`documents/bulk-jobs/${jobId}`);
  }

  /**
   * Download document file
   */
  downloadDocument(documentId: string): Observable<Blob> {
    // Mock implementation - return a simple blob
    return new Observable(observer => {
      const blob = new Blob(['Mock document content'], { type: 'application/pdf' });
      observer.next(blob);
      observer.complete();
    });
  }

  /**
   * Download verification receipt
   */
  downloadVerificationReceipt(verificationId: string): Observable<Blob> {
    // Mock implementation
    return new Observable(observer => {
      const blob = new Blob(['Mock receipt content'], { type: 'application/pdf' });
      observer.next(blob);
      observer.complete();
    });
  }

  // Document Management System Methods

  /**
   * Update document metadata
   */
  updateDocument(documentId: string, updates: Partial<DocumentModel>): Observable<DocumentModel> {
    return this.apiService.put<DocumentModel>(`documents/${documentId}`, updates).pipe(
      tap(document => {
        this.notificationService.success(`Document "${document.originalFileName}" updated successfully`);
      }),
      catchError(error => {
        this.notificationService.error('Failed to update document. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete document
   */
  deleteDocument(documentId: string): Observable<void> {
    return this.apiService.delete<void>(`documents/${documentId}`).pipe(
      tap(() => {
        this.notificationService.success('Document deleted successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to delete document. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Search documents with advanced filtering
   */
  searchDocuments(query: string, filters?: any, params?: QueryParams): Observable<any> {
    const searchParams = {
      ...params,
      query,
      ...filters
    };

    return this.apiService.get<any>('documents/search', { params: searchParams }).pipe(
      catchError(error => {
        this.notificationService.error('Search failed. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Add tags to document
   */
  addTags(documentId: string, tags: string[]): Observable<DocumentModel> {
    return this.apiService.post<DocumentModel>(`documents/${documentId}/tags`, { tags }).pipe(
      tap(() => {
        this.notificationService.success('Tags added successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to add tags. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Remove tags from document
   */
  removeTags(documentId: string, tags: string[]): Observable<DocumentModel> {
    return this.apiService.post<DocumentModel>(`documents/${documentId}/tags/remove`, { tags }).pipe(
      tap(() => {
        this.notificationService.success('Tags removed successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to remove tags. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Share document with users
   */
  shareDocument(documentId: string, userIds: string[], permissions: any): Observable<void> {
    return this.apiService.post<void>(`documents/${documentId}/share`, { userIds, permissions }).pipe(
      tap(() => {
        this.notificationService.success('Document shared successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to share document. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update document permissions
   */
  updateDocumentPermissions(documentId: string, permissions: any): Observable<DocumentModel> {
    return this.apiService.put<DocumentModel>(`documents/${documentId}/permissions`, permissions).pipe(
      tap(() => {
        this.notificationService.success('Document permissions updated successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to update permissions. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get document audit trail
   */
  getDocumentAuditTrail(documentId: string): Observable<any[]> {
    return this.apiService.get<any[]>(`documents/${documentId}/audit-trail`).pipe(
      catchError(error => {
        this.notificationService.error('Failed to load audit trail');
        return throwError(() => error);
      })
    );
  }

  /**
   * Perform bulk operations on documents
   */
  bulkOperation(operation: any): Observable<any> {
    return this.apiService.post<any>('documents/bulk-operation', operation).pipe(
      tap(result => {
        this.notificationService.success(`Bulk operation completed. ${result.successCount} items processed successfully.`);
      }),
      catchError(error => {
        this.notificationService.error('Bulk operation failed. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Export documents
   */
  exportDocuments(documentIds: string[], format: string, options?: any): Observable<Blob> {
    const exportData = {
      documentIds,
      format,
      ...options
    };

    // Use HttpClient directly for blob responses
    return this.http.post(`${this.apiService.getBaseUrl()}/documents/export`, exportData, {
      responseType: 'blob'
    }).pipe(
      tap(() => {
        this.notificationService.success('Export completed successfully');
      }),
      catchError(error => {
        this.notificationService.error('Export failed. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get document statistics
   */
  getDocumentStats(): Observable<unknown> {
    return this.apiService.get<any>('documents/stats').pipe(
      catchError(error => {
        this.notificationService.error('Failed to load document statistics');
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate document thumbnail
   */
  generateThumbnail(documentId: string): Observable<string> {
    return this.apiService.post<{ thumbnailUrl: string }>(`documents/${documentId}/thumbnail`, {}).pipe(
      map(response => response.thumbnailUrl),
      catchError(error => {
        this.notificationService.error('Failed to generate thumbnail');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update document status (deprecated - use DocumentStatusService instead)
   * @deprecated Use DocumentStatusService.updateDocumentStatus instead
   */
  updateDocumentStatus(documentId: string, status: DocumentStatus): Observable<DocumentModel> {
    return this.apiService.put<DocumentModel>(`documents/${documentId}/status`, { status }).pipe(
      tap(() => {
        this.notificationService.success('Document status updated successfully');
      }),
      catchError(error => {
        this.notificationService.error('Failed to update document status. Please try again.');
        return throwError(() => error);
      })
    );
  }
}
