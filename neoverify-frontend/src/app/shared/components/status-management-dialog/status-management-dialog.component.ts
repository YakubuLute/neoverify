import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { Subject, takeUntil } from 'rxjs';
import { DocumentStatusService } from '../../../core/services/document-status.service';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StatusHistoryComponent } from '../status-history/status-history.component';
import {
    Document,
    DocumentStatus,
    StatusTransition,
    StatusTrigger
} from '../../models/document.models';

@Component({
    selector: 'app-status-management-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        SelectModule,
        InputTextModule,
        TextareaModule,
        MessageModule,
        StatusBadgeComponent,
        StatusHistoryComponent
    ],
    template: `
    <p-dialog
      header="Manage Document Status"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '800px', maxHeight: '90vh' }"
      (onHide)="onDialogHide()"
    >
      <div class="status-management-content" *ngIf="document">
        
        <!-- Current Status Display -->
        <div class="current-status-section mb-6">
          <h3 class="text-lg font-semibold mb-3">Current Status</h3>
          <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <app-status-badge 
              [status]="document.status" 
              type="document" 
              size="lg">
            </app-status-badge>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ document.title }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Last updated: {{ document.updatedAt | date:'medium' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Status Change Form -->
        <div class="status-change-section mb-6">
          <h3 class="text-lg font-semibold mb-3">Change Status</h3>
          
          <form [formGroup]="statusForm" (ngSubmit)="onSubmit()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              
              <!-- New Status Selection -->
              <div class="form-field">
                <label for="newStatus" class="block text-sm font-medium mb-2">
                  New Status <span class="text-red-500">*</span>
                </label>
                <p-select
                  id="newStatus"
                  formControlName="newStatus"
                  [options]="allowedStatusOptions()"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select new status"
                  styleClass="w-full"
                  [disabled]="loading()"
                >
                  <ng-template pTemplate="selectedItem" let-option>
                    <div class="flex items-center gap-2" *ngIf="option">
                      <app-status-badge 
                        [status]="option.value" 
                        type="document" 
                        size="sm">
                      </app-status-badge>
                    </div>
                  </ng-template>
                  <ng-template pTemplate="item" let-option>
                    <div class="flex items-center gap-2">
                      <app-status-badge 
                        [status]="option.value" 
                        type="document" 
                        size="sm">
                      </app-status-badge>
                      <span>{{ option.label }}</span>
                    </div>
                  </ng-template>
                </p-select>
                
                <div *ngIf="statusForm.get('newStatus')?.invalid && statusForm.get('newStatus')?.touched" 
                     class="text-red-500 text-sm mt-1">
                  Please select a new status
                </div>
              </div>

              <!-- Reason (if required) -->
              <div class="form-field" *ngIf="requiresReason()">
                <label for="reason" class="block text-sm font-medium mb-2">
                  Reason <span class="text-red-500">*</span>
                </label>
                <p-inputText
                  id="reason"
                  formControlName="reason"
                  placeholder="Enter reason for status change"
                  styleClass="w-full"
                  [disabled]="loading()"
                ></p-inputText>
                
                <div *ngIf="statusForm.get('reason')?.invalid && statusForm.get('reason')?.touched" 
                     class="text-red-500 text-sm mt-1">
                  Reason is required for this status change
                </div>
              </div>
            </div>

            <!-- Additional Notes -->
            <div class="form-field mb-4">
              <label for="notes" class="block text-sm font-medium mb-2">
                Additional Notes
              </label>
              <p-textarea
                id="notes"
                formControlName="notes"
                placeholder="Add any additional notes about this status change..."
                [rows]="3"
                styleClass="w-full"
                [disabled]="loading()"
              ></p-textarea>
            </div>

            <!-- Warning Messages -->
            <div *ngIf="hasWarnings()" class="mb-4">
              <p-message 
                *ngFor="let warning of getWarnings()"
                severity="warn" 
                [text]="warning"
                styleClass="w-full mb-2"
              ></p-message>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end gap-3">
              <p-button
                label="Cancel"
                severity="secondary"
                [outlined]="true"
                (onClick)="onCancel()"
                [disabled]="loading()"
              ></p-button>
              
              <p-button
                label="Update Status"
                type="submit"
                [loading]="loading()"
                [disabled]="statusForm.invalid || !hasValidTransition()"
              ></p-button>
            </div>
          </form>
        </div>

        <!-- Status History -->
        <div class="status-history-section">
          <app-status-history 
            [documentId]="document.id"
            [maxItems]="5">
          </app-status-history>
        </div>
      </div>
    </p-dialog>
  `,
    styles: [`
    .status-management-content {
      @apply max-h-96 overflow-y-auto;
    }

    .form-field {
      @apply mb-4;
    }

    .form-field label {
      @apply text-gray-700 dark:text-gray-300;
    }

    :host ::ng-deep .p-dialog-content {
      @apply p-6;
    }

    :host ::ng-deep .p-select-panel .p-select-items .p-select-item {
      @apply py-2;
    }
  `]
})
export class StatusManagementDialogComponent implements OnInit, OnDestroy {
    @Input() visible = false;
    @Input() document: Document | null = null;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() statusChanged = new EventEmitter<{ document: Document; newStatus: DocumentStatus; reason?: string }>();

    private readonly fb = inject(FormBuilder);
    private readonly statusService = inject(DocumentStatusService);
    private readonly destroy$ = new Subject<void>();

    readonly loading = signal(false);
    private readonly allowedTransitions = signal<StatusTransition[]>([]);

    statusForm: FormGroup;

    constructor() {
        this.statusForm = this.fb.group({
            newStatus: ['', Validators.required],
            reason: [''],
            notes: ['']
        });
    }

    ngOnInit(): void {
        // Watch for new status selection to update reason requirement
        this.statusForm.get('newStatus')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(newStatus => {
                this.updateReasonValidation(newStatus);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    allowedStatusOptions = computed(() => {
        if (!this.document) return [];

        return this.allowedTransitions().map(transition => ({
            label: this.formatStatusLabel(transition.to),
            value: transition.to,
            transition
        }));
    });

    requiresReason = computed(() => {
        const newStatus = this.statusForm.get('newStatus')?.value;
        if (!newStatus) return false;

        const transition = this.allowedTransitions().find(t => t.to === newStatus);
        return transition?.requiresReason || false;
    });

    onDialogShow(): void {
        if (this.document) {
            this.loadAllowedTransitions();
            this.resetForm();
        }
    }

    onDialogHide(): void {
        this.visibleChange.emit(false);
        this.resetForm();
    }

    onSubmit(): void {
        if (this.statusForm.valid && this.document) {
            this.loading.set(true);

            const formValue = this.statusForm.value;
            const metadata = {
                notes: formValue.notes,
                triggeredBy: StatusTrigger.MANUAL,
                previousStatus: this.document.status
            };

            this.statusService.updateDocumentStatus(
                this.document.id,
                formValue.newStatus,
                formValue.reason,
                metadata
            ).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.statusChanged.emit({
                            document: this.document!,
                            newStatus: formValue.newStatus,
                            reason: formValue.reason
                        });
                        this.loading.set(false);
                        this.onDialogHide();
                    },
                    error: () => {
                        this.loading.set(false);
                    }
                });
        }
    }

    onCancel(): void {
        this.onDialogHide();
    }

    hasValidTransition(): boolean {
        const newStatus = this.statusForm.get('newStatus')?.value;
        if (!newStatus || !this.document) return false;

        return this.allowedTransitions().some(t => t.to === newStatus && t.allowed);
    }

    hasWarnings(): boolean {
        return this.getWarnings().length > 0;
    }

    getWarnings(): string[] {
        const warnings: string[] = [];
        const newStatus = this.statusForm.get('newStatus')?.value;

        if (!newStatus || !this.document) return warnings;

        // Add specific warnings based on status transitions
        if (newStatus === DocumentStatus.REVOKED) {
            warnings.push('Revoking this document will make it permanently invalid and cannot be undone.');
        }

        if (newStatus === DocumentStatus.EXPIRED) {
            warnings.push('Marking this document as expired will prevent further verification.');
        }

        if (this.document.status === DocumentStatus.VERIFIED && newStatus !== DocumentStatus.ACTIVE) {
            warnings.push('Changing status from verified may affect document authenticity validation.');
        }

        return warnings;
    }

    private loadAllowedTransitions(): void {
        if (!this.document) return;

        this.statusService.getAllowedStatusTransitions(this.document.id, this.document.status)
            .pipe(takeUntil(this.destroy$))
            .subscribe(transitions => {
                this.allowedTransitions.set(transitions.filter(t => t.allowed));
            });
    }

    private updateReasonValidation(newStatus: DocumentStatus): void {
        const reasonControl = this.statusForm.get('reason');
        if (!reasonControl) return;

        const transition = this.allowedTransitions().find(t => t.to === newStatus);

        if (transition?.requiresReason) {
            reasonControl.setValidators([Validators.required]);
        } else {
            reasonControl.clearValidators();
        }

        reasonControl.updateValueAndValidity();
    }

    private resetForm(): void {
        this.statusForm.reset();
        this.loading.set(false);
    }

    private formatStatusLabel(status: DocumentStatus): string {
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ');
    }
}