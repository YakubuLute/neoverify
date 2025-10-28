import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

export interface FormState {
    [key: string]: any;
}

@Injectable({
    providedIn: 'root'
})
export class FormPersistenceService {
    private readonly storageKey = 'neoverify_form_state';
    private formStates = new Map<string, FormState>();

    /**
     * Save form state to memory and optionally to localStorage
     */
    saveFormState(formId: string, formGroup: FormGroup, persistent = false): void {
        const formState = formGroup.value;
        this.formStates.set(formId, formState);

        if (persistent) {
            try {
                const allStates = this.getAllStatesFromStorage();
                allStates[formId] = formState;
                localStorage.setItem(this.storageKey, JSON.stringify(allStates));
            } catch (error) {
                console.warn('Failed to save form state to localStorage:', error);
            }
        }
    }

    /**
     * Restore form state from memory or localStorage
     */
    restoreFormState(formId: string, formGroup: FormGroup): boolean {
        // First try to get from memory
        let formState = this.formStates.get(formId);

        // If not in memory, try localStorage
        if (!formState) {
            try {
                const allStates = this.getAllStatesFromStorage();
                formState = allStates[formId];
            } catch (error) {
                console.warn('Failed to restore form state from localStorage:', error);
                return false;
            }
        }

        if (formState) {
            formGroup.patchValue(formState);
            return true;
        }

        return false;
    }

    /**
     * Clear form state from memory and localStorage
     */
    clearFormState(formId: string): void {
        this.formStates.delete(formId);

        try {
            const allStates = this.getAllStatesFromStorage();
            delete allStates[formId];
            localStorage.setItem(this.storageKey, JSON.stringify(allStates));
        } catch (error) {
            console.warn('Failed to clear form state from localStorage:', error);
        }
    }

    /**
     * Check if form state exists
     */
    hasFormState(formId: string): boolean {
        if (this.formStates.has(formId)) {
            return true;
        }

        try {
            const allStates = this.getAllStatesFromStorage();
            return formId in allStates;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clear all form states
     */
    clearAllFormStates(): void {
        this.formStates.clear();
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Failed to clear all form states from localStorage:', error);
        }
    }

    private getAllStatesFromStorage(): { [key: string]: FormState } {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : {};
    }
}