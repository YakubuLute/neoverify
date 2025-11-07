import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SHARED_IMPORTS } from '../../../shared';
import { Subject, takeUntil } from 'rxjs';

interface UserSession {
    id: string;
    deviceInfo: {
        browser: string;
        os: string;
        device: string;
    };
    location: {
        ip: string;
        city: string;
        country: string;
    };
    createdAt: Date;
    lastActivity: Date;
    isCurrent: boolean;
}

@Component({
    selector: 'app-session-management',
    standalone: true,
    imports: SHARED_IMPORTS,
    template: `
    <div class="session-management">
      <!-- Header -->
      <div class="header mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">
              Active Sessions
            </h2>
            <p class="text-surface-600 dark:text-surface-400">
              Manage your active sessions and sign out from devices you don't recognize
            </p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Refresh"
              icon="pi pi-refresh"
              [outlined]="true"
              size="small"
              (onClick)="loadSessions()"
              [loading]="loading()"
            ></p-button>
            <p-button
              label="Sign Out All Others"
              icon="pi pi-sign-out"
              severity="danger"
              [outlined]="true"
              size="small"
              (onClick)="revokeAllOtherSessions()"
              [disabled]="loading() || sessions().length <= 1"
            ></p-button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <i class="pi pi-spin pi-spinner text-3xl text-surface-400 mb-4"></i>
              <p class="text-surface-600 dark:text-surface-400">Loading sessions...</p>
            </div>
          </div>
        </div>
      } @else {
        <!-- Sessions List -->
        <div class="sessions-list space-y-4">
          @if (sessions().length === 0) {
            <div class="empty-state">
              <p-card>
                <div class="text-center py-8">
                  <i class="pi pi-desktop text-4xl text-surface-400 mb-4"></i>
                  <h3 class="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-2">
                    No Active Sessions
                  </h3>
                  <p class="text-surface-600 dark:text-surface-400">
                    You don't have any active sessions at the moment.
                  </p>
                </div>
              </p-card>
            </div>
          } @else {
            @for (session of sessions(); track session.id) {
              <div class="session-card">
                <p-card>
                  <div class="flex items-start justify-between">
                    <!-- Session Info -->
                    <div class="flex items-start gap-4 flex-1">
                      <!-- Device Icon -->
                      <div class="device-icon">
                        <div class="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-lg flex items-center justify-center">
                          <i [class]="getDeviceIcon(session.deviceInfo)" class="text-xl text-surface-600"></i>
                        </div>
                      </div>

                      <!-- Session Details -->
                      <div class="session-details flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <h3 class="font-semibold text-surface-900 dark:text-surface-0">
                            {{ session.deviceInfo.browser }} on {{ session.deviceInfo.os }}
                          </h3>
                          @if (session.isCurrent) {
                            <p-tag value="Current Session" severity="success" class="text-xs"></p-tag>
                          }
                        </div>

                        <div class="session-meta space-y-1">
                          <div class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                            <i class="pi pi-map-marker text-xs"></i>
                            <span>{{ session.location.city }}, {{ session.location.country }}</span>
                            <span class="text-surface-400">•</span>
                            <span>{{ session.location.ip }}</span>
                          </div>

                          <div class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                            <i class="pi pi-clock text-xs"></i>
                            <span>Last active: {{ formatRelativeTime(session.lastActivity) }}</span>
                          </div>

                          <div class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                            <i class="pi pi-calendar text-xs"></i>
                            <span>Started: {{ formatDate(session.createdAt) }}</span>
                          </div>
                        </div>

                        <!-- Security Indicators -->
                        <div class="security-indicators mt-3 flex gap-2">
                          @if (isRecentSession(session)) {
                            <p-tag value="Recent" severity="info" class="text-xs"></p-tag>
                          }
                          @if (isSuspiciousLocation(session)) {
                            <p-tag value="New Location" severity="warn" class="text-xs"></p-tag>
                          }
                          @if (isLongRunningSession(session)) {
                            <p-tag value="Long Running" severity="secondary" class="text-xs"></p-tag>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="session-actions">
                      @if (!session.isCurrent) {
                        <p-button
                          label="Sign Out"
                          icon="pi pi-sign-out"
                          severity="danger"
                          [outlined]="true"
                          size="small"
                          (onClick)="revokeSession(session.id)"
                          [loading]="revokingSession() === session.id"
                        ></p-button>
                      } @else {
                        <p-button
                          label="This Device"
                          severity="success"
                          [outlined]="true"
                          size="small"
                          [disabled]="true"
                        ></p-button>
                      }
                    </div>
                  </div>

                  <!-- Expandable Details -->
                  <div class="session-details-toggle mt-4">
                    <p-button
                      [label]="expandedSessions().has(session.id) ? 'Hide Details' : 'Show Details'"
                      [icon]="expandedSessions().has(session.id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
                      [text]="true"
                      size="small"
                      (onClick)="toggleSessionDetails(session.id)"
                    ></p-button>
                  </div>

                  @if (expandedSessions().has(session.id)) {
                    <div class="expanded-details mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 class="font-medium text-surface-900 dark:text-surface-0 mb-2">Device Information</h4>
                          <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                              <span class="text-surface-600 dark:text-surface-400">Browser:</span>
                              <span>{{ session.deviceInfo.browser }}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-surface-600 dark:text-surface-400">Operating System:</span>
                              <span>{{ session.deviceInfo.os }}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-surface-600 dark:text-surface-400">Device Type:</span>
                              <span>{{ session.deviceInfo.device }}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 class="font-medium text-surface-900 dark:text-surface-0 mb-2">Location & Security</h4>
                          <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                              <span class="text-surface-600 dark:text-surface-400">IP Address:</span>
                              <span class="font-mono">{{ session.location.ip }}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-surface-600 dark:text-surface-400">Location:</span>
                              <span>{{ session.location.city }}, {{ session.location.country }}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-surface-600 dark:text-surface-400">Session Duration:</span>
                              <span>{{ getSessionDuration(session) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </p-card>
              </div>
            }
          }
        </div>
      }

      <!-- Security Tips -->
      <div class="security-tips mt-8">
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 border-b border-surface-200 dark:border-surface-700">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <i class="pi pi-shield text-blue-600"></i>
                Security Tips
              </h3>
            </div>
          </ng-template>

          <div class="space-y-4">
            <div class="tip-item flex items-start gap-3">
              <i class="pi pi-check-circle text-green-600 mt-1"></i>
              <div>
                <p class="font-medium">Review sessions regularly</p>
                <p class="text-sm text-surface-600 dark:text-surface-400">
                  Check your active sessions periodically and sign out from devices you don't recognize.
                </p>
              </div>
            </div>

            <div class="tip-item flex items-start gap-3">
              <i class="pi pi-check-circle text-green-600 mt-1"></i>
              <div>
                <p class="font-medium">Sign out from public devices</p>
                <p class="text-sm text-surface-600 dark:text-surface-400">
                  Always sign out when using shared or public computers to protect your account.
                </p>
              </div>
            </div>

            <div class="tip-item flex items-start gap-3">
              <i class="pi pi-check-circle text-green-600 mt-1"></i>
              <div>
                <p class="font-medium">Enable two-factor authentication</p>
                <p class="text-sm text-surface-600 dark:text-surface-400">
                  Add an extra layer of security to your account with MFA for better protection.
                </p>
              </div>
            </div>

            <div class="tip-item flex items-start gap-3">
              <i class="pi pi-check-circle text-green-600 mt-1"></i>
              <div>
                <p class="font-medium">Watch for suspicious activity</p>
                <p class="text-sm text-surface-600 dark:text-surface-400">
                  Look out for sessions from unfamiliar locations or devices and revoke them immediately.
                </p>
              </div>
            </div>
          </div>
        </p-card>
      </div>
    </div>
  `,
    styles: [`
    .session-management {
      max-width: 1200px;
    }

    .session-card {
      transition: all 0.2s;
    }

    .session-card:hover {
      transform: translateY(-1px);
    }

    .device-icon {
      flex-shrink: 0;
    }

    .session-details {
      min-width: 0; /* Allow text truncation */
    }

    .session-actions {
      flex-shrink: 0;
    }

    .security-indicators {
      flex-wrap: wrap;
    }

    .tip-item {
      padding: 0.5rem 0;
    }

    @media (max-width: 768px) {
      .session-card .flex {
        flex-direction: column;
        gap: 1rem;
      }

      .session-actions {
        align-self: stretch;
      }

      .session-actions p-button {
        width: 100%;
      }
    }
  `]
})
export class SessionManagementComponent implements OnInit, OnDestroy {
    private readonly authService = inject(AuthService);
    private readonly notificationService = inject(NotificationService);
    private readonly destroy$ = new Subject<void>();

    // Signals
    readonly sessions = signal<UserSession[]>([]);
    readonly loading = signal<boolean>(false);
    readonly revokingSession = signal<string | null>(null);
    readonly expandedSessions = signal<Set<string>>(new Set());

    ngOnInit(): void {
        this.loadSessions();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadSessions(): void {
        this.loading.set(true);

        // Mock API call to load sessions
        setTimeout(() => {
            const mockSessions: UserSession[] = [
                {
                    id: 'current-session',
                    deviceInfo: {
                        browser: 'Chrome 118',
                        os: 'macOS 14.0',
                        device: 'Desktop'
                    },
                    location: {
                        ip: '192.168.1.100',
                        city: 'San Francisco',
                        country: 'United States'
                    },
                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                    lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                    isCurrent: true
                },
                {
                    id: 'mobile-session',
                    deviceInfo: {
                        browser: 'Safari 17',
                        os: 'iOS 17.1',
                        device: 'Mobile'
                    },
                    location: {
                        ip: '10.0.0.50',
                        city: 'San Francisco',
                        country: 'United States'
                    },
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                    lastActivity: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
                    isCurrent: false
                },
                {
                    id: 'work-session',
                    deviceInfo: {
                        browser: 'Firefox 119',
                        os: 'Windows 11',
                        device: 'Desktop'
                    },
                    location: {
                        ip: '203.0.113.45',
                        city: 'New York',
                        country: 'United States'
                    },
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
                    lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                    isCurrent: false
                }
            ];

            this.sessions.set(mockSessions);
            this.loading.set(false);
        }, 1000);
    }

    revokeSession(sessionId: string): void {
        this.revokingSession.set(sessionId);

        // Mock API call to revoke session
        setTimeout(() => {
            const currentSessions = this.sessions();
            const updatedSessions = currentSessions.filter(s => s.id !== sessionId);
            this.sessions.set(updatedSessions);
            this.revokingSession.set(null);
            this.notificationService.success('Session signed out successfully');
        }, 1000);
    }

    revokeAllOtherSessions(): void {
        this.loading.set(true);

        // Mock API call to revoke all other sessions
        setTimeout(() => {
            const currentSessions = this.sessions();
            const currentSession = currentSessions.find(s => s.isCurrent);
            this.sessions.set(currentSession ? [currentSession] : []);
            this.loading.set(false);
            this.notificationService.success('All other sessions have been signed out');
        }, 1500);
    }

    toggleSessionDetails(sessionId: string): void {
        const expanded = this.expandedSessions();
        const newExpanded = new Set(expanded);

        if (newExpanded.has(sessionId)) {
            newExpanded.delete(sessionId);
        } else {
            newExpanded.add(sessionId);
        }

        this.expandedSessions.set(newExpanded);
    }

    getDeviceIcon(deviceInfo: UserSession['deviceInfo']): string {
        if (deviceInfo.device.toLowerCase().includes('mobile') || deviceInfo.device.toLowerCase().includes('tablet')) {
            return 'pi pi-mobile';
        }
        return 'pi pi-desktop';
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }
    }

    getSessionDuration(session: UserSession): string {
        const durationMs = session.lastActivity.getTime() - session.createdAt.getTime();
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
        const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));

        if (durationDays > 0) {
            return `${durationDays} day${durationDays > 1 ? 's' : ''}`;
        } else if (durationHours > 0) {
            return `${durationHours} hour${durationHours > 1 ? 's' : ''}`;
        } else {
            return 'Less than 1 hour';
        }
    }

    isRecentSession(session: UserSession): boolean {
        const hoursSinceCreated = (Date.now() - session.createdAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreated < 24;
    }

    isSuspiciousLocation(session: UserSession): boolean {
        // Mock logic - in real app, compare with user's typical locations
        return session.location.city !== 'San Francisco';
    }

    isLongRunningSession(session: UserSession): boolean {
        const daysSinceCreated = (Date.now() - session.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreated > 7;
    }
}