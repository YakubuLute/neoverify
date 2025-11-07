import {
    DataTypes,
    Model,
    Optional,
    Association,
    BelongsToGetAssociationMixin,
} from 'sequelize';
import database from '../config/database';
import User from './User';

// User session attributes interface
export interface UserSessionAttributes {
    id: string;
    userId: string;
    sessionToken: string;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
    deviceInfo?: string;
    location?: string;
    isActive: boolean;
    lastActivityAt: Date;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

// Optional attributes for creation
export interface UserSessionCreationAttributes
    extends Optional<
        UserSessionAttributes,
        'id' | 'deviceInfo' | 'location' | 'createdAt' | 'updatedAt'
    > { }

class UserSession extends Model<UserSessionAttributes, UserSessionCreationAttributes> implements UserSessionAttributes {
    public id!: string;
    public userId!: string;
    public sessionToken!: string;
    public refreshToken!: string;
    public ipAddress!: string;
    public userAgent!: string;
    public deviceInfo?: string;
    public location?: string;
    public isActive!: boolean;
    public lastActivityAt!: Date;
    public expiresAt!: Date;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associations
    public getUser!: BelongsToGetAssociationMixin<User>;

    public static associations: {
        user: Association<UserSession, User>;
    };

    // Instance methods
    public isExpired(): boolean {
        return this.expiresAt < new Date();
    }

    public updateActivity(): void {
        this.lastActivityAt = new Date();
    }

    public deactivate(): void {
        this.isActive = false;
    }
}

// Initialize the model
UserSession.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        sessionToken: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        refreshToken: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        ipAddress: {
            type: DataTypes.INET,
            allowNull: false,
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        deviceInfo: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        lastActivityAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize: database.getSequelize(),
        modelName: 'UserSession',
        tableName: 'user_sessions',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['user_id'],
            },
            {
                unique: true,
                fields: ['session_token'],
            },
            {
                unique: true,
                fields: ['refresh_token'],
            },
            {
                fields: ['is_active'],
            },
            {
                fields: ['expires_at'],
            },
            {
                fields: ['last_activity_at'],
            },
        ],
    }
);

export default UserSession;