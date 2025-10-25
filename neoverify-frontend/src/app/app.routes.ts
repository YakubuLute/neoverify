import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core';
import {
  documentPermissionGuard,
  documentUploadGuard,
  templateManagementGuard,
  auditTrailGuard
} from './core/guards/document-permission.guard';
import { UserRole } from './shared/models/auth.models';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },

  // Authentication routes (only for non-authenticated users)
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent)
      },
      {
        path: 'mfa',
        loadComponent: () => import('./features/auth/mfa/mfa.component').then(m => m.MfaComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  // Public verification (no auth required)
  {
    path: 'verify',
    loadComponent: () => import('./features/documents/verify/document-verify.component').then(m => m.DocumentVerifyComponent)
  },
  {
    path: 'documents/verify',
    loadComponent: () => import('./features/documents/verify/document-verify.component').then(m => m.DocumentVerifyComponent)
  },
  {
    path: 'documents/shared/:token',
    loadComponent: () => import('./features/documents/shared/shared-document-access.component').then(m => m.SharedDocumentAccessComponent)
  },

  // Protected routes with dashboard layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/dashboard-layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      // Dashboard home
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
      },

      // Document management routes
      {
        path: 'documents',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/documents/list/document-list.component').then(m => m.DocumentListComponent)
          },
          {
            path: 'upload',
            canActivate: [documentUploadGuard],
            loadComponent: () => import('./features/documents/upload/document-upload.component').then(m => m.DocumentUploadComponent)
          },
          {
            path: 'templates',
            canActivate: [templateManagementGuard],
            children: [
              {
                path: '',
                loadComponent: () => import('./features/documents/templates/templates-list.component').then(m => m.TemplatesListComponent)
              },
              {
                path: 'create',
                loadComponent: () => import('./features/documents/templates/template-builder.component').then(m => m.TemplateBuilderComponent)
              },
              {
                path: ':id/edit',
                loadComponent: () => import('./features/documents/templates/template-builder.component').then(m => m.TemplateBuilderComponent)
              },
              {
                path: ':id/versions',
                loadComponent: () => import('./features/documents/templates/template-versions.component').then(m => m.TemplateVersionsComponent)
              }
            ]
          },
          {
            path: 'audit',
            canActivate: [auditTrailGuard],
            children: [
              {
                path: '',
                loadComponent: () => import('./features/documents/audit/audit-trail.component').then(m => m.AuditTrailComponent)
              },
              {
                path: 'compliance',
                loadComponent: () => import('./features/documents/audit/compliance-dashboard.component').then(m => m.ComplianceDashboardComponent)
              },
              {
                path: 'entry/:id',
                loadComponent: () => import('./features/documents/audit/audit-entry-detail.component').then(m => m.AuditEntryDetailComponent)
              },
              {
                path: 'scheduled-reports',
                loadComponent: () => import('./features/documents/audit/scheduled-reports.component').then(m => m.ScheduledReportsComponent)
              }
            ]
          },
          {
            path: ':id',
            canActivate: [documentPermissionGuard],
            data: { action: 'view', requireDocument: true },
            loadComponent: () => import('./features/documents/detail/document-detail.component').then(m => m.DocumentDetailComponent)
          }
        ]
      },

      // Organization management (Admin only)
      {
        path: 'organization',
        canActivate: [roleGuard],
        data: { roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN] },
        children: [
          {
            path: 'settings',
            loadComponent: () => import('./features/organization/settings/org-settings.component').then(m => m.OrgSettingsComponent)
          },
          {
            path: 'users',
            loadComponent: () => import('./features/organization/users/user-management.component').then(m => m.UserManagementComponent)
          },
          {
            path: 'api-keys',
            loadComponent: () => import('./features/organization/api-keys/api-keys.component').then(m => m.ApiKeysComponent)
          }
        ]
      },

      // Platform Admin routes
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: [UserRole.PLATFORM_ADMIN] },
        children: [
          {
            path: 'organizations',
            loadComponent: () => import('./features/documents/list/document-list.component').then(m => m.DocumentListComponent) // Placeholder
          },
          {
            path: 'users',
            loadComponent: () => import('./features/organization/users/user-management.component').then(m => m.UserManagementComponent)
          },
          {
            path: 'analytics',
            loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) // Placeholder
          },
          {
            path: 'security',
            loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) // Placeholder
          }
        ]
      },

      // Analytics routes
      {
        path: 'analytics',
        canActivate: [roleGuard],
        data: { roles: [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN] },
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) // Placeholder
      },

      // User profile
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },

  // Error pages
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '403',
    loadComponent: () => import('./shared/components/error/error.component').then(m => m.ErrorComponent),
    data: { errorType: 'forbidden' }
  },
  {
    path: '404',
    loadComponent: () => import('./shared/components/error/error.component').then(m => m.ErrorComponent),
    data: { errorType: 'notFound' }
  },

  // Catch all - redirect to home
  {
    path: '**',
    redirectTo: ''
  }
];
