import { Router } from 'express';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);

// Health check for API
router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'api',
        },
    });
});

export default router;