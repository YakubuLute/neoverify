import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared';
import { TemplateService } from '../../../core/services/template.service';
import { AuthService } from '../../../core/services/auth.service';
import {
    DocumentTemplate,
    TemplateField,
    ValidationRule,
    FieldType,
    ValidationType,
    DocumentType
} from '../../../shared/models/document.models';
import { UserRole } from '../../../shared/models/auth.models';

interface FieldTypeOption {
    label: string;
    value: FieldType;
    icon: string;
    description: string;
}

interface ValidationRuleOption {
    label: string;
    value: ValidationType;
    description: string;
    hasValue: boolean;
}

@Component({
    selector: 'app-template-builder',
    standalone: true,
    imports: [SHARED_IMPORTS],
    templateUrl: './template-builder.component.html',
    styleUrl: './template-builder.component.scss'
})
export class TemplateBuilderComponent implements OnInit, OnDestroy {
    @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;

    private readonly templateService = inject(TemplateService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly destroy$ = new Subject<void>();

    // State signals
    readonly template = signal<DocumentTemplate | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly isEditMode = signal(false);
    readonly templateId = signal<string | null>(null);

    // Template form
    readonly templateForm = signal<FormGroup>(this.createTemplateForm());
    readonly isDirty = signal(false);

    // Field management
    readonly fields = signal<TemplateField[]>([]);
    readonly selectedField = signal<TemplateField | null>(null);
    readonly showFieldEditor = signal(false);
    readonly fieldForm = signal<FormGroup>(this.createFieldForm());

    // Validation rules
    readonly validationRules = signal<ValidationRule[]>([]);
    readonly showValidationEditor = signal(false);
    readonly validationForm = signal<FormGroup>(this.createValidationForm());

    // Canvas state
    readonly canvasScale = signal(1);
    readonly canvasOffset = signal({ x: 0, y: 0 });
    readonly isDragging = signal(false);
    readonly draggedField = signal<TemplateField | null>(null);

    // Preview state
    readonly showPreview = signal(false);
    readonly previewData = signal<Record<string, unknown>>({});

    // User permissions
    readonly currentUser = computed(() => this.authService.getCurrentUser());
    readonly userRole = computed(() => this.currentUser()?.role);
    readonly canSaveTemplate = computed(() => {
        const role = this.userRole();
        return role === UserRole.PLATFORM_ADMIN ||
            role === UserRole.ORG_ADMIN ||
            role === UserRole.ISSUER;
    });

    // Field type options
    readonly fieldTypeOptions: FieldTypeOption[] = [
        {
            label: 'Text Input',
            value: FieldType.TEXT,
            icon: 'pi pi-pencil',
            description: 'Single line text input'
        },
        {
            label: 'Number Input',
            value: FieldType.NUMBER,
            icon: 'pi pi-hashtag',
            description: 'Numeric input field'
        },
        {
            label: 'Date Picker',
            value: FieldType.DATE,
            icon: 'pi pi-calendar',
            description: 'Date selection field'
        },
        {
            label: 'Email Input',
            value: FieldType.EMAIL,
            icon: 'pi pi-envelope',
            description: 'Email address input'
        },
        {
            label: 'Phone Input',
            value: FieldType.PHONE,
            icon: 'pi pi-phone',
            description: 'Phone number input'
        },
        {
            label: 'Dropdown',
            value: FieldType.DROPDOWN,
            icon: 'pi pi-chevron-down',
            description: 'Select from predefined options'
        },
        {
            label: 'Checkbox',
            value: FieldType.CHECKBOX,
            icon: 'pi pi-check-square',
            description: 'Boolean checkbox field'
        },
        {
            label: 'Text Area',
            value: FieldType.TEXTAREA,
            icon: 'pi pi-align-left',
            description: 'Multi-line text input'
        },
        {
            label: 'File Upload',
            value: FieldType.FILE,
            icon: 'pi pi-upload',
            description: 'File upload field'
        }
    ];

    // Validation rule options
    readonly validationRuleOptions: ValidationRuleOption[] = [
        {
            label: 'Required',
            value: ValidationType.REQUIRED,
            description: 'Field must have a value',
            hasValue: false
        },
        {
            label: 'Minimum Length',
            value: ValidationType.MIN_LENGTH,
            description: 'Minimum number of characters',
            hasValue: true
        },
        {
            label: 'Maximum Length',
            value: ValidationType.MAX_LENGTH,
            description: 'Maximum number of characters',
            hasValue: true
        },
        {
            label: 'Pattern',
            value: ValidationType.PATTERN,
            description: 'Regular expression pattern',
            hasValue: true
        },
        {
            label: 'Minimum Value',
            value: ValidationType.MIN_VALUE,
            description: 'Minimum numeric value',
            hasValue: true
        },
        {
            label: 'Maximum Value',
            value: ValidationType.MAX_VALUE,
            description: 'Maximum numeric value',
            hasValue: true
        },
        {
            label: 'Custom Rule',
            value: ValidationType.CUSTOM,
            description: 'Custom validation logic',
            hasValue: true
        }
    ];

    // Enum references for template
    readonly FieldType = FieldType;
    readonly ValidationType = ValidationType;
    readonly UserRole = UserRole;

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.templateId.set(params['id']);
                this.isEditMode.set(true);
                this.loadTemplate(params['id']);
            } else {
                this.isEditMode.set(false);
                this.initializeNewTemplate();
            }
        });

        this.setupFormWatchers();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private createTemplateForm(): FormGroup {
        return this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', [Validators.required, Validators.minLength(10)]],
            category: ['', Validators.required],
            version: ['1.0.0', Validators.required],
            isActive: [true]
        });
    }

    private createFieldForm(): FormGroup {
        return this.fb.group({
            name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)]],
            type: [FieldType.TEXT, Validators.required],
            required: [false],
            placeholder: [''],
            defaultValue: [''],
            options: [''] // For dropdown fields, comma-separated
        });
    }

    private createValidationForm(): FormGroup {
        return this.fb.group({
            type: [ValidationType.REQUIRED, Validators.required],
            value: [''],
            message: ['', Validators.required]
        });
    }

    private setupFormWatchers(): void {
        this.templateForm().valueChanges.subscribe(() => {
            this.isDirty.set(true);
        });
    }

    private async loadTemplate(templateId: string): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            // For development, use mock data
            const mockTemplate = this.getMockTemplate(templateId);

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            this.template.set(mockTemplate);
            this.fields.set(mockTemplate.fields);
            this.validationRules.set(mockTemplate.validationRules);

            // Populate form
            this.templateForm().patchValue({
                name: mockTemplate.name,
                description: mockTemplate.description,
                category: mockTemplate.category,
                version: mockTemplate.version,
                isActive: mockTemplate.isActive
            });

            // TODO: Replace with actual API call
            // const template = await this.templateService.getTemplate(templateId).toPromise();
            // if (template) {
            //     this.template.set(template);
            //     this.fields.set(template.fields);
            //     this.validationRules.set(template.validationRules);
            //     this.templateForm().patchValue(template);
            // }
        } catch (error) {
            console.error('Failed to load template:', error);
            this.error.set('Failed to load template. Please try again.');
        } finally {
            this.loading.set(false);
        }
    }

    private initializeNewTemplate(): void {
        this.template.set(null);
        this.fields.set([]);
        this.validationRules.set([]);
        this.templateForm().reset({
            name: '',
            description: '',
            category: '',
            version: '1.0.0',
            isActive: true
        });
    }

    onAddField(fieldType: FieldType): void {
        const newField: TemplateField = {
            id: this.generateFieldId(),
            label: '',
            name: `field_${this.fields().length + 1}`,
            type: fieldType,
            required: false,
            position: { x: 100, y: 100 + (this.fields().length * 60) },
            placeholder: this.getDefaultPlaceholder(fieldType),
            order: this.fields().length
        };

        if (fieldType === FieldType.DROPDOWN) {
            newField.options = ['Option 1', 'Option 2', 'Option 3'];
        }

        this.fields.update(fields => [...fields, newField]);
        this.selectedField.set(newField);
        this.populateFieldForm(newField);
        this.showFieldEditor.set(true);
        this.isDirty.set(true);
    }

    onFieldClick(field: TemplateField): void {
        this.selectedField.set(field);
        this.populateFieldForm(field);
        this.showFieldEditor.set(true);
    }

    onFieldDragStart(event: DragEvent, field: TemplateField): void {
        this.draggedField.set(field);
        this.isDragging.set(true);

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', field.id);
        }
    }

    onCanvasDrop(event: DragEvent): void {
        event.preventDefault();
        const draggedField = this.draggedField();

        if (draggedField && this.canvasContainer) {
            const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
            const x = (event.clientX - rect.left) / this.canvasScale();
            const y = (event.clientY - rect.top) / this.canvasScale();

            this.updateFieldPosition(draggedField.id, { x, y });
        }

        this.isDragging.set(false);
        this.draggedField.set(null);
    }

    onCanvasDragOver(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    private updateFieldPosition(fieldId: string, position: { x: number; y: number }): void {
        this.fields.update(fields =>
            fields.map(field =>
                field.id === fieldId ? { ...field, position } : field
            )
        );
        this.isDirty.set(true);
    }

    onSaveField(): void {
        if (this.fieldForm().valid) {
            const formValue = this.fieldForm().value;
            const selectedField = this.selectedField();

            if (selectedField) {
                const updatedField: TemplateField = {
                    ...selectedField,
                    name: formValue.name,
                    type: formValue.type,
                    required: formValue.required,
                    placeholder: formValue.placeholder,
                    defaultValue: formValue.defaultValue,
                    options: formValue.type === FieldType.DROPDOWN ?
                        formValue.options.split(',').map((opt: string) => opt.trim()).filter((opt: string) => opt) :
                        undefined
                };

                this.fields.update(fields =>
                    fields.map(field =>
                        field.id === selectedField.id ? updatedField : field
                    )
                );

                this.selectedField.set(updatedField);
                this.showFieldEditor.set(false);
                this.isDirty.set(true);
            }
        }
    }

    onDeleteField(fieldId: string): void {
        if (confirm('Are you sure you want to delete this field?')) {
            this.fields.update(fields => fields.filter(field => field.id !== fieldId));

            // Remove associated validation rules
            this.validationRules.update(rules =>
                rules.filter(rule => rule.fieldId !== fieldId)
            );

            if (this.selectedField()?.id === fieldId) {
                this.selectedField.set(null);
                this.showFieldEditor.set(false);
            }

            this.isDirty.set(true);
        }
    }

    onAddValidationRule(): void {
        const selectedField = this.selectedField();
        if (selectedField) {
            this.validationForm().patchValue({
                type: ValidationType.REQUIRED,
                value: '',
                message: 'This field is required'
            });
            this.showValidationEditor.set(true);
        }
    }

    onSaveValidationRule(): void {
        if (this.validationForm().valid && this.selectedField()) {
            const formValue = this.validationForm().value;
            const newRule: ValidationRule = {
                id: this.generateRuleId(),
                fieldId: this.selectedField()!.id,
                type: formValue.type,
                value: formValue.value,
                message: formValue.message
            };

            this.validationRules.update(rules => [...rules, newRule]);
            this.showValidationEditor.set(false);
            this.isDirty.set(true);
        }
    }

    onDeleteValidationRule(ruleId: string): void {
        if (confirm('Are you sure you want to delete this validation rule?')) {
            this.validationRules.update(rules =>
                rules.filter(rule => rule.id !== ruleId)
            );
            this.isDirty.set(true);
        }
    }

    onPreviewTemplate(): void {
        // Generate sample data for preview
        const sampleData: Record<string, unknown> = {};
        this.fields().forEach(field => {
            sampleData[field.name] = this.generateSampleValue(field);
        });

        this.previewData.set(sampleData);
        this.showPreview.set(true);
    }

    onSaveTemplate(): void {
        if (!this.templateForm().valid || !this.canSaveTemplate()) {
            return;
        }

        this.saving.set(true);
        const formValue = this.templateForm().value;

        const templateData: Partial<DocumentTemplate> = {
            ...formValue,
            fields: this.fields(),
            validationRules: this.validationRules(),
            organizationId: this.currentUser()?.organizationId
        };

        const saveOperation = this.isEditMode() && this.templateId() ?
            this.templateService.updateTemplate(this.templateId()!, templateData) :
            this.templateService.createTemplate(templateData);

        saveOperation.subscribe({
            next: () => {
                this.isDirty.set(false);
                this.router.navigate(['/documents/templates']);
            },
            error: (error) => {
                console.error('Failed to save template:', error);
                this.error.set('Failed to save template. Please try again.');
            },
            complete: () => {
                this.saving.set(false);
            }
        });
    }

    onCancel(): void {
        if (this.isDirty() && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
        this.router.navigate(['/documents/templates']);
    }

    onZoomIn(): void {
        this.canvasScale.update(scale => Math.min(scale * 1.2, 3));
    }

    onZoomOut(): void {
        this.canvasScale.update(scale => Math.max(scale / 1.2, 0.5));
    }

    onResetZoom(): void {
        this.canvasScale.set(1);
        this.canvasOffset.set({ x: 0, y: 0 });
    }

    private populateFieldForm(field: TemplateField): void {
        this.fieldForm().patchValue({
            name: field.name,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder || '',
            defaultValue: field.defaultValue || '',
            options: field.options ? field.options.join(', ') : ''
        });
    }

    private generateFieldId(): string {
        return 'field_' + Math.random().toString(36).substr(2, 9);
    }

    private generateRuleId(): string {
        return 'rule_' + Math.random().toString(36).substr(2, 9);
    }

    private getDefaultPlaceholder(fieldType: FieldType): string {
        switch (fieldType) {
            case FieldType.TEXT: return 'Enter text';
            case FieldType.NUMBER: return 'Enter number';
            case FieldType.DATE: return 'Select date';
            case FieldType.EMAIL: return 'Enter email address';
            case FieldType.PHONE: return 'Enter phone number';
            case FieldType.DROPDOWN: return 'Select option';
            case FieldType.CHECKBOX: return 'Check if applicable';
            case FieldType.TEXTAREA: return 'Enter detailed text';
            case FieldType.FILE: return 'Upload file';
            default: return 'Enter value';
        }
    }

    private generateSampleValue(field: TemplateField): unknown {
        switch (field.type) {
            case FieldType.TEXT: return 'Sample Text';
            case FieldType.NUMBER: return 42;
            case FieldType.DATE: return new Date().toISOString().split('T')[0];
            case FieldType.EMAIL: return 'sample@example.com';
            case FieldType.PHONE: return '+1 (555) 123-4567';
            case FieldType.DROPDOWN: return field.options?.[0] || 'Option 1';
            case FieldType.CHECKBOX: return true;
            case FieldType.TEXTAREA: return 'Sample multi-line text content';
            case FieldType.FILE: return 'sample-file.pdf';
            default: return 'Sample Value';
        }
    }

    getFieldValidationRules(fieldId: string): ValidationRule[] {
        return this.validationRules().filter(rule => rule.fieldId === fieldId);
    }

    getFieldIcon(fieldType: FieldType): string {
        const option = this.fieldTypeOptions.find(opt => opt.value === fieldType);
        return option?.icon || 'pi pi-question';
    }

    shouldShowValidationValue(): boolean {
        const selectedType = this.validationForm().get('type')?.value;
        const ruleOption = this.validationRuleOptions.find(opt => opt.value === selectedType);
        return ruleOption?.hasValue || false;
    }

    // Mock data for development
    private getMockTemplate(templateId: string): DocumentTemplate {
        return {
            id: templateId,
            name: 'Sample Template',
            description: 'A sample template for testing',
            category: 'Education',
            version: '1.0.0',
            isActive: true,
            documentType: DocumentType.PDF,
            fields: [
                {
                  id: 'field1',
                  name: 'recipientName',
                  type: FieldType.TEXT,
                  required: true,
                  position: { x: 100, y: 100 },
                  placeholder: 'Full Name',
                  label: '',
                  order: 0
                },
                {
                  id: 'field2',
                  name: 'degreeTitle',
                  type: FieldType.TEXT,
                  required: true,
                  position: { x: 100, y: 160 },
                  placeholder: 'Degree Title',
                  label: '',
                  order: 0
                }
            ],
            validationRules: [
                {
                    id: 'rule1',
                    fieldId: 'field1',
                    type: ValidationType.REQUIRED,
                    value: '',
                    message: 'Recipient name is required'
                }
            ],
            previewUrl: '/api/templates/preview',
            createdBy: 'admin@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
            organizationId: 'org123'
        };
    }
}
