/* eslint-disable @typescript-eslint/no-explicit-any */
//* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { UploadService } from '../../../core/services/upload.service';
import { TemplateService } from '../../../core/services/template.service';
import { SHARED_IMPORTS } from '../../../shared';
import { DocumentType, DocumentMetadata, DocumentUploadProgress, UploadStatus, DocumentTemplate, TemplateField, ValidationType } from '../../../shared/models/document.models';
import { FormUtils } from '../../../shared/utils/form.utils';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: SHARED_IMPORTS,
  templateUrl: `./document-upload.component.html`,
  styleUrl: `./document-upload.component.scss`
})
export class DocumentUploadComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly documentService = inject(DocumentService);
  private readonly uploadService = inject(UploadService);
  private readonly templateService = inject(TemplateService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  readonly acceptedFileTypes = '.pdf,.docx,.png,.jpg,.jpeg';
  readonly uploadMode = signal<'single' | 'bulk'>('single');
  readonly selectedFile = signal<File | null>(null);
  readonly selectedFiles = signal<File[]>([]);
  readonly fileError = signal<string>('');
  readonly isDragOver = signal<boolean>(false);
  readonly filePreview = signal<string>('');
  readonly uploadProgress = signal<DocumentUploadProgress | null>(null);
  readonly bulkUploadProgress = signal<Map<string, DocumentUploadProgress>>(new Map());
  readonly titleSuggestions = signal<string[]>([]);
  readonly customFields = signal<TemplateField[]>([]);
  readonly today = new Date();
  readonly bulkUploadResults = signal<{ success: number; failed: number; total: number } | null>(null);
  readonly availableTemplates = signal<DocumentTemplate[]>([]);
  readonly selectedTemplate = signal<DocumentTemplate | null>(null);
  readonly showTemplatePreview = signal<boolean>(false);

  readonly UploadStatus = UploadStatus;

  readonly documentTypeOptions = [
    { label: 'Degree Certificate', value: DocumentType.DEGREE },
    { label: 'Professional Certificate', value: DocumentType.CERTIFICATE },
    { label: 'License', value: DocumentType.LICENSE },
    { label: 'Academic Transcript', value: DocumentType.TRANSCRIPT },
    { label: 'ID Document', value: DocumentType.ID_DOCUMENT },
    { label: 'Other', value: DocumentType.OTHER }
  ];

  readonly uploadForm = this.fb.group({
    templateId: [''],
    documentType: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    recipientName: [''],
    issueDate: [null as Date | null],
    expiryDate: [null as Date | null],
    tags: [[] as string[]],
    autoRegister: [true]
  });

  readonly showRecipientField = signal<boolean>(false);
  readonly minExpiryDate = computed(() => {
    const issueDate = this.uploadForm.get('issueDate')?.value;
    return issueDate ? new Date(issueDate) : new Date();
  });

  readonly isUploading = computed(() => {
    const progress = this.uploadProgress();
    return progress?.status === UploadStatus.UPLOADING || progress?.status === UploadStatus.PROCESSING;
  });

  readonly canSubmit = computed(() => {
    const hasFiles = this.uploadMode() === 'single'
      ? this.selectedFile()
      : this.selectedFiles().length > 0;
    return this.uploadForm.valid && hasFiles && !this.isUploading();
  });

  readonly isBulkMode = computed(() => this.uploadMode() === 'bulk');

  // For template binding
  get isBulkModeValue(): boolean {
    return this.isBulkMode();
  }

  set isBulkModeValue(value: boolean) {
    // This setter is needed for ngModel binding but we handle the change in toggleUploadMode
  }
  readonly totalBulkProgress = computed(() => {
    const progressMap = this.bulkUploadProgress();
    if (progressMap.size === 0) return 0;

    const totalProgress = Array.from(progressMap.values())
      .reduce((sum, progress) => sum + progress.progress, 0);
    return Math.round(totalProgress / progressMap.size);
  });

  ngOnInit(): void {
    this.setupFormWatchers();
    this.subscribeToUploadProgress();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormWatchers(): void {
    // Watch template selection changes
    this.uploadForm.get('templateId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(templateId => {
        if (templateId) {
          this.loadTemplate(templateId);
        } else {
          this.selectedTemplate.set(null);
          this.customFields.set([]);
          this.clearTemplateFields();
        }
      });

    // Watch document type changes to show/hide recipient field
    this.uploadForm.get('documentType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        const showRecipient = type && [DocumentType.DEGREE, DocumentType.CERTIFICATE, DocumentType.TRANSCRIPT].includes(type as DocumentType);
        this.showRecipientField.set(!!showRecipient);

        if (showRecipient) {
          this.uploadForm.get('recipientName')?.setValidators([Validators.required]);
        } else {
          this.uploadForm.get('recipientName')?.clearValidators();
        }
        this.uploadForm.get('recipientName')?.updateValueAndValidity();

        // Generate title suggestions based on document type
        this.generateTitleSuggestions(type || '');
      });

    // Watch title changes for auto-completion
    this.uploadForm.get('title')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(title => {
        if (title && title.length > 2) {
          this.generateTitleSuggestions(this.uploadForm.get('documentType')?.value || '', title);
        }
      });

    // Watch issue date changes to update expiry date minimum
    this.uploadForm.get('issueDate')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(issueDate => {
        const expiryDateControl = this.uploadForm.get('expiryDate');
        if (issueDate && expiryDateControl?.value && expiryDateControl.value <= issueDate) {
          expiryDateControl.setValue(null);
        }
      });
  }

  private subscribeToUploadProgress(): void {
    this.uploadService.uploadProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progressMap => {
        if (this.uploadMode() === 'single') {
          const currentFile = this.selectedFile();
          if (currentFile) {
            // Find progress for current file
            const progress = Array.from(progressMap.values())
              .find(p => p.fileName === currentFile.name);
            this.uploadProgress.set(progress || null);
          }
        } else {
          // Update bulk upload progress
          this.bulkUploadProgress.set(new Map(progressMap));

          // Check if all uploads are complete
          const allProgress = Array.from(progressMap.values());
          const completed = allProgress.filter(p =>
            p.status === UploadStatus.COMPLETED || p.status === UploadStatus.FAILED
          );

          if (allProgress.length > 0 && completed.length === allProgress.length) {
            const success = allProgress.filter(p => p.status === UploadStatus.COMPLETED).length;
            const failed = allProgress.filter(p => p.status === UploadStatus.FAILED).length;

            this.bulkUploadResults.set({
              success,
              failed,
              total: allProgress.length
            });
          }
        }
      });
  }

  // Drag and Drop Methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      if (this.uploadMode() === 'single') {
        this.handleFileSelection(files[0]);
      } else {
        this.handleMultipleFileSelection(Array.from(files));
      }
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (this.uploadMode() === 'single') {
        this.handleFileSelection(input.files[0]);
      } else {
        this.handleMultipleFileSelection(Array.from(input.files));
      }
    }
  }

  private handleFileSelection(file: File): void {
    // Validate file using upload service
    const validation = this.uploadService.validateFile(file);

    if (!validation.isValid) {
      this.fileError.set(validation.errors.join(', '));
      return;
    }

    this.selectedFile.set(file);
    this.fileError.set('');

    // Generate preview for images
    if (this.isImageFile(file)) {
      this.uploadService.generateThumbnail(file, 300, 200)
        .pipe(takeUntil(this.destroy$))
        .subscribe(thumbnail => {
          this.filePreview.set(thumbnail);
        });
    } else {
      this.filePreview.set('');
    }

    // Auto-fill title if empty
    if (!this.uploadForm.get('title')?.value) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const cleanTitle = fileName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      this.uploadForm.patchValue({ title: cleanTitle });
    }
  }

  removeFile(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedFile.set(null);
    this.fileError.set('');
    this.filePreview.set('');
  }

  // Utility Methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // Title Suggestions
  private generateTitleSuggestions(documentType?: string, currentTitle?: string): void {
    const suggestions: string[] = [];

    if (documentType) {
      const baseSuggestions = this.getBaseSuggestions(documentType);

      if (currentTitle && currentTitle.length > 2) {
        // Filter suggestions based on current input
        const filtered = baseSuggestions.filter(s =>
          s.toLowerCase().includes(currentTitle.toLowerCase())
        );
        suggestions.push(...filtered);
      } else {
        suggestions.push(...baseSuggestions.slice(0, 5));
      }
    }

    this.titleSuggestions.set(suggestions);
  }

  private getBaseSuggestions(documentType: string): string[] {
    const suggestionMap: Record<string, string[]> = {
      [DocumentType.DEGREE]: [
        'Bachelor of Science Degree',
        'Master of Arts Degree',
        'Doctor of Philosophy Degree',
        'Bachelor of Engineering Degree',
        'Master of Business Administration'
      ],
      [DocumentType.CERTIFICATE]: [
        'Professional Certification',
        'Training Certificate',
        'Completion Certificate',
        'Achievement Certificate',
        'Competency Certificate'
      ],
      [DocumentType.LICENSE]: [
        'Professional License',
        'Business License',
        'Operating License',
        'Practice License',
        'Regulatory License'
      ],
      [DocumentType.TRANSCRIPT]: [
        'Academic Transcript',
        'Official Transcript',
        'University Transcript',
        'College Transcript',
        'Grade Report'
      ],
      [DocumentType.ID_DOCUMENT]: [
        'Identity Document',
        'Identification Card',
        'Official ID',
        'Government ID',
        'Personal Identification'
      ]
    };

    return suggestionMap[documentType] || [];
  }

  applySuggestion(fieldName: string, suggestion: string): void {
    this.uploadForm.patchValue({ [fieldName]: suggestion });
    this.titleSuggestions.set([]);
  }

  // Custom Fields Support
  getFieldOptions(field: TemplateField): any[] {
    return field.options?.map((option: string) => ({ label: option, value: option })) || [];
  }

  getTemplateOptions(): any[] {
    return this.availableTemplates().map(template => ({
      label: template.name,
      value: template.id
    }));
  }

  // Upload Mode Management
  toggleUploadMode(): void {
    const newMode = this.uploadMode() === 'single' ? 'bulk' : 'single';
    this.uploadMode.set(newMode);

    // Clear files when switching modes
    this.selectedFile.set(null);
    this.selectedFiles.set([]);
    this.fileError.set('');
    this.filePreview.set('');
    this.uploadProgress.set(null);
    this.bulkUploadProgress.set(new Map());
    this.bulkUploadResults.set(null);
  }

  // Bulk File Management
  private handleMultipleFileSelection(files: File[]): void {
    const validation = this.uploadService.validateFiles(files);

    if (!validation.isValid) {
      this.fileError.set(validation.errors.join('\n'));
      return;
    }

    // Add valid files to existing selection (up to 100 total)
    const currentFiles = this.selectedFiles();
    const newFiles = [...currentFiles, ...validation.validFiles];

    if (newFiles.length > 100) {
      this.fileError.set('Maximum 100 files allowed for bulk upload');
      return;
    }

    this.selectedFiles.set(newFiles);
    this.fileError.set('');
  }

  removeFileFromBulk(index: number): void {
    const files = this.selectedFiles();
    files.splice(index, 1);
    this.selectedFiles.set([...files]);
  }

  clearAllFiles(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedFiles.set([]);
    this.fileError.set('');
  }

  getTotalFileSize(): string {
    const totalBytes = this.selectedFiles().reduce((sum, file) => sum + file.size, 0);
    return this.formatFileSize(totalBytes);
  }

  // Upload Progress Management
  cancelUpload(): void {
    const progress = this.uploadProgress();
    if (progress) {
      if (progress.fileId) {
        this.uploadService.cancelUpload(progress.fileId);
      }
    }
  }

  cancelSingleUpload(fileId?: string): void {
    if (fileId) {
      this.uploadService.cancelUpload(fileId);
    }
  }

  // Template Management
  private loadTemplates(): void {
    this.templateService.getTemplates({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableTemplates.set(response);
        },
        error: (error) => {
          console.error('Failed to load templates:', error);
        }
      });
  }

  private loadTemplate(templateId: string): void {
    this.templateService.getTemplate(templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (template) => {
          this.selectedTemplate.set(template);
          this.customFields.set(template.fields);
          this.applyTemplateToForm(template);
        },
        error: (error) => {
          console.error('Failed to load template:', error);
        }
      });
  }

  private applyTemplateToForm(template: DocumentTemplate): void {
    // Pre-populate form fields based on template
    const updates: any = {};

    // Set document type if template has a specific type
    if (template.category) {
      const documentType = this.mapCategoryToDocumentType(template.category);
      if (documentType) {
        updates.documentType = documentType;
      }
    }

    // Apply template field defaults
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        switch (field.name.toLowerCase()) {
          case 'title':
            updates.title = field.defaultValue;
            break;
          case 'description':
            updates.description = field.defaultValue;
            break;
          case 'recipient':
          case 'recipientname':
            updates.recipientName = field.defaultValue;
            break;
          default:
            // Add custom field to form
            this.addCustomFieldToForm(field);
            updates[`custom_${field.id}`] = field.defaultValue;
            break;
        }
      } else {
        // Add custom field to form even without default value
        this.addCustomFieldToForm(field);
      }
    });

    // Apply validation rules from template
    this.applyTemplateValidation(template);

    // Update form with template values
    this.uploadForm.patchValue(updates);
  }

  private mapCategoryToDocumentType(category: string): DocumentType | null {
    const categoryMap: Record<string, DocumentType> = {
      'degree': DocumentType.DEGREE,
      'certificate': DocumentType.CERTIFICATE,
      'license': DocumentType.LICENSE,
      'transcript': DocumentType.TRANSCRIPT,
      'id': DocumentType.ID_DOCUMENT,
      'identity': DocumentType.ID_DOCUMENT
    };

    return categoryMap[category.toLowerCase()] || null;
  }

  private addCustomFieldToForm(field: TemplateField): void {
    const controlName = `custom_${field.id}`;

    if (!this.uploadForm.get(controlName)) {
      const validators = this.getFieldValidators(field);
      (this.uploadForm as any).addControl(controlName, this.fb.control(field.defaultValue || '', validators));
    }
  }

  private getFieldValidators(field: TemplateField): any[] {
    const validators: any[] = [];

    if (field.required) {
      validators.push(Validators.required);
    }

    if (field.validation) {
      if (field.validation.minLength) {
        validators.push(Validators.minLength(field.validation.minLength));
      }
      if (field.validation.maxLength) {
        validators.push(Validators.maxLength(field.validation.maxLength));
      }
      if (field.validation.pattern) {
        validators.push(Validators.pattern(field.validation.pattern));
      }
      if (field.validation.min !== undefined) {
        validators.push(Validators.min(field.validation.min));
      }
      if (field.validation.max !== undefined) {
        validators.push(Validators.max(field.validation.max));
      }
    }

    return validators;
  }

  private applyTemplateValidation(template: DocumentTemplate): void {
    template.validationRules.forEach(rule => {
      const control = this.uploadForm.get(rule.fieldId);
      if (control) {
        const currentValidators = control.validator ? [control.validator] : [];

        switch (rule.type) {
          case ValidationType.REQUIRED:
            currentValidators.push(Validators.required);
            break;
          case ValidationType.MIN_LENGTH:
            currentValidators.push(Validators.minLength(rule.value));
            break;
          case ValidationType.MAX_LENGTH:
            currentValidators.push(Validators.maxLength(rule.value));
            break;
          case ValidationType.PATTERN:
            currentValidators.push(Validators.pattern(rule.value));
            break;
        }

        control.setValidators(currentValidators);
        control.updateValueAndValidity();
      }
    });
  }

  private clearTemplateFields(): void {
    // Remove custom field controls
    const controlsToRemove: string[] = [];

    Object.keys(this.uploadForm.controls).forEach(key => {
      if (key.startsWith('custom_')) {
        controlsToRemove.push(key);
      }
    });

    controlsToRemove.forEach(controlName => {
      (this.uploadForm as any).removeControl(controlName);
    });
  }

  onTemplateSelect(templateId: string): void {
    this.uploadForm.patchValue({ templateId });
  }

  clearTemplate(): void {
    this.uploadForm.patchValue({ templateId: '' });
  }

  toggleTemplatePreview(): void {
    this.showTemplatePreview.set(!this.showTemplatePreview());
  }

  // Expose Array for template
  Array = Array;

  onSubmit(): void {
    if (!this.canSubmit()) {
      FormUtils.markFormGroupTouched(this.uploadForm);
      const hasFiles = this.uploadMode() === 'single'
        ? this.selectedFile()
        : this.selectedFiles().length > 0;

      if (!hasFiles) {
        this.fileError.set('Please select file(s) to upload');
      }
      return;
    }

    if (this.uploadMode() === 'single') {
      this.handleSingleUpload();
    } else {
      this.handleBulkUpload();
    }
  }

  private handleSingleUpload(): void {
    const formValue = this.uploadForm.value;
    const file = this.selectedFile()!;

    // Prepare metadata with custom fields
    const metadata: DocumentMetadata = {
      title: formValue.title!,
      description: formValue.description || undefined,
      recipientName: formValue.recipientName || undefined,
      issueDate: formValue.issueDate || undefined,
      expiryDate: formValue.expiryDate || undefined,
      customFields: this.extractCustomFields(formValue),
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      checksum: ''
    };

    // Add tags to metadata
    if (formValue.tags && formValue.tags.length > 0) {
      metadata.customFields = {
        ...metadata.customFields,
        tags: formValue.tags
      };
    }

    // Use upload service for better progress tracking
    this.uploadService.uploadDocument(
      file,
      metadata,
      formValue.documentType as DocumentType,
      formValue.templateId || undefined
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (document) => {
        if (document && formValue.autoRegister) {
          this.registerDocument(document.id);
        } else if (document) {
          this.router.navigate(['/documents', document.id]);
        }
      },
      error: (error) => {
        console.error('Upload failed:', error);
        // Error handling is managed by upload service
      }
    });
  }

  private handleBulkUpload(): void {
    const formValue = this.uploadForm.value;
    const files = this.selectedFiles();

    // Clear previous results
    this.bulkUploadResults.set(null);

    // Prepare base metadata (partial; per-file required fields added later)
    const baseMetadata: Partial<DocumentMetadata> = {
      description: formValue.description || undefined,
      recipientName: formValue.recipientName || undefined,
      issueDate: formValue.issueDate || undefined,
      expiryDate: formValue.expiryDate || undefined,
      customFields: this.extractCustomFields(formValue)
    };

    // Add tags to metadata
    if (formValue.tags && formValue.tags.length > 0) {
      baseMetadata.customFields = {
        ...baseMetadata.customFields,
        tags: formValue.tags
      };
    }

    // Create metadata array for each file (complete DocumentMetadata)
    const metadataArray = files.map(file => ({
      ...(baseMetadata as Partial<DocumentMetadata>),
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      checksum: ''
    }));

    // Use upload service for bulk upload
    this.uploadService.uploadMultipleDocuments(
      files,
      metadataArray as any,
      formValue.documentType as DocumentType,
      formValue.templateId || undefined
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (documents) => {
        // Handle successful bulk upload
        console.log('Bulk upload completed:', documents);

        // If auto-register is enabled, register all documents
        if (formValue.autoRegister) {
          this.registerMultipleDocuments(documents.map(d => d.id));
        } else {
          // Navigate to documents list after successful bulk upload
          setTimeout(() => {
            this.router.navigate(['/documents']);
          }, 2000);
        }
      },
      error: (error) => {
        console.error('Bulk upload failed:', error);
        // Error handling is managed by upload service
      }
    });
  }

  private registerMultipleDocuments(documentIds: string[]): void {
    // Register documents one by one (could be optimized with batch API)
    const registrations = documentIds.map(id =>
      this.documentService.registerOnChain(id).pipe(
        takeUntil(this.destroy$)
      )
    );

    // Wait for all registrations to complete
    Promise.allSettled(registrations.map(obs => obs.toPromise()))
      .then(() => {
        // Navigate to documents list after all registrations
        this.router.navigate(['/documents']);
      });
  }

  private extractCustomFields(formValue: any): Record<string, any> {
    const customFields: Record<string, any> = {};

    Object.keys(formValue).forEach(key => {
      if (key.startsWith('custom_')) {
        const fieldId = key.replace('custom_', '');
        customFields[fieldId] = formValue[key];
      }
    });

    return customFields;
  }

  private registerDocument(documentId: string): void {
    this.documentService.registerOnChain(documentId).subscribe({
      next: (document) => {
        this.router.navigate(['/documents', document.id]);
      },
      error: (error) => {
        console.error('Registration failed:', error);
        // Still navigate to document page even if registration failed
        this.router.navigate(['/documents', documentId]);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/documents']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.uploadForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }
}
