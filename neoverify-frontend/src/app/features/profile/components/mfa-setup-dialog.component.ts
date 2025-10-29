import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SHARED_IMPORTS } from '../../../shared';
import { Subject, takeUntil } from 'rxjs';

interface MfaSetup {
  qrCode: string;
  backupCodes: string[];
  verificationCode: string;
  step: 'setup' | 'verify' | 'complete';
}

interface MfaDevice {
  id: string;
  name: string;
  type: 'totp' | 'sms' | 'email';
  createdAt: Date;
  lastUsed: Date | null;
}

@Component({
  selector: 'app-mfa-setup-dialog',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="mfa-setup-dialog">
      <!-- Header -->
      <div class="dialog-header mb-6">
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">
          {{ isEnabling() ? 'Enable Two-Factor Authentication' : 'Manage Two-Factor Authentication' }}
        </h2>
        <p class="text-surface-600 dark:text-surface-400">
          {{ getStepDescription() }}
        </p>
      </div>

      <!-- Content based on current step -->
      @switch (currentStep()) {
        @case ('setup') {
          <div class="setup-step">
            <!-- QR Code Section -->
            <div class="qr-section mb-6">
              <h3 class="text-lg font-semibold mb-4">1. Scan QR Code</h3>
              <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-6 text-center">
                @if (mfaSetup()?.qrCode) {
                  <div class="qr-code-container mb-4">
                    <img [src]="mfaSetup()?.qrCode" alt="MFA QR Code" class="mx-auto border rounded-lg" />
                  </div>
                  <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                } @else {
                  <div class="flex items-center justify-center h-48">
                    <i class="pi pi-spin pi-spinner text-2xl text-surface-400"></i>
                  </div>
                }
                
                <!-- Manual Entry Option -->
                <div class="manual-entry mt-4">
                  <p-button
                    label="Can't scan? Enter manually"
                    [text]="true"
                    size="small"
                    (onClick)="toggleManualEntry()"
                  ></p-button>
                  
                  @if (showManualEntry()) {
                    <div class="mt-4 p-4 bg-surface-100 dark:bg-surface-700 rounded-lg">
                      <p class="text-sm font-medium mb-2">Manual Entry Key:</p>
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          pInputText
                          [value]="manualEntryKey"
                          readonly
                          class="flex-1 font-mono text-sm"
                        />
                        <p-button
                          icon="pi pi-copy"
                          [text]="true"
                          size="small"
                          (onClick)="copyToClipboard(manualEntryKey)"
                          pTooltip="Copy to clipboard"
                        ></p-button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- App Recommendations -->
            <div class="app-recommendations mb-6">
              <h3 class="text-lg font-semibold mb-4">2. Recommended Authenticator Apps</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="app-card p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                  <div class="flex items-center gap-3">
                    <i class="pi pi-google text-2xl text-blue-600"></i>
                    <div>
                      <p class="font-medium">Google Authenticator</p>
                      <p class="text-sm text-surface-600 dark:text-surface-400">Free, reliable</p>
                    </div>
                  </div>
                </div>
                <div class="app-card p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                  <div class="flex items-center gap-3">
                    <i class="pi pi-shield text-2xl text-green-600"></i>
                    <div>
                      <p class="font-medium">Authy</p>
                      <p class="text-sm text-surface-600 dark:text-surface-400">Multi-device sync</p>
                    </div>
                  </div>
                </div>
                <div class="app-card p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                  <div class="flex items-center gap-3">
                    <i class="pi pi-microsoft text-2xl text-blue-800"></i>
                    <div>
                      <p class="font-medium">Microsoft Authenticator</p>
                      <p class="text-sm text-surface-600 dark:text-surface-400">Enterprise features</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Next Step Button -->
            <div class="flex justify-end">
              <p-button
                label="I've Added the Account"
                icon="pi pi-arrow-right"
                (onClick)="proceedToVerification()"
                [disabled]="!mfaSetup()?.qrCode"
              ></p-button>
            </div>
          </div>
        }

        @case ('verify') {
          <div class="verify-step">
            <!-- Verification Form -->
            <div class="verification-form mb-6">
              <h3 class="text-lg font-semibold mb-4">3. Verify Setup</h3>
              <p class="text-surface-600 dark:text-surface-400 mb-4">
                Enter the 6-digit code from your authenticator app to verify the setup.
              </p>

              <form [formGroup]="verificationForm" (ngSubmit)="verifyMfaSetup()" class="space-y-4">
                <div class="field">
                  <label for="verificationCode" class="block text-sm font-medium mb-2">
                    Verification Code *
                  </label>
                  <div class="flex gap-2">
                    <input
                      id="verificationCode"
                      type="text"
                      pInputText
                      formControlName="verificationCode"
                      placeholder="000000"
                      maxlength="6"
                      class="flex-1 text-center text-2xl font-mono tracking-widest"
                      [class.ng-invalid]="isFieldInvalid('verificationCode')"
                      (input)="onVerificationCodeInput($event)"
                    />
                    <p-button
                      type="submit"
                      label="Verify"
                      icon="pi pi-check"
                      [loading]="verifying()"
                      [disabled]="verificationForm.invalid"
                    ></p-button>
                  </div>
                  @if (isFieldInvalid('verificationCode')) {
                    <small class="p-error block mt-1">
                      Please enter a valid 6-digit code
                    </small>
                  }
                </div>
              </form>
            </div>

            <!-- Help Text -->
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <i class="pi pi-info-circle text-blue-600 mt-1"></i>
                <div>
                  <p class="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Code not working?
                  </p>
                  <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Make sure your device's time is synchronized</li>
                    <li>• Wait for the code to refresh and try again</li>
                    <li>• Check that you scanned the correct QR code</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        }

        @case ('complete') {
          <div class="complete-step text-center">
            <!-- Success Icon -->
            <div class="success-icon mb-6">
              <div class="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <i class="pi pi-check text-3xl text-green-600"></i>
              </div>
            </div>

            <h3 class="text-xl font-semibold text-green-800 dark:text-green-200 mb-4">
              Two-Factor Authentication Enabled!
            </h3>
            <p class="text-surface-600 dark:text-surface-400 mb-6">
              Your account is now protected with an additional layer of security.
            </p>

            <!-- Backup Codes -->
            @if (mfaSetup()?.backupCodes && mfaSetup()!.backupCodes.length > 0) {
              <div class="backup-codes mb-6">
                <h4 class="text-lg font-semibold mb-4">Backup Recovery Codes</h4>
                <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <div class="flex items-start gap-3">
                    <i class="pi pi-exclamation-triangle text-yellow-600 mt-1"></i>
                    <div class="text-left">
                      <p class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Save these backup codes
                      </p>
                      <p class="text-sm text-yellow-700 dark:text-yellow-300">
                        Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="backup-codes-grid grid grid-cols-2 gap-2 mb-4">
                  @for (code of mfaSetup()?.backupCodes || []; track code) {
                    <div class="backup-code p-3 bg-surface-100 dark:bg-surface-800 rounded border font-mono text-sm text-center">
                      {{ code }}
                    </div>
                  }
                </div>

                <div class="flex gap-2 justify-center">
                  <p-button
                    label="Download Codes"
                    icon="pi pi-download"
                    [outlined]="true"
                    size="small"
                    (onClick)="downloadBackupCodes()"
                  ></p-button>
                  <p-button
                    label="Copy Codes"
                    icon="pi pi-copy"
                    [outlined]="true"
                    size="small"
                    (onClick)="copyBackupCodes()"
                  ></p-button>
                </div>
              </div>
            }

            <!-- Confirmation Checkbox -->
            <div class="confirmation mb-6">
              <p-checkbox
                [(ngModel)]="backupCodesSaved"
                binary="true"
                inputId="backupCodesSaved"
              ></p-checkbox>
              <label for="backupCodesSaved" class="ml-2 text-sm">
                I have saved my backup codes in a secure location
              </label>
            </div>
          </div>
        }
      }

      <!-- Existing MFA Devices (if any) -->
      @if (!isEnabling() && existingDevices().length > 0) {
        <div class="existing-devices mt-6">
          <h3 class="text-lg font-semibold mb-4">Current MFA Devices</h3>
          <div class="space-y-3">
            @for (device of existingDevices(); track device.id) {
              <div class="device-item flex items-center justify-between p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                <div class="flex items-center gap-3">
                  <i [class]="getDeviceIcon(device.type)" class="text-xl text-surface-600"></i>
                  <div>
                    <p class="font-medium">{{ device.name }}</p>
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                      Added {{ formatDate(device.createdAt) }}
                      @if (device.lastUsed) {
                        • Last used {{ formatDate(device.lastUsed) }}
                      }
                    </p>
                  </div>
                </div>
                <p-button
                  label="Remove"
                  severity="danger"
                  [outlined]="true"
                  size="small"
                  (onClick)="removeDevice(device.id)"
                ></p-button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Dialog Actions -->
      <div class="dialog-actions flex justify-between items-center mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
        <p-button
          label="Cancel"
          severity="secondary"
          [outlined]="true"
          (onClick)="closeDialog()"
          [disabled]="processing()"
        ></p-button>

        <div class="flex gap-2">
          @if (currentStep() === 'verify') {
            <p-button
              label="Back"
              severity="secondary"
              [outlined]="true"
              (onClick)="goBackToSetup()"
              [disabled]="processing()"
            ></p-button>
          }

          @if (currentStep() === 'complete') {
            <p-button
              label="Done"
              (onClick)="closeDialog()"
              [disabled]="!backupCodesSaved"
            ></p-button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mfa-setup-dialog {
      min-width: 600px;
      max-width: 800px;
    }

    .qr-code-container img {
      max-width: 200px;
      height: auto;
    }

    .backup-codes-grid {
      max-width: 400px;
      margin: 0 auto;
    }

    .backup-code {
      word-break: break-all;
    }

    .app-card {
      transition: all 0.2s;
    }

    .app-card:hover {
      background: var(--surface-50);
      border-color: var(--primary-color);
    }

    @media (max-width: 768px) {
      .mfa-setup-dialog {
        min-width: auto;
        width: 100%;
      }

      .backup-codes-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MfaSetupDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly destroy$ = new Subject<void>();

  // Signals
  readonly currentStep = signal<'setup' | 'verify' | 'complete'>('setup');
  readonly mfaSetup = signal<MfaSetup | null>(null);
  readonly existingDevices = signal<MfaDevice[]>([]);
  readonly isEnabling = signal<boolean>(true);
  readonly verifying = signal<boolean>(false);
  readonly processing = signal<boolean>(false);
  showManualEntry = signal<boolean>(false);
  readonly backupCodesSaved = signal<boolean>(false);

  // Form
  readonly verificationForm = this.fb.group({
    verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  // Properties
  manualEntryKey = 'JBSWY3DPEHPK3PXP'; // Mock key - replace with actual

  ngOnInit(): void {
    // Get configuration from dialog data
    const data = this.config.data;
    this.isEnabling.set(data?.isEnabling ?? true);

    if (this.isEnabling()) {
      this.initializeMfaSetup();
    } else {
      this.loadExistingDevices();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeMfaSetup(): void {
    this.processing.set(true);

    // Mock API call to initialize MFA setup
    setTimeout(() => {
      const mockSetup: MfaSetup = {
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Mock QR code
        backupCodes: [
          'ABC123DEF456',
          'GHI789JKL012',
          'MNO345PQR678',
          'STU901VWX234',
          'YZA567BCD890',
          'EFG123HIJ456',
          'KLM789NOP012',
          'QRS345TUV678'
        ],
        verificationCode: '',
        step: 'setup'
      };

      this.mfaSetup.set(mockSetup);
      this.processing.set(false);
    }, 1000);
  }

  private loadExistingDevices(): void {
    // Mock existing devices
    const mockDevices: MfaDevice[] = [
      {
        id: '1',
        name: 'Google Authenticator',
        type: 'totp',
        createdAt: new Date('2024-01-15'),
        lastUsed: new Date('2024-10-28')
      }
    ];

    this.existingDevices.set(mockDevices);
  }

  proceedToVerification(): void {
    this.currentStep.set('verify');
  }

  goBackToSetup(): void {
    this.currentStep.set('setup');
    this.verificationForm.reset();
  }

  verifyMfaSetup(): void {
    if (this.verificationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.verifying.set(true);
    const { verificationCode } = this.verificationForm.value;

    // Mock verification API call
    setTimeout(() => {
      if (verificationCode === '123456') {
        this.currentStep.set('complete');
        this.notificationService.success('MFA setup completed successfully!');
      } else {
        this.notificationService.error('Invalid verification code. Please try again.');
      }
      this.verifying.set(false);
    }, 1500);
  }

  onVerificationCodeInput(event: any): void {
    const value = event.target.value;
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      setTimeout(() => this.verifyMfaSetup(), 100);
    }
  }

  removeDevice(deviceId: string): void {
    // Mock device removal
    const devices = this.existingDevices();
    const updatedDevices = devices.filter(d => d.id !== deviceId);
    this.existingDevices.set(updatedDevices);
    this.notificationService.success('MFA device removed successfully');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success('Copied to clipboard');
    });
  }

  downloadBackupCodes(): void {
    const codes = this.mfaSetup()?.backupCodes || [];
    const content = codes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neoverify-backup-codes.txt';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  copyBackupCodes(): void {
    const codes = this.mfaSetup()?.backupCodes || [];
    const content = codes.join('\n');
    this.copyToClipboard(content);
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'totp': return 'pi pi-mobile';
      case 'sms': return 'pi pi-phone';
      case 'email': return 'pi pi-envelope';
      default: return 'pi pi-shield';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  getStepDescription(): string {
    switch (this.currentStep()) {
      case 'setup':
        return 'Scan the QR code with your authenticator app to get started.';
      case 'verify':
        return 'Enter the verification code from your authenticator app.';
      case 'complete':
        return 'MFA has been successfully enabled for your account.';
      default:
        return '';
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.verificationForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.verificationForm.controls).forEach(key => {
      const control = this.verificationForm.get(key);
      control?.markAsTouched();
    });
  }

  toggleManualEntry(): void {
    this.showManualEntry.set(!this.showManualEntry());
  }

  closeDialog(): void {
    this.dialogRef.close({
      success: this.currentStep() === 'complete',
      mfaEnabled: this.currentStep() === 'complete'
    });
  }
}