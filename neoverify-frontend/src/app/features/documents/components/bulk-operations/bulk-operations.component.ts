import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../shared';
import { BulkActionType, ExportFormat } from '../../../../shared/models/document.models';

export interface BulkOperationConfig {
  type: BulkActionType;
  label: string;
  icon: string;
  severity?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

@Component({
  selector: 'app-bulk-operations',
  standalone: true,
  imports: SHARED_IMPORTS,
  templateUrl: './bulk-operations.component.html',
  styleUrl: './bulk-operations.component.scss'
})
export class BulkOperationsComponent {
  @Input({ required: true }) selectedCount = 0;
  @Input() canBulkEdit = false;
  @Input() canExport = true;

  @Output() bulkAction = new EventEmitter<{ type: BulkActionType; data?: any }>();
  @Output() exportAction = new EventEmitter<ExportFormat>();
  @Output() clearSelection = new EventEmitter<void>();

  readonly showExportDialog = signal(false);
  readonly showBulkActionsMenu = signal(false);
  readonly showConfirmDialog = signal(false);
  readonly pendingAction = signal<BulkOperationConfig | null>(null);

  // Export format options
  readonly exportFormats = [
    { label: 'CSV', value: 'csv', description: 'Comma-separated values file' },
    { label: 'Excel', value: 'excel', description: 'Microsoft Excel spreadsheet' },
    { label: 'PDF', value: 'pdf', description: 'Portable Document Format' }
  ];

  readonly exportOptions = signal({
    format: 'csv' as 'csv' | 'excel' | 'pdf',
    includeMetadata: true,
    includeAuditTrail: false
  });

  // Bulk operation configurations
  readonly bulkOperations: BulkOperationConfig[] = [
    {
      type: BulkActionType.UPDATE_STATUS,
      label: 'Update Status',
      icon: 'pi pi-circle',
      severity: 'info'
    },
    {
      type: BulkActionType.ADD_TAGS,
      label: 'Add Tags',
      icon: 'pi pi-tag',
      severity: 'secondary'
    },
    {
      type: BulkActionType.REMOVE_TAGS,
      label: 'Remove Tags',
      icon: 'pi pi-tag',
      severity: 'warning'
    },
    {
      type: BulkActionType.SHARE,
      label: 'Share Documents',
      icon: 'pi pi-share-alt',
      severity: 'info'
    },
    {
      type: BulkActionType.DELETE,
      label: 'Delete Documents',
      icon: 'pi pi-trash',
      severity: 'danger',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to delete the selected documents? This action cannot be undone.'
    }
  ];

  readonly hasSelection = computed(() => this.selectedCount > 0);

  onBulkAction(operation: BulkOperationConfig): void {
    this.showBulkActionsMenu.set(false);

    if (operation.requiresConfirmation) {
      this.pendingAction.set(operation);
      this.showConfirmDialog.set(true);
    } else {
      this.executeBulkAction(operation);
    }
  }

  onConfirmAction(): void {
    const action = this.pendingAction();
    if (action) {
      this.executeBulkAction(action);
    }
    this.showConfirmDialog.set(false);
    this.pendingAction.set(null);
  }

  onCancelAction(): void {
    this.showConfirmDialog.set(false);
    this.pendingAction.set(null);
  }

  private executeBulkAction(operation: BulkOperationConfig): void {
    let actionData: any = undefined;

    switch (operation.type) {
      case BulkActionType.UPDATE_STATUS:
        actionData = { status: 'active' };
        break;
      case BulkActionType.ADD_TAGS:
        actionData = { tags: [] };
        break;
      case BulkActionType.REMOVE_TAGS:
        actionData = { tags: [] };
        break;
      case BulkActionType.SHARE:
        actionData = { userIds: [], permissions: {} };
        break;
    }

    this.bulkAction.emit({ type: operation.type, data: actionData });
  }

  onExport(): void {
    this.showExportDialog.set(true);
  }

  onConfirmExport(): void {
    const options = this.exportOptions();
    const exportFormat: ExportFormat = {
      type: options.format,
      includeMetadata: options.includeMetadata,
      includeAuditTrail: options.includeAuditTrail
    };
    
    this.exportAction.emit(exportFormat);
    this.showExportDialog.set(false);
  }

  onCancelExport(): void {
    this.showExportDialog.set(false);
  }

  onClearSelection(): void {
    this.clearSelection.emit();
  }

  tog