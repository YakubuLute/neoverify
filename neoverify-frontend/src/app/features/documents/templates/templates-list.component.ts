import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared';
import { TemplateService } from '../../../core/services/template.service';
import { AuthService } from '../../../core/services/auth.service';
import {
    DocumentTemplate,
    TemplateVersion
} from '../../../shared/models/document.models';
import { UserRole } from '../../../shared/models/auth.models';

interface TemplateFilters {
    category?: string[];
    isActive?: boolean;
    createdBy?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
}

interface TemplateUsageStats {
    totalUsage: number;
    recentUsage: number;
    averageUsage: number;
    trendDirection: 'up' | 'down' | 'stable';
}

@Component({
    selector: 'app-templates-list',
    standalone: true,
    imports: [SHARED_IMPORTS],
    templateUrl: './templates-list.component.html',
    styleUrl: './templates-list.component.scss'
})
export class TemplatesListComponent implements OnInit, OnDestroy {
    private readonly templateService = inject(TemplateService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly destroy$ = new Subject<void>();

    // State signals
    readonly templates = signal<DocumentTemplate[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly totalCount = signal(0);
    readonly currentPage = signal(1);
    readonly pageSize = signal(20);

    // Search and filter signals
    readonly searchQuery = signal('');
    readonly filters = signal<TemplateFilters>({});
    readonly selectedTemplates = signal<string[]>([]);
    readonly showFilters = signal(false);

    // View mode signals
    readonly viewMode = signal<'grid' | 'list'>('grid');
    readonly sortBy = signal<string>('updatedAt');
    readonly sortOrder = signal<'asc' | 'desc'>('desc');

    // Template management signals
    readonly showShareDialog = signal(false);
    readonly showVersionDialog = signal(false);
    readonly selectedTemplate = signal<DocumentTemplate | null>(null);
    readonly templateVersions = signal<TemplateVersion[]>([]);
    readonly templateUsageStats = signal<Map<string, TemplateUsageStats>>(new Map());

    // User permissions
    readonly currentUser = computed(() => this.authService.getCurrentUser());
    readonly userRole = computed(() => this.currentUser()?.role);
    readonly canCreateTemplate = computed(() => {
        const role = this.userRole();
        return role === UserRole.PLATFORM_ADMIN ||
            role === UserRole.ORG_ADMIN ||
            role === UserRole.ISSUER;
    });
    readonly canManageTemplates = computed(() => {
        const role = this.userRole();
        return role === UserRole.PLATFORM_ADMIN ||
            role === UserRole.ORG_ADMIN;
    });

    // Computed properties
    readonly filteredTemplates = computed(() => {
        let templates = this.templates();
        const query = this.searchQuery().toLowerCase();
        const currentFilters = this.filters();

        // Apply search
        if (query) {
            templates = templates.filter(template =>
                template.name.toLowerCase().includes(query) ||
                template.description.toLowerCase().includes(query) ||
                template.category.toLowerCase().includes(query)
            );
        }

        // Apply filters
        if (currentFilters.category?.length) {
            templates = templates.filter(template =>
                currentFilters.category!.includes(template.category)
            );
        }
        if (currentFilters.isActive !== undefined) {
            templates = templates.filter(template =>
                template.isActive === currentFilters.isActive
            );
        }
        if (currentFilters.createdBy?.length) {
            templates = templates.filter(template =>
                currentFilters.createdBy!.includes(template.createdBy)
            );
        }
        if (currentFilters.dateRange) {
            templates = templates.filter(template => {
                const createdDate = new Date(template.createdAt);
                return createdDate >= currentFilters.dateRange!.start &&
                    createdDate <= currentFilters.dateRange!.end;
            });
        }

        // Apply sorting
        const sortBy = this.sortBy();
        const sortOrder = this.sortOrder();
        templates.sort((a, b) => {
            let aValue: any = a[sortBy as keyof DocumentTemplate];
            let bValue: any = b[sortBy as keyof DocumentTemplate];

            if (aValue instanceof Date) aValue = aValue.getTime();
            if (bValue instanceof Date) bValue = bValue.getTime();

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return templates;
    });

    readonly hasSelection = computed(() => this.selectedTemplates().length > 0);
    readonly isAllSelected = computed(() => {
        const filtered = this.filteredTemplates();
        const selected = this.selectedTemplates();
        return filtered.length > 0 && filtered.every(template => selected.includes(template.id));
    });

    readonly availableCategories = computed(() => {
        const categories = new Set(this.templates().map(t => t.category));
        return Array.from(categories).sort();
    });

    readonly availableCreators = computed(() => {
        const creators = new Set(this.templates().map(t => t.createdBy));
        return Array.from(creators).sort();
    });

    // Enum references for template
    readonly UserRole = UserRole;

    ngOnInit(): void {
        this.loadTemplates();
        this.loadTemplateUsageStats();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async loadTemplates(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            // For development, use mock data
            const mockTemplates = this.getMockTemplates();

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            this.templates.set(mockTemplates);
            this.totalCount.set(mockTemplates.length);

            // TODO: Replace with actual API call
            // const params = {
            //   page: this.currentPage(),
            //   limit: this.pageSize(),
            //   sortBy: this.sortBy(),
            //   sortOrder: this.sortOrder(),
            //   ...this.filters()
            // };
            // const response = await this.templateService.getTemplates(params).toPromise();
            // if (response) {
            //   this.templates.set(response.items);
            //   this.totalCount.set(response.totalCount);
            // }
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.error.set('Failed to load templates. Please try again.');
            this.templates.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    async loadTemplateUsageStats(): Promise<void> {
        // Mock usage stats for development
        const mockStats = new Map<string, TemplateUsageStats>([
            ['1', { totalUsage: 45, recentUsage: 12, averageUsage: 15, trendDirection: 'up' }],
            ['2', { totalUsage: 23, recentUsage: 8, averageUsage: 7, trendDirection: 'up' }],
            ['3', { totalUsage: 67, recentUsage: 5, averageUsage: 22, trendDirection: 'down' }],
            ['4', { totalUsage: 12, recentUsage: 3, averageUsage: 4, trendDirection: 'stable' }]
        ]);

        this.templateUsageStats.set(mockStats);

        // TODO: Replace with actual API calls
        // const templates = this.templates();
        // for (const template of templates) {
        //   try {
        //     const stats = await this.templateService.getTemplateUsageStats(template.id).toPromise();
        //     if (stats) {
        //       this.templateUsageStats.update(map => new Map(map.set(template.id, stats)));
        //     }
        //   } catch (error) {
        //     console.error(`Failed to load usage stats for template ${template.id}:`, error);
        //   }
        // }
    }

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadTemplates();
    }

    onFilterChange(newFilters: TemplateFilters): void {
        this.filters.set(newFilters);
        this.currentPage.set(1);
        this.loadTemplates();
    }

    onCategoryFilterChange(categories: string[]): void {
        const currentFilters = this.filters();
        this.onFilterChange({ ...currentFilters, category: categories });
    }

    onStatusFilterChange(isActive: boolean | undefined): void {
        const currentFilters = this.filters();
        this.onFilterChange({ ...currentFilters, isActive });
    }

    onCreatedByFilterChange(createdBy: string[]): void {
        const currentFilters = this.filters();
        this.onFilterChange({ ...currentFilters, createdBy });
    }

    onDateRangeFilterChange(dateRange: Date[] | null): void {
        const currentFilters = this.filters();
        const newDateRange = dateRange && dateRange.length === 2
            ? { start: dateRange[0], end: dateRange[1] }
            : undefined;
        this.onFilterChange({ ...currentFilters, dateRange: newDateRange });
    }

    onSortChange(sortBy: string, sortOrder: 'asc' | 'desc'): void {
        this.sortBy.set(sortBy);
        this.sortOrder.set(sortOrder);
        this.loadTemplates();
    }

    onPageChange(page: number): void {
        this.currentPage.set(page);
        this.loadTemplates();
    }

    onTemplateSelect(templateId: string, selected: boolean): void {
        const current = this.selectedTemplates();
        if (selected) {
            this.selectedTemplates.set([...current, templateId]);
        } else {
            this.selectedTemplates.set(current.filter(id => id !== templateId));
        }
    }

    onSelectAll(): void {
        const filtered = this.filteredTemplates();
        if (this.isAllSelected()) {
            this.selectedTemplates.set([]);
        } else {
            this.selectedTemplates.set(filtered.map(template => template.id));
        }
    }

    onTemplateClick(template: DocumentTemplate): void {
        this.router.navigate(['/documents/templates', template.id]);
    }

    onCreateTemplate(): void {
        this.router.navigate(['/documents/templates/create']);
    }

    onEditTemplate(template: DocumentTemplate): void {
        this.router.navigate(['/documents/templates', template.id, 'edit']);
    }

    onDuplicateTemplate(template: DocumentTemplate): void {
        const newName = `${template.name} (Copy)`;
        this.templateService.duplicateTemplate(template.id, newName).subscribe({
            next: () => {
                this.loadTemplates();
            },
            error: (error) => {
                console.error('Failed to duplicate template:', error);
            }
        });
    }

    onDeleteTemplate(template: DocumentTemplate): void {
        if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
            this.templateService.deleteTemplate(template.id).subscribe({
                next: () => {
                    this.loadTemplates();
                },
                error: (error) => {
                    console.error('Failed to delete template:', error);
                }
            });
        }
    }

    onShareTemplate(template: DocumentTemplate): void {
        this.selectedTemplate.set(template);
        this.showShareDialog.set(true);
    }

    onViewVersions(template: DocumentTemplate): void {
        this.router.navigate(['/documents/templates', template.id, 'versions']);
    }

    onToggleTemplateStatus(template: DocumentTemplate): void {
        const updates = { isActive: !template.isActive };
        this.templateService.updateTemplate(template.id, updates).subscribe({
            next: () => {
                this.loadTemplates();
            },
            error: (error) => {
                console.error('Failed to update template status:', error);
            }
        });
    }

    onExportTemplate(template: DocumentTemplate, format: 'json' | 'pdf'): void {
        this.templateService.exportTemplate(template.id, format).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${template.name}.${format}`;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: (error) => {
                console.error('Export failed:', error);
            }
        });
    }

    onBulkAction(action: string, data?: any): void {
        const selectedIds = this.selectedTemplates();
        if (selectedIds.length === 0) return;

        switch (action) {
            case 'activate':
                this.bulkUpdateStatus(selectedIds, true);
                break;
            case 'deactivate':
                this.bulkUpdateStatus(selectedIds, false);
                break;
            case 'delete':
                this.bulkDelete(selectedIds);
                break;
            case 'export':
                this.bulkExport(selectedIds);
                break;
        }
    }

    private bulkUpdateStatus(templateIds: string[], isActive: boolean): void {
        const promises = templateIds.map(id =>
            this.templateService.updateTemplate(id, { isActive }).toPromise()
        );

        Promise.all(promises).then(() => {
            this.selectedTemplates.set([]);
            this.loadTemplates();
        }).catch(error => {
            console.error('Bulk status update failed:', error);
        });
    }

    private bulkDelete(templateIds: string[]): void {
        if (confirm(`Are you sure you want to delete ${templateIds.length} template(s)?`)) {
            const promises = templateIds.map(id =>
                this.templateService.deleteTemplate(id).toPromise()
            );

            Promise.all(promises).then(() => {
                this.selectedTemplates.set([]);
                this.loadTemplates();
            }).catch(error => {
                console.error('Bulk delete failed:', error);
            });
        }
    }

    private bulkExport(templateIds: string[]): void {
        // For now, export as JSON
        const promises = templateIds.map(id =>
            this.templateService.exportTemplate(id, 'json').toPromise()
        );

        Promise.all(promises).then(blobs => {
            blobs.forEach((blob, index) => {
                if (blob) {
                    const template = this.templates().find(t => t.id === templateIds[index]);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${template?.name || 'template'}.json`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                }
            });
        }).catch(error => {
            console.error('Bulk export failed:', error);
        });
    }

    onActivateVersion(templateId: string, versionId: string): void {
        this.templateService.activateTemplateVersion(templateId, versionId).subscribe({
            next: () => {
                this.loadTemplateVersions(templateId);
                this.loadTemplates();
            },
            error: (error) => {
                console.error('Failed to activate version:', error);
            }
        });
    }

    onCreateNewVersion(template: DocumentTemplate): void {
        const changes = prompt('Enter description of changes for the new version:');
        if (changes) {
            this.templateService.createTemplateVersion(template.id, changes).subscribe({
                next: () => {
                    this.loadTemplateVersions(template.id);
                },
                error: (error) => {
                    console.error('Failed to create new version:', error);
                }
            });
        }
    }

    private async loadTemplateVersions(templateId: string): Promise<void> {
        try {
            // Mock versions for development
            const mockVersions: TemplateVersion[] = [
                {
                    id: 'v1',
                    templateId,
                    version: '1.0.0',
                    changes: 'Initial version',
                    createdBy: 'admin@example.com',
                    createdAt: new Date('2024-01-15'),
                    isActive: false
                },
                {
                    id: 'v2',
                    templateId,
                    version: '1.1.0',
                    changes: 'Added validation rules for email fields',
                    createdBy: 'admin@example.com',
                    createdAt: new Date('2024-01-20'),
                    isActive: true
                }
            ];

            this.templateVersions.set(mockVersions);

            // TODO: Replace with actual API call
            // const versions = await this.templateService.getTemplateVersions(templateId).toPromise();
            // if (versions) {
            //   this.templateVersions.set(versions);
            // }
        } catch (error) {
            console.error('Failed to load template versions:', error);
        }
    }

    toggleViewMode(): void {
        this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
    }

    toggleFilters(): void {
        this.showFilters.set(!this.showFilters());
    }

    clearFilters(): void {
        this.filters.set({});
        this.searchQuery.set('');
        this.loadTemplates();
    }

    refreshTemplates(): void {
        this.loadTemplates();
        this.loadTemplateUsageStats();
    }

    getUsageStats(templateId: string): TemplateUsageStats | null {
        return this.templateUsageStats().get(templateId) || null;
    }

    getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
        switch (direction) {
            case 'up': return 'pi pi-arrow-up';
            case 'down': return 'pi pi-arrow-down';
            case 'stable': return 'pi pi-minus';
            default: return 'pi pi-minus';
        }
    }

    getTrendColor(direction: 'up' | 'down' | 'stable'): string {
        switch (direction) {
            case 'up': return 'text-green-400';
            case 'down': return 'text-red-400';
            case 'stable': return 'text-gray-400';
            default: return 'text-gray-400';
        }
    }

    formatDate(date: Date): string {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }

    getCategoryOptions(): { label: string; value: string }[] {
        return this.availableCategories().map(cat => ({ label: cat, value: cat }));
    }

    getCreatorOptions(): { label: string; value: string }[] {
        return this.availableCreators().map(creator => ({ label: creator, value: creator }));
    }

    getStatusOptions(): { label: string; value: boolean | undefined }[] {
        return [
            { label: 'All', value: undefined },
            { label: 'Active', value: true },
            { label: 'Inactive', value: false }
        ];
    }

    getSortOptions(): { label: string; value: string }[] {
        return [
            { label: 'Name', value: 'name' },
            { label: 'Category', value: 'category' },
            { label: 'Created Date', value: 'createdAt' },
            { label: 'Updated Date', value: 'updatedAt' },
            { label: 'Usage Count', value: 'usageCount' }
        ];
    }

    getDateRangeValue(): Date[] | null {
        const dateRange = this.filters().dateRange;
        return dateRange ? [dateRange.start, dateRange.end] : null;
    }

    hasActiveFilters(): boolean {
        const currentFilters = this.filters();
        return Object.keys(currentFilters).length > 0;
    }

    // Mock data for development
    private getMockTemplates(): DocumentTemplate[] {
        return [
            {
                id: '1',
                name: 'University Degree Certificate',
                description: 'Standard template for university degree certificates with academic honors',
                category: 'Education',
                version: '1.2.0',
                isActive: true,
                fields: [
                    {
                        id: 'f1',
                        name: 'recipientName',
                        type: 'text' as any,
                        required: true,
                        position: { x: 100, y: 200 },
                        placeholder: 'Full Name'
                    },
                    {
                        id: 'f2',
                        name: 'degreeTitle',
                        type: 'text' as any,
                        required: true,
                        position: { x: 100, y: 250 },
                        placeholder: 'Degree Title'
                    }
                ],
                validationRules: [],
                previewUrl: '/api/templates/1/preview',
                createdBy: 'admin@university.edu',
                createdAt: new Date('2024-01-15'),
                updatedAt: new Date('2024-01-20'),
                usageCount: 45,
                organizationId: 'org123'
            },
            {
                id: '2',
                name: 'Professional Certification',
                description: 'Template for professional certifications and training completions',
                category: 'Professional',
                version: '1.0.0',
                isActive: true,
                fields: [
                    {
                        id: 'f3',
                        name: 'recipientName',
                        type: 'text' as any,
                        required: true,
                        position: { x: 100, y: 200 },
                        placeholder: 'Full Name'
                    },
                    {
                        id: 'f4',
                        name: 'certificationTitle',
                        type: 'text' as any,
                        required: true,
                        position: { x: 100, y: 250 },
                        placeholder: 'Certification Title'
                    }
                ],
                validationRules: [],
                previewUrl: '/api/templates/2/preview',
                createdBy: 'training@company.com',
                createdAt: new Date('2024-01-10'),
                updatedAt: new Date('2024-01-10'),
                usageCount: 23,
                organizationId: 'org123'
            },
            {
                id: '3',
                name: 'Government License',
                description: 'Official template for government-issued licenses and permits',
                category: 'Government',
                version: '2.1.0',
                isActive: true,
                fields: [
                    {
                        id: 'f5',
                        name: 'licenseHolder',
                        type: 'text' as any,
                        required: true,
                        position: { x: 100, y: 200 },
                        placeholder: 'License Holder Name'
                    },
                    {
                        id: 'f6',
                        name: 'licenseType',
                        type: 'dropdown' as any,
                        required: true,
                        position: { x: 100, y: 250 },
                        options: ['Driver License', 'Business License', 'Professional License']
                    }
                ],
                validationRules: [],
                previewUrl: '/api/templates/3/preview',
                createdBy: 'gov@state.gov',
                createdAt: new Date('2023-12-01'),
                updatedAt: new Date('2024-01-18'),
                usageCount: 67,
                organizationId: 'org456'
            },
            {
                id: '4',
                name: 'Medical Certificate',
                description: 'Template for medical certificates and health records',
                category: 'Healthcare',
                version: '1.0.0',
                isActive: false,
                fields: [
                    {
                        id: 'f7',
                        name: 'patientName',
                        type: 'text' as any,
                        required: true,
                        position: { x: 100, y: 200 },
                        placeholder: 'Patient Name'
                    },
                    {
                        id: 'f8',
                        name: 'diagnosis',
                        type: 'textarea' as any,
                        required: true,
                        position: { x: 100, y: 250 },
                        placeholder: 'Medical Diagnosis'
                    }
                ],
                validationRules: [],
                previewUrl: '/api/templates/4/preview',
                createdBy: 'medical@hospital.com',
                createdAt: new Date('2024-01-05'),
                updatedAt: new Date('2024-01-05'),
                usageCount: 12,
                organizationId: 'org789'
            }
        ];
    }
}