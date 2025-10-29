import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import  logger  from '../utils/logger';
import User from '../models/User';
import { verificationService } from './verification.service';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    organizationId?: string;
}

interface Socket {
    id: string;
    userId?: string;
    organizationId?: string;
    join: (room: string) => void;
    leave: (room: string) => void;
    emit: (event: string, data: any) => void;
    on: (event: string, callback: (data: any) => void) => void;
    disconnect: () => void;
}

// WebSocket event types
export enum WebSocketEvent {
    VERIFICATION_STARTED = 'verification:started',
    VERIFICATION_STATUS_UPDATE = 'verification:status_update',
    VERIFICATION_COMPLETED = 'verification:completed',
    VERIFICATION_FAILED = 'verification:failed',
    DOCUMENT_STATUS_UPDATE = 'document:status_update',
    ERROR = 'error',
    AUTHENTICATED = 'authenticated',
    UNAUTHENTICATED = 'unauthenticated',
}

// WebSocket message interface
interface WebSocketMessage {
    event: WebSocketEvent;
    data: any;
    timestamp: Date;
    userId?: string;
    organizationId?: string;
}

class WebSocketService {
    private io: SocketIOServer;
    private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs
    private socketUsers = new Map<string, string>(); // socketId -> userId

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:4200',
                methods: ['GET', 'POST'],
                credentials: true,
            },
            transports: ['websocket', 'polling'],
        });

        this.setupEventHandlers();
        this.setupVerificationServiceListeners();
    }

    /**
     * Setup WebSocket event handlers
     */
    private setupEventHandlers(): void {
        this.io.use(this.authenticateSocket.bind(this));

        this.io.on('connection', (socket: any) => {
            logger.info('WebSocket client connected', {
                socketId: socket.id,
                userId: socket.userId,
                organizationId: socket.organizationId,
            });

            // Track connected user
            if (socket.userId) {
                this.addUserSocket(socket.userId, socket.id);

                // Join user-specific room
                socket.join(`user:${socket.userId}`);

                // Join organization room if applicable
                if (socket.organizationId) {
                    socket.join(`org:${socket.organizationId}`);
                }

                // Send authentication success
                socket.emit(WebSocketEvent.AUTHENTICATED, {
                    message: 'Successfully authenticated',
                    userId: socket.userId,
                    organizationId: socket.organizationId,
                });
            }

            // Handle verification subscription
            socket.on('subscribe:verification', (data: { verificationId: string }) => {
                this.handleVerificationSubscription(socket, data.verificationId);
            });

            // Handle verification unsubscription
            socket.on('unsubscribe:verification', (data: { verificationId: string }) => {
                this.handleVerificationUnsubscription(socket, data.verificationId);
            });

            // Handle document subscription
            socket.on('subscribe:document', (data: { documentId: string }) => {
                this.handleDocumentSubscription(socket, data.documentId);
            });

            // Handle document unsubscription
            socket.on('unsubscribe:document', (data: { documentId: string }) => {
                this.handleDocumentUnsubscription(socket, data.documentId);
            });

            // Handle ping/pong for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: new Date() });
            });

            // Handle disconnection
            socket.on('disconnect', (reason: string) => {
                logger.info('WebSocket client disconnected', {
                    socketId: socket.id,
                    userId: socket.userId,
                    reason,
                });

                if (socket.userId) {
                    this.removeUserSocket(socket.userId, socket.id);
                }
            });

            // Handle errors
            socket.on('error', (error: Error) => {
                logger.error('WebSocket error', {
                    socketId: socket.id,
                    userId: socket.userId,
                    error: error.message,
                });
            });
        });
    }

    /**
     * Authenticate WebSocket connection
     */
    private async authenticateSocket(socket: any, next: (err?: Error) => void): Promise<void> {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;

            if (!token) {
                socket.emit(WebSocketEvent.UNAUTHENTICATED, {
                    message: 'Authentication token required',
                });
                return next(new Error('Authentication token required'));
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            // Get user from database
            const user = await User.findByPk(decoded.userId);
            if (!user) {
                socket.emit(WebSocketEvent.UNAUTHENTICATED, {
                    message: 'Invalid user',
                });
                return next(new Error('Invalid user'));
            }

            // Attach user info to socket
            socket.userId = user.id;
            socket.organizationId = user.organizationId;

            next();
        } catch (error: any) {
            logger.error('WebSocket authentication failed', {
                error: error.message,
                socketId: socket.id,
            });

            socket.emit(WebSocketEvent.UNAUTHENTICATED, {
                message: 'Authentication failed',
                error: error.message,
            });

            next(new Error('Authentication failed'));
        }
    }

    /**
     * Setup verification service event listeners
     */
    private setupVerificationServiceListeners(): void {
        verificationService.on('verificationStarted', (data) => {
            this.broadcastVerificationEvent(WebSocketEvent.VERIFICATION_STARTED, data);
        });

        verificationService.on('statusUpdate', (data) => {
            this.broadcastVerificationEvent(WebSocketEvent.VERIFICATION_STATUS_UPDATE, data);
        });

        verificationService.on('verificationCompleted', (data) => {
            this.broadcastVerificationEvent(WebSocketEvent.VERIFICATION_COMPLETED, data);
        });

        verificationService.on('verificationFailed', (data) => {
            this.broadcastVerificationEvent(WebSocketEvent.VERIFICATION_FAILED, data);
        });
    }

    /**
     * Handle verification subscription
     */
    private async handleVerificationSubscription(socket: any, verificationId: string): Promise<void> {
        try {
            // Verify user has access to this verification
            const verification = await this.verifyVerificationAccess(socket.userId, verificationId);
            if (!verification) {
                socket.emit(WebSocketEvent.ERROR, {
                    message: 'Access denied to verification',
                    verificationId,
                });
                return;
            }

            // Join verification-specific room
            socket.join(`verification:${verificationId}`);

            logger.info('User subscribed to verification updates', {
                userId: socket.userId,
                verificationId,
                socketId: socket.id,
            });

            // Send current status
            const status = await verificationService.getVerificationStatus(verificationId);
            socket.emit(WebSocketEvent.VERIFICATION_STATUS_UPDATE, {
                verificationId,
                ...status,
            });
        } catch (error: any) {
            logger.error('Failed to handle verification subscription', {
                error: error.message,
                userId: socket.userId,
                verificationId,
            });

            socket.emit(WebSocketEvent.ERROR, {
                message: 'Failed to subscribe to verification',
                error: error.message,
            });
        }
    }

    /**
     * Handle verification unsubscription
     */
    private handleVerificationUnsubscription(socket: any, verificationId: string): void {
        socket.leave(`verification:${verificationId}`);

        logger.info('User unsubscribed from verification updates', {
            userId: socket.userId,
            verificationId,
            socketId: socket.id,
        });
    }

    /**
     * Handle document subscription
     */
    private async handleDocumentSubscription(socket: any, documentId: string): Promise<void> {
        try {
            // Verify user has access to this document
            const hasAccess = await this.verifyDocumentAccess(socket.userId, documentId);
            if (!hasAccess) {
                socket.emit(WebSocketEvent.ERROR, {
                    message: 'Access denied to document',
                    documentId,
                });
                return;
            }

            // Join document-specific room
            socket.join(`document:${documentId}`);

            logger.info('User subscribed to document updates', {
                userId: socket.userId,
                documentId,
                socketId: socket.id,
            });
        } catch (error: any) {
            logger.error('Failed to handle document subscription', {
                error: error.message,
                userId: socket.userId,
                documentId,
            });

            socket.emit(WebSocketEvent.ERROR, {
                message: 'Failed to subscribe to document',
                error: error.message,
            });
        }
    }

    /**
     * Handle document unsubscription
     */
    private handleDocumentUnsubscription(socket: any, documentId: string): void {
        socket.leave(`document:${documentId}`);

        logger.info('User unsubscribed from document updates', {
            userId: socket.userId,
            documentId,
            socketId: socket.id,
        });
    }

    /**
     * Broadcast verification event to relevant users
     */
    private broadcastVerificationEvent(event: WebSocketEvent, data: any): void {
        const message: WebSocketMessage = {
            event,
            data,
            timestamp: new Date(),
        };

        // Broadcast to verification-specific room
        if (data.verificationId) {
            this.io.to(`verification:${data.verificationId}`).emit(event, message);
        }

        // Broadcast to document-specific room
        if (data.documentId) {
            this.io.to(`document:${data.documentId}`).emit(WebSocketEvent.DOCUMENT_STATUS_UPDATE, message);
        }

        logger.info('Broadcasted verification event', {
            event,
            verificationId: data.verificationId,
            documentId: data.documentId,
        });
    }

    /**
     * Send message to specific user
     */
    public sendToUser(userId: string, event: WebSocketEvent, data: any): void {
        const message: WebSocketMessage = {
            event,
            data,
            timestamp: new Date(),
            userId,
        };

        this.io.to(`user:${userId}`).emit(event, message);

        logger.info('Sent message to user', {
            userId,
            event,
            data,
        });
    }

    /**
     * Send message to organization
     */
    public sendToOrganization(organizationId: string, event: WebSocketEvent, data: any): void {
        const message: WebSocketMessage = {
            event,
            data,
            timestamp: new Date(),
            organizationId,
        };

        this.io.to(`org:${organizationId}`).emit(event, message);

        logger.info('Sent message to organization', {
            organizationId,
            event,
            data,
        });
    }

    /**
     * Broadcast message to all connected clients
     */
    public broadcast(event: WebSocketEvent, data: any): void {
        const message: WebSocketMessage = {
            event,
            data,
            timestamp: new Date(),
        };

        this.io.emit(event, message);

        logger.info('Broadcasted message to all clients', {
            event,
            data,
        });
    }

    /**
     * Get connected users count
     */
    public getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    /**
     * Get user connection status
     */
    public isUserConnected(userId: string): boolean {
        return this.connectedUsers.has(userId);
    }

    /**
     * Add user socket mapping
     */
    private addUserSocket(userId: string, socketId: string): void {
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId)!.add(socketId);
        this.socketUsers.set(socketId, userId);
    }

    /**
     * Remove user socket mapping
     */
    private removeUserSocket(userId: string, socketId: string): void {
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.connectedUsers.delete(userId);
            }
        }
        this.socketUsers.delete(socketId);
    }

    /**
     * Verify user has access to verification
     */
    private async verifyVerificationAccess(userId: string, verificationId: string): Promise<boolean> {
        try {
            const { Verification } = require('../models');
            const verification = await Verification.findByPk(verificationId);

            if (!verification) {
                return false;
            }

            // Check if user owns the verification or is in the same organization
            return verification.userId === userId ||
                (verification.organizationId && verification.organizationId === userId);
        } catch (error) {
            logger.error('Failed to verify verification access', { error, userId, verificationId });
            return false;
        }
    }

    /**
     * Verify user has access to document
     */
    private async verifyDocumentAccess(userId: string, documentId: string): Promise<boolean> {
        try {
            const { Document } = require('../models');
            const document = await Document.findByPk(documentId);

            if (!document) {
                return false;
            }

            // Check if user owns the document or is in the same organization
            return document.userId === userId ||
                (document.organizationId && document.organizationId === userId);
        } catch (error) {
            logger.error('Failed to verify document access', { error, userId, documentId });
            return false;
        }
    }
}

let webSocketService: WebSocketService;

/**
 * Initialize WebSocket service
 */
export const initializeWebSocketService = (server: HTTPServer): WebSocketService => {
    webSocketService = new WebSocketService(server);
    return webSocketService;
};

/**
 * Get WebSocket service instance
 */
export const getWebSocketService = (): WebSocketService => {
    if (!webSocketService) {
        throw new Error('WebSocket service not initialized');
    }
    return webSocketService;
};

export default WebSocketService;