import { Injectable, inject } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { OrganizationService } from './organization.service';

@Injectable({
    providedIn: 'root'
})
export class PolicyValidationService {
    private readonly organizationService = inject(OrganizationService);

    /**
     * Create a validator that checks against organization policies
     */
    createPolicyValidator(settingPath: string): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }

            const validation = this.organizationService.validateSettingChange(settingPath, control.value);

            if (!validation.isValid) {
                return {
                    policyViolation: {
                        message: validation.reason,
                        policyId: validation.policyId,
                        settingPath
                    }
                };
            }

            return null;
        };
    }

    /**
     * Create an async validator for complex policy checks
     */
    createAsyncPolicyValidator(settingPath: string): (control: AbstractControl) => Observable<ValidationErrors | null> {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            if (!control.value) {
                return of(null);
            }

            // Simulate async policy validation (e.g., checking with server)
            return of(control.value).pipe(
                map(value => {
                    const validation = this.organizationService.validateSettingChange(settingPath, value);

                    if (!validation.isValid) {
                        return {
                            asyncPolicyViolation: {
                                message: validation.reason,
                                policyId: validation.policyId,
                                settingPath
                            }
                        };
                    }

                    return null;
                })
            );
        };
    }

    /**
     * Validate multiple settings at once
     */
    validateSettings(settings: Record<string, any>): Array<{ setting: string; error: string; policyId?: string }> {
        const errors: Array<{ setting: string; error: string; policyId?: string }> = [];

        for (const [settingPath, value] of Object.entries(settings)) {
            const validation = this.organizationService.validateSettingChange(settingPath, value);

            if (!validation.isValid) {
                errors.push({
                    setting: settingPath,
                    error: validation.reason || 'Policy violation',
                    policyId: validation.policyId
                });
            }
        }

        return errors;
    }

    /**
     * Get effective form values considering organization policies
     */
    getEffectiveFormValues(formValues: Record<string, any>): Record<string, any> {
        const effectiveValues: Record<string, any> = {};

        for (const [settingPath, value] of Object.entries(formValues)) {
            effectiveValues[settingPath] = this.organizationService.getEffectiveSettingValue(settingPath, value);
        }

        return effectiveValues;
    }

    /**
     * Check if a form control should be disabled due to policy restrictions
     */
    isControlDisabled(settingPath: string): boolean {
        return this.organizationService.isSettingRestricted(settingPath);
    }

    /**
     * Get restriction message for a setting
     */
    getRestrictionMessage(settingPath: string): string | null {
        const restriction = this.organizationService.getSettingRestriction(settingPath);
        return restriction?.reason || null;
    }

    /**
     * Validate form group against all organization policies
     */
    validateFormGroup(formGroup: AbstractControl): ValidationErrors | null {
        const formValue = formGroup.value;
        const violations = this.organizationService.getPolicyViolations(formValue);

        if (violations.length > 0) {
            return {
                policyViolations: violations.map(v => ({
                    setting: v.setting,
                    message: v.violation,
                    policyId: v.policyId,
                    policyName: v.policyName
                }))
            };
        }

        return null;
    }

    /**
     * Create a custom error message for policy violations
     */
    getPolicyErrorMessage(error: any): string {
        if (error.policyViolation) {
            return error.policyViolation.message;
        }

        if (error.asyncPolicyViolation) {
            return error.asyncPolicyViolation.message;
        }

        if (error.policyViolations && error.policyViolations.length > 0) {
            return error.policyViolations[0].message;
        }

        return 'This setting violates organization policy';
    }

    /**
     * Check if user has permission to modify a setting
     */
    canModifySetting(settingPath: string): boolean {
        // This could be expanded to check specific permissions
        // For now, we just check if the setting is not restricted
        return !this.organizationService.isSettingRestricted(settingPath);
    }

    /**
     * Get policy-compliant default value for a setting
     */
    getPolicyCompliantDefault(settingPath: string, defaultValue: any): any {
        return this.organizationService.getEffectiveSettingValue(settingPath, defaultValue);
    }

    /**
     * Validate and sanitize settings before saving
     */
    sanitizeSettings(settings: Record<string, any>): {
        sanitized: Record<string, any>;
        warnings: Array<{ setting: string; message: string }>
    } {
        const sanitized: Record<string, any> = {};
        const warnings: Array<{ setting: string; message: string }> = [];

        for (const [settingPath, value] of Object.entries(settings)) {
            const effectiveValue = this.organizationService.getEffectiveSettingValue(settingPath, value);

            sanitized[settingPath] = effectiveValue;

            if (effectiveValue !== value) {
                warnings.push({
                    setting: settingPath,
                    message: `Value was adjusted to comply with organization policy`
                });
            }
        }

        return { sanitized, warnings };
    }
}