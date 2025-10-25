import { Injectable, inject } from '@angular/core';
import { Observable, Subject, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { HttpClient, HttpEventType, HttpProgressEvent, HttpResponse } from '@angular/common/http';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
    Document as DocumentModel,
    DocumentMetadata,
    DocumentType,
    DocumentUploadProgress,
    UploadStatus,
    BulkIssuanceRequest,
    BulkIssuanceResult
} from '../../shared/models/document.models';

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    private readonly http = inject(HttpClient);
    private readonly apiService = inject(ApiService);
    private readonly notificationService = inject(NotificationService);

    private uploadProgressSubject = new BehaviorSubject<Map<string, DocumentUploadProgress>>(new Map());
    public uploadProgress$ = this.uploadProgressSubject.asObservable();

    private activeUploads = new Map<string, Subject<void>>();

    /**
     * Upload single document with progress tracking
     */
    uploadDocument(
        file: File,
        metadata: DocumentMetadata,
        documentType: DocumentType,
        templateId?: string
    ): Observable<DocumentModel> {
        const fileId = this.generateFileId();
        const formData = new FormData();

        formData.append('file', file);
        formData.append('metadata', JSON.stringify(metadata));
        formData.append('documentType', documentType);
        if (templateId) {
            formData.append('templateId', templateId);
        }

        // Initialize progress tracking
        this.updateUploadProgress(fileId, {
            fileId,
            fileName: file.name,
            progress: 0,
            status: UploadStatus.PENDING
        });

        // Create cancellation subject
        const cancelSubject = new Subject<void>();
        this.activeUploads.set(fileId, cancelSubject);

        return this.http.post<any>(`${this.apiService.getBaseUrl()}/documents/upload`, formData, {
            reportProgress: true,
            observe: 'events'
        }).pipe(
            map(event => {
                if (event.type === HttpEventType.UploadProgress) {
                    const progress = Math.round(100 * event.loaded / (event.total || 1));
                    this.updateUploadProgress(fileId, {
                        fileId,
                        fileName: file.name,
                        progress,
                        status: UploadStatus.UPLOADING
                    });
                } else if (event.type === HttpEventType.Response) {
                    this.updateUploadProgress(fileId, {
                        fileId,
                        fileName: file.name,
                        progress: 100,
                        status: UploadStatus.PROCESSING
                    });
                    return event.body.data;
                }
                return null;
            }),
            tap(document => {
                if (document) {
                    this.updateUploadProgress(fileId, {
                        fileId,
                        fileName: file.name,
                        progress: 100,
                        status: UploadStatus.COMPLETED,
                        documentId: document.id
                    });
                    this.notificationService.success(`Document "${file.name}" uploaded successfully`);
                }
            }),
            catchError(error => {
                this.updateUploadProgress(fileId, {
                    fileId,
                    fileName: file.name,
                    progress: 0,
                    status: UploadStatus.FAILED,
                    error: error.message || 'Upload failed'
                });
                this.notificationService.error(`Failed to upload "${file.name}". Please try again.`);
                return throwError(() => error);
            }),
            finalize(() => {
                this.activeUploads.delete(fileId);
                // Remove progress after 5 seconds
                setTimeout(() => this.removeUploadProgress(fileId), 5000);
            })
        );
    }

    /**
     * Upload multiple documents with progress tracking
     */
    uploadMultipleDocuments(
        files: File[],
        metadata: DocumentMetadata[],
        documentType: DocumentType,
        templateId?: string
    ): Observable<DocumentModel[]> {
        const uploads = files.map((file, index) =>
            this.uploadDocument(file, metadata[index] || {}, documentType, templateId)
        );

        return new Observable(observer => {
            const results: DocumentModel[] = [];
            let completed = 0;

            uploads.forEach((upload, index) => {
                upload.subscribe({
                    next: (document) => {
                        if (document) {
                            results[index] = document;
                            completed++;
                            if (completed === files.length) {
                                observer.next(results);
                                observer.complete();
                            }
                        }
                    },
                    error: (error) => {
                        observer.error(error);
                    }
                });
            });
        });
    }

    /**
     * Bulk upload with job tracking
     */
    bulkUpload(request: BulkIssuanceRequest): Observable<BulkIssuanceResult> {
        const formData = new FormData();

        request.documents.forEach((doc, index) => {
            const fileId = this.generateFileId();
            formData.append(`files[${index}]`, doc.file);
            formData.append(`metadata[${index}]`, JSON.stringify(doc.metadata));

            // Initialize progress for each file
            this.updateUploadProgress(fileId, {
                fileId,
                fileName: doc.file.name,
                progress: 0,
                status: UploadStatus.PENDING
            });
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
     * Cancel upload
     */
    cancelUpload(fileId: string): void {
        const cancelSubject = this.activeUploads.get(fileId);
        if (cancelSubject) {
            cancelSubject.next();
            cancelSubject.complete();
            this.activeUploads.delete(fileId);

            this.updateUploadProgress(fileId, {
                fileId,
                fileName: '',
                progress: 0,
                status: UploadStatus.CANCELLED
            });
        }
    }

    /**
     * Validate file before upload
     */
    validateFile(file: File): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png',
            'image/jpeg',
            'image/jpg'
        ];

        // Check file size
        if (file.size > maxSize) {
            errors.push(`File size exceeds 10MB limit. Current size: ${this.formatFileSize(file.size)}`);
        }

        // Check file type
        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type not supported. Allowed types: PDF, DOCX, PNG, JPG, JPEG`);
        }

        // Check file name
        if (!file.name || file.name.trim().length === 0) {
            errors.push('File name is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate multiple files
     */
    validateFiles(files: File[]): { isValid: boolean; errors: string[]; validFiles: File[] } {
        const errors: string[] = [];
        const validFiles: File[] = [];

        if (files.length > 100) {
            errors.push('Maximum 100 files allowed for bulk upload');
            return { isValid: false, errors, validFiles };
        }

        files.forEach((file, index) => {
            const validation = this.validateFile(file);
            if (validation.isValid) {
                validFiles.push(file);
            } else {
                errors.push(`File ${index + 1} (${file.name}): ${validation.errors.join(', ')}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            validFiles
        };
    }

    /**
     * Get upload progress for specific file
     */
    getUploadProgress(fileId: string): DocumentUploadProgress | undefined {
        return this.uploadProgressSubject.value.get(fileId);
    }

    /**
     * Get all upload progress
     */
    getAllUploadProgress(): DocumentUploadProgress[] {
        return Array.from(this.uploadProgressSubject.value.values());
    }

    /**
     * Clear all upload progress
     */
    clearAllProgress(): void {
        this.uploadProgressSubject.next(new Map());
    }

    /**
     * Retry failed upload
     */
    retryUpload(fileId: string, file: File, metadata: DocumentMetadata, documentType: DocumentType): Observable<DocumentModel> {
        // Remove old progress
        this.removeUploadProgress(fileId);
        // Start new upload
        return this.uploadDocument(file, metadata, documentType);
    }

    /**
     * Generate unique file ID
     */
    private generateFileId(): string {
        return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update upload progress
     */
    private updateUploadProgress(fileId: string, progress: DocumentUploadProgress): void {
        const currentProgress = new Map(this.uploadProgressSubject.value);
        currentProgress.set(fileId, progress);
        this.uploadProgressSubject.next(currentProgress);
    }

    /**
     * Remove upload progress
     */
    private removeUploadProgress(fileId: string): void {
        const currentProgress = new Map(this.uploadProgressSubject.value);
        currentProgress.delete(fileId);
        this.uploadProgressSubject.next(currentProgress);
    }

    /**
     * Format file size for display
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Check if file type is image
     */
    isImageFile(file: File): boolean {
        return file.type.startsWith('image/');
    }

    /**
     * Generate thumbnail for image files
     */
    generateThumbnail(file: File, maxWidth: number = 200, maxHeight: number = 200): Observable<string> {
        if (!this.isImageFile(file)) {
            return of('');
        }

        return new Observable(observer => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions
                    let { width, height } = img;
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw and convert to base64
                    ctx?.drawImage(img, 0, 0, width, height);
                    const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

                    observer.next(thumbnail);
                    observer.complete();
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    }
}