import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared';
import { NotificationService } from '../../../core/services/notification.service';
import { ProfileService } from '../../../core/services/profile.service';
import {
  VerificationPreferences,
  VerificationLevel,
  ShareRecipient,
  RecipientType,
  DigestFrequency,
  OrganizationPolicy,
  VerificationTemplate,
  VerificationPreferencesUpdateRequest,
  RetentionSettings,
  VerificationNotificationSettings,
  TemplateSettings
} from '../../../shared/models/verification-preferences.models';

@Component({
  selector: 'app-verification-tab',
  standalone: true,
  imports: [SHARED_IMPORTS],
  template: `
    <div class="verification-preferences-container">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Verification Preferences</h2>
        <p class="text-gray-600">Configure your default settings for document verification processes</p>
      </div>

      <form [formGroup]="verificationForm" (ngSubmit)="savePreferences()" class="space-y-8">
        
        <!-- Default Verification Level -->
        <p-card styleClass="bg-white rounded-2xl shadow-lg border border-gray-100">
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <i class="pi pi-shield text-blue-600"></i>
                Default Verification Level
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Choose the default verification level for new document verification requests
              </p>
            </div>
          </ng-template>

          <div class="space-y-4">
            @for (level of verificationLevels; track level.value) {
              <div class="verification-level-option" 
                   [class.selected]="verificationForm.get('defaultVerificationLevel')?.value === level.value">
                <label class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <p-radioButton 
                    [inputId]="'level-' + level.value"
                    [value]="level.value" 
                    formControlName="defaultVerificationLevel"
                  ></p-radioButton>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium">{{ level.label }}</span>
                      <p-tag [value]="level.badge" [severity]="level.severity"></p-tag>
                    </div>
                    <p class="text-sm text-gray-600">{{ level.description }}</p>
                    <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span><i class="pi pi-clock mr-1"></i>{{ level.duration }}</span>
                      <span><i class="pi pi-dollar mr-1"></i>{{ level.cost }}</span>
                    </div>
                  </div>
                </label>
              </div>
            }

            @if (hasOrganizationPolicy('verification_level')) {
              <p-message severity="info" styleClass="w-full">
                <ng-template pTemplate>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle"></i>
                    <span>Your organization policy restricts verification level changes. Contact your administrator for assistance.</span>
                  </div>
                </ng-template>
              </p-message>
            }
          </div>
        </p-card>

        <!-- Auto-Sharing Configuration -->
        <p-card styleClass="bg-white rounded-2xl shadow-lg border border-gray-100">
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <i class="pi pi-share-alt text-green-600"></i>
                Auto-Sharing Configuration
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Automatically share verification results with specified recipients
              </p>
            </div>
          </ng-template>

          <div class="space-y-6" formGroupName="autoShare">
            <!-- Enable Auto-Sharing -->
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium">Enable Auto-Sharing</label>
                <p class="text-sm text-gray-600">Automatically share verification results when completed</p>
              </div>
              <p-toggleSwitch formControlName="enabled"></p-toggleSwitch>
            </div>

            @if (verificationForm.get('autoShare.enabled')?.value) {
              <!-- Sharing Options -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex items-center gap-3">
                  <p-checkbox 
                    inputId="shareOnCompletion" 
                    formControlName="shareOnCompletion"
                  ></p-checkbox>
                  <label for="shareOnCompletion" class="text-sm font-medium">Share on successful completion</label>
                </div>
                <div class="flex items-center gap-3">
                  <p-checkbox 
                    inputId="shareOnFailure" 
                    formControlName="shareOnFailure"
                  ></p-checkbox>
                  <label for="shareOnFailure" class="text-sm font-medium">Share on verification failure</label>
                </div>
                <div class="flex items-center gap-3">
                  <p-checkbox 
                    inputId="includeDetails" 
                    formControlName="includeDetails"
                  ></p-checkbox>
                  <label for="includeDetails" class="text-sm font-medium">Include detailed results</label>
                </div>
              </div>

              <!-- Recipients Management -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <label class="font-medium">Recipients</label>
                  <p-button 
                    label="Add Recipient" 
                    icon="pi pi-plus" 
                    size="small"
                    [outlined]="true"
                    (onClick)="addRecipient()"
                  ></p-button>
                </div>

                <div formArrayName="recipients" class="space-y-3">
                  @for (recipientControl of recipientsArray.controls; track $index; let i = $index) {
                    <div [formGroupName]="i" class="recipient-item">
                      <div class="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                        <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input 
                            type="email" 
                            pInputText 
                            placeholder="Email address"
                            formControlName="email"
                            class="w-full"
                          />
                          <input 
                            type="text" 
                            pInputText 
                            placeholder="Name"
                            formControlName="name"
                            class="w-full"
                          />
                          <p-select 
                            formControlName="type"
                            [options]="recipientTypes"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Type"
                            class="w-full"
                          ></p-select>
                        </div>
                        <p-button 
                          icon="pi pi-trash" 
                          severity="danger"
                          [outlined]="true"
                          size="small"
                          (onClick)="removeRecipient(i)"
                        ></p-button>
                      </div>
                    </div>
                  }
                </div>

                @if (recipientsArray.length === 0) {
                  <div class="text-center py-8 text-gray-500">
                    <i class="pi pi-users text-2xl mb-2"></i>
                    <p>No recipients configured. Add recipients to enable auto-sharing.</p>
                  </div>
                }
              </div>
            }

            @if (hasOrganizationPolicy('auto_sharing')) {
              <p-message severity="warn" styleClass="w-full">
                <ng-template pTemplate>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span>Auto-sharing is restricted by your organization policy.</span>
                  </div>
                </ng-template>
              </p-message>
            }
          </div>
        </p-card>

        <!-- Document Retention Settings -->
        <p-card styleClass="bg-white rounded-2xl shadow-lg border border-gray-100">
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <i class="pi pi-calendar text-purple-600"></i>
                Document Retention Settings
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Configure how long documents and reports are retained
              </p>
            </div>
          </ng-template>

          <div class="space-y-6" formGroupName="retention">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Document Retention -->
              <div class="field">
                <label for="documentRetention" class="block font-medium mb-2">
                  Document Retention Period
                </label>
                <div class="flex items-center gap-2">
                  <p-inputNumber
                    inputId="documentRetention"
                    formControlName="documents"
                    [min]="1"
                    [max]="3650"
                    suffix=" days"
                    class="flex-1"
                  ></p-inputNumber>
                </div>
                <small class="text-gray-600">How long to keep original documents (1-3650 days)</small>
              </div>

              <!-- Report Retention -->
              <div class="field">
                <label for="reportRetention" class="block font-medium mb-2">
                  Report Retention Period
                </label>
                <div class="flex items-center gap-2">
                  <p-inputNumber
                    inputId="reportRetention"
                    formControlName="reports"
                    [min]="1"
                    [max]="3650"
                    suffix=" days"
                    class="flex-1"
                  ></p-inputNumber>
                </div>
                <small class="text-gray-600">How long to keep verification reports (1-3650 days)</small>
              </div>
            </div>

            <!-- Auto-Delete Options -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="font-medium">Enable Auto-Delete</label>
                  <p class="text-sm text-gray-600">Automatically delete documents after retention period</p>
                </div>
                <p-toggleSwitch formControlName="autoDelete"></p-toggleSwitch>
              </div>

              @if (verificationForm.get('retention.autoDelete')?.value) {
                <div class="ml-4 space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <label class="font-medium">Notify Before Delete</label>
                      <p class="text-sm text-gray-600">Send notification before auto-deletion</p>
                    </div>
                    <p-toggleSwitch formControlName="notifyBeforeDelete"></p-toggleSwitch>
                  </div>

                  @if (verificationForm.get('retention.notifyBeforeDelete')?.value) {
                    <div class="field">
                      <label for="deleteWarningDays" class="block font-medium mb-2">
                        Warning Period
                      </label>
                      <p-inputNumber
                        inputId="deleteWarningDays"
                        formControlName="deleteWarningDays"
                        [min]="1"
                        [max]="30"
                        suffix=" days"
                        class="w-full"
                      ></p-inputNumber>
                      <small class="text-gray-600">Days before deletion to send warning (1-30 days)</small>
                    </div>
                  }
                </div>
              }
            </div>

            @if (hasOrganizationPolicy('retention_period')) {
              <p-message severity="info" styleClass="w-full">
                <ng-template pTemplate>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle"></i>
                    <span>Retention periods are governed by your organization policy and cannot be modified.</span>
                  </div>
                </ng-template>
              </p-message>
            }
          </div>
        </p-card>

        <!-- Verification Notifications -->
        <p-card styleClass="bg-white rounded-2xl shadow-lg border border-gray-100">
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <i class="pi pi-bell text-orange-600"></i>
                Verification Notifications
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Configure when to receive notifications about verification activities
              </p>
            </div>
          </ng-template>

          <div class="space-y-6" formGroupName="notifications">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center gap-3">
                <p-checkbox 
                  inputId="notifyCompletion" 
                  formControlName="onCompletion"
                ></p-checkbox>
                <label for="notifyCompletion" class="font-medium">Verification completed</label>
              </div>
              <div class="flex items-center gap-3">
                <p-checkbox 
                  inputId="notifyFailure" 
                  formControlName="onFailure"
                ></p-checkbox>
                <label for="notifyFailure" class="font-medium">Verification failed</label>
              </div>
              <div class="flex items-center gap-3">
                <p-checkbox 
                  inputId="notifyExpiration" 
                  formControlName="onExpiration"
                ></p-checkbox>
                <label for="notifyExpiration" class="font-medium">Document expiring</label>
              </div>
              <div class="flex items-center gap-3">
                <p-checkbox 
                  inputId="notifyStatusChange" 
                  formControlName="onStatusChange"
                ></p-checkbox>
                <label for="notifyStatusChange" class="font-medium">Status changes</label>
              </div>
            </div>

            <!-- Digest Settings -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="font-medium">Enable Digest Notifications</label>
                  <p class="text-sm text-gray-600">Receive summary notifications instead of individual alerts</p>
                </div>
                <p-toggleSwitch formControlName="digestEnabled"></p-toggleSwitch>
              </div>

              @if (verificationForm.get('notifications.digestEnabled')?.value) {
                <div class="field">
                  <label for="digestFrequency" class="block font-medium mb-2">
                    Digest Frequency
                  </label>
                  <p-select 
                    inputId="digestFrequency"
                    formControlName="digestFrequency"
                    [options]="digestFrequencies"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select frequency"
                    class="w-full"
                  ></p-select>
                </div>
              }
            </div>
          </div>
        </p-card>

        <!-- Template Management -->
        <p-card styleClass="bg-white rounded-2xl shadow-lg border border-gray-100">
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <i class="pi pi-file-edit text-indigo-600"></i>
                Template Management
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Configure default templates and auto-application settings for verification processes
              </p>
            </div>
          </ng-template>

          <div class="space-y-6" formGroupName="templates">
            <!-- Default Template Selection -->
            <div class="field">
              <label for="defaultTemplate" class="block font-medium mb-2">
                Default Verification Template
              </label>
              <p-select 
                inputId="defaultTemplate"
                formControlName="defaultTemplate"
                [options]="availableTemplates()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select default template"
                class="w-full"
                [showClear]="true"
              >
                <ng-template pTemplate="selectedItem" let-selectedOption>
                  @if (selectedOption) {
                    <div class="flex items-center gap-2">
                    <i class="pi pi-file-edit text-indigo-600"></i>
                      <span>{{ selectedOption.name }}</span>
                      <p-tag [value]="selectedOption.verificationLevel" severity="info" class="text-xs"></p-tag>
                    </div>
                  }
                </ng-template>
                <ng-template pTemplate="item" let-template>
                  <div class="flex items-center justify-between w-full p-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium">{{ template.name }}</span>
                        <p-tag [value]="template.verificationLevel" severity="info" class="text-xs"></p-tag>
                        @if (template.isDefault) {
                          <p-tag value="Default" severity="success" class="text-xs"></p-tag>
                        }
                      </div>
                      <p class="text-sm text-gray-600">{{ template.description }}</p>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs text-gray-500">
                          Document types: {{ template.documentTypes.join(', ') }}
                        </span>
                      </div>
                    </div>
                  </div>
                </ng-template>
              </p-select>
              <small class="text-gray-600">Template to use by default for new verifications</small>
            </div>

            <!-- Auto-Apply Template -->
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium">Auto-Apply Default Template</label>
                <p class="text-sm text-gray-600">Automatically apply the default template to new verifications</p>
              </div>
              <p-toggleSwitch formControlName="autoApplyTemplate"></p-toggleSwitch>
            </div>

            <!-- Document Type Specific Templates -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium">Document Type Specific Templates</h4>
                  <p class="text-sm text-gray-600">Configure different templates for specific document types</p>
                </div>
                <p-button 
                  label="Add Template Preference" 
                  icon="pi pi-plus" 
                  size="small"
                  [outlined]="true"
                  (onClick)="addTemplatePreference()"
                ></p-button>
              </div>

              <div formArrayName="templatePreferences" class="space-y-3">
                @for (preferenceControl of templatePreferencesArray.controls; track $index; let i = $index) {
                  <div [formGroupName]="i" class="template-preference-item">
                    <div class="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
                      <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="field">
                          <label class="block text-sm font-medium mb-1">Document Type</label>
                          <p-select 
                            formControlName="documentType"
                            [options]="documentTypes"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select type"
                            class="w-full"
                          ></p-select>
                        </div>
                        <div class="field">
                          <label class="block text-sm font-medium mb-1">Template</label>
                          <p-select 
                            formControlName="templateId"
                            [options]="getTemplatesForDocumentType(preferenceControl.get('documentType')?.value)"
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select template"
                            class="w-full"
                          ></p-select>
                        </div>
                        <div class="field flex items-center">
                          <div class="flex items-center gap-2">
                            <p-checkbox 
                              inputId="autoApply-{{ i }}" 
                              formControlName="autoApply"
                            ></p-checkbox>
                            <label [for]="'autoApply-' + i" class="text-sm font-medium">Auto-apply</label>
                          </div>
                        </div>
                      </div>
                      <p-button 
                        icon="pi pi-trash" 
                        severity="danger"
                        [outlined]="true"
                        size="small"
                        (onClick)="removeTemplatePreference(i)"
                      ></p-button>
                    </div>
                  </div>
                }
              </div>

              @if (templatePreferencesArray.length === 0) {
                <div class="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <i class="pi pi-file-edit text-2xl mb-2"></i>
                  <p>No document type specific templates configured</p>
                  <p class="text-sm">Add preferences to use different templates for specific document types</p>
                </div>
              }
            </div>

            <!-- Template Preview -->
            @if (selectedTemplatePreview()) {
              <div class="template-preview">
                <h4 class="font-medium mb-3">Template Preview</h4>
                <div class="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div class="flex items-start gap-3">
                    <i class="pi pi-eye text-blue-600 mt-1"></i>
                    <div class="flex-1">
                      <h5 class="font-medium text-blue-800">{{ selectedTemplatePreview()?.name }}</h5>
                      <p class="text-sm text-blue-700 mt-1">{{ selectedTemplatePreview()?.description }}</p>
                      <div class="flex items-center gap-4 mt-2 text-sm text-blue-600">
                        <span><strong>Level:</strong> {{ selectedTemplatePreview()?.verificationLevel }}</span>
                        <span><strong>Types:</strong> {{ selectedTemplatePreview()?.documentTypes?.join(', ') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (hasOrganizationPolicy('template_usage')) {
              <p-message severity="info" styleClass="w-full">
                <ng-template pTemplate>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle"></i>
                    <span>Template usage is controlled by your organization policy.</span>
                  </div>
                </ng-template>
              </p-message>
            }
          </div>
        </p-card>

        <!-- Organization Policies (if any) -->
        @if (organizationPolicies().length > 0) {
          <p-card styleClass="bg-white rounded-2xl shadow-lg border border-gray-100">
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold flex items-center gap-2">
                  <i class="pi pi-building text-red-600"></i>
                  Organization Policies
                </h3>
                <p class="text-sm text-gray-600 mt-1">
                  Policies that override or restrict your verification preferences
                </p>
              </div>
            </ng-template>

            <div class="space-y-4">
              @for (policy of organizationPolicies(); track policy.id) {
                <div class="policy-item p-4 border rounded-lg bg-red-50 border-red-200">
                  <div class="flex items-start gap-3">
                    <i class="pi pi-exclamation-triangle text-red-600 mt-1"></i>
                    <div class="flex-1">
                      <h4 class="font-medium text-red-800">{{ policy.name }}</h4>
                      <p class="text-sm text-red-700 mt-1">{{ policy.description }}</p>
                      @if (policy.overridesUserPreference) {
                        <p class="text-xs text-red-600 mt-2">
                          <i class="pi pi-lock mr-1"></i>
                          This policy overrides your personal preferences
                        </p>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </p-card>
        }

        <!-- Form Actions -->
        <div class="flex justify-between items-center pt-6 border-t border-gray-200">
          <p-button 
            label="Reset to Defaults" 
            icon="pi pi-refresh"
            severity="secondary"
            [outlined]="true"
            (onClick)="resetToDefaults()"
            [disabled]="saving()"
          ></p-button>
          
          <div class="flex gap-3">
            <p-button 
              label="Cancel" 
              severity="secondary"
              [outlined]="true"
              (onClick)="cancelChanges()"
              [disabled]="saving()"
            ></p-button>
            <p-button 
              type="submit"
              label="Save Preferences" 
              icon="pi pi-save"
              [loading]="saving()"
              [disabled]="verificationForm.invalid"
            ></p-button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .verification-preferences-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .verification-level-option.selected {
      border-color: var(--primary-color);
      background-color: var(--primary-50);
    }

    .recipient-item {
      transition: all 0.2s ease;
    }

    .recipient-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .policy-item {
      transition: all 0.2s ease;
    }

    .field {
      margin-bottom: 1rem;
    }

    /* Custom styling for form controls */
    :host ::ng-deep {
      .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider {
        background-color: var(--primary-color);
      }
      
      .p-radiobutton.p-radiobutton-checked .p-radiobutton-box {
        border-color: var(--primary-color);
        background-color: var(--primary-color);
      }
      
      .p-checkbox.p-checkbox-checked .p-checkbox-box {
        border-color: var(--primary-color);
        background-color: var(--primary-color);
      }
    }
  `]
})
export class VerificationTabComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly profileService = inject(ProfileService);
  private readonly destroy$ = new Subject<void>();

  readonly saving = signal<boolean>(false);
  readonly loading = signal<boolean>(true);
  readonly availableTemplates = signal<VerificationTemplate[]>([]);
  readonly organizationPolicies = signal<OrganizationPolicy[]>([]);
  readonly selectedTemplatePreview = signal<VerificationTemplate | null>(null);

  readonly verificationLevels = [
    {
      value: VerificationLevel.BASIC,
      label: 'Basic Verification',
      badge: 'Fast',
      severity: 'success' as const,
      description: 'Quick document authenticity check with basic validation',
      duration: '< 5 minutes',
      cost: 'Low cost'
    },
    {
      value: VerificationLevel.STANDARD,
      label: 'Standard Verification',
      badge: 'Recommended',
      severity: 'info' as const,
      description: 'Comprehensive verification with forensic analysis and blockchain validation',
      duration: '5-15 minutes',
      cost: 'Standard cost'
    },
    {
      value: VerificationLevel.COMPREHENSIVE,
      label: 'Comprehensive Verification',
      badge: 'Thorough',
      severity: 'warn' as const,
      description: 'Complete verification with advanced forensics, multiple validation layers, and detailed reporting',
      duration: '15-30 minutes',
      cost: 'Higher cost'
    }
  ];

  readonly recipientTypes = [
    { label: 'User', value: RecipientType.USER },
    { label: 'External', value: RecipientType.EXTERNAL },
    { label: 'Organization', value: RecipientType.ORGANIZATION }
  ];

  readonly digestFrequencies = [
    { label: 'Daily', value: DigestFrequency.DAILY },
    { label: 'Weekly', value: DigestFrequency.WEEKLY },
    { label: 'Monthly', value: DigestFrequency.MONTHLY }
  ];

  readonly documentTypes = [
    { label: 'Degree', value: 'degree' },
    { label: 'Certificate', value: 'certificate' },
    { label: 'License', value: 'license' },
    { label: 'Transcript', value: 'transcript' },
    { label: 'ID Document', value: 'id_document' },
    { label: 'Other', value: 'other' }
  ];

  readonly verificationForm = this.fb.group({
    defaultVerificationLevel: [VerificationLevel.STANDARD, Validators.required],
    autoShare: this.fb.group({
      enabled: [false],
      shareOnCompletion: [true],
      shareOnFailure: [false],
      includeDetails: [true],
      recipients: this.fb.array([])
    }),
    retention: this.fb.group({
      documents: [365, [Validators.required, Validators.min(1), Validators.max(3650)]],
      reports: [730, [Validators.required, Validators.min(1), Validators.max(3650)]],
      autoDelete: [false],
      notifyBeforeDelete: [true],
      deleteWarningDays: [7, [Validators.min(1), Validators.max(30)]]
    }),
    notifications: this.fb.group({
      onCompletion: [true],
      onFailure: [true],
      onExpiration: [true],
      onStatusChange: [false],
      digestEnabled: [false],
      digestFrequency: [DigestFrequency.WEEKLY]
    }),
    templates: this.fb.group({
      defaultTemplate: [null as string | null],
      autoApplyTemplate: [false],
      templatePreferences: this.fb.array([])
    })
  });

  get recipientsArray(): FormArray {
    return this.verificationForm.get('autoShare.recipients') as FormArray;
  }

  get templatePreferencesArray(): FormArray {
    return this.verificationForm.get('templates.templatePreferences') as FormArray;
  }

  ngOnInit(): void {
    this.loadVerificationPreferences();
    this.loadAvailableTemplates();
    this.loadOrganizationPolicies();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadVerificationPreferences(): void {
    this.loading.set(true);

    // Mock data - replace with actual service call
    setTimeout(() => {
      const mockPreferences: VerificationPreferences = {
        defaultVerificationLevel: VerificationLevel.STANDARD,
        autoShare: {
          enabled: false,
          recipients: [],
          includeDetails: true,
          shareOnCompletion: true,
          shareOnFailure: false
        },
        retention: {
          documents: 365,
          reports: 730,
          autoDelete: false,
          notifyBeforeDelete: true,
          deleteWarningDays: 7
        },
        notifications: {
          onCompletion: true,
          onFailure: true,
          onExpiration: true,
          onStatusChange: false,
          digestEnabled: false,
          digestFrequency: DigestFrequency.WEEKLY
        },
        templates: {
          defaultTemplate: null,
          autoApplyTemplate: false,
          templatePreferences: []
        }
      };

      this.patchFormWithPreferences(mockPreferences);
      this.loading.set(false);
    }, 1000);
  }

  private loadAvailableTemplates(): void {
    // Mock templates - replace with actual service call
    const mockTemplates: VerificationTemplate[] = [
      {
        id: '1',
        name: 'Standard Document Template',
        description: 'Default template for standard document verification',
        documentTypes: ['certificate', 'license'],
        verificationLevel: VerificationLevel.STANDARD,
        isDefault: true,
        isActive: true,
        organizationId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Academic Credentials Template',
        description: 'Specialized template for academic documents',
        documentTypes: ['degree', 'transcript'],
        verificationLevel: VerificationLevel.COMPREHENSIVE,
        isDefault: false,
        isActive: true,
        organizationId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.availableTemplates.set(mockTemplates);
  }

  private loadOrganizationPolicies(): void {
    // Mock policies - replace with actual service call
    const mockPolicies: OrganizationPolicy[] = [];
    this.organizationPolicies.set(mockPolicies);
  }

  private patchFormWithPreferences(preferences: VerificationPreferences): void {
    this.verificationForm.patchValue({
      defaultVerificationLevel: preferences.defaultVerificationLevel,
      autoShare: {
        enabled: preferences.autoShare.enabled,
        shareOnCompletion: preferences.autoShare.shareOnCompletion,
        shareOnFailure: preferences.autoShare.shareOnFailure,
        includeDetails: preferences.autoShare.includeDetails
      },
      retention: preferences.retention,
      notifications: preferences.notifications,
      templates: {
        defaultTemplate: preferences.templates.defaultTemplate,
        autoApplyTemplate: preferences.templates.autoApplyTemplate
      }
    });

    // Add recipients
    preferences.autoShare.recipients.forEach(recipient => {
      this.addRecipient(recipient);
    });

    // Add template preferences
    preferences.templates.templatePreferences.forEach(preference => {
      const preferenceForm = this.fb.group({
        documentType: [preference.documentType, Validators.required],
        templateId: [preference.templateId, Validators.required],
        autoApply: [preference.autoApply]
      });
      this.templatePreferencesArray.push(preferenceForm);
    });
  }

  private setupFormValidation(): void {
    // Add custom validation logic here
    this.verificationForm.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Perform any cross-field validation
    });

    // Watch for default template changes to update preview
    this.verificationForm.get('templates.defaultTemplate')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(templateId => {
      if (templateId) {
        const template = this.availableTemplates().find(t => t.id === templateId);
        this.selectedTemplatePreview.set(template || null);
      } else {
        this.selectedTemplatePreview.set(null);
      }
    });
  }

  addRecipient(recipient?: ShareRecipient): void {
    const recipientForm = this.fb.group({
      id: [recipient?.id || ''],
      email: [recipient?.email || '', [Validators.required, Validators.email]],
      name: [recipient?.name || '', Validators.required],
      type: [recipient?.type || RecipientType.EXTERNAL, Validators.required]
    });

    this.recipientsArray.push(recipientForm);
  }

  removeRecipient(index: number): void {
    this.recipientsArray.removeAt(index);
  }

  addTemplatePreference(): void {
    const preferenceForm = this.fb.group({
      documentType: ['', Validators.required],
      templateId: ['', Validators.required],
      autoApply: [true]
    });

    this.templatePreferencesArray.push(preferenceForm);
  }

  removeTemplatePreference(index: number): void {
    this.templatePreferencesArray.removeAt(index);
  }

  getTemplatesForDocumentType(documentType: string): VerificationTemplate[] {
    if (!documentType) return this.availableTemplates();

    return this.availableTemplates().filter(template =>
      template.documentTypes.includes(documentType)
    );
  }

  hasOrganizationPolicy(policyType: string): boolean {
    return this.organizationPolicies().some(policy =>
      policy.type === policyType && policy.isRestricted
    );
  }

  savePreferences(): void {
    if (this.verificationForm.invalid) {
      this.notificationService.error('Please fix the validation errors before saving.');
      return;
    }

    this.saving.set(true);
    const formValue = this.verificationForm.value;

    const _updateRequest: VerificationPreferencesUpdateRequest = {
      defaultVerificationLevel: formValue.defaultVerificationLevel as VerificationLevel,
      autoShare: {
        enabled: formValue.autoShare?.enabled || false,
        shareOnCompletion: formValue.autoShare?.shareOnCompletion || false,
        shareOnFailure: formValue.autoShare?.shareOnFailure || false,
        includeDetails: formValue.autoShare?.includeDetails || false,
        recipients: (formValue.autoShare?.recipients as any[])?.map((r: any) => ({
          id: r.id || '',
          email: r.email,
          name: r.name,
          type: r.type as RecipientType,
          permissions: {
            canView: true,
            canDownload: false,
            canComment: false
          }
        })) || []
      },
      retention: formValue.retention as Partial<RetentionSettings>,
      notifications: formValue.notifications as Partial<VerificationNotificationSettings>,
      templates: formValue.templates as Partial<TemplateSettings>
    };

    // Mock API call - replace with actual service
    setTimeout(() => {
      this.saving.set(false);
      this.notificationService.success('Verification preferences saved successfully!');
    }, 1500);
  }

  resetToDefaults(): void {
    this.verificationForm.reset({
      defaultVerificationLevel: VerificationLevel.STANDARD,
      autoShare: {
        enabled: false,
        shareOnCompletion: true,
        shareOnFailure: false,
        includeDetails: true
      },
      retention: {
        documents: 365,
        reports: 730,
        autoDelete: false,
        notifyBeforeDelete: true,
        deleteWarningDays: 7
      },
      notifications: {
        onCompletion: true,
        onFailure: true,
        onExpiration: true,
        onStatusChange: false,
        digestEnabled: false,
        digestFrequency: DigestFrequency.WEEKLY
      },
      templates: {
        defaultTemplate: null,
        autoApplyTemplate: false
      }
    });

    // Clear recipients array
    while (this.recipientsArray.length !== 0) {
      this.recipientsArray.removeAt(0);
    }

    // Clear template preferences array
    while (this.templatePreferencesArray.length !== 0) {
      this.templatePreferencesArray.removeAt(0);
    }

    this.notificationService.info('Preferences reset to default values');
  }

  cancelChanges(): void {
    this.loadVerificationPreferences();
    this.notificationService.info('Changes cancelled');
  }
}