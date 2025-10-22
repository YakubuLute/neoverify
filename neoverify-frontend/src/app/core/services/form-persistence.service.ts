import { Injectable } from '@angular/core';

export interface SignupFormData {
    accountType: 'individual' | 'organization';
    currentStep: number;
    individualForm?: {
        fullName?: string;
        email?: string;
        phone?: string;
        password?: string;
        confirmPassword?: string;
        acceptTerms?: boolean;
    };
    organizationForm?: {
        contactFirstName?: string;
        contactLastName?: string;
        contactEmail?: string;
        contactPhone?: string;
        organizationName?: string;
        organizationEmail?: string;
        organizationLocation?: string;
        password?: string;
        confirmPassword?: string;
        acceptTerms?: boolean;
    };
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class FormPersistenceService {
    private readonly STORAGE_KEY = 'neoverify_signup_form';
    private readonly EXPIRY_HOURS = 24; // Form data expires after 24 hours

    /**
     * Save form data to local storage
     */
    saveFormData(data: Partial<SignupFormData>): void {
        try {
            const existingData = this.getFormData();
            const updatedData: SignupFormData = {
                accountType: 'individual',
                currentStep: 1,
                timestamp: Date.now(),
                ...existingData,
                ...data
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
        } catch (error) {
            console.warn('Failed to save form data to localStorage:', error);
        }
    }

    /**
     * Retrieve form data from local storage
     */
    getFormData(): SignupFormData | null {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const data: SignupFormData = JSON.parse(stored);

            // Check if data has expired
            if (this.isDataExpired(data.timestamp)) {
                this.clearFormData();
                return null;
            }

            return data;
        } catch (error) {
            console.warn('Failed to retrieve form data from localStorage:', error);
            this.clearFormData();
            return null;
        }
    }

    /**
     * Clear form data from local storage
     */
    clearFormData(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to clear form data from localStorage:', error);
        }
    }

    /**
     * Check if stored data has expired
     */
    private isDataExpired(timestamp: number): boolean {
        const now = Date.now();
        const expiryTime = this.EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
        return (now - timestamp) > expiryTime;
    }

    /**
     * Check if there is any saved form data
     */
    hasSavedData(): boolean {
        const data = this.getFormData();
        return data !== null;
    }

    /**
     * Get the age of saved data in minutes
     */
    getSavedDataAge(): number | null {
        const data = this.getFormData();
        if (!data) {
            return null;
        }

        return Math.floor((Date.now() - data.timestamp) / (1000 * 60));
    }
}