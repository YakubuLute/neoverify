import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { NotificationService } from '../../core/services/notification.service';
import { FormPersistenceService } from '../../core/services/form-persistence.service';
import { SHARED_IMPORTS } from '../../shared';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';

import { FormUtils, FormValidators } from '../../shared/utils/form.utils';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Import new security components
import { MfaSetupDialogComponent } from './components/mfa-setup-dialog.component';
import { SessionManagementComponent } from './components/session-management.component';
import { EnhancedPasswordChangeComponent } from './components/enhanced-password-change.component';
import { NotificationTabComponent } from './components/notification-tab.component';
import { VerificationTabComponent } from './components/verification-tab.component';
import { OrganizationTabComponent } from './components/organization-tab.component';

interface ProfileTab {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    SHARED_IMPORTS,
    DynamicDialogModule,
    EnhancedPasswordChangeComponent,
    NotificationTabComponent,
    VerificationTabComponent,
    OrganizationTabComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  readonly formPersistenceService = inject(FormPersistenceService);
  private readonly dialogService = inject(DialogService);
  private readonly destroy$ = new Subject<void>();

  readonly currentUser = this.authService.currentUser;
  readonly updatingProfile = signal<boolean>(false);
  readonly changingPassword = signal<boolean>(false);
  readonly formId = 'profile-basic-info';

  // Tab management with signals
  readonly activeTabIndex = signal<number>(0);

  readonly profileTabs = signal<ProfileTab[]>([
    { id: 'basic', label: 'Basic Info', icon: 'pi pi-user' },
    { id: 'security', label: 'Security', icon: 'pi pi-shield' },
    { id: 'notifications', label: 'Notifications', icon: 'pi pi-bell' },
    { id: 'verification', label: 'Verification', icon: 'pi pi-verified' },
    { id: 'api-keys', label: 'API Keys', icon: 'pi pi-key' },
    { id: 'organization', label: 'Organization', icon: 'pi pi-building' },
    { id: 'privacy', label: 'Privacy & Data', icon: 'pi pi-shield' }
  ]);

  readonly profileForm = this.fb.group({
    firstName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      FormValidators.name()
    ]],
    lastName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      FormValidators.name()
    ]],
    email: ['', [
      Validators.required,
      Validators.email
    ], [
        FormValidators.emailAvailability(
          (email, currentEmail) => this.profileService.validateEmailAvailability(email, currentEmail),
          this.currentUser()?.email || ''
        )
      ]],
    phone: ['', [], [
      FormValidators.asyncPhoneNumber(
        (phone) => this.profileService.validatePhoneNumber(phone)
      )
    ]],
    organization: ['']
  });



  ngOnInit(): void {
    this.loadUserData();
    this.setupFormStatePreservation();
    this.setupRealTimeValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(index: number): void {
    // Save current form state before switching tabs
    if (this.activeTabIndex() === 0) { // Basic info tab
      this.saveFormState();
    }
    this.activeTabIndex.set(index);
  }

  private loadUserData(): void {
    const user = this.currentUser();
    if (user) {
      // Try to restore form state first, otherwise load user data
      const restored = this.formPersistenceService.restoreFormState(this.formId, this.profileForm);

      if (!restored) {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
          organization: user.organizationName || ''
        });
      }
    }
  }

  private setupFormStatePreservation(): void {
    // Save form state on every change with debounce
    this.profileForm.valueChanges.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveFormState();
    });
  }

  private setupRealTimeValidation(): void {
    // Real-time validation for name fields
    const firstNameControl = this.profileForm.get('firstName');
    const lastNameControl = this.profileForm.get('lastName');
    const emailControl = this.profileForm.get('email');
    const phoneControl = this.profileForm.get('phone');

    // Trigger validation on value changes with debounce
    if (firstNameControl) {
      firstNameControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        firstNameControl.markAsTouched();
      });
    }

    if (lastNameControl) {
      lastNameControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        lastNameControl.markAsTouched();
      });
    }

    if (emailControl) {
      emailControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        emailControl.markAsTouched();
      });
    }

    if (phoneControl) {
      phoneControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        phoneControl.markAsTouched();
      });
    }
  }

  private saveFormState(): void {
    this.formPersistenceService.saveFormState(this.formId, this.profileForm, true);
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      FormUtils.markFormGroupTouched(this.profileForm);
      this.notificationService.error('Please fix the validation errors before submitting.');
      return;
    }

    this.updatingProfile.set(true);

    const formValue = this.profileForm.value;
    this.profileService.updateProfile({
      firstName: formValue.firstName!,
      lastName: formValue.lastName!,
      email: formValue.email!,
      phone: formValue.phone || undefined
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.updatingProfile.set(false);
        if (response.success) {
          this.notificationService.success('Profile updated successfully!');
          // Clear saved form state after successful update
          this.formPersistenceService.clearFormState(this.formId);
          // Update the current user if provided in response
          if (response.user) {
            // Update auth service user data here if needed
          }
        } else {
          this.notificationService.error(response.message || 'Failed to update profile');
        }
      },
      error: (error) => {
        this.updatingProfile.set(false);
        this.notificationService.error(error.message || 'An error occurred while updating your profile');
      }
    });
  }



  openMfaSetup(): void {
    const user = this.currentUser();
    const dialogRef = this.dialogService.open(MfaSetupDialogComponent, {
      header: user?.mfaEnabled ? 'Manage Two-Factor Authentication' : 'Enable Two-Factor Authentication',
      width: '90vw',
      modal: true,
      closable: true,
      data: {
        isEnabling: !user?.mfaEnabled
      }
    });

    if (dialogRef) {
      dialogRef.onClose.subscribe((result) => {
        if (result?.success) {
          // Refresh user data or update MFA status
          this.notificationService.success('MFA settings updated successfully');
        }
      });
    }
  }

  openSessionManagement(): void {
    const dialogRef = this.dialogService.open(SessionManagementComponent, {
      header: 'Manage Active Sessions',
      width: '90vw',
      modal: true,
      closable: true
    });
  }

  sendVerificationEmail(): void {
    this.notificationService.info('Verification email sent! Please check your inbox.');
  }

  deleteAccount(): void {
    console.log('Delete account');
  }



  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.valid && field?.touched && field?.value);
  }



  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }

  resetForm(): void {
    this.formPersistenceService.clearFormState(this.formId);
    this.loadUserData();
    this.notificationService.info('Form has been reset to original values');
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}