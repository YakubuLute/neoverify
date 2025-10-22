import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SHARED_IMPORTS, FormUtils } from '../../../shared';
import { FormValidators } from '../../../shared/utils/form.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-surface-900 dark:to-surface-950 p-4">
      <div class="w-full max-w-md">
        <!-- Logo and Title -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            NeoVerify
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Sign in to your account
          </p>
        </div>

        <!-- Login Form -->
        <p-card class="shadow-lg">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email Field -->
            <div class="field">
              <label for="email" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                pInputText
                formControlName="email"
                placeholder="Enter your email"
                class="w-full"
                [class.ng-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
              />
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(loginForm.get('email'), 'Email') }}
                </small>
              }
            </div>

            <!-- Password Field -->
            <div class="field">
              <label for="password" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">
                Password
              </label>
              <p-password
                id="password"
                formControlName="password"
                placeholder="Enter your password"
                [toggleMask]="true"
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full"
                [class.ng-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
              ></p-password>
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <small class="p-error block mt-1">
                  {{ getErrorMessage(loginForm.get('password'), 'Password') }}
                </small>
              }
            </div>

            <!-- Remember Me -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <p-checkbox
                  formControlName="rememberMe"
                  inputId="rememberMe"
                  [binary]="true"
                ></p-checkbox>
                <label for="rememberMe" class="ml-2 text-sm text-surface-600 dark:text-surface-400">
                  Remember me
                </label>
              </div>
              
              <a 
                href="#" 
                class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                (click)="$event.preventDefault(); forgotPassword()"
              >
                Forgot password?
              </a>
            </div>

            <!-- Submit Button -->
            <p-button
              type="submit"
              label="Sign In"
              icon="pi pi-sign-in"
              [loading]="loading()"
              [disabled]="loginForm.invalid"
              styleClass="w-full"
            ></p-button>

            <!-- Divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-surface-200 dark:border-surface-700"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white dark:bg-surface-800 text-surface-500">
                  Don't have an account?
                </span>
              </div>
            </div>

            <!-- Sign Up Link -->
            <p-button
              label="Create Account"
              icon="pi pi-user-plus"
              [outlined]="true"
              styleClass="w-full"
              (onClick)="navigateToSignUp()"
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
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = this.authService.loading;

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, FormValidators.email()]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      
      this.authService.login({
        email: email!,
        password: password!
      }).subscribe({
        next: (response) => {
          if (response.requiresMfa) {
            this.router.navigate(['/auth/mfa'], {
              state: { email, sessionToken: response.sessionToken }
            });
          }
        },
        error: (error) => {
          console.error('Login failed:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  navigateToSignUp(): void {
    this.router.navigate(['/auth/signup']);
  }

  forgotPassword(): void {
    // TODO: Implement forgot password functionality
    console.log('Forgot password clicked');
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}