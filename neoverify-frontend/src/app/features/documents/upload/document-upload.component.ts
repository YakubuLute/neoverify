import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { SHARED_IMPORTS } from '../../../shared';
import { DocumentType, DocumentMetadata } from '../../../shared/models/document.models';
import { FormUtils } from '../../../shared/utils/form.utils';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            Upload Document
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Upload and register your document on the blockchain for verification
          </p>
        </div>

        <!-- Upload Form -->
        <p-card class="shadow-lg">
          <form [formGroup]="uploadForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- File Upload -->
            <div class="field">
              <label class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Document File *
              </label>
              <p-fileUpload
                #fileUpload
                mode="basic"
                [auto]="false"
                chooseLabel="Choose File"
                [maxFileSize]="maxFileSize"
                accept=".pdf,.jpg,.jpeg,.png"
                (onSelect)="onFileSelect($event)"
                (onRemove)="onFileRemove()"
                styleClass="w-full"
              ></p-fileUpload>
              <small class="text-surface-500 mt-1 block">
                Supported formats: PDF, JPG, PNG (Max: {{ maxFileSize / 1024 / 1024 }}MB)
              </small>
              @if (selectedFile()) {
                <div class="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <div class="flex items-center text-green-700 dark:text-green-300">
                    <i class="pi pi-check-circle mr-2"></i>
                    <span class="text-sm">{{ selectedFile()?.name }}</span>
                  </div>
                </div>
              }
              @if (fileError()) {
                <small class="p-error block mt-1">{{ fileError() }}</small>
              }
            </div>

            <!-- Document Type -->
            <div class="field">
              <label for="documentType" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Document Type *
              </label>
              <p-select
                id="documentType"
                formControlName="documentType"
                [options]="documentTypeOptions"
                placeholder="Select document type"
                styleClass="w-full"
                [class.ng-invalid]="isFieldInvalid('documentType')"
              ></p-select>
              @if (isFieldInvalid('documentType')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(uploadForm.get('documentType'), 'Document type') }}
                </small>
              }
            </div>

            <!-- Document Title -->
            <div class="field">
              <label for="title" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Document Title *
              </label>
              <input
                id="title"
                type="text"
                pInputText
                formControlName="title"
                placeholder="Enter document title"
                class="w-full"
                [class.ng-invalid]="isFieldInvalid('title')"
              />
              @if (isFieldInvalid('title')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(uploadForm.get('title'), 'Title') }}
                </small>
              }
            </div>

            <!-- Description -->
            <div class="field">
              <label for="description" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Description
              </label>
              <textarea
                id="description"
                pInputTextarea
                formControlName="description"
                placeholder="Enter document description (optional)"
                rows="3"
                class="w-full"
              ></textarea>
            </div>

            <!-- Recipient Name (conditional) -->
            @if (showRecipientField()) {
              <div class="field">
                <label for="recipientName" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                  Recipient Name
                </label>
                <input
                  id="recipientName"
                  type="text"
                  pInputText
                  formControlName="recipientName"
                  placeholder="Enter recipient name"
                  class="w-full"
                />
              </div>
            }

            <!-- Issue Date -->
            <div class="field">
              <label for="issueDate" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Issue Date
              </label>
              <p-datepicker
                id="issueDate"
                formControlName="issueDate"
                placeholder="Select issue date"
                styleClass="w-full"
                inputStyleClass="w-full"
                [showIcon]="true"
              ></p-datepicker>
            </div>

            <!-- Expiry Date -->
            <div class="field">
              <label for="expiryDate" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Expiry Date
              </label>
              <p-datepicker
                id="expiryDate"
                formControlName="expiryDate"
                placeholder="Select expiry date (optional)"
                styleClass="w-full"
                inputStyleClass="w-full"
                [showIcon]="true"
              ></p-datepicker>
            </div>

            <!-- Auto Register Option -->
            <div class="field">
              <div class="flex items-center">
                <p-checkbox
                  formControlName="autoRegister"
                  inputId="autoRegister"
                  [binary]="true"
                  class="mr-2"
                ></p-checkbox>
                <label for="autoRegister" class="text-sm text-surface-600 dark:text-surface-400">
                  Automatically register on blockchain after upload
                </label>
              </div>
              <small class="text-surface-500 mt-1 block">
                If unchecked, you can register manually later from the document details page
              </small>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4">
              <p-button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                [outlined]="true"
                styleClass="flex-1"
                (onClick)="cancel()"
              ></p-button>
              
              <p-button
                type="submit"
                label="Upload Document"
                icon="pi pi-upload"
                [loading]="uploading()"
                [disabled]="uploadForm.invalid || !selectedFile()"
                styleClass="flex-1"
              ></p-button>
            </div>
          </form>
        </p-card>

        <!-- Upload Progress -->
        @if (uploading()) {
          <p-card class="mt-6">
            <div class="text-center">
              <p-progressSpinner strokeWidth="4" animationDuration="1s"></p-progressSpinner>
              <p class="mt-4 text-surface-600 dark:text-surface-400">
                {{ uploadStatus() }}
              </p>
            </div>
          </p-card>
        }
      </div>
    </div>
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
export class DocumentUploadComponent {
  private readonly fb = inject(FormBuilder);
  private readonly documentService = inject(DocumentService);
  private readonly router = inject(Router);

  readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string>('');
  readonly uploading = signal<boolean>(false);
  readonly uploadStatus = signal<string>('');

  readonly documentTypeOptions = [
    { label: 'Degree Certificate', value: DocumentType.DEGREE },
    { label: 'Professional Certificate', value: DocumentType.CERTIFICATE },
    { label: 'License', value: DocumentType.LICENSE },
    { label: 'Academic Transcript', value: DocumentType.TRANSCRIPT },
    { label: 'ID Document', value: DocumentType.ID_DOCUMENT },
    { label: 'Other', value: DocumentType.OTHER }
  ];

  readonly uploadForm = this.fb.group({
    documentType: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    recipientName: [''],
    issueDate: [null as Date | null],
    expiryDate: [null as Date | null],
    autoRegister: [true]
  });

  readonly showRecipientField = signal<boolean>(false);

  constructor() {
    // Watch document type changes to show/hide recipient field
    this.uploadForm.get('documentType')?.valueChanges.subscribe(type => {
      const showRecipient = [DocumentType.DEGREE, DocumentType.CERTIFICATE, DocumentType.TRANSCRIPT].includes(type);
      this.showRecipientField.set(showRecipient);
      
      if (showRecipient) {
        this.uploadForm.get('recipientName')?.setValidators([Validators.required]);
      } else {
        this.uploadForm.get('recipientName')?.clearValidators();
      }
      this.uploadForm.get('recipientName')?.updateValueAndValidity();
    });
  }

  onFileSelect(event: any): void {
    const file = event.files[0] as File;
    
    if (!file) {
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.fileError.set('Invalid file type. Please upload PDF, JPG, or PNG files only.');
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      this.fileError.set(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit.`);
      return;
    }

    this.selectedFile.set(file);
    this.fileError.set('');
    
    // Auto-fill title if empty
    if (!this.uploadForm.get('title')?.value) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      this.uploadForm.patchValue({ title: fileName });
    }
  }

  onFileRemove(): void {
    this.selectedFile.set(null);
    this.fileError.set('');
  }

  onSubmit(): void {
    if (this.uploadForm.valid && this.selectedFile()) {
      this.uploading.set(true);
      this.uploadStatus.set('Uploading document...');

      const formValue = this.uploadForm.value;
      const metadata: DocumentMetadata = {
        title: formValue.title!,
        description: formValue.description || undefined,
        recipientName: formValue.recipientName || undefined,
        issueDate: formValue.issueDate || undefined,
        expiryDate: formValue.expiryDate || undefined
      };

      this.documentService.uploadDocument(
        this.selectedFile()!,
        metadata,
        formValue.documentType as DocumentType
      ).subscribe({
        next: (document) => {
          if (formValue.autoRegister) {
            this.uploadStatus.set('Registering on blockchain...');
            this.registerDocument(document.id);
          } else {
            this.uploading.set(false);
            this.router.navigate(['/documents', document.id]);
          }
        },
        error: (error) => {
          console.error('Upload failed:', error);
          this.uploading.set(false);
          this.uploadStatus.set('');
        }
      });
    } else {
      FormUtils.markFormGroupTouched(this.uploadForm);
      if (!this.selectedFile()) {
        this.fileError.set('Please select a file to upload');
      }
    }
  }

  private registerDocument(documentId: string): void {
    this.documentService.registerOnChain(documentId).subscribe({
      next: (document) => {
        this.uploading.set(false);
        this.uploadStatus.set('');
        this.router.navigate(['/documents', document.id]);
      },
      error: (error) => {
        console.error('Registration failed:', error);
        this.uploading.set(false);
        this.uploadStatus.set('');
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