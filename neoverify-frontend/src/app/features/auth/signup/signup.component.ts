import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FormPersistenceService } from '../../../core/services/form-persistence.service';
import { SHARED_IMPORTS, FormUtils } from '../../../shared';
import { Subject, takeUntil, debounceTime } from 'rxjs';

export type AccountType = 'individual' | 'organization';

export interface AccountTypeOption {
  type: AccountType;
  label: string;
  description: string;
  icon: string;
  steps: string[];
}

export interface SignupStep {
  id: number;
  label: string;
  completed: boolean;
  valid: boolean;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-2xl w-full">
        <!-- Logo and Header -->
        <div class="text-center mb-8">
          <div class="mx-auto h-20 w-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <i class="pi pi-users text-white text-3xl"></i>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">
            Join NeoVerify
          </h2>
          <p class="text-gray-600 text-lg">
            Choose your account type and get started with secure document verification
          </p>
        </div>

        <!-- Data Restored Message -->
        @if (showDataRestoredMessage()) {
          <div class="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
            <div class="flex-shrink-0">
              <i class="pi pi-info-circle text-blue-600 text-lg"></i>
            </div>
            <div class="flex-1">
              <p class="text-blue-800 text-sm font-medium">
                Your previous progress has been restored
              </p>
              <p class="text-blue-600 text-xs mt-1">
                We've saved your form data so you can continue where you left off
              </p>
            </div>
            <button
              type="button"
              class="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
              (click)="showDataRestoredMessage.set(false)"
            >
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>
        }

        <!-- Account Type Selector -->
        <div class="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <!-- Tab Navigation -->
          <div class="border-b border-gray-200 bg-gray-50">
            <nav class="flex" role="tablist">
              @for (option of accountTypeOptions; track option.type) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="selectedAccountType() === option.type"
                  [attr.aria-controls]="option.type + '-panel'"
                  class="flex-1 py-4 px-6 text-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
                  [class]="getTabClasses(option.type)"
                  (click)="selectAccountType(option.type)"
                >
                  <div class="flex flex-col items-center space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-center">
                    <i [class]="option.icon + ' text-xl'"></i>
                    <div class="text-left sm:text-center">
                      <div class="font-semibold">{{ option.label }}</div>
                      <div class="text-xs opacity-75 hidden sm:block">{{ option.description }}</div>
                    </div>
                  </div>
                </button>
              }
            </nav>
          </div>

          <!-- Step Progress Indicator -->
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                @for (step of currentSteps(); track step.id; let i = $index) {
                  <div class="flex items-center">
                    <div 
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200"
                      [class]="getStepClasses(step)"
                    >
                      @if (step.completed) {
                        <i class="pi pi-check text-xs"></i>
                      } @else {
                        {{ step.id }}
                      }
                    </div>
                    @if (i < currentSteps().length - 1) {
                      <div class="w-8 h-0.5 mx-2" [class]="step.completed ? 'bg-purple-500' : 'bg-gray-300'"></div>
                    }
                  </div>
                }
              </div>
              <div class="text-sm text-gray-600">
                Step {{ currentStep() }} of {{ currentSteps().length }}
              </div>
            </div>
            <div class="mt-2">
              <div class="text-sm font-medium text-gray-900">{{ getCurrentStepLabel() }}</div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  class="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  [style.width.%]="getProgressPercentage()"
                ></div>
              </div>
            </div>
          </div>

          <!-- Form Content -->
          <div class="p-8">
            <div 
              [id]="selectedAccountType() + '-panel'"
              role="tabpanel"
              [attr.aria-labelledby]="selectedAccountType() + '-tab'"
            >
              @if (selectedAccountType() === 'individual') {
                <!-- Individual Account Form -->
                <form [formGroup]="individualForm" (ngSubmit)="onSubmit()" class="space-y-6">
                  @if (currentStep() === 1) {
                    <!-- Personal Information Step -->
                    <div class="space-y-6">
                      <div class="text-center mb-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">Personal Information</h3>
                        <p class="text-gray-600">Tell us about yourself to get started</p>
                      </div>

                      <!-- Full Name -->
                      <div class="space-y-2">
                        <label for="individual-fullName" class="block text-sm font-semibold text-gray-700">
                          Full Name
                        </label>
                        <div class="relative group">
                          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i class="pi pi-user text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                          </div>
                          <input
                            id="individual-fullName"
                            type="text"
                            pInputText
                            formControlName="fullName"
                            placeholder="Enter your full name"
                            class="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            [class.border-red-300]="isIndividualFieldInvalid('fullName')"
                          />
                        </div>
                        @if (isIndividualFieldInvalid('fullName')) {
                          <p class="text-red-500 text-sm mt-1 flex items-center">
                            <i class="pi pi-exclamation-circle mr-1"></i>
                            {{ getErrorMessage(individualForm.get('fullName'), 'Full Name') }}
                          </p>
                        }
                      </div>

                      <!-- Email -->
                      <div class="space-y-2">
                        <label for="individual-email" class="block text-sm font-semibold text-gray-700">
                          Email Address
                        </label>
                        <div class="relative group">
                          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i class="pi pi-envelope text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                          </div>
                          <input
                            id="individual-email"
                            type="email"
                            pInputText
                            formControlName="email"
                            placeholder="Enter your email address"
                            class="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            [class.border-red-300]="isIndividualFieldInvalid('email')"
                          />
                        </div>
                        @if (isIndividualFieldInvalid('email')) {
                          <p class="text-red-500 text-sm mt-1 flex items-center">
                            <i class="pi pi-exclamation-circle mr-1"></i>
                            {{ getErrorMessage(individualForm.get('email'), 'Email') }}
                          </p>
                        }
                      </div>

                      <!-- Phone (Optional) -->
                      <div class="space-y-2">
                        <label for="individual-phone" class="block text-sm font-semibold text-gray-700">
                          Phone Number <span class="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <div class="relative group">
                          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i class="pi pi-phone text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                          </div>
                          <input
                            id="individual-phone"
                            type="tel"
                            pInputText
                            formControlName="phone"
                            placeholder="Enter your phone number"
                            class="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  }

                  @if (currentStep() === 2) {
                    <!-- Account Security Step -->
                    <div class="space-y-6">
                      <div class="text-center mb-6">
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">Account Security</h3>
                        <p class="text-gray-600">Create a secure password for your account</p>
                      </div>

                      <!-- Password -->
                      <div class="space-y-2">
                        <label for="individual-password" class="block text-sm font-semibold text-gray-700">
                          Password
                        </label>
                        <div class="relative group">
                          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                            <i class="pi pi-lock text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                          </div>
                          <p-password
                            id="individual-password"
                            formControlName="password"
                            placeholder="Create a strong password"
                            [toggleMask]="true"
                            [feedback]="true"
                            styleClass="w-full"
                            inputStyleClass="w-full pl-14 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            [class.ng-invalid]="isIndividualFieldInvalid('password')"
                          ></p-password>
                        </div>
                        @if (isIndividualFieldInvalid('password')) {
                          <p class="text-red-500 text-sm mt-1 flex items-center">
                            <i class="pi pi-exclamation-circle mr-1"></i>
                            {{ getErrorMessage(individualForm.get('password'), 'Password') }}
                          </p>
                        }
                      </div>

                      <!-- Confirm Password -->
                      <div class="space-y-2">
                        <label for="individual-confirmPassword" class="block text-sm font-semibold text-gray-700">
                          Confirm Password
                        </label>
                        <div class="relative group">
                          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                            <i class="pi pi-lock text-gray-400 group-focus-within:text-purple-500 transition-colors"></i>
                          </div>
                          <p-password
                            id="individual-confirmPassword"
                            formControlName="confirmPassword"
                            placeholder="Confirm your password"
                            [toggleMask]="true"
                            [feedback]="false"
                            styleClass="w-full"
                            inputStyleClass="w-full pl-14 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                            [class.ng-invalid]="isIndividualFieldInvalid('confirmPassword')"
                          ></p-password>
                        </div>
                        @if (isIndividualFieldInvalid('confirmPassword')) {
                          <p class="text-red-500 text-sm mt-1 flex items-center">
                            <i class="pi pi-exclamation-circle mr-1"></i>
                            {{ getErrorMessage(individualForm.get('confirmPassword'), 'Confirm Password') }}
                          </p>
                        }
                      </div>

                      <!-- Terms and Conditions -->
                      <div class="flex items-start space-x-3">
                        <p-checkbox
                          formControlName="acceptTerms"
                          inputId="individual-acceptTerms"
                          [binary]="true"
                          class="mt-1"
                        ></p-checkbox>
                        <label for="individual-acceptTerms" class="text-sm text-gray-600 leading-relaxed">
                          I agree to the 
                          <a href="#" class="text-purple-600 hover:text-purple-800 font-medium">Terms of Service</a> 
                          and 
                          <a href="#" class="text-purple-600 hover:text-purple-800 font-medium">Privacy Policy</a>
                        </label>
                      </div>
                      @if (isIndividualFieldInvalid('acceptTerms')) {
                        <p class="text-red-500 text-sm flex items-center">
                          <i class="pi pi-exclamation-circle mr-1"></i>
                          You must accept the terms and conditions
                        </p>
                      }
                    </div>
                  }
                </form>
              } @else {
                <!-- Organization Account Form - Placeholder for now -->
                <div class="text-center py-12">
                  <i class="pi pi-building text-6xl text-gray-300 mb-4 block"></i>
                  <h3 class="text-xl font-semibold text-gray-900 mb-2">Organization Account</h3>
                  <p class="text-gray-600">Organization signup form coming soon...</p>
                </div>
              }
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div class="flex justify-between items-center">
              <div class="flex space-x-3">
                <button
                  type="button"
                  [disabled]="currentStep() === 1"
                  class="px-6 py-3 text-gray-600 font-medium rounded-xl border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  (click)="previousStep()"
                >
                  <i class="pi pi-arrow-left mr-2"></i>
                  Previous
                </button>
                
                @if (formPersistence.hasSavedData()) {
                  <button
                    type="button"
                    class="px-4 py-3 text-gray-500 hover:text-red-600 font-medium rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 text-sm"
                    (click)="startOver()"
                    title="Clear saved data and start over"
                  >
                    <i class="pi pi-refresh mr-1"></i>
                    Start Over
                  </button>
                }
              </div>

              <div>
                @if (currentStep() < currentSteps().length) {
                  <button
                    type="button"
                    [disabled]="!canProceedToNextStep()"
                    class="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                    (click)="nextStep()"
                  >
                    Next
                    <i class="pi pi-arrow-right ml-2"></i>
                  </button>
                } @else {
                  <button
                    type="submit"
                    [disabled]="!canSubmitForm() || loading()"
                    class="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center"
                    (click)="onSubmit()"
                  >
                    @if (loading()) {
                      <i class="pi pi-spin pi-spinner mr-2"></i>
                      Creating Account...
                    } @else {
                      <i class="pi pi-check mr-2"></i>
                      Create Account
                    }
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Sign In Link -->
        <div class="text-center mt-8">
          <p class="text-gray-600">
            Already have an account?
            <a routerLink="/auth/login" class="text-purple-600 hover:text-purple-800 font-medium ml-1">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SignupComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly formPersistence = inject(FormPersistenceService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = signal<boolean>(false);
  readonly selectedAccountType = signal<AccountType>('individual');
  readonly currentStep = signal<number>(1);
  readonly showDataRestoredMessage = signal<boolean>(false);

  readonly accountTypeOptions: AccountTypeOption[] = [
    {
      type: 'individual',
      label: 'Individual',
      description: 'Personal account for individual use',
      icon: 'pi pi-user',
      steps: ['Personal Info', 'Security']
    },
    {
      type: 'organization',
      label: 'Organization',
      description: 'Business account for teams',
      icon: 'pi pi-building',
      steps: ['Organization Info', 'Admin Details', 'Security']
    }
  ];

  readonly individualForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]]
  }, {
    validators: [this.passwordMatchValidator]
  });

  readonly organizationForm = this.fb.group({
    // Contact Person Info (Step 1)
    contactFirstName: ['', [Validators.required, Validators.minLength(2)]],
    contactLastName: ['', [Validators.required, Validators.minLength(2)]],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', [Validators.required]],

    // Organization Details (Step 2)
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    organizationEmail: ['', [Validators.required, Validators.email]],
    organizationLocation: ['', [Validators.required]],

    // Security (Step 3)
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]]
  }, {
    validators: [this.passwordMatchValidator]
  });

  readonly currentSteps = computed(() => {
    const option = this.accountTypeOptions.find(opt => opt.type === this.selectedAccountType());
    return option?.steps.map((label, index) => ({
      id: index + 1,
      label,
      completed: index + 1 < this.currentStep(),
      valid: this.isStepValid(index + 1)
    })) || [];
  });

  ngOnInit(): void {
    this.loadSavedFormData();
    this.setupFormPersistence();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectAccountType(type: AccountType): void {
    this.selectedAccountType.set(type);
    this.currentStep.set(1);
    this.saveFormData();
  }

  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStep.update(step => step + 1);
      this.saveFormData();
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
      this.saveFormData();
    }
  }

  canProceedToNextStep(): boolean {
    return this.isStepValid(this.currentStep());
  }

  canSubmitForm(): boolean {
    const form = this.selectedAccountType() === 'individual' ? this.individualForm : this.organizationForm;
    return form.valid && this.currentStep() === this.currentSteps().length;
  }

  isStepValid(step: number): boolean {
    if (this.selectedAccountType() === 'individual') {
      switch (step) {
        case 1:
          return !!(this.individualForm.get('fullName')?.valid &&
            this.individualForm.get('email')?.valid);
        case 2:
          return !!(this.individualForm.get('password')?.valid &&
            this.individualForm.get('confirmPassword')?.valid &&
            this.individualForm.get('acceptTerms')?.valid);
        default:
          return false;
      }
    } else if (this.selectedAccountType() === 'organization') {
      switch (step) {
        case 1: // Contact Person Info
          return !!(this.organizationForm.get('contactFirstName')?.valid &&
            this.organizationForm.get('contactLastName')?.valid &&
            this.organizationForm.get('contactEmail')?.valid &&
            this.organizationForm.get('contactPhone')?.valid);
        case 2: // Organization Details
          return !!(this.organizationForm.get('organizationName')?.valid &&
            this.organizationForm.get('organizationEmail')?.valid &&
            this.organizationForm.get('organizationLocation')?.valid);
        case 3: // Security
          return !!(this.organizationForm.get('password')?.valid &&
            this.organizationForm.get('confirmPassword')?.valid &&
            this.organizationForm.get('acceptTerms')?.valid);
        default:
          return false;
      }
    }
    return false;
  }

  onSubmit(): void {
    if (!this.canSubmitForm()) {
      this.markFormGroupTouched();
      return;
    }

    this.loading.set(true);

    if (this.selectedAccountType() === 'individual') {
      const formValue = this.individualForm.value;

      // Mock individual signup - replace with actual registration
      setTimeout(() => {
        console.log('Individual signup:', formValue);
        this.loading.set(false);

        // Clear saved form data on successful submission
        this.clearSavedData();

        this.router.navigate(['/auth/login']);
      }, 2000);
    } else if (this.selectedAccountType() === 'organization') {
      const formValue = this.organizationForm.value;

      // Mock organization signup - replace with actual registration
      setTimeout(() => {
        console.log('Organization signup:', formValue);
        this.loading.set(false);

        // Clear saved form data on successful submission
        this.clearSavedData();

        this.router.navigate(['/auth/login']);
      }, 2000);
    }
  }

  getTabClasses(type: AccountType): string {
    const isActive = this.selectedAccountType() === type;
    return isActive
      ? 'text-purple-600 bg-white border-b-2 border-purple-500'
      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100';
  }

  getStepClasses(step: SignupStep): string {
    if (step.completed) {
      return 'bg-purple-500 text-white';
    } else if (step.id === this.currentStep()) {
      return 'bg-purple-100 text-purple-600 border-2 border-purple-500';
    } else {
      return 'bg-gray-200 text-gray-600';
    }
  }

  getCurrentStepLabel(): string {
    const steps = this.currentSteps();
    const current = steps.find(step => step.id === this.currentStep());
    return current?.label || '';
  }

  getProgressPercentage(): number {
    return (this.currentStep() / this.currentSteps().length) * 100;
  }

  isIndividualFieldInvalid(fieldName: string): boolean {
    const field = this.individualForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isOrganizationFieldInvalid(fieldName: string): boolean {
    const field = this.organizationForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    if (control?.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    return FormUtils.getErrorMessage(control, fieldName);
  }

  /**
   * Load saved form data from local storage on component initialization
   */
  private loadSavedFormData(): void {
    const savedData = this.formPersistence.getFormData();
    if (!savedData) {
      return;
    }

    // Show restoration message
    this.showDataRestoredMessage.set(true);

    // Hide message after 5 seconds
    setTimeout(() => {
      this.showDataRestoredMessage.set(false);
    }, 5000);

    // Restore account type and step
    this.selectedAccountType.set(savedData.accountType);
    this.currentStep.set(savedData.currentStep);

    // Restore individual form data
    if (savedData['individualForm'] && this.selectedAccountType() === 'individual') {
      const individualData = savedData['individualForm'];
      this.individualForm.patchValue({
        fullName: individualData.fullName || '',
        email: individualData.email || '',
        phone: individualData.phone || '',
        // Don't restore passwords for security
        acceptTerms: individualData.acceptTerms || false
      });
    }

    // Restore organization form data
    if (savedData['organizationForm'] && this.selectedAccountType() === 'organization') {
      const organizationData = savedData['organizationForm'];
      this.organizationForm.patchValue({
        contactFirstName: organizationData.contactFirstName || '',
        contactLastName: organizationData.contactLastName || '',
        contactEmail: organizationData.contactEmail || '',
        contactPhone: organizationData.contactPhone || '',
        organizationName: organizationData.organizationName || '',
        organizationEmail: organizationData.organizationEmail || '',
        organizationLocation: organizationData.organizationLocation || '',
        // Don't restore passwords for security
        acceptTerms: organizationData.acceptTerms || false
      });
    }
  }

  /**
   * Set up automatic form persistence on value changes
   */
  private setupFormPersistence(): void {
    // Save individual form changes
    this.individualForm.valueChanges
      .pipe(
        debounceTime(500), // Debounce to avoid excessive saves
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.selectedAccountType() === 'individual') {
          this.saveFormData();
        }
      });

    // Save organization form changes when implemented
    this.organizationForm.valueChanges
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.selectedAccountType() === 'organization') {
          this.saveFormData();
        }
      });
  }

  /**
   * Save current form data to local storage
   */
  private saveFormData(): void {
    const formData: Partial<any> = {
      accountType: this.selectedAccountType(),
      currentStep: this.currentStep()
    };

    if (this.selectedAccountType() === 'individual') {
      const individualValues = this.individualForm.value;
      formData['individualForm'] = {
        fullName: individualValues.fullName,
        email: individualValues.email,
        phone: individualValues.phone,
        // Don't save passwords for security
        acceptTerms: individualValues.acceptTerms
      };
    } else if (this.selectedAccountType() === 'organization') {
      const organizationValues = this.organizationForm.value;
      formData['organizationForm'] = {
        contactFirstName: organizationValues.contactFirstName,
        contactLastName: organizationValues.contactLastName,
        contactEmail: organizationValues.contactEmail,
        contactPhone: organizationValues.contactPhone,
        organizationName: organizationValues.organizationName,
        organizationEmail: organizationValues.organizationEmail,
        organizationLocation: organizationValues.organizationLocation,
        // Don't save passwords for security
        acceptTerms: organizationValues.acceptTerms
      };
    }

    this.formPersistence.saveFormData(formData);
  }

  /**
   * Clear saved form data (called on successful submission)
   */
  private clearSavedData(): void {
    this.formPersistence.clearFormData();
  }

  /**
   * Start over - clear all form data and reset to initial state
   */
  startOver(): void {
    // Clear saved data
    this.clearSavedData();

    // Reset form state
    this.selectedAccountType.set('individual');
    this.currentStep.set(1);
    this.showDataRestoredMessage.set(false);

    // Reset forms
    this.individualForm.reset({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    });

    this.organizationForm.reset({
      contactFirstName: '',
      contactLastName: '',
      contactEmail: '',
      contactPhone: '',
      organizationName: '',
      organizationEmail: '',
      organizationLocation: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    });
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

  private markFormGroupTouched(): void {
    const form = this.selectedAccountType() === 'individual' ? this.individualForm : this.organizationForm;
    Object.keys(form.controls).forEach(key => {
      const control = (form.controls as any)[key];
      control?.markAsTouched();
    });
  }
}