import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '../../../shared';
import { FormUtils } from '../../../shared/utils/form.utils';
import { ReactiveFormsModule } from '@angular/forms';

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
  imports: [SHARED_IMPORTS,
  ReactiveFormsModule],
  templateUrl: './org-settings.component.html',
  styleUrls: ['./org-settings.component.scss']
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

    this.settingsForm.patchValue({
      allowSelfRegistration: mockOrg.settings.allowSelfRegistration,
      requireEmailVerification: mockOrg.settings.requireEmailVerification,
      enableMFA: mockOrg.settings.enableMFA,
      documentRetentionDays: mockOrg.settings.documentRetentionDays
    });
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
