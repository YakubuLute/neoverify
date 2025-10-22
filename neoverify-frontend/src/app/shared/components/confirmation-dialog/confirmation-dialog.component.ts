import { Component, inject, input, output } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

export interface ConfirmationConfig {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptButtonStyleClass?: string;
  rejectButtonStyleClass?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [ConfirmDialogModule],
  template: `<p-confirmDialog></p-confirmDialog>`,
  providers: [ConfirmationService]
})
export class ConfirmationDialogComponent {
  private readonly confirmationService = inject(ConfirmationService);

  readonly config = input<ConfirmationConfig>();
  readonly confirmed = output<void>();
  readonly rejected = output<void>();

  /**
   * Show confirmation dialog
   */
  confirm(config?: ConfirmationConfig): void {
    const dialogConfig = config || this.config();
    
    if (!dialogConfig) {
      throw new Error('Confirmation config is required');
    }

    this.confirmationService.confirm({
      message: dialogConfig.message,
      header: dialogConfig.header || 'Confirmation',
      icon: dialogConfig.icon || 'pi pi-exclamation-triangle',
      acceptLabel: dialogConfig.acceptLabel || 'Yes',
      rejectLabel: dialogConfig.rejectLabel || 'No',
      acceptButtonStyleClass: dialogConfig.acceptButtonStyleClass || 'p-button-danger',
      rejectButtonStyleClass: dialogConfig.rejectButtonStyleClass || 'p-button-text',
      accept: () => this.confirmed.emit(),
      reject: () => this.rejected.emit()
    });
  }
}