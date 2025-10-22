import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SHARED_IMPORTS } from '../../index';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <p-dialog
      [(visible)]="visible"
      [header]="title"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '400px' }"
      (onHide)="onCancel()"
    >
      <div class="mb-4">
        <p>{{ message }}</p>
      </div>
      
      <div class="flex justify-end gap-2">
        <p-button
          label="Cancel"
          [outlined]="true"
          (onClick)="onCancel()"
        ></p-button>
        <p-button
          [label]="confirmLabel"
          [severity]="severity"
          (onClick)="onConfirm()"
        ></p-button>
      </div>
    </p-dialog>
  `
})
export class ConfirmationDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmLabel = 'Confirm';
  @Input() severity: 'success' | 'info' | 'warning' | 'danger' = 'info';
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onCancel(): void {
    this.cancel.emit();
    this.visible = false;
    this.visibleChange.emit(false);
  }
}