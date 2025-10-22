import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared';

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
export class DocumentVerifyComponent {}