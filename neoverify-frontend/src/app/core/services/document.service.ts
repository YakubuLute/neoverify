import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import { 
  Document as DocumentModel, 
  VerificationRequest, 
  VerificationResult, 
  BulkIssuanceRequest, 
  BulkIssuanceResult,
  DocumentMetadata,
  DocumentType 
} from '../../shared/models/document.models';
import { PaginatedResponse, QueryParams } from '../../shared/models/common.models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
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
      map(response => response.data),
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
      map(response => response.data),
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
      map(response => response.data),
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
      map(response => response.data),
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
  getDocument(documentId: string): Observable<DocumentModel> {
    return this.apiService.get<DocumentModel>(`documents/${documentId}`).pipe(
      map(response => response.data),
      catchError(error => {
        this.notificationService.error('Document not found');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get documents with pagination and filtering
   */
  getDocuments(params?: QueryParams): Observable<PaginatedResponse<DocumentModel>> {
    return this.apiService.get<PaginatedResponse<DocumentModel>>('documents', params as any).pipe(
      map(response => response.data),
      catchError(error => {
        this.notificationService.error('Failed to load documents');
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify document by upload, hash, or ID
   */
  verifyDocument(request: VerificationRequest): Observable<VerificationResult> {
    let endpoint = 'verify';
    let body: any = {};

    switch (request.type) {
      case 'file':
        const formData = new FormData();
        formData.append('file', request.file!);
        formData.append('runForensics', String(request.runForensics || false));
        
        return this.apiService.post<VerificationResult>(`${endpoint}/file`, formData).pipe(
          map(response => response.data)
        );

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

    return this.apiService.post<VerificationResult>(`${endpoint}/${request.type}`, body).pipe(
      map(response => response.data),
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
      formData.append('template', request.template);
    }

    return this.apiService.post<BulkIssuanceResult>('documents/bulk-upload', formData).pipe(
      map(response => response.data),
      tap(result => {
        this.notificationService.success(`Bulk upload initiated. Processing ${result.totalItems} documents.`);
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
    return this.apiService.get<BulkIssuanceResult>(`documents/bulk-jobs/${jobId}`).pipe(
      map(response => response.data)
    );
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
}