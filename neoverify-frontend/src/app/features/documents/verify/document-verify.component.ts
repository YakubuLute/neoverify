import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { SHARED_IMPORTS } from '../../../shared';
import { VerificationRequest, VerificationResult } from '../../../shared/models/document.models';
import { FormUtils } from '../../../shared/utils/form.utils';

@Component({
  selector: 'app-document-verify',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            Verify Document
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Upload a document, enter a hash, or use a verification ID to check authenticity
          </p>
        </div>

        <!-- Verification Methods -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <!-- File Upload Method -->
          <p-card 
            [class]="'cursor-pointer transition-all duration-200 ' + (verificationMethod() === 'file' ? 'ring-2 ring-primary-500 shadow-lg' : 'hover:shadow-md')"
            (click)="setVerificationMethod('file')"
          >
            <div class="text-center p-4">
              <i class="pi pi-upload text-4xl text-primary-500 mb-3"></i>
              <h3 class="text-lg font-semibold mb-2">Upload File</h3>
              <p class="text-surface-600 dark:text-surface-400 text-sm">
                Upload the document file to verify its authenticity
              </p>
            </div>
          </p-card>

          <!-- Hash Method -->
          <p-card 
            [class]="'cursor-pointer transition-all duration-200 ' + (verificationMethod() === 'hash' ? 'ring-2 ring-primary-500 shadow-lg' : 'hover:shadow-md')"
            (click)="setVerificationMethod('hash')"
          >
            <div class="text-center p-4">
              <i class="pi pi-key text-4xl text-primary-500 mb-3"></i>
              <h3 class="text-lg font-semibold mb-2">Enter Hash</h3>
              <p class="text-surface-600 dark:text-surface-400 text-sm">
                Verify using the document's SHA-256 hash
              </p>
            </div>
          </p-card>

          <!-- ID Method -->
          <p-card 
            [class]="'cursor-pointer transition-all duration-200 ' + (verificationMethod() === 'id' ? 'ring-2 ring-primary-500 shadow-lg' : 'hover:shadow-md')"
            (click)="setVerificationMethod('id')"
          >
            <div class="text-center p-4">
              <i class="pi pi-qrcode text-4xl text-primary-500 mb-3"></i>
              <h3 class="text-lg font-semibold mb-2">Verification ID</h3>
              <p class="text-surface-600 dark:text-surface-400 text-sm">
                Use the unique verification ID from QR code
              </p>
            </div>
          </p-card>
        </div>

        <!-- Verification Form -->
        <p-card class="shadow-lg">
          <form [formGroup]="verifyForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- File Upload -->
            @if (verificationMethod() === 'file') {
              <div class="field">
                <label class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                  Document File *
                </label>
                <p-fileUpload
                  mode="basic"
                  [auto]="false"
                  chooseLabel="Choose File"
                  [maxFileSize]="maxFileSize"
                  accept=".pdf,.jpg,.jpeg,.png"
                  (onSelect)="onFileSelect($event)"
                  (onRemove)="onFileRemove()"
                  styleClass="w-full"
                ></p-fileUpload>
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
            }

            <!-- Hash Input -->
            @if (verificationMethod() === 'hash') {
              <div class="field">
                <label for="hash" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                  SHA-256 Hash *
                </label>
                <input
                  id="hash"
                  type="text"
                  pInputText
                  formControlName="hash"
                  placeholder="Enter the 64-character SHA-256 hash"
                  class="w-full font-mono text-sm"
                  [class.ng-invalid]="isFieldInvalid('hash')"
                />
                @if (isFieldInvalid('hash')) {
                  <small class="p-error block mt-1">
                    {{ getErrorMessage(verifyForm.get('hash'), 'Hash') }}
                  </small>
                }
              </div>
            }

            <!-- Verification ID Input -->
            @if (verificationMethod() === 'id') {
              <div class="field">
                <label for="verificationId" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                  Verification ID *
                </label>
                <input
                  id="verificationId"
                  type="text"
                  pInputText
                  formControlName="verificationId"
                  placeholder="Enter the verification ID"
                  class="w-full"
                  [class.ng-invalid]="isFieldInvalid('verificationId')"
                />
                @if (isFieldInvalid('verificationId')) {
                  <small class="p-error block mt-1">
                    {{ getErrorMessage(verifyForm.get('verificationId'), 'Verification ID') }}
                  </small>
                }
              </div>
            }

            <!-- Submit Button -->
            <p-button
              type="submit"
              label="Verify Document"
              icon="pi pi-search"
              [loading]="verifying()"
              [disabled]="!canSubmit()"
              styleClass="w-full"
            ></p-button>
          </form>
        </p-card>

        <!-- Verification Result -->
        @if (verificationResult()) {
          <p-card class="mt-8 shadow-lg">
            <div class="text-center py-8">
              <div [class]="getStatusIconClass()">
                <i [class]="getStatusIcon()" class="text-6xl mb-4"></i>
              </div>
              <h2 class="text-2xl font-bold mb-2" [class]="getStatusTextClass()">
                {{ getStatusTitle() }}
              </h2>
              <p class="text-surface-600 dark:text-surface-400">
                {{ getStatusDescription() }}
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
export class DocumentVerifyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly documentService = inject(DocumentService);

  readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  readonly verificationMethod = signal<'file' | 'hash' | 'id'>('file');
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string>('');
  readonly verifying = signal<boolean>(false);
  readonly verificationResult = signal<VerificationResult | null>(null);

  readonly verifyForm = this.fb.group({
    hash: ['', [Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
    verificationId: ['', [Validators.minLength(8)]]
  });

  setVerificationMethod(method: 'file' | 'hash' | 'id'): void {
    this.verificationMethod.set(method);
    this.resetForm();
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
  }

  onFileRemove(): void {
    this.selectedFile.set(null);
    this.fileError.set('');
  }

  canSubmit(): boolean {
    const method = this.verificationMethod();
    
    switch (method) {
      case 'file':
        return !!this.selectedFile() && !this.fileError();
      case 'hash':
        return this.verifyForm.get('hash')?.valid ?? false;
      case 'id':
        return this.verifyForm.get('verificationId')?.valid ?? false;
      default:
        return false;
    }
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      FormUtils.markFormGroupTouched(this.verifyForm);
      return;
    }

    this.verifying.set(true);
    this.verificationResult.set(null);

    const method = this.verificationMethod();
    const formValue = this.verifyForm.value;
    
    let request: VerificationRequest;

    switch (method) {
      case 'file':
        request = {
          type: 'file',
          file: this.selectedFile()!
        };
        break;
      case 'hash':
        request = {
          type: 'hash',
          hash: formValue.hash!
        };
        break;
      case 'id':
        request = {
          type: 'id',
          verificationId: formValue.verificationId!
        };
        break;
      default:
        this.verifying.set(false);
        return;
    }

    this.documentService.verifyDocument(request).subscribe({
      next: (result) => {
        this.verificationResult.set(result);
        this.verifying.set(false);
      },
      error: (error) => {
        console.error('Verification failed:', error);
        this.verifying.set(false);
      }
    });
  }

  private resetForm(): void {
    this.verifyForm.reset();
    this.selectedFile.set(null);
    this.fileError.set('');
  }

  // UI Helper Methods
  getStatusIconClass(): string {
    const status = this.verificationResult()?.status;
    switch (status) {
      case 'genuine': return 'text-green-500';
      case 'suspicious': return 'text-orange-500';
      case 'invalid': return 'text-red-500';
      default: return 'text-surface-500';
    }
  }

  getStatusIcon(): string {
    const status = this.verificationResult()?.status;
    switch (status) {
      case 'genuine': return 'pi pi-check-circle';
      case 'suspicious': return 'pi pi-exclamation-triangle';
      case 'invalid': return 'pi pi-times-circle';
      default: return 'pi pi-question-circle';
    }
  }

  getStatusTextClass(): string {
    const status = this.verificationResult()?.status;
    switch (status) {
      case 'genuine': return 'text-green-700 dark:text-green-300';
      case 'suspicious': return 'text-orange-700 dark:text-orange-300';
      case 'invalid': return 'text-red-700 dark:text-red-300';
      default: return 'text-surface-700 dark:text-surface-300';
    }
  }

  getStatusTitle(): string {
    const status = this.verificationResult()?.status;
    switch (status) {
      case 'genuine': return 'Document is Genuine';
      case 'suspicious': return 'Document is Suspicious';
      case 'invalid': return 'Document is Invalid';
      case 'not_found': return 'Document Not Found';
      default: return 'Unknown Status';
    }
  }

  getStatusDescription(): string {
    const status = this.verificationResult()?.status;
    switch (status) {
      case 'genuine': return 'This document has been verified as authentic and registered on the blockchain.';
      case 'suspicious': return 'This document shows signs of potential tampering or modification.';
      case 'invalid': return 'This document could not be verified or has been revoked.';
      case 'not_found': return 'No record of this document was found in our system.';
      default: return 'Unable to determine document status.';
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.verifyForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }
}