import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

// PrimeNG imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { PasswordModule } from 'primeng/password';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { DocumentSharingService, ShareLink } from '../../../core/services/document-sharing.service';
import { Document, SharedUser, SharePermissions } from '../../models/document.models';
import { User } from '../../models/auth.models';

@Component({
  selector: 'app-document-sharing-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    SelectModule,
    DatePickerModule,
    TextareaModule,
    TabsModule,
    TagModule,
    PasswordModule,
    InputNumberModule,
    TooltipModule,
    ProgressSpinnerModule,
    AutoCompleteModule,
    TableModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  template: `
    <p-dialog 
      header="Share Document" 
      [(visible)]="visible" 
      (onHide)="onClose()"
      [modal]="true" 
      [closable]="true"
      [style]="{ width: '800px', maxHeight: '90vh' }"
      styleClass="document-sharing-dialog">
      
      <div class="sharing-dialog-content" *ngIf="document">
        <!-- Document Info -->
        <div class="document-info-section">
          <div class="document-header">
            <i class="pi pi-file document-icon"></i>
            <div class="document-details">
              <h3>{{ document.title }}</h3>
              <p class="document-filename">{{ document.originalName }}</p>
            </div>
          </div>
        </div>

        <!-- Tabs for different sharing methods -->
        <p-tabs [(value)]="activeTabValue">
          <p-tablist>
            <p-tab value="users">
              <i class="pi pi-users mr-2"></i>
              Share with Users
            </p-tab>
            <p-tab value="link">
              <i class="pi pi-link mr-2"></i>
              Share Link
            </p-tab>
            <p-tab value="current">
              <i class="pi pi-users mr-2"></i>
              Current Shares
            </p-tab>
          </p-tablist>
          
          <p-tabpanels>
            <!-- Share with Users Tab -->
            <p-tabpanel value="users">
            <div class="share-users-content">
              
              <!-- User Search and Selection -->
              <div class="user-selection-section">
                <label for="userSearch" class="form-label">Add users to share with:</label>
                <p-autoComplete
                  id="userSearch"
                  [(ngModel)]="selectedUser"
                  [suggestions]="userSuggestions()"
                  (completeMethod)="searchUsers($event)"
                  (onSelect)="addUserToShare($event)"
                  field="email"
                  placeholder="Search by email or name..."

                  [dropdown]="true"
                  class="w-full">
                  
                  <ng-template let-user pTemplate="item">
                    <div class="user-suggestion">
                      <div class="user-info">
                        <strong>{{ user.name }}</strong>
                        <span class="user-email">{{ user.email }}</span>
                      </div>
                      <p-tag [value]="user.role" severity="info" class="user-role"></p-tag>
                    </div>
                  </ng-template>
                </p-autoComplete>
              </div>

              <!-- Selected Users List -->
              <div class="selected-users-section" *ngIf="selectedUsers().length > 0">
                <label class="form-label">Users to share with:</label>
                <div class="selected-users-list">
                  @for (user of selectedUsers(); track user.email) {
                    <div class="selected-user-item">
                      <div class="user-info">
                        <span class="user-name">{{ user.name }}</span>
                        <span class="user-email">{{ user.email }}</span>
                      </div>
                      <p-button 
                        icon="pi pi-times" 
                        [text]="true" 
                        size="small"
                        (onClick)="removeUserFromShare(user)"
                        pTooltip="Remove user">
                      </p-button>
                    </div>
                  }
                </div>
              </div>

              <!-- Permissions Section -->
              <div class="permissions-section">
                <label class="form-label">Permissions:</label>
                <div class="permission-checkboxes">
                  <div class="permission-item">
                    <p-checkbox 
                      [(ngModel)]="sharePermissions.canView" 
                      binary="true" 
                      inputId="canView">
                    </p-checkbox>
                    <label for="canView">Can View</label>
                    <i class="pi pi-info-circle" pTooltip="Allow users to view the document"></i>
                  </div>
                  
                  <div class="permission-item">
                    <p-checkbox 
                      [(ngModel)]="sharePermissions.canEdit" 
                      binary="true" 
                      inputId="canEdit">
                    </p-checkbox>
                    <label for="canEdit">Can Edit</label>
                    <i class="pi pi-info-circle" pTooltip="Allow users to edit document metadata"></i>
                  </div>
                  
                  <div class="permission-item">
                    <p-checkbox 
                      [(ngModel)]="sharePermissions.canDownload" 
                      binary="true" 
                      inputId="canDownload">
                    </p-checkbox>
                    <label for="canDownload">Can Download</label>
                    <i class="pi pi-info-circle" pTooltip="Allow users to download the document"></i>
                  </div>
                </div>
              </div>

              <!-- Optional Message -->
              <div class="message-section">
                <label for="shareMessage" class="form-label">Message (optional):</label>
                <textarea 
                  id="shareMessage"
                  pInputTextarea
                  [(ngModel)]="shareMessage"
                  placeholder="Add a message for the recipients..."
                  rows="3"
                  class="w-full">
                </textarea>
              </div>

              <!-- Expiration Date -->
              <div class="expiration-section">
                <div class="expiration-toggle">
                  <p-checkbox 
                    [(ngModel)]="hasExpiration" 
                    binary="true" 
                    inputId="hasExpiration">
                  </p-checkbox>
                  <label for="hasExpiration">Set expiration date</label>
                </div>
                
                <div class="expiration-date" *ngIf="hasExpiration">
                  <p-datePicker
                    [(ngModel)]="expirationDate"
                    [showTime]="true"
                    [minDate]="minExpirationDate"
                    placeholder="Select expiration date"
                    class="w-full">
                  </p-datePicker>
                </div>
              </div>

              <!-- Share Button -->
              <div class="share-actions">
                <p-button 
                  label="Share Document" 
                  icon="pi pi-share-alt"
                  (onClick)="shareWithUsers()"
                  [loading]="sharing()"
                  [disabled]="selectedUsers().length === 0 || !isValidPermissions()"
                  class="share-button">
                </p-button>
              </div>
            </div>
            </p-tabpanel>

            <!-- Share Link Tab -->
            <p-tabpanel value="link">
            <div class="share-link-content">
              
              <!-- Create Link Section -->
              <div class="create-link-section">
                <h4>Create a shareable link</h4>
                <p class="section-description">
                  Anyone with this link will be able to access the document based on the permissions you set.
                </p>

                <!-- Link Permissions -->
                <div class="permissions-section">
                  <label class="form-label">Link Permissions:</label>
                  <div class="permission-checkboxes">
                    <div class="permission-item">
                      <p-checkbox 
                        [(ngModel)]="linkPermissions.canView" 
                        binary="true" 
                        inputId="linkCanView">
                      </p-checkbox>
                      <label for="linkCanView">Can View</label>
                    </div>
                    
                    <div class="permission-item">
                      <p-checkbox 
                        [(ngModel)]="linkPermissions.canDownload" 
                        binary="true" 
                        inputId="linkCanDownload">
                      </p-checkbox>
                      <label for="linkCanDownload">Can Download</label>
                    </div>
                  </div>
                </div>

                <!-- Link Options -->
                <div class="link-options">
                  <!-- Password Protection -->
                  <div class="option-item">
                    <div class="option-toggle">
                      <p-checkbox 
                        [(ngModel)]="linkHasPassword" 
                        binary="true" 
                        inputId="linkHasPassword">
                      </p-checkbox>
                      <label for="linkHasPassword">Password protect</label>
                    </div>
                    
                    <div class="option-input" *ngIf="linkHasPassword">
                      <p-password
                        [(ngModel)]="linkPassword"
                        placeholder="Enter password"
                        [feedback]="false"
                        class="w-full">
                      </p-password>
                    </div>
                  </div>

                  <!-- Download Limit -->
                  <div class="option-item">
                    <div class="option-toggle">
                      <p-checkbox 
                        [(ngModel)]="linkHasDownloadLimit" 
                        binary="true" 
                        inputId="linkHasDownloadLimit">
                      </p-checkbox>
                      <label for="linkHasDownloadLimit">Limit downloads</label>
                    </div>
                    
                    <div class="option-input" *ngIf="linkHasDownloadLimit">
                      <p-inputNumber
                        [(ngModel)]="linkMaxDownloads"
                        [min]="1"
                        [max]="1000"
                        placeholder="Max downloads"
                        class="w-full">
                      </p-inputNumber>
                    </div>
                  </div>

                  <!-- Expiration -->
                  <div class="option-item">
                    <div class="option-toggle">
                      <p-checkbox 
                        [(ngModel)]="linkHasExpiration" 
                        binary="true" 
                        inputId="linkHasExpiration">
                      </p-checkbox>
                      <label for="linkHasExpiration">Set expiration</label>
                    </div>
                    
                    <div class="option-input" *ngIf="linkHasExpiration">
                      <p-datePicker
                        [(ngModel)]="linkExpirationDate"
                        [showTime]="true"
                        [minDate]="minExpirationDate"
                        placeholder="Select expiration date"
                        class="w-full">
                      </p-datePicker>
                    </div>
                  </div>
                </div>

                <!-- Create Link Button -->
                <div class="create-link-actions">
                  <p-button 
                    label="Create Share Link" 
                    icon="pi pi-link"
                    (onClick)="createShareLink()"
                    [loading]="creatingLink()"
                    [disabled]="!isValidLinkPermissions()"
                    class="create-link-button">
                  </p-button>
                </div>
              </div>

              <!-- Existing Links -->
              <div class="existing-links-section" *ngIf="shareLinks().length > 0">
                <h4>Existing Share Links</h4>
                <div class="links-table">
                  <p-table [value]="shareLinks()" styleClass="p-datatable-sm">
                    <ng-template pTemplate="header">
                      <tr>
                        <th>Created</th>
                        <th>Permissions</th>
                        <th>Expires</th>
                        <th>Downloads</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </ng-template>
                    
                    <ng-template pTemplate="body" let-link>
                      <tr>
                        <td>{{ link.createdAt | date:'short' }}</td>
                        <td>
                          <div class="link-permissions">
                            <p-tag value="View" severity="info" *ngIf="link.permissions.canView"></p-tag>
                            <p-tag value="Download" severity="success" *ngIf="link.permissions.canDownload"></p-tag>
                          </div>
                        </td>
                        <td>
                          {{ link.expiresAt ? (link.expiresAt | date:'short') : 'Never' }}
                        </td>
                        <td>
                          {{ link.downloadCount }}{{ link.maxDownloads ? '/' + link.maxDownloads : '' }}
                        </td>
                        <td>
                          <p-tag 
                            [value]="link.isActive ? 'Active' : 'Inactive'" 
                            [severity]="link.isActive ? 'success' : 'danger'">
                          </p-tag>
                        </td>
                        <td>
                          <div class="link-actions">
                            <p-button 
                              icon="pi pi-copy" 
                              [text]="true" 
                              size="small"
                              (onClick)="copyLinkToClipboard(link)"
                              pTooltip="Copy link"
                              *ngIf="link.isActive">
                            </p-button>
                            <p-button 
                              icon="pi pi-trash" 
                              [text]="true" 
                              size="small"
                              severity="danger"
                              (onClick)="revokeShareLink(link)"
                              pTooltip="Revoke link">
                            </p-button>
                          </div>
                        </td>
                      </tr>
                    </ng-template>
                  </p-table>
                </div>
              </div>
            </div>
            </p-tabpanel>

            <!-- Current Shares Tab -->
            <p-tabpanel value="current">
            <div class="current-shares-content">
              <div class="shares-loading" *ngIf="loadingShares()">
                <p-progressSpinner></p-progressSpinner>
                <p>Loading current shares...</p>
              </div>

              <div class="shares-table" *ngIf="!loadingShares() && currentShares().length > 0">
                <p-table [value]="currentShares()" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>User</th>
                      <th>Permissions</th>
                      <th>Shared Date</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </ng-template>
                  
                  <ng-template pTemplate="body" let-share>
                    <tr>
                      <td>
                        <div class="shared-user-info">
                          <strong>{{ share.email }}</strong>
                        </div>
                      </td>
                      <td>
                        <div class="share-permissions">
                          <p-tag value="View" severity="info" *ngIf="share.permissions.canView"></p-tag>
                          <p-tag value="Edit" severity="warn" *ngIf="share.permissions.canEdit"></p-tag>
                          <p-tag value="Download" severity="success" *ngIf="share.permissions.canDownload"></p-tag>
                        </div>
                      </td>
                      <td>{{ share.sharedAt | date:'short' }}</td>
                      <td>{{ share.expiresAt ? (share.expiresAt | date:'short') : 'Never' }}</td>
                      <td>
                        <div class="share-actions">
                          <p-button 
                            icon="pi pi-pencil" 
                            [text]="true" 
                            size="small"
                            (onClick)="editUserPermissions(share)"
                            pTooltip="Edit permissions">
                          </p-button>
                          <p-button 
                            icon="pi pi-trash" 
                            [text]="true" 
                            size="small"
                            severity="danger"
                            (onClick)="removeUserShare(share)"
                            pTooltip="Remove access">
                          </p-button>
                        </div>
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>

              <div class="no-shares" *ngIf="!loadingShares() && currentShares().length === 0">
                <i class="pi pi-users no-shares-icon"></i>
                <h4>No Current Shares</h4>
                <p>This document is not currently shared with any users.</p>
              </div>
            </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>

      <ng-template pTemplate="footer">
        <div class="dialog-footer">
          <p-button 
            label="Close" 
            icon="pi pi-times" 
            [text]="true"
            (onClick)="onClose()">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styleUrl: './document-sharing-dialog.component.scss'
})
export class DocumentSharingDialogComponent implements OnInit, OnDestroy {
  private readonly sharingService = inject(DocumentSharingService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();

  @Input() document: Document | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() documentShared = new EventEmitter<void>();

  // State signals
  readonly activeTabValue = signal('users');
  readonly sharing = signal(false);
  readonly creatingLink = signal(false);
  readonly loadingShares = signal(false);
  readonly searchingUsers = signal(false);

  // User sharing state
  readonly selectedUsers = signal<User[]>([]);
  readonly userSuggestions = signal<User[]>([]);
  selectedUser: User | null = null;
  shareMessage = '';
  hasExpiration = false;
  expirationDate: Date | null = null;
  sharePermissions: SharePermissions = {
    canView: true,
    canEdit: false,
    canDownload: false,
    canShare: false
  };

  // Link sharing state
  linkPermissions: SharePermissions = {
    canView: true,
    canEdit: false,
    canDownload: false,
    canShare:false
  };
  linkHasPassword = false;
  linkPassword = '';
  linkHasExpiration = false;
  linkExpirationDate: Date | null = null;
  linkHasDownloadLimit = false;
  linkMaxDownloads = 10;

  // Current shares
  readonly currentShares = signal<SharedUser[]>([]);
  readonly shareLinks = signal<ShareLink[]>([]);

  // Computed properties
  readonly minExpirationDate = new Date();

  ngOnInit() {
    if (this.document) {
      this.loadCurrentShares();
      this.loadShareLinks();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  private resetForm() {
    this.selectedUsers.set([]);
    this.selectedUser = null;
    this.shareMessage = '';
    this.hasExpiration = false;
    this.expirationDate = null;
    this.sharePermissions = {
      canView: true,
      canEdit: false,
      canDownload: false,
      canShare:false,
    };
    this.resetLinkForm();
  }

  private resetLinkForm() {
    this.linkPermissions = {
      canView: true,
      canEdit: false,
      canDownload: false,
      canShare:false
    };
    this.linkHasPassword = false;
    this.linkPassword = '';
    this.linkHasExpiration = false;
    this.linkExpirationDate = null;
    this.linkHasDownloadLimit = false;
    this.linkMaxDownloads = 10;
  }

  searchUsers(event: any) {
    const query = event.query;
    if (!query || query.length < 2) {
      this.userSuggestions.set([]);
      return;
    }

    this.searchingUsers.set(true);
    this.sharingService.searchUsersForSharing(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          // Filter out already selected users
          const selectedEmails = this.selectedUsers().map(u => u.email);
          const filteredUsers = users.filter(u => !selectedEmails.includes(u.email));
          this.userSuggestions.set(filteredUsers);
          this.searchingUsers.set(false);
        },
        error: () => {
          this.userSuggestions.set([]);
          this.searchingUsers.set(false);
        }
      });
  }

  addUserToShare(event: any) {
    const user = event.value as User;
    const current = this.selectedUsers();
    if (!current.find(u => u.email === user.email)) {
      this.selectedUsers.set([...current, user]);
    }
    this.selectedUser = null;
  }

  removeUserFromShare(user: User) {
    const current = this.selectedUsers();
    this.selectedUsers.set(current.filter(u => u.email !== user.email));
  }

  isValidPermissions(): boolean {
    return this.sharePermissions.canView ||
      this.sharePermissions.canEdit ||
      this.sharePermissions.canDownload;
  }

  isValidLinkPermissions(): boolean {
    return this.linkPermissions.canView || this.linkPermissions.canDownload;
  }

  shareWithUsers() {
    if (!this.document || this.selectedUsers().length === 0 || !this.isValidPermissions()) {
      return;
    }

    this.sharing.set(true);

    const request = {
      documentId: this.document.id,
      userEmails: this.selectedUsers().map(u => u.email),
      permissions: this.sharePermissions,
      message: this.shareMessage || undefined,
      expiresAt: this.hasExpiration ? this.expirationDate || undefined : undefined
    };

    this.sharingService.shareDocument(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sharing.set(false);
          this.documentShared.emit();
          this.loadCurrentShares();
          this.resetForm();
          this.activeTabValue.set('current'); // Switch to current shares tab
        },
        error: () => {
          this.sharing.set(false);
        }
      });
  }

  createShareLink() {
    if (!this.document || !this.isValidLinkPermissions()) {
      return;
    }

    this.creatingLink.set(true);

    const request = {
      documentId: this.document.id,
      permissions: this.linkPermissions,
      expiresAt: this.linkHasExpiration ? this.linkExpirationDate || undefined : undefined,
      password: this.linkHasPassword ? this.linkPassword || undefined : undefined,
      maxDownloads: this.linkHasDownloadLimit ? this.linkMaxDownloads || undefined : undefined
    };

    this.sharingService.createShareLink(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shareLink) => {
          this.creatingLink.set(false);
          this.loadShareLinks();
          this.resetLinkForm();
          // Automatically copy the new link to clipboard
          this.sharingService.copyShareLinkToClipboard(shareLink);
        },
        error: () => {
          this.creatingLink.set(false);
        }
      });
  }

  copyLinkToClipboard(shareLink: ShareLink) {
    this.sharingService.copyShareLinkToClipboard(shareLink);
  }

  revokeShareLink(shareLink: ShareLink) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to revoke this share link? Users will no longer be able to access the document using this link.',
      header: 'Revoke Share Link',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (this.document) {
          this.sharingService.revokeShareLink(this.document.id, shareLink.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.loadShareLinks();
              }
            });
        }
      }
    });
  }

  editUserPermissions(share: SharedUser) {
    // TODO: Implement edit permissions dialog
    console.log('Edit permissions for:', share);
  }

  removeUserShare(share: SharedUser) {
    this.confirmationService.confirm({
      message: `Are you sure you want to remove access for ${share.email}?`,
      header: 'Remove Access',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (this.document) {
          this.sharingService.removeUserFromSharing(this.document.id, share.userId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.loadCurrentShares();
              }
            });
        }
      }
    });
  }

  private loadCurrentShares() {
    if (!this.document) return;

    this.loadingShares.set(true);
    this.sharingService.getDocumentSharedUsers(this.document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shares) => {
          this.currentShares.set(shares);
          this.loadingShares.set(false);
        },
        error: () => {
          this.currentShares.set([]);
          this.loadingShares.set(false);
        }
      });
  }

  private loadShareLinks() {
    if (!this.document) return;

    this.sharingService.getDocumentShareLinks(this.document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (links) => {
          this.shareLinks.set(links);
        },
        error: () => {
          this.shareLinks.set([]);
        }
      });
  }
}