/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
    DocumentTemplate,
    TemplateVersion,
    TemplateField,
    ValidationRule,
    SharePermissions
} from '../../shared/models/document.models';
import { QueryParams } from '../../shared/models/common.models';

@Injectable({
    providedIn: 'root'
})
export class TemplateService {
    private readonly http = inject(HttpClient);
    private readonly apiService = inject(ApiService);
    private readonly notificationService = inject(NotificationService);

    /**
     * Get all templates with pagination and filtering
     */
    getTemplates(params?: QueryParams): Observable<{data: DocumentTemplate[], total: number}> {
        return this.apiService.get<{data: DocumentTemplate[], total: number}>('templates', params as any).pipe(
            catchError(error => {
                this.notificationService.error('Failed to load templates');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get template by ID
     */
    getTemplate(templateId: string): Observable<DocumentTemplate> {
        return this.apiService.get<{data: DocumentTemplate}>(`templates/${templateId}`).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Template not found');
                return throwError(() => error);
            })
        );
    }

    /**
     * Create new template
     */
    createTemplate(template: Partial<DocumentTemplate>): Observable<DocumentTemplate> {
        return this.apiService.post<{data: DocumentTemplate }>('templates', template).pipe(
            map(response => response.data),
            tap(createdTemplate => {
                this.notificationService.success(`Template "${createdTemplate.name}" created successfully`);
            }),
            catchError(error => {
                this.notificationService.error('Failed to create template. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Update existing template
     */
    updateTemplate(templateId: string, updates: Partial<DocumentTemplate>): Observable<DocumentTemplate> {
        return this.apiService.put<{data: DocumentTemplate}>(`templates/${templateId}`, updates).pipe(
            map(response => response.data),
            tap(updatedTemplate => {
                this.notificationService.success(`Template "${updatedTemplate.name}" updated successfully`);
            }),
            catchError(error => {
                this.notificationService.error('Failed to update template. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Delete template
     */
    deleteTemplate(templateId: string): Observable<void> {
        return this.apiService.delete<void>(`templates/${templateId}`).pipe(

            tap(() => {
                this.notificationService.success('Template deleted successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to delete template. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Duplicate template
     */
    duplicateTemplate(templateId: string, name: string): Observable<DocumentTemplate> {
        return this.apiService.post<{data: DocumentTemplate}>(`templates/${templateId}/duplicate`, { name }).pipe(
            map(response => response.data),
            tap(duplicatedTemplate => {
                this.notificationService.success(`Template duplicated as "${duplicatedTemplate.name}"`);
            }),
            catchError(error => {
                this.notificationService.error('Failed to duplicate template. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get template versions
     */
    getTemplateVersions(templateId: string): Observable<TemplateVersion[]> {
        return this.apiService.get<{data: TemplateVersion[]}>(`templates/${templateId}/versions`).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load template versions');
                return throwError(() => error);
            })
        );
    }

    /**
     * Create new template version
     */
    createTemplateVersion(templateId: string, changes: string): Observable<TemplateVersion> {
        return this.apiService.post<{data: TemplateVersion}>(`templates/${templateId}/versions`, { changes }).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('New template version created successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to create template version. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Activate template version
     */
    activateTemplateVersion(templateId: string, versionId: string): Observable<DocumentTemplate> {
        return this.apiService.post<{data: DocumentTemplate}>(`templates/${templateId}/versions/${versionId}/activate`, {}).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Template version activated successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to activate template version. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Add field to template
     */
    addTemplateField(templateId: string, field: Omit<TemplateField, 'id'>): Observable<TemplateField> {
        return this.apiService.post<{data: TemplateField}>(`templates/${templateId}/fields`, field).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Field added to template successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to add field to template. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Update template field
     */
    updateTemplateField(templateId: string, fieldId: string, updates: Partial<TemplateField>): Observable<TemplateField> {
        return this.apiService.put<{data: TemplateField}>(`templates/${templateId}/fields/${fieldId}`, updates).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Template field updated successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to update template field. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Remove field from template
     */
    removeTemplateField(templateId: string, fieldId: string): Observable<void> {
        return this.apiService.delete<void>(`templates/${templateId}/fields/${fieldId}`).pipe(
            // map(response => response.data),
            tap(() => {
                this.notificationService.success('Field removed from template successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to remove field from template. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Add validation rule to template
     */
    addValidationRule(templateId: string, rule: Omit<ValidationRule, 'id'>): Observable<ValidationRule> {
        return this.apiService.post<{data: ValidationRule}>(`templates/${templateId}/validation-rules`, rule).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Validation rule added successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to add validation rule. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Update validation rule
     */
    updateValidationRule(templateId: string, ruleId: string, updates: Partial<ValidationRule>): Observable<ValidationRule> {
        return this.apiService.put<{data: ValidationRule}>(`templates/${templateId}/validation-rules/${ruleId}`, updates).pipe(
            map(response => response.data),
            tap(() => {
                this.notificationService.success('Validation rule updated successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to update validation rule. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Remove validation rule
     */
    removeValidationRule(templateId: string, ruleId: string): Observable<void> {
        return this.apiService.delete<void>(`templates/${templateId}/validation-rules/${ruleId}`).pipe(
            // map(response => response.data),
            tap(() => {
                this.notificationService.success('Validation rule removed successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to remove validation rule. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Share template with users
     */
    shareTemplate(templateId: string, userIds: string[], permissions: SharePermissions): Observable<void> {
        return this.apiService.post<void>(`templates/${templateId}/share`, { userIds, permissions }).pipe(
            // map(response => response.data),
            tap(() => {
                this.notificationService.success('Template shared successfully');
            }),
            catchError(error => {
                this.notificationService.error('Failed to share template. Please try again.');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get template usage statistics
     */
    getTemplateUsageStats(templateId: string): Observable<string[]> {
        return this.apiService.get<{data: string[]}>(`templates/${templateId}/usage-stats`).pipe(
            map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to load template usage statistics');
                return throwError(() => error);
            })
        );
    }

    /**
     * Validate template fields
     */
    validateTemplate(template: DocumentTemplate): Observable<{ isValid: boolean; errors: string[] }> {
        return this.apiService.post<{ isValid: boolean; errors: string[] }>('templates/validate', template).pipe(
            // map(response => response.data),
            catchError(error => {
                this.notificationService.error('Failed to validate template');
                return throwError(() => error);
            })
        );
    }

    /**
     * Export template
     */
    exportTemplate(templateId: string, format: 'json' | 'pdf'): Observable<Blob> {
        // Use HttpClient directly for blob responses
        return this.http.get(`${this.apiService.getBaseUrl()}/templates/${templateId}/export?format=${format}`, {
            responseType: 'blob'
        }).pipe(
            catchError(error => {
                this.notificationService.error('Failed to export template');
                return throwError(() => error);
            })
        );
    }

    /**
     * Import template
     */
    importTemplate(file: File): Observable<DocumentTemplate> {
        const formData = new FormData();
        formData.append('file', file);

        return this.apiService.post<{data:DocumentTemplate}>('templates/import', formData).pipe(
            map(response => response.data),
            tap(importedTemplate => {
                this.notificationService.success(`Template "${importedTemplate.name}" imported successfully`);
            }),
            catchError(error => {
                this.notificationService.error('Failed to import template. Please check the file format.');
                return throwError(() => error);
            })
        );
    }
}
