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
  readonly orgAdminStats = signal<DashboardCard[]>([
    { title: 'Team Members', value: '24', icon: 'pi pi-users', trend: '+3', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/organization/users' },
    { title: 'Documents Issued', value: '1,847', icon: 'pi pi-file-plus', trend: '+127', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/documents' },
    { title: 'Verifications Today', value: '89', icon: 'pi pi-verified', trend: '+23', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents/analytics' },
    { title: 'API Usage', value: '2.3K', icon: 'pi pi-code', trend: '+15%', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/organization/api-keys' }
  ]);

  readonly orgAdminActions = signal<QuickAction[]>([
    { title: 'Issue Document', description: 'Create and issue new documents', icon: 'pi pi-file-plus', route: '/documents/upload', color: 'bg-cyan-500' },
    { title: 'Manage Team', description: 'Add and manage team members', icon: 'pi pi-users', route: '/organization/users', color: 'bg-purple-500' },
    { title: 'View Analytics', description: 'Document verification analytics', icon: 'pi pi-chart-line', route: '/documents/analytics', color: 'bg-cyan-500' },
    { title: 'Organization Settings', description: 'Configure organization settings', icon: 'pi pi-cog', route: '/organization/settings', color: 'bg-purple-500' }
  ]);

  // Issuer Dashboard Data
  readonly issuerStats = signal<DashboardCard[]>([
    { title: 'Documents Issued', value: '342', icon: 'pi pi-file-plus', trend: '+18', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents' },
    { title: 'Pending Reviews', value: '7', icon: 'pi pi-clock', trend: '-2', trendIcon: 'pi pi-arrow-down', color: 'text-purple-400', route: '/documents?status=pending' },
    { title: 'Verified Today', value: '23', icon: 'pi pi-verified', trend: '+5', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents?status=verified' },
    { title: 'Success Rate', value: '98.5%', icon: 'pi pi-check-circle', trend: '+0.3%', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/documents/analytics' }
  ]);

  readonly issuerActions = signal<QuickAction[]>([
    { title: 'Upload Document', description: 'Issue a new document', icon: 'pi pi-upload', route: '/documents/upload', color: 'bg-cyan-500' },
    { title: 'My Documents', description: 'View all issued documents', icon: 'pi pi-file', route: '/documents', color: 'bg-purple-500' },
    { title: 'Bulk Upload', description: 'Upload multiple documents', icon: 'pi pi-files', route: '/documents/bulk-upload', color: 'bg-cyan-500' },
    { title: 'Templates', description: 'Manage document templates', icon: 'pi pi-bookmark', route: '/documents/templates', color: 'bg-purple-500' }
  ]);

  // Individual User Dashboard Data
  readonly individualStats = signal<DashboardCard[]>([
    { title: 'My Documents', value: '12', icon: 'pi pi-file', trend: '+2', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents' },
    { title: 'Verifications', value: '45', icon: 'pi pi-verified', trend: '+8', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/documents?tab=verified' },
    { title: 'Shared Links', value: '6', icon: 'pi pi-share-alt', trend: '+1', trendIcon: 'pi pi-arrow-up', color: 'text-cyan-400', route: '/documents?tab=shared' },
    { title: 'Storage Used', value: '2.3GB', icon: 'pi pi-database', trend: '+0.5GB', trendIcon: 'pi pi-arrow-up', color: 'text-purple-400', route: '/profile/storage' }
  ]);

  readonly individualActions = signal<QuickAction[]>([
    { title: 'Verify Document', description: 'Verify document authenticity', icon: 'pi pi-search', route: '/documents/verify', color: 'bg-cyan-500' },
    { title: 'My Documents', description: 'View your documents', icon: 'pi pi-file', route: '/documents', color: 'bg-purple-500' },
    { title: 'Upload Document', description: 'Upload new document', icon: 'pi pi-upload', route: '/documents/upload', color: 'bg-cyan-500' },
    { title: 'Profile Settings', description: 'Manage your profile', icon: 'pi pi-user', route: '/profile', color: 'bg-purple-500' }
  ]);

  readonly recentActivities = signal<RecentActivity[]>([
    { title: 'Document Verified', description: 'Certificate #DOC-2024-001 verified successfully', time: '2 minutes ago', icon: 'pi pi-check-circle', type: 'success' },
    { title: 'New Document Uploaded', description: 'Academic transcript uploaded for verification', time: '15 minutes ago', icon: 'pi pi-upload', type: 'info' },
    { title: 'Verification Request', description: 'External verification request received', time: '1 hour ago', icon: 'pi pi-bell', type: 'warning' },
    { title: 'Profile Updated', description: 'Profile information updated successfully', time: '2 hours ago', icon: 'pi pi-user', type: 'info' },
    { title: 'Document Shared', description: 'Diploma shared with employer', time: '3 hours ago', icon: 'pi pi-share-alt', type: 'success' }
  ]);

  // Computed properties for role-based data
  readonly currentStats = computed(() => {
    switch (this.userRole()) {
      case UserRole.PLATFORM_ADMIN:
        return this.platformAdminStats();
      case UserRole.ORG_ADMIN:
        return this.orgAdminStats();
      case UserRole.ISSUER:
        return this.issuerStats();
      default:
        return this.individualStats();
    }
  });

  readonly currentActions = computed(() => {
    switch (this.userRole()) {
      case UserRole.PLATFORM_ADMIN:
        return this.platformAdminActions();
      case UserRole.ORG_ADMIN:
        return this.orgAdminActions();
      case UserRole.ISSUER:
        return this.issuerActions();
      default:
        return this.individualActions();
    }
  });

  readonly dashboardTitle = computed(() => {
    switch (this.userRole()) {
      case UserRole.PLATFORM_ADMIN:
        return 'Platform Administration';
      case UserRole.ORG_ADMIN:
        return 'Organization Dashboard';
      case UserRole.ISSUER:
        return 'Document Issuer Dashboard';
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
      default:
        return `Welcome back, ${name}. Your documents are secure with us.`;
    }
  });

  ngOnInit(): void {
    // Get current user and role from auth service
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);
    this.userRole.set(user?.role || UserRole.VERIFIER);
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
