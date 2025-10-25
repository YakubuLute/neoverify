import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { EditorModule } from 'primeng/editor';
import { FileUploadModule } from 'primeng/fileupload';

// Services
import { NotificationService } from '../../../core/services/notification.service';
import { ApiService } from '../../../core/services/api.service';

interface ComplianceReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'regulatory' | 'internal' | 'audit' | 'security';
  format: 'pdf' | 'html' | 'docx';
  isActive: boolean;
  isDefault: boolean;
  sections: ReportSection[];
  metadata: {
    author: string;
    version: string;
    lastModified: Date;
    tags: string[];
  };
  settings: {
    includeCharts: boolean;
    includeSummary: boolean;
    includeRecommendations: boolean;
    logoUrl?: string;
    headerText?: string;
    footerText?: string;
  };
}

interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'table' | 'chart' | 'metrics' | 'audit_trail';
  order: number;
  required: boolean;
  content?: string;
  dataSource?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut';
  filters?: any;
}

@Component({
  selector: 'app-compliance-report-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    ToggleButtonModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    EditorModule,
    FileUploadModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="compliance-templates-container p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Compliance Report Templates</h1>
          <p class="text-gray-400">Create and manage customizable compliance report templates</p>
        </div>
        <div class="flex gap-3">
          <p-button
            label="Import Template"
            icon="pi pi-upload"
            [outlined]="true"
            (onClick)="showImportDialog = true"
          />
          <p-button
            label="New Template"
            icon="pi pi-plus"
            (onClick)="openCreateDialog()"
          />
        </div>
      </div>

      <!-- Template Categories -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          *ngFor="let category of templateCategories"
          class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
          [class.ring-2]="selectedCategory === category.value"
          [class.ring-blue-500]="selectedCategory === category.value"
          (click)="filterByCategory(category.value)"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-white">{{ category.label }}</h3>
              <p class="text-sm text-gray-400">{{ getCategoryCount(category.value) }} templates</p>
            </div>
            <i [class]="category.icon" class="text-2xl text-blue-400"></i>
          </div>
        </div>
      </div>

      <!-- Templates Table -->
      <p-card header="Report Templates" styleClass="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
        <p-table
          [value]="filteredTemplates()"
          [loading]="loading()"
          styleClass="p-datatable-sm"
          [scrollable]="true"
          scrollHeight="600px"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Format</th>
              <th>Sections</th>
              <th>Status</th>
              <th>Last Modified</th>
              <th>Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-template>
            <tr>
              <td>
                <div class="flex flex-col">
                  <span class="font-medium text-white">{{ template.name }}</span>
                  <span class="text-sm text-gray-400">{{ template.description }}</span>
                  <div class="flex gap-1 mt-1" *ngIf="template.metadata.tags.length > 0">
                    <span
                      *ngFor="let tag of template.metadata.tags.slice(0, 3)"
                      class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <p-tag [value]="getCategoryLabel(template.category)" severity="info" />
              </td>
              <td>
                <span class="text-sm text-gray-300 uppercase">{{ template.format }}</span>
              </td>
              <td>
                <span class="text-sm text-gray-300">{{ template.sections.length }} sections</span>
              </td>
              <td>
                <div class="flex flex-col gap-1">
                  <p-tag
                    [value]="template.isActive ? 'Active' : 'Inactive'"
                    [severity]="template.isActive ? 'success' : 'secondary'"
                  />
                  <p-tag
                    value="Default"
                    severity="warn"
                    *ngIf="template.isDefault"
                  />
                </div>
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm text-gray-300">{{ template.metadata.lastModified | date:'short' }}</span>
                  <span class="text-xs text-gray-400">v{{ template.metadata.version }}</span>
                </div>
              </td>
              <td>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    size="small"
                    (onClick)="previewTemplate(template)"
                    pTooltip="Preview"
                  />
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    size="small"
                    (onClick)="editTemplate(template)"
                    pTooltip="Edit"
                  />
                  <p-button
                    icon="pi pi-copy"
                    [text]="true"
                    size="small"
                    (onClick)="duplicateTemplate(template)"
                    pTooltip="Duplicate"
                  />
                  <p-button
                    icon="pi pi-download"
                    [text]="true"
                    size="small"
                    (onClick)="exportTemplate(template)"
                    pTooltip="Export"
                  />
                  <p-button
                    [icon]="template.isDefault ? 'pi pi-star-fill' : 'pi pi-star'"
                    [text]="true"
                    size="small"
                    (onClick)="toggleDefault(template.id)"
                    [pTooltip]="template.isDefault ? 'Remove as default' : 'Set as default'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    size="small"
                    severity="danger"
                    (onClick)="deleteTemplate(template.id)"
                    pTooltip="Delete"
                    [disabled]="template.isDefault"
                  />
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-8">
                <div class="flex flex-col items-center gap-3">
                  <i class="pi pi-file-o text-4xl text-gray-500"></i>
                  <p class="text-gray-400">No templates found</p>
                  <p-button
                    label="Create First Template"
                    icon="pi pi-plus"
                    (onClick)="openCreateDialog()"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Create/Edit Template Dialog -->
      <p-dialog
        [header]="editingTemplate() ? 'Edit Template' : 'Create Template'"
        [(visible)]="showCreateDialog"
        [modal]="true"
        [style]="{ width: '900px', height: '80vh' }"
        [draggable]="false"
        [resizable]="true"
        [maximizable]="true"
      >
        <form [formGroup]="templateForm" class="space-y-4 h-full overflow-y-auto">
          <!-- Basic Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Template Name</label>
              <input
                pInputText
                formControlName="name"
                placeholder="Enter template name"
                class="w-full"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Category</label>
              <p-select
                formControlName="category"
                [options]="templateCategories"
                optionLabel="label"
                optionValue="value"
                placeholder="Select category"
                styleClass="w-full"
              />
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-gray-300 mb-2 block">Description</label>
            <p-textarea
              formControlName="description"
              placeholder="Enter template description"
              rows="3"
              class="w-full"
            ></p-textarea>
          </div>

          <!-- Format and Settings -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Format</label>
              <p-select
                formControlName="format"
                [options]="formatOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select format"
                styleClass="w-full"
              />
            </div>

            <div class="flex items-center justify-between pt-6">
              <span class="text-sm text-gray-300">Include Charts</span>
              <p-toggleButton
                formControlName="includeCharts"
                onLabel="Yes"
                offLabel="No"
              />
            </div>

            <div class="flex items-center justify-between pt-6">
              <span class="text-sm text-gray-300">Include Summary</span>
              <p-toggleButton
                formControlName="includeSummary"
                onLabel="Yes"
                offLabel="No"
              />
            </div>
          </div>

          <!-- Header/Footer -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Header Text</label>
              <input
                pInputText
                formControlName="headerText"
                placeholder="Report header text"
                class="w-full"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-gray-300 mb-2 block">Footer Text</label>
              <input
                pInputText
                formControlName="footerText"
                placeholder="Report footer text"
                class="w-full"
              />
            </div>
          </div>

          <!-- Sections Management -->
          <div>
            <div class="flex justify-between items-center mb-4">
              <label class="text-sm font-medium text-gray-300">Report Sections</label>
              <p-button
                label="Add Section"
                icon="pi pi-plus"
                size="small"
                (onClick)="addSection()"
              />
            </div>

            <div class="space-y-3" *ngIf="templateSections().length > 0">
              <div
                *ngFor="let section of templateSections(); let i = index"
                class="bg-gray-900/50 border border-gray-600 rounded-lg p-4"
              >
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      pInputText
                      [(ngModel)]="section.title"
                      [ngModelOptions]="{standalone: true}"
                      placeholder="Section title"
                      class="w-full"
                    />
                    <p-select
                      [(ngModel)]="section.type"
                      [ngModelOptions]="{standalone: true}"
                      [options]="sectionTypes"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Section type"
                      styleClass="w-full"
                    />
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400">Required</span>
                      <p-toggleButton
                        [(ngModel)]="section.required"
                        [ngModelOptions]="{standalone: true}"
                        onLabel="Yes"
                        offLabel="No"
                        size="small"
                      />
                    </div>
                  </div>
                  <div class="flex gap-1 ml-3">
                    <p-button
                      icon="pi pi-arrow-up"
                      [text]="true"
                      size="small"
                      (onClick)="moveSectionUp(i)"
                      [disabled]="i === 0"
                    />
                    <p-button
                      icon="pi pi-arrow-down"
                      [text]="true"
                      size="small"
                      (onClick)="moveSectionDown(i)"
                      [disabled]="i === templateSections().length - 1"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [text]="true"
                      size="small"
                      severity="danger"
                      (onClick)="removeSection(i)"
                    />
                  </div>
                </div>

                <!-- Section Content -->
                <div *ngIf="section.type === 'text'">
                  <label class="text-xs text-gray-400 mb-2 block">Content</label>
                  <p-editor
                    [(ngModel)]="section.content"
                    [ngModelOptions]="{standalone: true}"
                    [style]="{ height: '200px' }"
                  />
                </div>

                <div *ngIf="section.type === 'chart'" class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-gray-400 mb-2 block">Chart Type</label>
                    <p-select
                      [(ngModel)]="section.chartType"
                      [ngModelOptions]="{standalone: true}"
                      [options]="chartTypes"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select chart type"
                      styleClass="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-gray-400 mb-2 block">Data Source</label>
                    <p-select
                      [(ngModel)]="section.dataSource"
                      [ngModelOptions]="{standalone: true}"
                      [options]="dataSources"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select data source"
                      styleClass="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="templateSections().length === 0" class="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
              <i class="pi pi-plus text-2xl text-gray-500 mb-2"></i>
              <p class="text-gray-400">No sections added yet</p>
              <p-button
                label="Add First Section"
                icon="pi pi-plus"
                [text]="true"
                (onClick)="addSection()"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-600">
            <p-button
              label="Cancel"
              [outlined]="true"
              (onClick)="closeCreateDialog()"
            />
            <p-button
              label="Preview"
              icon="pi pi-eye"
              [outlined]="true"
              (onClick)="previewCurrentTemplate()"
              [disabled]="templateForm.invalid"
            />
            <p-button
              [label]="editingTemplate() ? 'Update Template' : 'Create Template'"
              (onClick)="saveTemplate()"
              [loading]="saving()"
              [disabled]="templateForm.invalid"
            />
          </div>
        </form>
      </p-dialog>

      <!-- Import Dialog -->
      <p-dialog
        header="Import Template"
        [(visible)]="showImportDialog"
        [modal]="true"
        [style]="{ width: '500px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div class="space-y-4">
          <p-fileUpload
            mode="basic"
            name="template"
            accept=".json"
            [maxFileSize]="1000000"
            chooseLabel="Select Template File"
            (onSelect)="onTemplateFileSelect($event)"
            styleClass="w-full"
          />

          <div class="flex justify-end gap-2 pt-4">
            <p-button
              label="Cancel"
              [outlined]="true"
              (onClick)="showImportDialog = false"
            />
            <p-button
              label="Import"
              (onClick)="importTemplate()"
              [loading]="importing()"
              [disabled]="!selectedFile"
            />
          </div>
        </div>
      </p-dialog>

      <!-- Preview Dialog -->
      <p-dialog
        header="Template Preview"
        [(visible)]="showPreviewDialog"
        [modal]="true"
        [style]="{ width: '90vw', height: '90vh' }"
        [draggable]="false"
        [resizable]="true"
        [maximizable]="true"
      >
        <div class="h-full overflow-auto">
          <iframe
            *ngIf="previewUrl"
            [src]="previewUrl"
            class="w-full h-full border-0"
          ></iframe>
        </div>
      </p-dialog>

      <!-- Confirmation Dialog -->
      <p-confirmDialog />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    }

    .compliance-templates-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    ::ng-deep .p-card .p-card-header {
      background: rgba(31, 41, 55, 0.5) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-card .p-card-body {
      background: transparent !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: rgba(31, 41, 55, 0.5) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
    }

    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: rgba(17, 24, 39, 0.8) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.5) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-dialog .p-dialog-header {
      background: rgba(31, 41, 55, 0.95) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-dialog .p-dialog-content {
      background: rgba(31, 41, 55, 0.95) !important;
      color: #f3f4f6 !important;
    }

    ::ng-deep .p-editor .ql-toolbar {
      background: rgba(17, 24, 39, 0.8) !important;
      border-color: rgba(75, 85, 99, 0.3) !important;
    }

    ::ng-deep .p-editor .ql-container {
      background: rgba(31, 41, 55, 0.5) !important;
      border-color: rgba(75, 85, 99, 0.3) !important;
      color: #f3f4f6 !important;
    }
  `]
})
export class ComplianceReportTemplatesComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  // Signals
  templates = signal<ComplianceReportTemplate[]>([]);
  filteredTemplates = signal<ComplianceReportTemplate[]>([]);
  templateSections = signal<ReportSection[]>([]);
  loading = signal(false);
  saving = signal(false);
  importing = signal(false);
  editingTemplate = signal<ComplianceReportTemplate | null>(null);

  // Dialog states
  showCreateDialog = false;
  showImportDialog = false;
  showPreviewDialog = false;

  // Form and data
  templateForm: FormGroup;
  selectedCategory: string = 'all';
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  // Options
  templateCategories = [
    { label: 'All Categories', value: 'all', icon: 'pi pi-th-large' },
    { label: 'Regulatory', value: 'regulatory', icon: 'pi pi-shield' },
    { label: 'Internal Audit', value: 'internal', icon: 'pi pi-building' },
    { label: 'External Audit', value: 'audit', icon: 'pi pi-eye' },
    { label: 'Security', value: 'security', icon: 'pi pi-lock' }
  ];

  formatOptions = [
    { label: 'PDF', value: 'pdf' },
    { label: 'HTML', value: 'html' },
    { label: 'Word Document', value: 'docx' }
  ];

  sectionTypes = [
    { label: 'Text Content', value: 'text' },
    { label: 'Data Table', value: 'table' },
    { label: 'Chart/Graph', value: 'chart' },
    { label: 'Key Metrics', value: 'metrics' },
    { label: 'Audit Trail', value: 'audit_trail' }
  ];

  chartTypes = [
    { label: 'Line Chart', value: 'line' },
    { label: 'Bar Chart', value: 'bar' },
    { label: 'Pie Chart', value: 'pie' },
    { label: 'Doughnut Chart', value: 'doughnut' }
  ];

  dataSources = [
    { label: 'Audit Statistics', value: 'audit_stats' },
    { label: 'Document Metrics', value: 'document_metrics' },
    { label: 'User Activity', value: 'user_activity' },
    { label: 'Compliance Scores', value: 'compliance_scores' }
  ];

  constructor() {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      category: ['regulatory', Validators.required],
      format: ['pdf', Validators.required],
      includeCharts: [true],
      includeSummary: [true],
      headerText: [''],
      footerText: ['']
    });
  }

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading.set(true);

    // Mock data - in real app, this would come from API
    const mockTemplates: ComplianceReportTemplate[] = [
      {
        id: '1',
        name: 'SOX Compliance Report',
        description: 'Sarbanes-Oxley compliance reporting template',
        category: 'regulatory',
        format: 'pdf',
        isActive: true,
        isDefault: true,
        sections: [
          {
            id: '1',
            title: 'Executive Summary',
            type: 'text',
            order: 1,
            required: true,
            content: 'Executive summary content...'
          },
          {
            id: '2',
            title: 'Audit Activity Overview',
            type: 'chart',
            order: 2,
            required: true,
            chartType: 'line',
            dataSource: 'audit_stats'
          }
        ],
        metadata: {
          author: 'System Admin',
          version: '1.0',
          lastModified: new Date(),
          tags: ['sox', 'regulatory', 'financial']
        },
        settings: {
          includeCharts: true,
          includeSummary: true,
          includeRecommendations: true,
          headerText: 'SOX Compliance Report',
          footerText: 'Confidential - Internal Use Only'
        }
      },
      {
        id: '2',
        name: 'Internal Audit Summary',
        description: 'Monthly internal audit summary template',
        category: 'internal',
        format: 'html',
        isActive: true,
        isDefault: false,
        sections: [
          {
            id: '3',
            title: 'Monthly Overview',
            type: 'metrics',
            order: 1,
            required: true,
            dataSource: 'audit_stats'
          }
        ],
        metadata: {
          author: 'Audit Team',
          version: '2.1',
          lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          tags: ['internal', 'monthly', 'summary']
        },
        settings: {
          includeCharts: true,
          includeSummary: false,
          includeRecommendations: true
        }
      }
    ];

    setTimeout(() => {
      this.templates.set(mockTemplates);
      this.filterTemplates();
      this.loading.set(false);
    }, 1000);
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.filterTemplates();
  }

  filterTemplates() {
    const templates = this.templates();
    if (this.selectedCategory === 'all') {
      this.filteredTemplates.set(templates);
    } else {
      this.filteredTemplates.set(templates.filter(t => t.category === this.selectedCategory));
    }
  }

  getCategoryCount(category: string): number {
    if (category === 'all') return this.templates().length;
    return this.templates().filter(t => t.category === category).length;
  }

  getCategoryLabel(category: string): string {
    const categoryObj = this.templateCategories.find(c => c.value === category);
    return categoryObj?.label || category;
  }

  openCreateDialog() {
    this.editingTemplate.set(null);
    this.templateForm.reset({
      category: 'regulatory',
      format: 'pdf',
      includeCharts: true,
      includeSummary: true
    });
    this.templateSections.set([]);
    this.showCreateDialog = true;
  }

  editTemplate(template: ComplianceReportTemplate) {
    this.editingTemplate.set(template);
    this.templateForm.patchValue({
      name: template.name,
      description: template.description,
      category: template.category,
      format: template.format,
      includeCharts: template.settings.includeCharts,
      includeSummary: template.settings.includeSummary,
      headerText: template.settings.headerText,
      footerText: template.settings.footerText
    });
    this.templateSections.set([...template.sections]);
    this.showCreateDialog = true;
  }

  closeCreateDialog() {
    this.showCreateDialog = false;
    this.editingTemplate.set(null);
    this.templateForm.reset();
    this.templateSections.set([]);
  }

  saveTemplate() {
    if (this.templateForm.invalid) return;

    this.saving.set(true);

    // Mock save - in real app, this would call API
    setTimeout(() => {
      this.saving.set(false);
      this.closeCreateDialog();
      this.loadTemplates();
      this.notificationService.success('Template saved successfully');
    }, 1000);
  }

  addSection() {
    const sections = this.templateSections();
    const newSection: ReportSection = {
      id: Date.now().toString(),
      title: 'New Section',
      type: 'text',
      order: sections.length + 1,
      required: false
    };
    this.templateSections.set([...sections, newSection]);
  }

  removeSection(index: number) {
    const sections = this.templateSections();
    sections.splice(index, 1);
    this.templateSections.set([...sections]);
  }

  moveSectionUp(index: number) {
    if (index === 0) return;
    const sections = this.templateSections();
    [sections[index], sections[index - 1]] = [sections[index - 1], sections[index]];
    this.templateSections.set([...sections]);
  }

  moveSectionDown(index: number) {
    const sections = this.templateSections();
    if (index === sections.length - 1) return;
    [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
    this.templateSections.set([...sections]);
  }

  previewTemplate(template: ComplianceReportTemplate) {
    // Mock preview - in real app, this would generate preview
    this.previewUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html>
        <head><title>${template.name} Preview</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>${template.name}</h1>
          <p>${template.description}</p>
          <div style="margin: 20px 0;">
            <h2>Template Sections:</h2>
            ${template.sections.map(section => `
              <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
                <h3>${section.title}</h3>
                <p>Type: ${section.type}</p>
                ${section.content ? `<div>${section.content}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    this.showPreviewDialog = true;
  }

  previewCurrentTemplate() {
    const formValue = this.templateForm.value;
    const sections = this.templateSections();

    this.previewUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html>
        <head><title>${formValue.name} Preview</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>${formValue.name}</h1>
          <p>${formValue.description}</p>
          <div style="margin: 20px 0;">
            <h2>Template Sections:</h2>
            ${sections.map(section => `
              <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
                <h3>${section.title}</h3>
                <p>Type: ${section.type}</p>
                ${section.content ? `<div>${section.content}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    this.showPreviewDialog = true;
  }

  duplicateTemplate(template: ComplianceReportTemplate) {
    // Mock duplicate - in real app, this would call API
    this.notificationService.success('Template duplicated successfully');
    this.loadTemplates();
  }

  exportTemplate(template: ComplianceReportTemplate) {
    const exportData = JSON.stringify(template, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/\s+/g, '_')}_template.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    this.notificationService.success('Template exported successfully');
  }

  toggleDefault(templateId: string) {
    // Mock toggle - in real app, this would call API
    this.notificationService.success('Default template updated');
    this.loadTemplates();
  }

  deleteTemplate(templateId: string) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this template?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Mock delete - in real app, this would call API
        this.notificationService.success('Template deleted successfully');
        this.loadTemplates();
      }
    });
  }

  onTemplateFileSelect(event: any) {
    this.selectedFile = event.files[0];
  }

  importTemplate() {
    if (!this.selectedFile) return;

    this.importing.set(true);

    // Mock import - in real app, this would process the file
    setTimeout(() => {
      this.importing.set(false);
      this.showImportDialog = false;
      this.selectedFile = null;
      this.notificationService.success('Template imported successfully');
      this.loadTemplates();
    }, 1000);
  }
}