import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom form validators
 */
export class FormValidators {
  
  /**
   * Email validator with better regex
   */
  static email(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const valid = emailRegex.test(control.value);
      
      return valid ? null : { email: { value: control.value } };
    };
  }

  /**
   * Strong password validator
   */
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const hasNumber = /[0-9]/.test(control.value);
      const hasUpper = /[A-Z]/.test(control.value);
      const hasLower = /[a-z]/.test(control.value);
      const hasSpecial = /[#?!@$%^&*-]/.test(control.value);
      const isLengthValid = control.value.length >= 8;

      const passwordValid = hasNumber && hasUpper && hasLower && hasSpecial && isLengthValid;

      return passwordValid ? null : {
        strongPassword: {
          hasNumber,
          hasUpper,
          hasLower,
          hasSpecial,
          isLengthValid
        }
      };
    };
  }

  /**
   * Match fields validator (for password confirmation)
   */
  static matchFields(fieldName: string, matchFieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const field = control.get(fieldName);
      const matchField = control.get(matchFieldName);

      if (!field || !matchField) {
        return null;
      }

      if (field.value !== matchField.value) {
        matchField.setErrors({ matchFields: true });
        return { matchFields: true };
      } else {
        const errors = matchField.errors;
        if (errors) {
          delete errors['matchFields'];
          matchField.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      }
    };
  }

  /**
   * Phone number validator
   */
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const valid = phoneRegex.test(control.value.replace(/\s/g, ''));

      return valid ? null : { phoneNumber: { value: control.value } };
    };
  }
}

/**
 * Form utility functions
 */
export class FormUtils {
  
  /**
   * Mark all fields as touched to show validation errors
   */
  static markFormGroupTouched(formGroup: AbstractControl): void {
    const controls = (formGroup as any).controls;
    if (controls) {
      Object.keys(controls).forEach(field => {
        const control = formGroup.get(field);
        control?.markAsTouched({ onlySelf: true });

        if (control && 'controls' in control) {
          this.markFormGroupTouched(control);
        }
      });
    }
  }

  /**
   * Get error message for a form control
   */
  static getErrorMessage(control: AbstractControl | null, fieldName: string): string {
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return `${fieldName} is required`;
    }

    if (errors['email']) {
      return 'Please enter a valid email address';
    }

    if (errors['minlength']) {
      return `${fieldName} must be at least ${errors['minlength'].requiredLength} characters`;
    }

    if (errors['maxlength']) {
      return `${fieldName} cannot exceed ${errors['maxlength'].requiredLength} characters`;
    }

    if (errors['strongPassword']) {
      const requirements = [];
      if (!errors['strongPassword'].hasNumber) requirements.push('a number');
      if (!errors['strongPassword'].hasUpper) requirements.push('an uppercase letter');
      if (!errors['strongPassword'].hasLower) requirements.push('a lowercase letter');
      if (!errors['strongPassword'].hasSpecial) requirements.push('a special character');
      if (!errors['strongPassword'].isLengthValid) requirements.push('at least 8 characters');
      
      return `Password must contain ${requirements.join(', ')}`;
    }

    if (errors['matchFields']) {
      return 'Passwords do not match';
    }

    if (errors['phoneNumber']) {
      return 'Please enter a valid phone number';
    }

    return 'Invalid input';
  }
}