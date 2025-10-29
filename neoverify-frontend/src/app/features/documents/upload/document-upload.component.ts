import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { UploadService } from '../../../core/services/upload.service';
import { TemplateService } from '../../../core/services/template.service';
import { SHARED_IMPORTS } from '../../../shared';
import { DocumentType, DocumentMetadata, DocumentUploadProgress, UploadStatus, DocumentTemplate, TemplateField, ValidationRule, ValidationType } from '../../../shared/models/document.models';
import { FormUtils } from '../../../shared/utils/form.utils';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="document-upload-container">
      <!-- Header Section -->
      <div class="document-upload-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              {{ uploadMode() === 'single' ? 'Upload Document' : 'Bulk Upload Documents' }}
            </h1>
            <p class="page-subtitle">
              {{ uploadMode() === 'single' 
                ? 'Upload and register your document on the blockchain for verification'
                : 'Upload multiple documents at once (up to 100 files)'
              }}
            </p>
          </div>
          
          <div class="header-actions">
            <!-- Upload Mode Toggle -->
            <div class="mode-toggle">
              <span class="toggle-label">Single</span>
              <p-toggleSwitch
                [(ngModel)]="isBulkModeValue"
                (onChange)="toggleUploadMode()"
                [disabled]="isUploading()"
              ></p-toggleSwitch>
              <span class="toggle-label">Bulk</span>
            </div>
            
            <p-button 
              icon="pi pi-arrow-left" 
              label="Back to Documents"
              (onClick)="cancel()" 
              styleClass="p-button-text"
              pTooltip="Return to documents list">
            </p-button>
          </div>
        </div>
      </div>

      <!-- Upload Content -->
      <div class="upload-content">
        <div class="upload-grid">
          <!-- Upload Section -->
          <div class="upload-section">
            <!-- Drag and Drop Upload Area -->
            <div class="upload-card">
              <div class="upload-card-content">
                <div class="upload-field">
                  <label class="upload-field-label">
                    Document File *
                  </label>
                  
                  <!-- Drag and Drop Zone -->
                  <div 
                    class="drag-drop-zone"
                    [class.drag-over]="isDragOver()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onDrop($event)"
                    (click)="fileInput.click()"
                  >
                    @if (uploadMode() === 'single') {
                      @if (!selectedFile()) {
                        <div class="drop-zone-content">
                          <div class="drop-zone-icon">
                            <i class="pi pi-cloud-upload"></i>
                          </div>
                          <div class="drop-zone-text">
                            <p class="drop-zone-title">
                              Drop your file here or click to browse
                            </p>
                            <p class="drop-zone-subtitle">
                              Supported formats: PDF, DOCX, PNG, JPG, JPEG (Max: {{ maxFileSize / 1024 / 1024 }}MB)
                            </p>
                          </div>
                        </div>
                      } @else {
                        <div class="file-selected-content">
                          <div class="file-selected-icon">
                            <i class="pi pi-check"></i>
                          </div>
                          <div class="file-selected-info">
                            <p class="file-selected-name">
                              {{ selectedFile()?.name }}
                            </p>
                            <p class="file-selected-size">
                              {{ formatFileSize(selectedFile()?.size || 0) }}
                            </p>
                            <button 
                              type="button" 
                              class="file-remove-btn"
                              (click)="removeFile($event)"
                            >
                              Remove file
                            </button>
                          </div>
                        </div>
                      }
                    } @else {
                      @if (selectedFiles().length === 0) {
                        <div class="space-y-4">
                          <div class="mx-auto w-16 h-16 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center">
                            <i class="pi pi-cloud-upload text-2xl text-surface-500"></i>
                          </div>
                          <div>
                            <p class="text-lg font-medium text-surface-900 dark:text-surface-0 mb-2">
                              Drop multiple files here or click to browse
                            </p>
                            <p class="text-sm text-surface-500">
                              Upload up to 100 files at once<br>
                              Supported formats: PDF, DOCX, PNG, JPG, JPEG (Max: {{ maxFileSize / 1024 / 1024 }}MB each)
                            </p>
                          </div>
                        </div>
                      } @else {
                        <div class="space-y-4">
                          <div class="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                            <i class="pi pi-files text-2xl text-green-600 dark:text-green-400"></i>
                          </div>
                          <div>
                            <p class="text-lg font-medium text-surface-900 dark:text-surface-0 mb-1">
                              {{ selectedFiles().length }} files selected
                            </p>
                            <p class="text-sm text-surface-500">
                              Total size: {{ getTotalFileSize() }}
                            </p>
                            <button 
                              type="button" 
                              class="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              (click)="clearAllFiles($event)"
                            >
                              Clear all files
                            </button>
                          </div>
                        </div>
                      }
                    }
                  </div>

                  <!-- Hidden file input -->
                  <input 
                    #fileInput
                    type="file" 
                    class="hidden" 
                    [accept]="acceptedFileTypes"
                    [multiple]="uploadMode() === 'bulk'"
                    (change)="onFileInputChange($event)"
                  />

                  @if (fileError()) {
                    <div class="error-message">
                      <div class="error-content">
                        <i class="pi pi-exclamation-triangle error-icon"></i>
                        <span class="error-text">{{ fileError() }}</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- File Preview / Bulk File List -->
                @if (uploadMode() === 'single' && selectedFile() && filePreview()) {
                  <div class="field">
                    <label class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                      Preview
                    </label>
                    <div class="border rounded-lg p-4 bg-surface-50 dark:bg-surface-800">
                      @if (isImageFile(selectedFile()!)) {
                        <img 
                          [src]="filePreview()" 
                          [alt]="selectedFile()?.name"
                          class="max-w-full h-auto max-h-48 mx-auto rounded"
                        />
                      } @else {
                        <div class="text-center py-8">
                          <i class="pi pi-file-pdf text-4xl text-red-500 mb-2"></i>
                          <p class="text-sm text-surface-600 dark:text-surface-400">PDF Preview</p>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (uploadMode() === 'bulk' && selectedFiles().length > 0) {
                  <div class="field">
                    <label class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                      Selected Files ({{ selectedFiles().length }})
                    </label>
                    <div class="border rounded-lg bg-surface-50 dark:bg-surface-800 max-h-64 overflow-y-auto">
                      @for (file of selectedFiles(); track file.name; let i = $index) {
                        <div class="flex items-center justify-between p-3 border-b border-surface-200 dark:border-surface-700 last:border-b-0">
                          <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-surface-200 dark:bg-surface-600 rounded flex items-center justify-center">
                              @if (isImageFile(file)) {
                                <i class="pi pi-image text-sm text-surface-600 dark:text-surface-400"></i>
                              } @else {
                                <i class="pi pi-file-pdf text-sm text-red-500"></i>
                              }
                            </div>
                            <div>
                              <p class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ file.name }}</p>
                              <p class="text-xs text-surface-500">{{ formatFileSize(file.size) }}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            (click)="removeFileFromBulk(i)"
                          >
                            <i class="pi pi-times text-sm"></i>
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Upload Progress -->
            @if (uploadMode() === 'single' && uploadProgress()) {
              <div class="progress-card">
                <div class="progress-card-content">
                  <div class="progress-card-header">
                    <h3 class="progress-card-title">
                      Upload Progress
                    </h3>
                    @if (uploadProgress()?.status === UploadStatus.UPLOADING || uploadProgress()?.status === UploadStatus.PROCESSING) {
                      <p-button
                        icon="pi pi-times"
                        [text]="true"
                        [rounded]="true"
                        severity="danger"
                        size="small"
                        (onClick)="cancelUpload()"
                        pTooltip="Cancel upload"
                      ></p-button>
                    }
                  </div>

                  <div class="progress-details">
                    <div class="progress-info">
                      <span class="progress-filename">{{ uploadProgress()?.fileName }}</span>
                      <span class="progress-percentage">{{ uploadProgress()?.progress }}%</span>
                    </div>
                    
                    <p-progressBar 
                      [value]="uploadProgress()?.progress || 0"
                      [showValue]="false"
                      class="h-2"
                    ></p-progressBar>

                    <div class="flex items-center text-sm">
                      @switch (uploadProgress()?.status) {
                        @case (UploadStatus.UPLOADING) {
                          <i class="pi pi-spin pi-spinner text-blue-500 mr-2"></i>
                          <span class="text-blue-600 dark:text-blue-400">Uploading...</span>
                        }
                        @case (UploadStatus.PROCESSING) {
                          <i class="pi pi-spin pi-cog text-orange-500 mr-2"></i>
                          <span class="text-orange-600 dark:text-orange-400">Processing...</span>
                        }
                        @case (UploadStatus.COMPLETED) {
                          <i class="pi pi-check-circle text-green-500 mr-2"></i>
                          <span class="text-green-600 dark:text-green-400">Upload completed</span>
                        }
                        @case (UploadStatus.FAILED) {
                          <i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>
                          <span class="text-red-600 dark:text-red-400">Upload failed</span>
                        }
                        @case (UploadStatus.CANCELLED) {
                          <i class="pi pi-times-circle text-gray-500 mr-2"></i>
                          <span class="text-gray-600 dark:text-gray-400">Upload cancelled</span>
                        }
                      }
                    </div>

                    @if (uploadProgress()?.error) {
                      <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <p class="text-sm text-red-700 dark:text-red-300">{{ uploadProgress()?.error }}</p>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Bulk Upload Progress -->
            @if (uploadMode() === 'bulk' && bulkUploadProgress().size > 0) {
              <div class="progress-card">
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-medium text-surface-900 dark:text-surface-0">
                      Bulk Upload Progress
                    </h3>
                    <div class="text-sm text-surface-600 dark:text-surface-400">
                      {{ totalBulkProgress() }}% Complete
                    </div>
                  </div>

                  <!-- Overall Progress -->
                  <div class="space-y-2">
                    <p-progressBar 
                      [value]="totalBulkProgress()"
                      [showValue]="false"
                      class="h-3"
                    ></p-progressBar>
                  </div>

                  <!-- Individual File Progress -->
                  <div class="max-h-48 overflow-y-auto space-y-2">
                    @for (progress of Array.from(bulkUploadProgress().values()); track progress.fileId) {
                      <div class="flex items-center justify-between p-2 bg-surface-100 dark:bg-surface-700 rounded">
                        <div class="flex items-center space-x-2 flex-1 min-w-0">
                          <div class="w-4 h-4 flex-shrink-0">
                            @switch (progress.status) {
                              @case (UploadStatus.UPLOADING) {
                                <i class="pi pi-spin pi-spinner text-blue-500 text-xs"></i>
                              }
                              @case (UploadStatus.PROCESSING) {
                                <i class="pi pi-spin pi-cog text-orange-500 text-xs"></i>
                              }
                              @case (UploadStatus.COMPLETED) {
                                <i class="pi pi-check-circle text-green-500 text-xs"></i>
                              }
                              @case (UploadStatus.FAILED) {
                                <i class="pi pi-exclamation-triangle text-red-500 text-xs"></i>
                              }
                              @case (UploadStatus.CANCELLED) {
                                <i class="pi pi-times-circle text-gray-500 text-xs"></i>
                              }
                              @default {
                                <i class="pi pi-clock text-gray-500 text-xs"></i>
                              }
                            }
                          </div>
                          <span class="text-sm text-surface-900 dark:text-surface-0 truncate">
                            {{ progress.fileName }}
                          </span>
                        </div>
                        <div class="flex items-center space-x-2 flex-shrink-0">
                          <span class="text-xs text-surface-600 dark:text-surface-400">
                            {{ progress.progress }}%
                          </span>
                          @if (progress.status === UploadStatus.UPLOADING || progress.status === UploadStatus.PROCESSING) {
                            <button
                              type="button"
                              class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              (click)="cancelSingleUpload(progress.fileId)"
                            >
                              <i class="pi pi-times text-xs"></i>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Bulk Upload Results -->
                  @if (bulkUploadResults()) {
                    <div class="p-3 bg-surface-50 dark:bg-surface-800 rounded border">
                      <div class="flex items-center justify-between text-sm">
                        <span class="font-medium text-surface-900 dark:text-surface-0">Upload Summary</span>
                      </div>
                      <div class="mt-2 grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div class="text-lg font-bold text-green-600 dark:text-green-400">
                            {{ bulkUploadResults()?.success }}
                          </div>
                          <div class="text-xs text-surface-600 dark:text-surface-400">Success</div>
                        </div>
                        <div>
                          <div class="text-lg font-bold text-red-600 dark:text-red-400">
                            {{ bulkUploadResults()?.failed }}
                          </div>
                          <div class="text-xs text-surface-600 dark:text-surface-400">Failed</div>
                        </div>
                        <div>
                          <div class="text-lg font-bold text-surface-900 dark:text-surface-0">
                            {{ bulkUploadResults()?.total }}
                          </div>
                          <div class="text-xs text-surface-600 dark:text-surface-400">Total</div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Metadata Form -->
          <div class="metadata-section">
            <div class="metadata-card">
              <form [formGroup]="uploadForm" (ngSubmit)="onSubmit()" class="metadata-form">

                <h3 class="metadata-card-title">
                  Document Information
                </h3>

                <!-- Template Selection -->
                @if (availableTemplates().length > 0) {
                  <div class="form-field">
                    <label for="templateId" class="form-field-label">
                      Document Template (Optional)
                    </label>
                    <div class="flex gap-2">
                      <p-select
                        id="templateId"
                        formControlName="templateId"
                        [options]="getTemplateOptions()"
                        placeholder="Select a template to pre-fill fields"
                        class="flex-1"
                        [showClear]="true"
                      ></p-select>
                      @if (selectedTemplate()) {
                        <p-button
                          icon="pi pi-eye"
                          [text]="true"
                          [rounded]="true"
                          severity="secondary"
                          size="small"
                          (onClick)="toggleTemplatePreview()"
                          pTooltip="Preview template"
                        ></p-button>
                      }
                    </div>
                    <small class="form-field-help">
                      Templates help standardize document information and pre-fill common fields
                    </small>
                  </div>

                  <!-- Template Preview -->
                  @if (selectedTemplate() && showTemplatePreview()) {
                    <div class="form-field">
                      <div class="template-preview-card">
                        <div class="flex items-center justify-between mb-2">
                          <h4 class="text-sm font-medium text-surface-900 dark:text-surface-0">
                            {{ selectedTemplate()?.name }}
                          </h4>
                          <button
                            type="button"
                            class="text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                            (click)="toggleTemplatePreview()"
                          >
                            <i class="pi pi-times text-sm"></i>
                          </button>
                        </div>
                        <p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
                          {{ selectedTemplate()?.description }}
                        </p>
                        <div class="space-y-2">
                          <div class="text-xs font-medium text-surface-700 dark:text-surface-300">
                            Template Fields:
                          </div>
                          @for (field of selectedTemplate()?.fields || []; track field.id) {
                            <div class="flex items-center justify-between text-xs">
                              <span class="text-surface-600 dark:text-surface-400">
                                {{ field.name }}
                                @if (field.required) {
                                  <span class="text-red-500">*</span>
                                }
                              </span>
                              <span class="text-surface-500 capitalize">{{ field.type }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  }
                }

                <!-- Document Type -->
                <div class="form-field">
                  <label for="documentType" class="form-field-label">
                    Document Type *
                  </label>
                  <p-select
                    id="documentType"
                    formControlName="documentType"
                    [options]="documentTypeOptions"
                    placeholder="Select document type"
                    class="w-full"
                    [class.ng-invalid]="isFieldInvalid('documentType')"
                  ></p-select>
                  @if (isFieldInvalid('documentType')) {
                    <small class="p-error block mt-1">
                      {{ getErrorMessage(uploadForm.get('documentType'), 'Document type') }}
                    </small>
                  }
                </div>

                <!-- Document Title -->
                <div class="form-field">
                  <label for="title" class="form-field-label">
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
                  @if (titleSuggestions().length > 0) {
                    <div class="mt-1">
                      <small class="text-surface-500 block mb-1">Suggestions:</small>
                      <div class="flex flex-wrap gap-1">
                        @for (suggestion of titleSuggestions(); track suggestion) {
                          <button
                            type="button"
                            class="px-2 py-1 text-xs bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded hover:bg-surface-200 dark:hover:bg-surface-600"
                            (click)="applySuggestion('title', suggestion)"
                          >
                            {{ suggestion }}
                          </button>
                        }
                      </div>
                    </div>
                  }
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

                <!-- Tags -->
                <div class="field">
                  <label for="tags" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                    Tags
                  </label>
                  <p-chips
                    id="tags"
                    formControlName="tags"
                    placeholder="Add tags (press Enter to add)"
                    class="w-full"
                  ></p-chips>
                  <small class="text-surface-500 mt-1 block">
                    Add tags to help organize and search your documents
                  </small>
                </div>

                <!-- Recipient Name (conditional) -->
                @if (showRecipientField()) {
                  <div class="field">
                    <label for="recipientName" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                      Recipient Name *
                    </label>
                    <input
                      id="recipientName"
                      type="text"
                      pInputText
                      formControlName="recipientName"
                      placeholder="Enter recipient name"
                      class="w-full"
                      [class.ng-invalid]="isFieldInvalid('recipientName')"
                    />
                    @if (isFieldInvalid('recipientName')) {
                      <small class="p-error block mt-1">
                        {{ getErrorMessage(uploadForm.get('recipientName'), 'Recipient name') }}
                      </small>
                    }
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
                    class="w-full"
                    [showIcon]="true"
                    [maxDate]="today"
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
                    class="w-full"
                    [showIcon]="true"
                    [minDate]="minExpiryDate()"
                  ></p-datepicker>
                </div>

                <!-- Custom Fields (if any) -->
                @if (customFields().length > 0) {
                  <div class="space-y-4">
                    <h4 class="text-md font-medium text-surface-900 dark:text-surface-0">
                      Additional Information
                    </h4>
                    @for (field of customFields(); track field.id) {
                      <div class="field">
                        <label [for]="field.id" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                          {{ field.name }}
                          @if (field.required) {
                            <span class="text-red-500">*</span>
                          }
                        </label>
                        @switch (field.type) {
                          @case ('text') {
                            <input
                              [id]="field.id"
                              type="text"
                              pInputText
                              [formControlName]="'custom_' + field.id"
                              [placeholder]="field.placeholder || 'Enter ' + field.name.toLowerCase()"
                              class="w-full"
                            />
                          }
                          @case ('textarea') {
                            <textarea
                              [id]="field.id"
                              pInputTextarea
                              [formControlName]="'custom_' + field.id"
                              [placeholder]="field.placeholder || 'Enter ' + field.name.toLowerCase()"
                              rows="3"
                              class="w-full"
                            ></textarea>
                          }
                          @case ('dropdown') {
                            <p-select
                              [id]="field.id"
                              [formControlName]="'custom_' + field.id"
                              [options]="getFieldOptions(field)"
                              [placeholder]="'Select ' + field.name.toLowerCase()"
                              class="w-full"
                            ></p-select>
                          }
                          @case ('date') {
                            <p-datepicker
                              [id]="field.id"
                              [formControlName]="'custom_' + field.id"
                              [placeholder]="'Select ' + field.name.toLowerCase()"
                              class="w-full"
                              [showIcon]="true"
                            ></p-datepicker>
                          }
                        }
                      </div>
                    }
                  </div>
                }

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
                <div class="form-actions">
                  <p-button
                    type="button"
                    label="Cancel"
                    icon="pi pi-times"
                    styleClass="p-button-outlined"
                    (onClick)="cancel()"
                    [disabled]="isUploading()"
                  ></p-button>
                  
                  <p-button
                    type="submit"
                    label="Upload Document"
                    icon="pi pi-upload"
                    styleClass="p-button-primary"
                    [loading]="isUploading()"
                    [disabled]="!canSubmit()"
                  ></p-button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .document-upload-container {
      @apply min-h-screen bg-gray-900 text-white;
    }

    // Header Section
    .document-upload-header {
      @apply bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-6;

      .header-content {
        @apply max-w-7xl mx-auto flex items-center justify-between;

        .title-section {
          .page-title {
            @apply text-3xl font-semibold text-white mb-2;
          }

          .page-subtitle {
            @apply text-gray-300 font-normal;
          }
        }

        .header-actions {
          @apply flex items-center space-x-4;

          .mode-toggle {
            @apply flex items-center space-x-2 px-4 py-2 bg-gray-700/50 rounded-lg;

            .toggle-label {
              @apply text-sm text-gray-300;
            }
          }

          ::ng-deep .p-button.p-button-text {
            @apply text-gray-300 hover:text-white hover:bg-gray-700/50;
          }
        }
      }
    }

    // Upload Content
    .upload-content {
      @apply max-w-7xl mx-auto p-6;

      .upload-grid {
        @apply grid grid-cols-1 lg:grid-cols-2 gap-8;

        .upload-section {
          @apply space-y-6;

          .upload-card {
            @apply bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6;

            .upload-card-content {
              @apply space-y-6;

              .upload-field {
                .upload-field-label {
                  @apply block text-sm font-medium text-gray-300 mb-4;
                }

                .drag-drop-zone {
                  @apply border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer;
                  @apply transition-all duration-200 hover:border-cyan-500 hover:bg-cyan-500/10;

                  &.drag-over {
                    @apply border-cyan-500 bg-cyan-500/20 transform scale-105;
                    box-shadow: 0 8px 25px rgba(6, 182, 212, 0.2);
                  }

                  .drop-zone-content {
                    @apply space-y-4;

                    .drop-zone-icon {
                      @apply mx-auto w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center;

                      i {
                        @apply text-2xl text-gray-400;
                      }
                    }

                    .drop-zone-text {
                      .drop-zone-title {
                        @apply text-lg font-medium text-white mb-2;
                      }

                      .drop-zone-subtitle {
                        @apply text-sm text-gray-400;
                      }
                    }
                  }

                  .file-selected-content {
                    @apply space-y-4;

                    .file-selected-icon {
                      @apply mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center;

                      i {
                        @apply text-2xl text-green-400;
                      }
                    }

                    .file-selected-info {
                      .file-selected-name {
                        @apply text-lg font-medium text-white mb-1;
                      }

                      .file-selected-size {
                        @apply text-sm text-gray-400;
                      }

                      .file-remove-btn {
                        @apply mt-2 text-sm text-red-400 hover:text-red-300 transition-colors;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        .metadata-section {
          @apply space-y-6;

          .metadata-card {
            @apply bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6;

            .metadata-card-title {
              @apply text-lg font-medium text-white mb-6;
            }

            .metadata-form {
              @apply space-y-6;

              .form-field {
                @apply space-y-2;

                .form-field-label {
                  @apply block text-sm font-medium text-gray-300;
                }

                .form-field-help {
                  @apply text-xs text-gray-400 mt-1 block;
                }

                .template-preview-card {
                  @apply p-3 bg-gray-700/30 rounded border border-gray-600;
                }
              }
            }

            .progress-card {
              @apply bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6;

              .progress-card-content {
                @apply space-y-4;

                .progress-card-header {
                  @apply flex items-center justify-between;

                  .progress-card-title {
                    @apply text-lg font-medium text-white;
                  }
                }

                .progress-details {
                  @apply space-y-3;

                  .progress-info {
                    @apply flex items-center justify-between text-sm;

                    .progress-filename {
                      @apply text-gray-400;
                    }

                    .progress-percentage {
                      @apply font-medium text-white;
                    }
                  }

                  .error-message {
                    @apply mt-2 p-3 bg-red-500/20 rounded border border-red-500/30;

                    .error-content {
                      @apply flex items-start;

                      .error-icon {
                        @apply text-red-400 mr-2 mt-0.5;
                      }

                      .error-text {
                        @apply text-sm text-red-300;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Form Fields
    .field {
      @apply mb-6;
    }

    // Dark theme glassmorphism effects
    .document-upload-container {
      ::ng-deep .p-card {
        @apply bg-gray-800/50 backdrop-blur-sm border-gray-700;
      }

      ::ng-deep .p-button:not(.p-button-text) {
        @apply bg-gray-700/50 border-gray-600 hover:bg-gray-600/50;

        &.p-button-primary {
          @apply bg-cyan-500 border-cyan-500 hover:bg-cyan-600;
        }
      }

      ::ng-deep .p-inputtext,
      ::ng-deep .p-select,
      ::ng-deep .p-multiselect,
      ::ng-deep .p-datepicker input {
        @apply bg-gray-700/50 border-gray-600 text-white;

        &:enabled:focus {
          @apply border-cyan-500 ring-2 ring-cyan-500/20;
        }
      }

      ::ng-deep .p-progressbar {
        @apply bg-gray-700/50;

        .p-progressbar-value {
          @apply bg-cyan-500;
        }
      }

      ::ng-deep .p-toggleswitch {
        .p-toggleswitch-slider {
          @apply bg-gray-600;
        }

        &.p-toggleswitch-checked .p-toggleswitch-slider {
          @apply bg-cyan-500;
        }
      }

      // Form Actions
      .form-actions {
        @apply flex gap-4 pt-6 border-t border-gray-700;

        ::ng-deep .p-button {
          @apply flex-1;

          &.p-button-outlined {
            @apply border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500;
          }

          &.p-button-primary {
            @apply bg-cyan-500 border-cyan-500 hover:bg-cyan-600;
          }
        }
      }
    }
  `]
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
      this.uploadService.cancelUpload(progress.fileId);
    }
  }

  cancelSingleUpload(fileId: string): void {
    this.uploadService.cancelUpload(fileId);
  }

  // Template Management
  private loadTemplates(): void {
    this.templateService.getTemplates({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableTemplates.set(response.items);
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
      customFields: this.extractCustomFields(formValue)
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

    // Prepare base metadata
    const baseMetadata: DocumentMetadata = {
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

    // Create metadata array for each file
    const metadataArray = files.map(file => ({
      ...baseMetadata,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));

    // Use upload service for bulk upload
    this.uploadService.uploadMultipleDocuments(
      files,
      metadataArray,
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