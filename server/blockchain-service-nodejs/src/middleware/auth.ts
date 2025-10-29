import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config, redisClient } from '../config';
import logger from '../utils/logger';

// Extend Request interface to include user context
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                organizationId?: string;
                role: string;
                permissions: string[];
            };
            token?: string;
        }
    }
}

export interface JwtPayload {
    id: string;
    email: string;
    organizationId?: string;
    role: string;
    permissions: string[];
    type: 'access' | 'refresh';
    iat: number;
    exp: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

/**
 * JWT token generation utilities
 */
export class JwtUtils {
    /**
     * Generate access token
     */
    static generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
        const tokenPayload = { ...payload, type: 'access' as const };
        const options: SignOptions = {
            expiresIn: config.jwt.expiresIn as string,
            issuer: 'neoverify-api',
            audience: 'neoverify-client',
        };
        return jwt.sign(tokenPayload, config.jwt.secret, options);
    }

    /**
     * Generate refresh token
     */
    static generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
        const tokenPayload = { ...payload, type: 'refresh' as const };
        const options: SignOptions = {
            expiresIn: config.jwt.refreshExpiresIn,
            issuer: 'neoverify-api',
            audience: 'neoverify-client',
        };
        return jwt.sign(tokenPayload, config.jwt.refreshSecret, options);
    }

    /**
     * Generate token pair (access + refresh)
     */
    static async generateTokenPair(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): Promise<TokenPair> {
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);

        // Store refresh token in Redis with expiration
        const refreshTokenKey = `refresh_token:${payload.id}:${Date.now()}`;
        const refreshTokenTTL = this.getTokenTTL(config.jwt.refreshExpiresIn);

        await redisClient.set(refreshTokenKey, refreshToken, refreshTokenTTL);

        // Store mapping from user to refresh token for rotation
        await redisClient.set(
            `user_refresh:${payload.id}`,
            refreshTokenKey,
            refreshTokenTTL
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: this.getTokenTTL(config.jwt.expiresIn),
        };
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): JwtPayload {
        try {
            const decoded = jwt.verify(token, config.jwt.secret, {
                issuer: 'neoverify-api',
                audience: 'neoverify-client',
            }) as JwtPayload;

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }

    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token: string): JwtPayload {
        try {
            const decoded = jwt.verify(token, config.jwt.refreshSecret, {
                issuer: 'neoverify-api',
                audience: 'neoverify-client',
            }) as JwtPayload;

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    /**
     * Refresh token rotation
     */
    static async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
        // Verify the refresh token
        const decoded = this.verifyRefreshToken(refreshToken);

        // Check if refresh token exists in Redis
        const userRefreshKey = `user_refresh:${decoded.id}`;
        const storedRefreshTokenKey = await redisClient.get(userRefreshKey);

        if (!storedRefreshTokenKey) {
            throw new Error('Refresh token not found or expired');
        }

        const storedRefreshToken = await redisClient.get(storedRefreshTokenKey);
        if (storedRefreshToken !== refreshToken) {
            // Token rotation detected - invalidate all tokens for this user
            await this.invalidateAllUserTokens(decoded.id);
            throw new Error('Token rotation detected - please login again');
        }

        // Generate new token pair
        const newTokenPair = await this.generateTokenPair({
            id: decoded.id,
            email: decoded.email,
            organizationId: decoded.organizationId,
            role: decoded.role,
            permissions: decoded.permissions,
        });

        // Invalidate old refresh token
        await redisClient.del(storedRefreshTokenKey);
        await redisClient.del(userRefreshKey);

        return newTokenPair;
    }

    /**
     * Blacklist access token
     */
    static async blacklistToken(token: string): Promise<void> {
        try {
            const decoded = this.verifyAccessToken(token);
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);

            if (ttl > 0) {
                await redisClient.set(`blacklist:${token}`, '1', ttl);
            }
        } catch (error) {
            // Token is already invalid, no need to blacklist
            logger.warn('Attempted to blacklist invalid token');
        }
    }

    /**
     * Check if token is blacklisted
     */
    static async isTokenBlacklisted(token: string): Promise<boolean> {
        const result = await redisClient.get(`blacklist:${token}`);
        return result === '1';
    }

    /**
     * Invalidate all tokens for a user
     */
    static async invalidateAllUserTokens(userId: string): Promise<void> {
        const userRefreshKey = `user_refresh:${userId}`;
        const refreshTokenKey = await redisClient.get(userRefreshKey);

        if (refreshTokenKey) {
            await redisClient.del(refreshTokenKey);
            await redisClient.del(userRefreshKey);
        }

        // Note: Access tokens will expire naturally or can be blacklisted individually
    }

    /**
     * Convert time string to seconds
     */
    private static getTokenTTL(timeString: string): number {
        const unit = timeString.slice(-1);
        const value = parseInt(timeString.slice(0, -1));

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            default: return 900; // 15 minutes default
        }
    }
}

/**
 * Authentication middleware for protected routes
 */
export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;

        if (!token) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Access token is required',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        // Check if token is blacklisted
        const isBlacklisted = await JwtUtils.isTokenBlacklisted(token);
        if (isBlacklisted) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_BLACKLISTED',
                    message: 'Token has been invalidated',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        // Verify token
        const decoded = JwtUtils.verifyAccessToken(token);

        // Attach user context to request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            organizationId: decoded.organizationId,
            role: decoded.role,
            permissions: decoded.permissions,
        };
        req.token = token;

        next();
    } catch (error) {
        logger.warn('Authentication failed:', { error: error instanceof Error ? error.message : error });

        res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired access token',
                timestamp: new Date().toISOString(),
            },
        });
    }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;

        if (token) {
            const isBlacklisted = await JwtUtils.isTokenBlacklisted(token);
            if (!isBlacklisted) {
                const decoded = JwtUtils.verifyAccessToken(token);
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    organizationId: decoded.organizationId,
                    role: decoded.role,
                    permissions: decoded.permissions,
                };
                req.token = token;
            }
        }

        next();
    } catch (error) {
        // Silently continue without authentication
        next();
    }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication is required for this endpoint',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'Insufficient permissions to access this resource',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        next();
    };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permissions: string | string[]) => {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication is required for this endpoint',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        const hasPermission = requiredPermissions.some(permission =>
            req.user!.permissions.includes(permission)
        );

        if (!hasPermission) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'Insufficient permissions to access this resource',
                    timestamp: new Date().toISOString(),
                },
            });
            return;
        }

        next();
    };
};