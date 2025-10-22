import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SharedModule } from '../../../shared';
import { FormUtils } from '../../../shared/utils/form.utils';

interface Organization {
  id: string;
  name: string;
  domain: string;
  website?: string;
  description?: string;
  logo?: string;
  settings: {
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    enableMFA: boolean;
    documentRetentionDays: number;
  };
}

@Component({
  selector: 'app-org-settings',
  standalone: true,
  imports: [SharedModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            Organization Settings
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Manage your organization's configuration and policies
          </p>
        </div>

        <div class="space-y-6">
          <!-- Basic Information -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h2 class="text-xl font-semibold">Basic Information</h2>
              </div>
            </ng-template>

            <form [formGroup]="orgForm" (ngSubmit)="updateOrganization()" class="space-y-4">
              <div class="field">
                <label for="name" class="block text-sm font-medium mb-2">Organization Name *</label>
                <input
                  id="name"
                  type="text"
                  pInputText
                  formControlName="name"
                  class="w-full"
                  [class.ng-invalid]="isFieldInvalid('name')"
                />
                @if (isFieldInvalid('name')) {
                  <small class="p-error block mt-1">
                    {{ getErrorMessage(orgForm.get('name'), 'Organization Name') }}
                  </small>
                }
              </div>

              <div class="field">
                <label for="domain" class="block text-sm font-medium mb-2">Domain *</label>
                <input
                  id="domain"
                  type="text"
                  pInputText
                  formControlName="domain"
                  placeholder="example.com"
                  class="w-full"
                  [class.ng-invalid]="isFieldInvalid('domain')"
                />
                @if (isFieldInvalid('domain')) {
                  <small class="p-error block mt-1">
                    {{ getErrorMessage(orgForm.get('domain'), 'Domain') }}
                  </small>
                }
              </div>

              <div class="field">
                <label for="website" class="block text-sm font-medium mb-2">Website</label>
                <input
                  id="website"
                  type="url"
                  pInputText
                  formControlName="website"
                  placeholder="https://example.com"
                  class="w-full"
                  [class.ng-invalid]="isFieldInvalid('website')"
                />
                @if (isFieldInvalid('website')) {
                  <small class="p-error block mt-1">
                    {{ getErrorMessage(orgForm.get('website'), 'Website') }}
                  </small>
                }
              </div>

              <div class="field">
                <label for="description" class="block text-sm font-medium mb-2">Description</label>
                <textarea
                  id="description"
                  pInputTextarea
                  formControlName="description"
                  rows="3"
                  class="w-full"
                  placeholder="Brief description of your organization"
                ></textarea>
              </div>

              <div class="flex justify-end">
                <p-button
                  type="submit"
                  label="Update Information"
                  icon="pi pi-save"
                  [loading]="updating()"
                  [disabled]="orgForm.invalid"
                ></p-button>
              </div>
            </form>
          </p-card>

          <!-- Security & Access Settings -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h2 class="text-xl font-semibold">Security & Access Settings</h2>
              </div>
            </ng-template>

            <form [formGroup]="settingsForm" (ngSubmit)="updateSettings()" class="space-y-6">
              <div class="field">
                <div class="flex items-center justify-between">
                  <div>
                    <label class="font-medium">Allow Self Registration</label>
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                      Allow users to register with your organization domain
                    </p>
                  </div>
                  <p-inputSwitch formControlName="allowSelfRegistration"></p-inputSwitch>
                </div>
              </div>

              <div class="field">
                <div class="flex items-center justify-between">
                  <div>
                    <label class="font-medium">Require Email Verification</label>
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                      Users must verify their email before accessing the system
                    </p>
                  </div>
                  <p-inputSwitch formControlName="requireEmailVerification"></p-inputSwitch>
                </div>
              </div>

              <div class="field">
                <div class="flex items-center justify-between">
                  <div>
                    <label class="font-medium">Enforce Multi-Factor Authentication</label>
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                      Require all users to enable MFA
                    </p>
                  </div>
                  <p-inputSwitch formControlName="enableMFA"></p-inputSwitch>
                </div>
              </div>

              <div class="field">
                <label for="retentionDays" class="block text-sm font-medium mb-2">
                  Document Retention Period (Days)
                </label>
                <p-inputNumber
                  id="retentionDays"
                  formControlName="documentRetentionDays"
                  [min]="30"
                  [max]="3650"
                  suffix=" days"
                  class="w-full"
                ></p-inputNumber>
                <small class="text-surface-500 mt-1 block">
                  Documents will be automatically archived after this period (30-3650 days)
                </small>
              </div>

              <div class="flex justify-end">
                <p-button
                  type="submit"
                  label="Update Settings"
                  icon="pi pi-save"
                  [loading]="updating()"
                  [disabled]="settingsForm.invalid"
                ></p-button>
              </div>
            </form>
          </p-card>

          <!-- Organization Statistics -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h2 class="text-xl font-semibold">Organization Statistics</h2>
              </div>
            </ng-template>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-primary-500 mb-2">{{ stats().totalUsers }}</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">Total Users</div>
              </div>
              
              <div class="text-center">
                <div class="text-3xl font-bold text-green-500 mb-2">{{ stats().activeDocuments }}</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">Active Documents</div>
              </div>
              
              <div class="text-center">
                <div class="text-3xl font-bold text-blue-500 mb-2">{{ stats().totalVerifications }}</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">Total Verifications</div>
              </div>
              
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-500 mb-2">{{ stats().storageUsed }}</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">Storage Used (GB)</div>
              </div>
            </div>
          </p-card>

          <!-- Danger Zone -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <h2 class="text-xl font-semibold text-red-700 dark:text-red-300">Danger Zone</h2>
              </div>
            </ng-template>

            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded">
                <div>
                  <h3 class="font-medium text-red-700 dark:text-red-300">Reset Organization</h3>
                  <p class="text-sm text-surface-600 dark:text-surface-400">
                    Remove all users and documents. This action cannot be undone.
                  </p>
                </div>
                <p-button
                  label="Reset"
                  severity="danger"
                  [outlined]="true"
                  (onClick)="resetOrganization()"
                ></p-button>
              </div>

              <div class="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded">
                <div>
                  <h3 class="font-medium text-red-700 dark:text-red-300">Delete Organization</h3>
                  <p class="text-sm text-surface-600 dark:text-surface-400">
                    Permanently delete the organization and all associated data.
                  </p>
                </div>
                <p-button
                  label="Delete"
                  severity="danger"
                  (onClick)="deleteOrganization()"
                ></p-button>
              </div>
            </div>
          </p-card>
        </div>
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
export class OrgSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly organization = signal<Organization | null>(null);
  readonly updating = signal<boolean>(false);
  readonly stats = signal({
    totalUsers: 0,
    activeDocuments: 0,
    totalVerifications: 0,
    storageUsed: 0
  });

  readonly orgForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    domain: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)]],
    website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    description: ['']
  });

  readonly settingsForm = this.fb.group({
    allowSelfRegistration: [false],
    requireEmailVerification: [true],
    enableMFA: [false],
    documentRetentionDays: [365, [Validators.min(30), Validators.max(3650)]]
  });

  ngOnInit(): void {
    this.loadOrganization();
    this.loadStats();
  }

  private loadOrganization(): void {
    // Mock data - replace with actual API call
    const mockOrg: Organization = {
      id: '1',
      name: 'Example University',
      domain: 'example.edu',
      website: 'https://example.edu',
      description: 'A leading educational institution',
      settings: {
        allowSelfRegistration: true,
        requireEmailVerification: true,
        enableMFA: false,
        documentRetentionDays: 365
      }
    };

    this.organization.set(mockOrg);
    
    this.orgForm.patchValue({
      name: mockOrg.name,
      domain: mockOrg.domain,
      website: mockOrg.website,
      description: mockOrg.description
    });

    this.settingsForm.patchValue(mockOrg.settings);
  }

  private loadStats(): void {
    // Mock stats - replace with actual API call
    this.stats.set({
      totalUsers: 156,
      activeDocuments: 1243,
      totalVerifications: 5678,
      storageUsed: 12.5
    });
  }

  updateOrganization(): void {
    if (this.orgForm.invalid) {
      FormUtils.markFormGroupTouched(this.orgForm);
      return;
    }

    this.updating.set(true);
    const formValue = this.orgForm.value;

    // Mock API call
    setTimeout(() => {
      console.log('Organization updated:', formValue);
      this.updating.set(false);
    }, 1000);
  }

  updateSettings(): void {
    if (this.settingsForm.invalid) {
      FormUtils.markFormGroupTouched(this.settingsForm);
      return;
    }

    this.updating.set(true);
    const formValue = this.settingsForm.value;

    // Mock API call
    setTimeout(() => {
      console.log('Settings updated:', formValue);
      this.updating.set(false);
    }, 1000);
  }

  resetOrganization(): void {
    console.log('Reset organization');
  }

  deleteOrganization(): void {
    console.log('Delete organization');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.orgForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }
}