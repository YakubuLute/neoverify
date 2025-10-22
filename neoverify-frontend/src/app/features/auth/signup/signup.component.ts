import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SHARED_IMPORTS, FormUtils } from '../../../shared';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-lg w-full">
        <!-- Logo and Header -->
        <div class="text-center mb-8">
          <div class="mx-auto h-20 w-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <i class="pi pi-building text-white text-3xl"></i>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">
            Join NeoVerify
          </h2>
          <p class="text-gray-600 text-lg">
            Create your organization account and start verifying documents securely
          </p>
        </div>

        <!-- Signup Form Card -->
        <div class="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Organization Name -->
            <div class="space-y-2">
              <label for="organizationName" class="block text-sm font-semibold text-gray-700">
                Organization Name
              </label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i class="pi pi-building text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                </div>
                <input
                  id="organizationName"
                  type="text"
                  pInputText
                  formControlName="organizationName"
                  placeholder="Enter your organization name"
                  class="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                  [class.border-red-300]="isFieldInvalid('organizationName')"
                />
              </div>
              @if (isFieldInvalid('organizationName')) {
                <p class="text-red-500 text-sm mt-1 flex items-center">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  {{ getErrorMessage(signupForm.get('organizationName'), 'Organization name') }}
                </p>
              }
            </div>

            <!-- Domain -->
            <div class="space-y-2">
              <label for="domain" class="block text-sm font-semibold text-gray-700">
                Organization Domain
              </label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i class="pi pi-globe text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                </div>
                <input
                  id="domain"
                  type="text"
                  pInputText
                  formControlName="domain"
                  placeholder="example.com"
                  class="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                  [class.border-red-300]="isFieldInvalid('domain')"
                />
              </div>
              @if (isFieldInvalid('domain')) {
                <p class="text-red-500 text-sm mt-1 flex items-center">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  {{ getErrorMessage(signupForm.get('domain'), 'Domain') }}
                </p>
              }
              <p class="text-xs text-gray-500 mt-1">
                This will be used for user email validation and organization identification
              </p>
            </div>

            <!-- Admin Details Section -->
            <div class="bg-gray-50 rounded-2xl p-6 space-y-4">
              <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                <i class="pi pi-user-edit mr-2 text-purple-600"></i>
                Administrator Details
              </h3>

              <!-- Admin Name -->
              <div class="space-y-2">
                <label for="adminName" class="block text-sm font-semibold text-gray-700">
                  Full Name
                </label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i class="pi pi-user text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                  </div>
                  <input
                    id="adminName"
                    type="text"
                    pInputText
                    formControlName="adminName"
                    placeholder="Enter your full name"
                    class="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    [class.border-red-300]="isFieldInvalid('adminName')"
                  />
                </div>
                @if (isFieldInvalid('adminName')) {
                  <p class="text-red-500 text-sm mt-1 flex items-center">
                    <i class="pi pi-exclamation-circle mr-1"></i>
                    {{ getErrorMessage(signupForm.get('adminName'), 'Admin name') }}
                  </p>
                }
              </div>

              <!-- Admin Email -->
              <div class="space-y-2">
                <label for="adminEmail" class="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i class="pi pi-envelope text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                  </div>
                  <input
                    id="adminEmail"
                    type="email"
                    pInputText
                    formControlName="adminEmail"
                    placeholder="admin@example.com"
                    class="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    [class.border-red-300]="isFieldInvalid('adminEmail')"
                  />
                </div>
                @if (isFieldInvalid('adminEmail')) {
                  <p class="text-red-500 text-sm mt-1 flex items-center">
                    <i class="pi pi-exclamation-circle mr-1"></i>
                    {{ getErrorMessage(signupForm.get('adminEmail'), 'Admin email') }}
                  </p>
                }
              </div>
            </div>

            <!-- Password Section -->
            <div class="space-y-4">
              <!-- Password -->
              <div class="space-y-2">
                <label for="password" class="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <i class="pi pi-lock text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                  </div>
                  <p-password
                    id="password"
                    formControlName="password"
                    placeholder="Create a strong password"
                    [toggleMask]="true"
                    [feedback]="true"
                    styleClass="w-full"
                    inputStyleClass="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    [class.ng-invalid]="isFieldInvalid('password')"
                  ></p-password>
                </div>
                @if (isFieldInvalid('password')) {
                  <p class="text-red-500 text-sm mt-1 flex items-center">
                    <i class="pi pi-exclamation-circle mr-1"></i>
                    {{ getErrorMessage(signupForm.get('password'), 'Password') }}
                  </p>
                }
              </div>

              <!-- Confirm Password -->
              <div class="space-y-2">
                <label for="confirmPassword" class="block text-sm font-semibold text-gray-700">
                  Confirm Password
                </label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <i class="pi pi-lock text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                  </div>
                  <p-password
                    id="confirmPassword"
                    formControlName="confirmPassword"
                    placeholder="Confirm your password"
                    [toggleMask]="true"
                    [feedback]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    [class.ng-invalid]="isFieldInvalid('confirmPassword')"
                  ></p-password>
                </div>
                @if (isFieldInvalid('confirmPassword')) {
                  <p class="text-red-500 text-sm mt-1 flex items-center">
                    <i class="pi pi-exclamation-circle mr-1"></i>
                    {{ getErrorMessage(signupForm.get('confirmPassword'), 'Confirm password') }}
                  </p>
                }
              </div>
            </div>

            <!-- Terms and Conditions -->
            <div class="flex items-start space-x-3">
              <p-checkbox
                formControlName="acceptTerms"
                inputId="acceptTerms"
                [binary]="true"
                class="mt-1"
              ></p-checkbox>
              <label for="acceptTerms" class="text-sm text-gray-600 leading-relaxed">
                I agree to the 
                <a href="#" class="text-purple-600 hover:text-purple-800 font-medium">Terms of Service</a> 
                and 
                <a href="#" class="text-purple-600 hover:text-purple-800 font-medium">Privacy Policy</a>
              </label>
            </div>
            @if (isFieldInvalid('acceptTerms')) {
              <p class="text-red-500 text-sm flex items-center">
                <i class="pi pi-exclamation-circle mr-1"></i>
                You must accept the terms and conditions
              </p>
            }

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="signupForm.invalid || loading()"
              class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
            >
              @if (loading()) {
                <i class="pi pi-spin pi-spinner text-lg"></i>
                <span class="text-lg">Creating Account...</span>
              } @else {
                <i class="pi pi-user-plus text-lg"></i>
                <span class="text-lg">Create Organization Account</span>
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-8">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-white text-gray-500 font-medium">Already have an account?</span>
            </div>
          </div>

          <!-- Sign In Link -->
          <button
            type="button"
            routerLink="/auth/login"
            class="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center space-x-3"
          >
            <i class="pi pi-sign-in text-lg"></i>
            <span class="text-lg">Sign In Instead</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8">
          <p class="text-sm text-gray-500">
            By creating an account, you're joining a secure and trusted document verification platform
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal<boolean>(false);

  readonly signupForm = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    domain: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)]],
    adminName: ['', [Validators.required, Validators.minLength(2)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]]
  }, {
    validators: [this.passwordMatchValidator]
  });

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.signupForm.value;

    // Mock signup - replace with actual registration
    setTimeout(() => {
      console.log('Signup attempt:', formValue);
      this.loading.set(false);
      // Navigate to login or dashboard on successful signup
      this.router.navigate(['/auth/login']);
    }, 2000);
  }

  private passwordMatchValidator(form: any) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    if (control?.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    return FormUtils.getErrorMessage(control, fieldName);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }
}