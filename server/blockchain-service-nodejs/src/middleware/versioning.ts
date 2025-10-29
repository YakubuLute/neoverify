import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface VersionedRequest extends Request {
    apiVersion: string;
}

/**
 * API versioning middleware
 * Supports versioning via:
 * 1. Accept header: Accept: application/vnd.neoverify.v1+json
 * 2. Custom header: X-API-Version: v1
 * 3. URL path: /api/v1/...
 * 4. Query parameter: ?version=v1
 */
export const apiVersioning = (req: VersionedRequest, res: Response, next: NextFunction) => {
    let version = 'v1'; // Default version

    // 1. Check URL path for version
    const pathVersionMatch = req.path.match(/^\/api\/v(\d+)\//);
    if (pathVersionMatch) {
        version = `v${pathVersionMatch[1]}`;
    }
    // 2. Check Accept header
    else if (req.headers.accept) {
        const acceptVersionMatch = req.headers.accept.match(/application\/vnd\.neoverify\.v(\d+)\+json/);
        if (acceptVersionMatch) {
            version = `v${acceptVersionMatch[1]}`;
        }
    }
    // 3. Check custom header
    else if (req.headers['x-api-version']) {
        const headerVersion = req.headers['x-api-version'] as string;
        if (headerVersion.match(/^v\d+$/)) {
            version = headerVersion;
        }
    }
    // 4. Check query parameter
    else if (req.query.version) {
        const queryVersion = req.query.version as string;
        if (queryVersion.match(/^v\d+$/)) {
            version = queryVersion;
        }
    }

    // Validate version
    const supportedVersions = ['v1']; // Add more versions as needed
    if (!supportedVersions.includes(version)) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'UNSUPPORTED_API_VERSION',
                message: `API version ${version} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
                supportedVersions,
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }

    // Attach version to request
    req.apiVersion = version;

    // Set response headers
    res.setHeader('X-API-Version', version);
    res.setHeader('X-Supported-Versions', supportedVersions.join(', '));

    // Log version usage for analytics
    logger.debug('API version used', {
        version,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id'],
    });

    next();
};

/**
 * Version deprecation middleware
 * Adds deprecation warnings for older API versions
 */
export const versionDeprecation = (req: VersionedRequest, res: Response, next: NextFunction) => {
    const deprecatedVersions: Record<string, {
        deprecatedAt: string;
        sunsetAt: string;
        message: string;
    }> = {
        // 'v1': {
        //     deprecatedAt: '2024-01-01',
        //     sunsetAt: '2024-06-01',
        //     message: 'API v1 is deprecated. Please migrate to v2.',
        // },
    };

    const version = req.apiVersion;
    const deprecationInfo = deprecatedVersions[version];

    if (deprecationInfo) {
        // Add deprecation headers
        res.setHeader('Deprecation', deprecationInfo.deprecatedAt);
        res.setHeader('Sunset', deprecationInfo.sunsetAt);
        res.setHeader('Link', '</api-docs>; rel="successor-version"');

        // Log deprecation usage
        logger.warn('Deprecated API version used', {
            version,
            path: req.path,
            method: req.method,
            deprecationInfo,
            userAgent: req.headers['user-agent'],
            requestId: req.headers['x-request-id'],
        });
    }

    next();
};

/**
 * Backward compatibility middleware
 * Handles breaking changes between versions
 */
export const backwardCompatibility = (req: VersionedRequest, res: Response, next: NextFunction) => {
    const version = req.apiVersion;

    // Transform request/response based on version
    switch (version) {
        case 'v1':
            // Handle v1 specific transformations
            break;
        default:
            // Default behavior for latest version
            break;
    }

    next();
};

/**
 * Version-specific route handler
 * Allows different implementations for different versions
 */
export const versionedHandler = (handlers: Record<string, any>) => {
    return (req: VersionedRequest, res: Response, next: NextFunction) => {
        const version = req.apiVersion;
        const handler = handlers[version] || handlers.default;

        if (!handler) {
            return res.status(501).json({
                success: false,
                error: {
                    code: 'VERSION_NOT_IMPLEMENTED',
                    message: `Handler for API version ${version} is not implemented`,
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
        }

        handler(req, res, next);
    };
};