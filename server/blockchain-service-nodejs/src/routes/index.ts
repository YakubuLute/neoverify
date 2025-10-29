import { Router } from 'express';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';
import profileRoutes from './profile.routes';
import organizationRoutes from './organization.routes';
import invitationRoutes from './invitation.routes';
import verificationRoutes from './verification.routes';
import healthRoutes from './health.routes';
import { apiVersioning, versionDeprecation, backwardCompatibility, apiMonitoring } from '../middleware';

const router = Router();

// Apply API monitoring to all routes
router.use(apiMonitoring);

// Apply API versioning middleware
router.use(apiVersioning);
router.use(versionDeprecation);
router.use(backwardCompatibility);

// Mount route modules with versioning support
router.use('/v1/auth', authRoutes);
router.use('/v1/documents', documentRoutes);
router.use('/v1/profile', profileRoutes);
router.use('/v1/organizations', organizationRoutes);
router.use('/v1/invitations', invitationRoutes);
router.use('/v1/verification', verificationRoutes);

// Mount health routes (no versioning needed)
router.use('/health', healthRoutes);

// Legacy routes (for backward compatibility)
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/profile', profileRoutes);
router.use('/organizations', organizationRoutes);
router.use('/invitations', invitationRoutes);
router.use('/verification', verificationRoutes);

export default router;