import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config, redisClient } from './config';
import logger from './utils/logger';
import {
    globalErrorHandler,
    requestId,
    requestLogger,
    notFoundHandler,
    setupProcessHandlers
} from './middleware';

// Setup process handlers for unhandled rejections and exceptions
setupProcessHandlers();

// Create Express application
const app: Application = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Request ID middleware - must be first
app.use(requestId);

// Security middleware - Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration with environment-specific origins
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

app.use(cors(corsOptions));

// Rate limiting middleware with Redis store
const createRateLimiter = () => {
    return rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.maxRequests,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
            },
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Use Redis for distributed rate limiting
        store: redisClient.isReady ? {
            incr: async (key: string) => {
                const current = await redisClient.incr(key);
                if (current === 1) {
                    await redisClient.expire(key, Math.ceil(config.rateLimit.windowMs / 1000));
                }
                return { totalHits: current, resetTime: new Date(Date.now() + config.rateLimit.windowMs) };
            },
            decrement: async (key: string) => {
                await redisClient.decr(key);
            },
            resetKey: async (key: string) => {
                await redisClient.del(key);
            },
        } : undefined,
    });
};

// Apply rate limiting
app.use('/api/', createRateLimiter());

// Request parsing middleware
app.use(express.json({
    limit: '10mb',
    verify: (req: Request, res: Response, buf: Buffer) => {
        // Store raw body for webhook verification if needed
        (req as any).rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
const morganFormat = config.env === 'production'
    ? 'combined'
    : ':method :url :status :res[content-length] - :response-time ms';

app.use(morgan(morganFormat, {
    stream: {
        write: (message: string) => {
            logger.info(message.trim());
        },
    },
    skip: (req: Request, res: Response) => {
        // Skip logging for health checks in production
        return config.env === 'production' && req.url === '/health';
    },
}));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config.env,
            version: process.env.npm_package_version || '1.0.0',
        },
    });
});

// API routes will be added here
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Placeholder for API routes
    next();
});

// 404 handler for undefined routes
app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            timestamp: new Date().toISOString(),
        },
    });
});

export default app;