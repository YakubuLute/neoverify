import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { UserRole } from '../../shared/models/auth.models';
import { catchError, of } from 'rxjs';

interface DashboardCard {
  title: string;
  value: string;
  icon: string;
  trend?: string;
  trendIcon?: string;
  color: string;
  route?: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

interface RecentActivity {
  title: string;
  description: string;
  time: string;
  icon: string;
  type: 'success' | 'warning' | 'info' | 'danger';
}

interface DocumentStats {
  totalDocuments: number;
  documentsToday: number;
  pendingVerifications: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
  templatesCount: number;
  sharedDocuments: number;
  storageUsed: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [SharedModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);
  private readonly router = inject(Router);

  readonly currentUser = signal<any>(null);
  readonly userRole = signal<UserRole | null>(null);
  readonly documentStats = signal<DocumentStats | null>(null);
  readonly UserRole = UserRole; // Make enum available in template

  // Platform Admin Dashboard Data
  readonly platformAdminStats = signal<DashboardCard[]>([
    { title: 'Total Organizations', value: '2,847', icon: 'pi pi-building', trend: '+12%', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/admin/organizations' },
    { title: 'Documents Verified', value: '1.2M', icon: 'pi pi-file-check', trend: '+8%', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/admin/documents' },
    { title: 'Active Users', value: '45,231', icon: 'pi pi-users', trend: '+15%', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/admin/users' },
    { title: 'System Health', value: '99.9%', icon: 'pi pi-heart', trend: 'Stable', trendIcon: 'pi pi-check', color: 'text-purple-400', route: '/admin/system' }
  ]);

  readonly platformAdminActions = signal<QuickAction[]>([
    { title: 'Manage Organizations', description: 'View and manage all organizations', icon: 'pi pi-building', route: '/admin/organizations', color: 'bg-cyan-500' },
    { title: 'System Analytics', description: 'View platform-wide analytics', icon: 'pi pi-chart-bar', route: '/admin/analytics', color: 'bg-purple-500' },
    { title: 'User Management', description: 'Manage platform users', icon: 'pi pi-users', route: '/admin/users', color: 'bg-cyan-500' },
    { title: 'Security Settings', description: 'Configure platform security', icon: 'pi pi-shield', route: '/admin/security', color: 'bg-purple-500' }
  ]);

  // Organization Admin Dashboard Data
  readonly orgAdminStats = computed<DashboardCard[]>(() => {
    const stats = this.documentStats();
    return [
      { title: 'Team Members', value: '24', icon: 'pi pi-users', trend: '+3', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/organization/users' },
      { title: 'Documents Issued', value: stats ? stats.totalDocuments.toLocaleString() : '0', icon: 'pi pi-file-plus', trend: stats ? `+${stats.documentsToday}` : '+0', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/documents' },
      { title: 'Verifications Today', value: stats ? stats.verifiedDocuments.toString() : '0', icon: 'pi pi-verified', trend: stats ? `+${Math.floor(stats.verifiedDocuments * 0.2)}` : '+0', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents?status=verified' },
      { title: 'Pending Reviews', value: stats ? stats.pendingVerifications.toString() : '0', icon: 'pi pi-clock', trend: stats && stats.pendingVerifications > 0 ? 'Needs attention' : 'All clear', trendIcon: stats && stats.pendingVerifications > 0 ? 'pi pi-exclamation-triangle' : 'pi pi-check', color: 'text-purple-400', route: '/documents?status=pending' }
    ];
  });

  readonly orgAdminActions = signal<QuickAction[]>([
    { title: 'Issue Document', description: 'Create and issue new documents', icon: 'pi pi-file-plus', route: '/documents/upload', color: 'bg-cyan-500' },
    { title: 'View All Documents', description: 'Manage organization documents', icon: 'pi pi-file', route: '/documents', color: 'bg-purple-500' },
    { title: 'Audit Trail', description: 'View document audit logs', icon: 'pi pi-history', route: '/documents/audit', color: 'bg-cyan-500' },
    { title: 'Manage Templates', description: 'Create and edit document templates', icon: 'pi pi-bookmark', route: '/documents/templates', color: 'bg-purple-500' }
  ]);

  // Issuer Dashboard Data
  readonly issuerStats = computed<DashboardCard[]>(() => {
    const stats = this.documentStats();
    const successRate = stats && stats.totalDocuments > 0
      ? ((stats.verifiedDocuments / stats.totalDocuments) * 100).toFixed(1) + '%'
      : '0%';

    return [
      { title: 'Documents Issued', value: stats ? stats.totalDocuments.toLocaleString() : '0', icon: 'pi pi-file-plus', trend: stats ? `+${stats.documentsToday}` : '+0', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents' },
      { title: 'Pending Reviews', value: stats ? stats.pendingVerifications.toString() : '0', icon: 'pi pi-clock', trend: stats && stats.pendingVerifications > 0 ? 'Needs attention' : 'All clear', trendIcon: stats && stats.pendingVerifications > 0 ? 'pi pi-exclamation-triangle' : 'pi pi-check', color: 'text-purple-400', route: '/documents?status=pending' },
      { title: 'Verified Today', value: stats ? stats.verifiedDocuments.toString() : '0', icon: 'pi pi-verified', trend: stats ? `+${Math.floor(stats.verifiedDocuments * 0.3)}` : '+0', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents?status=verified' },
      { title: 'Success Rate', value: successRate, icon: 'pi pi-check-circle', trend: stats && stats.rejectedDocuments === 0 ? 'Perfect!' : 'Good', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/documents' }
    ];
  });

  readonly issuerActions = signal<QuickAction[]>([
    { title: 'Upload Document', description: 'Issue a new document', icon: 'pi pi-upload', route: '/documents/upload', color: 'bg-cyan-500' },
    { title: 'My Documents', description: 'View all issued documents', icon: 'pi pi-file', route: '/documents', color: 'bg-purple-500' },
    { title: 'Use Template', description: 'Create document from template', icon: 'pi pi-bookmark', route: '/documents/templates', color: 'bg-cyan-500' },
    { title: 'Bulk Upload', description: 'Upload multiple documents', icon: 'pi pi-files', route: '/documents/upload?mode=bulk', color: 'bg-purple-500' }
  ]);

  // Individual User Dashboard Data
  readonly individualStats = computed<DashboardCard[]>(() => {
    const stats = this.documentStats();
    return [
      { title: 'My Documents', value: stats ? stats.totalDocuments.toString() : '0', icon: 'pi pi-file', trend: stats ? `+${stats.documentsToday}` : '+0', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents' },
      { title: 'Verified Documents', value: stats ? stats.verifiedDocuments.toString() : '0', icon: 'pi pi-verified', trend: stats && stats.verifiedDocuments > 0 ? 'Secure' : 'None yet', trendIcon: 'pi pi-shield', color: 'text-purple-400', route: '/documents?status=verified' },
      { title: 'Shared Documents', value: stats ? stats.sharedDocuments.toString() : '0', icon: 'pi pi-share-alt', trend: stats && stats.sharedDocuments > 0 ? 'Active' : 'None', trendIcon: 'pi pi-share-alt', color: 'text-cyan-400', route: '/documents?filter=shared' },
      { title: 'Storage Used', value: stats ? stats.storageUsed : '0 MB', icon: 'pi pi-database', trend: 'Available', trendIcon: 'pi pi-check', color: 'text-purple-400', route: '/profile' }
    ];
  });

  readonly individualActions = signal<QuickAction[]>([
    { title: 'Verify Document', description: 'Verify document authenticity', icon: 'pi pi-search', route: '/documents/verify', color: 'bg-cyan-500' },
    { title: 'My Documents', description: 'View your documents', icon: 'pi pi-file', route: '/documents', color: 'bg-purple-500' },
    { title: 'Upload Document', description: 'Upload new document', icon: 'pi pi-upload', route: '/documents/upload', color: 'bg-cyan-500' },
    { title: 'Share Document', description: 'Share a document securely', icon: 'pi pi-share-alt', route: '/documents?action=share', color: 'bg-purple-500' }
  ]);

  readonly recentActivities = computed<RecentActivity[]>(() => {
    const stats = this.documentStats();
    const baseActivities: RecentActivity[] = [
      { title: 'Document Verified', description: 'Certificate #DOC-2024-001 verified successfully', time: '2 minutes ago', icon: 'pi pi-check-circle', type: 'success' },
      { title: 'New Document Uploaded', description: 'Academic transcript uploaded for verification', time: '15 minutes ago', icon: 'pi pi-upload', type: 'info' },
      { title: 'Verification Request', description: 'External verification request received', time: '1 hour ago', icon: 'pi pi-bell', type: 'warning' },
      { title: 'Profile Updated', description: 'Profile information updated successfully', time: '2 hours ago', icon: 'pi pi-user', type: 'info' },
      { title: 'Document Shared', description: 'Diploma shared with employer', time: '3 hours ago', icon: 'pi pi-share-alt', type: 'success' }
    ];

    // Add document-specific activities based on stats
    if (stats) {
      if (stats.pendingVerifications > 0) {
        baseActivities.unshift({
          title: 'Pending Verifications',
          description: `${stats.pendingVerifications} documents awaiting verification`,
          time: 'Now',
          icon: 'pi pi-clock',
          type: 'warning'
        });
      }

      if (stats.documentsToday > 0) {
        baseActivities.splice(1, 0, {
          title: 'Documents Added Today',
          description: `${stats.documentsToday} new documents uploaded today`,
          time: 'Today',
          icon: 'pi pi-file-plus',
          type: 'info'
        });
      }
    }

    return baseActivities.slice(0, 5); // Keep only 5 most recent
  });

  // Computed properties for role-based data
  readonly currentStats = computed(() => {
    switch (this.userRole()) {
      case UserRole.PLATFORM_ADMIN:
        return this.platformAdminStats();
      case UserRole.ORG_ADMIN:
        return this.orgAdminStats();
      case UserRole.ISSUER:
        return this.issuerStats();
      case UserRole.AUDITOR:
        return this.auditStats();
      default:
        return this.individualStats();
    }
  });

  // Auditor Dashboard Data
  readonly auditStats = computed<DashboardCard[]>(() => {
    const stats = this.documentStats();
    return [
      { title: 'Total Documents', value: stats ? stats.totalDocuments.toLocaleString() : '0', icon: 'pi pi-file', trend: stats ? `+${stats.documentsToday}` : '+0', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents' },
      { title: 'Audit Entries', value: stats ? (stats.totalDocuments * 3).toLocaleString() : '0', icon: 'pi pi-history', trend: 'Active', trendIcon: 'pi pi-check', color: 'text-purple-400', route: '/documents/audit' },
      { title: 'Compliance Score', value: '98.2%', icon: 'pi pi-shield', trend: '+0.5%', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents/audit/compliance' },
      { title: 'Violations', value: stats ? stats.rejectedDocuments.toString() : '0', icon: 'pi pi-exclamation-triangle', trend: stats && stats.rejectedDocuments === 0 ? 'None' : 'Review needed', trendIcon: stats && stats.rejectedDocuments === 0 ? 'pi pi-check' : 'pi pi-exclamation-triangle', color: 'text-purple-400', route: '/documents?status=rejected' }
    ];
  });

  readonly currentActions = computed(() => {
    switch (this.userRole()) {
      case UserRole.PLATFORM_ADMIN:
        return this.platformAdminActions();
      case UserRole.ORG_ADMIN:
        return this.orgAdminActions();
      case UserRole.ISSUER:
        return this.issuerActions();
      case UserRole.AUDITOR:
        return this.auditActions();
      default:
        return this.individualActions();
    }
  });

  readonly auditActions = signal<QuickAction[]>([
    { title: 'Audit Trail', description: 'View comprehensive audit logs', icon: 'pi pi-history', route: '/documents/audit', color: 'bg-cyan-500' },
    { title: 'Compliance Dashboard', description: 'Monitor compliance metrics', icon: 'pi pi-chart-bar', route: '/documents/audit/compliance', color: 'bg-purple-500' },
    { title: 'Generate Report', description: 'Create compliance reports', icon: 'pi pi-file-export', route: '/documents/audit/scheduled-reports', color: 'bg-cyan-500' },
    { title: 'Review Documents', description: 'Review flagged documents', icon: 'pi pi-search', route: '/documents?status=flagged', color: 'bg-purple-500' }
  ]);

  readonly dashboardTitle = computed(() => {
    switch (this.userRole()) {
      case UserRole.PLATFORM_ADMIN:
        return 'Platform Administration';
      case UserRole.ORG_ADMIN:
        return 'Organization Dashboard';
      case UserRole.ISSUER:
        return 'Document Issuer Dashboard';
      case UserRole.AUDITOR:
        return 'Audit & Compliance Dashboard';
      default:
        return 'My Dashboard';
    }
  });

  readonly welcomeMessage = computed(() => {
    const user = this.currentUser();
    const name = user?.name || 'User';
    switch (this.userRole()) {
      case UserRole.PLATFORM_ADMIN:
        return `Welcome back, ${name}. Here's your platform overview.`;
      case UserRole.ORG_ADMIN:
        return `Welcome back, ${name}. Manage your organization efficiently.`;
      case UserRole.ISSUER:
        return `Welcome back, ${name}. Ready to issue some documents?`;
      case UserRole.AUDITOR:
        return `Welcome back, ${name}. Monitor compliance and audit activities.`;
      default:
        return `Welcome back, ${name}. Your documents are secure with us.`;
    }
  });

  ngOnInit(): void {
    // Get current user and role from auth service
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);
    this.userRole.set(user?.role || UserRole.VERIFIER);

    // Load document statistics
    this.loadDocumentStats();
  }

  private loadDocumentStats(): void {
    this.documentService.getDocumentStats()
      .pipe(
        catchError(error => {
          console.error('Failed to load document stats:', error);
          // Return mock data for development
          return of({
            totalDocuments: 156,
            documentsToday: 8,
            pendingVerifications: 3,
            verifiedDocuments: 142,
            rejectedDocuments: 2,
            templatesCount: 12,
            sharedDocuments: 24,
            storageUsed: '2.3 GB'
          });
        })
      )
      .subscribe(stats => {
        this.documentStats.set(stats);
      });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getActivityTypeClass(type: RecentActivity['type']): string {
    switch (type) {
      case 'success':
        return 'text-cyan-400 bg-cyan-500/10';
      case 'warning':
        return 'text-purple-400 bg-purple-500/10';
      case 'info':
        return 'text-cyan-400 bg-cyan-500/10';
      case 'danger':
        return 'text-red-400 bg-red-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  }
}
