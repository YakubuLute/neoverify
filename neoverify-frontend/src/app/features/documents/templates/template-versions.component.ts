import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared';
import { TemplateService } from '../../../core/services/template.service';
import { AuthService } from '../../../core/services/auth.service';
import {
    DocumentTemplate,
    TemplateVersion,
    TemplateField,
    ValidationRule
} from '../../../shared/models/document.models';
import { UserRole } from '../../../shared/models/auth.models';

interface VersionComparison {
    version1: TemplateVersion;
    version2: TemplateVersion;
    fieldChanges: FieldChange[];
    ruleChanges: RuleChange[];
}

interface FieldChange {
    type: 'added' | 'removed' | 'modified';
    fieldName: string;
    oldField?: TemplateField;
    newField?: TemplateField;
    changes?: string[];
}

interface RuleChange {
    type: 'added' | 'removed' | 'modified';
    ruleName: string;
    oldRule?: ValidationRule;
    newRule?: ValidationRule;
    changes?: string[];
}

@Component({
    selector: 'app-template-versions',
    standalone: true,
    imports: [SHARED_IMPORTS],
    templateUrl: './template-versions.component.html',
    styleUrl: './template-versions.component.scss'
})
export class TemplateVersionsComponent implements OnInit, OnDestroy {
    private readonly templateService = inject(TemplateService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroy$ = new Subject<void>();

    // State signals
    readonly template = signal<DocumentTemplate | null>(null);
    readonly versions = signal<TemplateVersion[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly templateId = signal<string | null>(null);

    // Version management
    readonly selectedVersions = signal<TemplateVersion[]>([]);
    readonly showComparison = signal(false);
    readonly versionComparison = signal<VersionComparison | null>(null);
    readonly showCreateVersionDialog = signal(false);
    readonly showRollbackDialog = signal(false);
    readonly rollbackVersion = signal<TemplateVersion | null>(null);

    // Create version form
    readonly newVersionChanges = signal('');
    readonly creatingVersion = signal(false);

    // User permissions
    readonly currentUser = computed(() => this.authService.getCurrentUser());
    readonly userRole = computed(() => this.currentUser()?.role);
    readonly canManageVersions = computed(() => {
        const role = this.userRole();
        return role === UserRole.PLATFORM_ADMIN ||
            role === UserRole.ORG_ADMIN ||
            role === UserRole.ISSUER;
    });

    // Computed properties
    readonly activeVersion = computed(() =>
        this.versions().find(version => version.isActive)
    );

    readonly sortedVersions = computed(() =>
        [...this.versions()].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    );

    readonly canCompareVersions = computed(() =>
        this.selectedVersions().length === 2
    );

    readonly canRollback = computed(() =>
        this.selectedVersions().length === 1 &&
        !this.selectedVersions()[0].isActive &&
        this.canManageVersions()
    );

    // Enum references for template
    readonly UserRole = UserRole;

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.templateId.set(params['id']);
                this.loadTemplate(params['id']);
                this.loadVersions(params['id']);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private async loadTemplate(templateId: string): Promise<void> {
        try {
            // For development, use mock data
            const mockTemplate = this.getMockTemplate(templateId);
            this.template.set(mockTemplate);

            // TODO: Replace with actual API call
            // const template = await this.templateService.getTemplate(templateId).toPromise();
            // if (template) {
            //     this.template.set(template);
            // }
        } catch (error) {
            console.error('Failed to load template:', error);
            this.error.set('Failed to load template. Please try again.');
        }
    }

    private async loadVersions(templateId: string): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            // For development, use mock data
            const mockVersions = this.getMockVersions(templateId);

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            this.versions.set(mockVersions);

            // TODO: Replace with actual API call
            // const versions = await this.templateService.getTemplateVersions(templateId).toPromise();
            // if (versions) {
            //     this.versions.set(versions);
            // }
        } catch (error) {
            console.error('Failed to load template versions:', error);
            this.error.set('Failed to load template versions. Please try again.');
        } finally {
            this.loading.set(false);
        }
    }

    onVersionSelect(version: TemplateVersion, selected: boolean): void {
        const current = this.selectedVersions();
        if (selected) {
            if (current.length < 2) {
                this.selectedVersions.set([...current, version]);
            }
        } else {
            this.selectedVersions.set(current.filter(v => v.id !== version.id));
        }
    }

    onCompareVersions(): void {
        const selected = this.selectedVersions();
        if (selected.length === 2) {
            const comparison = this.generateVersionComparison(selected[0], selected[1]);
            this.versionComparison.set(comparison);
            this.showComparison.set(true);
        }
    }

    onRollbackToVersion(version: TemplateVersion): void {
        this.rollbackVersion.set(version);
        this.showRollbackDialog.set(true);
    }

    onConfirmRollback(): void {
        const version = this.rollbackVersion();
        const templateId = this.templateId();

        if (version && templateId && this.canManageVersions()) {
            this.templateService.activateTemplateVersion(templateId, version.id).subscribe({
                next: () => {
                    this.loadVersions(templateId);
                    this.showRollbackDialog.set(false);
                    this.rollbackVersion.set(null);
                    this.selectedVersions.set([]);
                },
                error: (error) => {
                    console.error('Failed to rollback to version:', error);
                }
            });
        }
    }

    onCreateNewVersion(): void {
        this.newVersionChanges.set('');
        this.showCreateVersionDialog.set(true);
    }

    onSaveNewVersion(): void {
        const changes = this.newVersionChanges().trim();
        const templateId = this.templateId();

        if (changes && templateId && this.canManageVersions()) {
            this.creatingVersion.set(true);

            this.templateService.createTemplateVersion(templateId, changes).subscribe({
                next: () => {
                    this.loadVersions(templateId);
                    this.showCreateVersionDialog.set(false);
                    this.newVersionChanges.set('');
                },
                error: (error) => {
                    console.error('Failed to create new version:', error);
                },
                complete: () => {
                    this.creatingVersion.set(false);
                }
            });
        }
    }

    onViewVersion(version: TemplateVersion): void {
        // Navigate to template builder in view mode for this version
        this.router.navigate(['/documents/templates', this.templateId(), 'versions', version.id]);
    }

    onEditTemplate(): void {
        this.router.navigate(['/documents/templates', this.templateId(), 'edit']);
    }

    onBackToTemplates(): void {
        this.router.navigate(['/documents/templates']);
    }

    private generateVersionComparison(version1: TemplateVersion, version2: TemplateVersion): VersionComparison {
        // For development, generate mock comparison data
        const fieldChanges: FieldChange[] = [
            {
                type: 'added',
                fieldName: 'newField',
                newField: {
                    id: 'new1',
                    name: 'newField',
                    type: 'text' as any,
                    required: false,
                    position: { x: 100, y: 300 }
                }
            },
            {
                type: 'modified',
                fieldName: 'existingField',
                oldField: {
                    id: 'existing1',
                    name: 'existingField',
                    type: 'text' as any,
                    required: false,
                    position: { x: 100, y: 200 }
                },
                newField: {
                    id: 'existing1',
                    name: 'existingField',
                    type: 'text' as any,
                    required: true,
                    position: { x: 100, y: 200 }
                },
                changes: ['Required property changed from false to true']
            }
        ];

        const ruleChanges: RuleChange[] = [
            {
                type: 'added',
                ruleName: 'Email validation',
                newRule: {
                    id: 'rule1',
                    fieldId: 'field1',
                    type: 'pattern' as any,
                    value: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
                    message: 'Please enter a valid email address'
                }
            }
        ];

        return {
            version1,
            version2,
            fieldChanges,
            ruleChanges
        };

        // TODO: Implement actual comparison logic
        // const template1 = await this.getTemplateForVersion(version1);
        // const template2 = await this.getTemplateForVersion(version2);
        // return this.compareTemplates(template1, template2);
    }

    formatDate(date: Date): string {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    isVersionSelected(version: TemplateVersion): boolean {
        return this.selectedVersions().some(v => v.id === version.id);
    }

    getVersionStatusSeverity(version: TemplateVersion): string {
        return version.isActive ? 'success' : 'secondary';
    }

    getChangeTypeSeverity(changeType: 'added' | 'removed' | 'modified'): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
        switch (changeType) {
            case 'added': return 'success';
            case 'removed': return 'danger';
            case 'modified': return 'warn';
            default: return 'info';
        }
    }

    getChangeTypeIcon(changeType: 'added' | 'removed' | 'modified'): string {
        switch (changeType) {
            case 'added': return 'pi pi-plus';
            case 'removed': return 'pi pi-minus';
            case 'modified': return 'pi pi-pencil';
            default: return 'pi pi-info';
        }
    }

    // Mock data for development
    private getMockTemplate(templateId: string): DocumentTemplate {
        return {
            id: templateId,
            name: 'University Degree Certificate',
            description: 'Standard template for university degree certificates',
            category: 'Education',
            version: '2.1.0',
            isActive: true,
            fields: [],
            validationRules: [],
            previewUrl: '/api/templates/preview',
            createdBy: 'admin@university.edu',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-20'),
            usageCount: 45,
            organizationId: 'org123'
        };
    }

    private getMockVersions(templateId: string): TemplateVersion[] {
        return [
            {
                id: 'v1',
                templateId,
                version: '2.1.0',
                changes: 'Added email validation for contact field and improved layout positioning',
                createdBy: 'admin@university.edu',
                createdAt: new Date('2024-01-20'),
                isActive: true
            },
            {
                id: 'v2',
                templateId,
                version: '2.0.0',
                changes: 'Major redesign with new field types and validation system',
                createdBy: 'admin@university.edu',
                createdAt: new Date('2024-01-15'),
                isActive: false
            },
            {
                id: 'v3',
                templateId,
                version: '1.2.0',
                changes: 'Added graduation date field and updated styling',
                createdBy: 'designer@university.edu',
                createdAt: new Date('2024-01-10'),
                isActive: false
            },
            {
                id: 'v4',
                templateId,
                version: '1.1.0',
                changes: 'Fixed validation rules for student ID field',
                createdBy: 'admin@university.edu',
                createdAt: new Date('2024-01-05'),
                isActive: false
            },
            {
                id: 'v5',
                templateId,
                version: '1.0.0',
                changes: 'Initial template version with basic fields',
                createdBy: 'admin@university.edu',
                createdAt: new Date('2024-01-01'),
                isActive: false
            }
        ];
    }
}