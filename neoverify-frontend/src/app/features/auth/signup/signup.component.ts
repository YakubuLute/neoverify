import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SharedModule } from '../../../shared';
import { FormValidators, FormUtils } from '../../../shared/utils/form.utils';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [SharedModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-surface-900 dark:to-surface-950 p-4">
      <div class="w-full max-w-lg">
        <!-- Logo and Title -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            NeoVerify
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Create your organization account
          </p>
        </div>

        <!-- Sign Up Form -->
        <p-card class="shadow-lg">
          <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Organization Name -->
            <div class="field">
              <label for="organizationName" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Organization Name *
              </label>
              <input
                id="organizationName"
                type="text"
                pInputText
                formControlName="organizationName"
                placeholder="Enter your organization name"
                class="w-full"
                [class.ng-invalid]="isFieldInvalid('organizationName')"
              />
              @if (isFieldInvalid('organizationName')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(signupForm.get('organizationName'), 'Organization name') }}
                </small>
              }
            </div>

            <!-- Domain -->
            <div class="field">
              <label for="domain" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Organization Domain *
              </label>
              <input
                id="domain"
                type="text"
                pInputText
                formControlName="domain"
                placeholder="example.com"
                class="w-full"
                [class.ng-invalid]="isFieldInvalid('domain')"
              />
              <small class="text-surface-500 mt-1 block">
                This will be used for email verification and branding
              </small>
              @if (isFieldInvalid('domain')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(signupForm.get('domain'), 'Domain') }}
                </small>
              }
            </div>

            <!-- Admin Details Section -->
            <p-divider align="left">
              <span class="text-sm font-medium text-surface-600 dark:text-surface-400">
                Administrator Details
              </span>
            </p-divider>

            <!-- Admin Name -->
            <div class="field">
              <label for="adminName" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Full Name *
              </label>
              <input
                id="adminName"
                type="text"
                pInputText
                formControlName="adminName"
                placeholder="Enter your full name"
                class="w-full"
                [class.ng-invalid]="isFieldInvalid('adminName')"
              />
              @if (isFieldInvalid('adminName')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(signupForm.get('adminName'), 'Name') }}
                </small>
              }
            </div>

            <!-- Admin Email -->
            <div class="field">
              <label for="adminEmail" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Email Address *
              </label>
              <input
                id="adminEmail"
                type="email"
                pInputText
                formControlName="adminEmail"
                placeholder="admin@example.com"
                class="w-full"
                [class.ng-invalid]="isFieldInvalid('adminEmail')"
              />
              @if (isFieldInvalid('adminEmail')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(signupForm.get('adminEmail'), 'Email') }}
                </small>
              }
            </div>

            <!-- Password -->
            <div class="field">
              <label for="password" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Password *
              </label>
              <p-password
                id="password"
                formControlName="password"
                placeholder="Create a strong password"
                [toggleMask]="true"
                [feedback]="true"
                styleClass="w-full"
                inputStyleClass="w-full"
                [class.ng-invalid]="isFieldInvalid('password')"
              ></p-password>
              @if (isFieldInvalid('password')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(signupForm.get('password'), 'Password') }}
                </small>
              }
            </div>

            <!-- Confirm Password -->
            <div class="field">
              <label for="confirmPassword" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Confirm Password *
              </label>
              <p-password
                id="confirmPassword"
                formControlName="confirmPassword"
                placeholder="Confirm your password"
                [toggleMask]="true"
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full"
                [class.ng-invalid]="isFieldInvalid('confirmPassword')"
              ></p-password>
              @if (isFieldInvalid('confirmPassword')) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(signupForm.get('confirmPassword'), 'Confirm password') }}
                </small>
              }
            </div>

            <!-- Terms and Conditions -->
            <div class="field">
              <div class="flex items-start">
                <p-checkbox
                  formControlName="acceptTerms"
                  inputId="acceptTerms"
                  [binary]="true"
                  class="mr-2"
                ></p-checkbox>
                <label for="acceptTerms" class="text-sm text-surface-600 dark:text-surface-400">
                  I agree to the 
                  <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400">
                    Terms of Service
                  </a> 
                  and 
                  <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400">
                    Privacy Policy
                  </a>
                </label>
              </div>
              @if (isFieldInvalid('acceptTerms')) {
                <small class="p-error block mt-1">
                  You must accept the terms and conditions
                </small>
              }
            </div>

            <!-- reCAPTCHA Placeholder -->
            <div class="field">
              <div class="bg-surface-100 dark:bg-surface-700 p-4 rounded border-2 border-dashed border-surface-300 dark:border-surface-600 text-center">
                <i class="pi pi-shield text-2xl text-surface-400 mb-2"></i>
                <p class="text-sm text-surface-500">reCAPTCHA verification will be here</p>
              </div>
            </div>

            <!-- Submit Button -->
            <p-button
              type="submit"
              label="Create Account"
              icon="pi pi-user-plus"
              [loading]="loading()"
              [disabled]="signupForm.invalid"
              styleClass="w-full"
            ></p-button>

            <!-- Divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-surface-200 dark:border-surface-700"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white dark:bg-surface-800 text-surface-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <!-- Sign In Link -->
            <p-button
              label="Sign In"
              icon="pi pi-sign-in"
              [outlined]="true"
              styleClass="w-full"
              (onClick)="navigateToLogin()"
            ></p-button>
          </form>
        </p-card>

        <!-- Footer -->
        <div class="text-center mt-8 text-sm text-surface-500">
          <p>&copy; 2025 NeoVerify. All rights reserved.</p>
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
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = this.authService.loading;

  readonly signupForm = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    domain: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)]],
    adminName: ['', [Validators.required, Validators.minLength(2)]],
    adminEmail: ['', [Validators.required, FormValidators.email()]],
    password: ['', [Validators.required, FormValidators.strongPassword()]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]]
  }, {
    validators: [FormValidators.matchFields('password', 'confirmPassword')]
  });

  onSubmit(): void {
    if (this.signupForm.valid) {
      const formValue = this.signupForm.value;
      
      this.authService.signUp({
        organizationName: formValue.organizationName!,
        domain: formValue.domain!,
        adminName: formValue.adminName!,
        adminEmail: formValue.adminEmail!,
        password: formValue.password!,
        confirmPassword: formValue.confirmPassword!,
        recaptchaToken: 'mock-recaptcha-token' // TODO: Implement real reCAPTCHA
      }).subscribe({
        next: () => {
          this.router.navigate(['/auth/login'], {
            queryParams: { message: 'account-created' }
          });
        },
        error: (error) => {
          console.error('Sign up failed:', error);
        }
      });
    } else {
      FormUtils.markFormGroupTouched(this.signupForm);
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }
}