import {
    DataTypes,
    Model,
    Optional,
    Association,
    BelongsToGetAssociationMixin,
    Op,
} from 'sequelize';
import database from '../config/database';
import { UserRole } from './User';

// Invitation status enumeration
export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}

// User invitation attributes interface
export interface UserInvitationAttributes {
    id: string;
    organizationId: string;
    invitedBy: string;
    email: string;
    role: UserRole;
    status: InvitationStatus;
    token: string;
    expiresAt: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
    cancelledAt?: Date;
    message?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Optional attributes for creation
export interface UserInvitationCreationAttributes
    extends Optional<
        UserInvitationAttributes,
        | 'id'
        | 'status'
        | 'createdAt'
        | 'updatedAt'
    > { }

class UserInvitation extends Model<UserInvitationAttributes, UserInvitationCreationAttributes> implements UserInvitationAttributes {
    public id!: string;
    public organizationId!: string;
    public invitedBy!: string;
    public email!: string;
    public role!: UserRole;
    public status!: InvitationStatus;
    public token!: string;
    public expiresAt!: Date;
    public acceptedAt?: Date;
    public declinedAt?: Date;
    public cancelledAt?: Date;
    public message?: string;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associations
    public getOrganization!: BelongsToGetAssociationMixin<any>;
    public getInviter!: BelongsToGetAssociationMixin<any>;

    public static associations: {
        organization: Association<UserInvitation, any>;
        inviter: Association<UserInvitation, any>;
    };

    // Instance methods
    public isExpired(): boolean {
        return this.expiresAt < new Date();
    }

    public canBeAccepted(): boolean {
        return this.status === InvitationStatus.PENDING && !this.isExpired();
    }

    public async accept(): Promise<void> {
        if (!this.canBeAccepted()) {
            throw new Error('Invitation cannot be accepted');
        }

        this.status = InvitationStatus.ACCEPTED;
        this.acceptedAt = new Date();
        await this.save();
    }

    public async decline(): Promise<void> {
        if (this.status !== InvitationStatus.PENDING) {
            throw new Error('Invitation cannot be declined');
        }

        this.status = InvitationStatus.DECLINED;
        this.declinedAt = new Date();
        await this.save();
    }

    public async cancel(): Promise<void> {
        if (this.status !== InvitationStatus.PENDING) {
            throw new Error('Invitation cannot be cancelled');
        }

        this.status = InvitationStatus.CANCELLED;
        this.cancelledAt = new Date();
        await this.save();
    }

    public async markExpired(): Promise<void> {
        if (this.status === InvitationStatus.PENDING && this.isExpired()) {
            this.status = InvitationStatus.EXPIRED;
            await this.save();
        }
    }

    public toJSON(): Partial<UserInvitationAttributes> {
        const values = { ...this.get() } as any;
        // Remove sensitive token from JSON output
        delete values.token;
        return values;
    }

    // Static methods
    public static async findByToken(token: string): Promise<UserInvitation | null> {
        return this.findOne({
            where: {
                token,
                status: InvitationStatus.PENDING,
                expiresAt: {
                    [Op.gt]: new Date(),
                },
            },
        });
    }

    public static async findPendingByEmail(email: string, organizationId: string): Promise<UserInvitation | null> {
        return this.findOne({
            where: {
                email: email.toLowerCase(),
                organizationId,
                status: InvitationStatus.PENDING,
                expiresAt: {
                    [Op.gt]: new Date(),
                },
            },
        });
    }

    public static async cleanupExpired(): Promise<number> {
        const [affectedCount] = await this.update(
            { status: InvitationStatus.EXPIRED },
            {
                where: {
                    status: InvitationStatus.PENDING,
                    expiresAt: {
                        [Op.lt]: new Date(),
                    },
                },
            }
        );
        return affectedCount;
    }
}

// Initialize the model
UserInvitation.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        organizationId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'organizations',
                key: 'id',
            },
        },
        invitedBy: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            },
            set(value: string) {
                this.setDataValue('email', value.toLowerCase());
            },
        },
        role: {
            type: DataTypes.ENUM(...Object.values(UserRole)),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(InvitationStatus)),
            defaultValue: InvitationStatus.PENDING,
        },
        token: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        acceptedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        declinedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize: database.getSequelize(),
        modelName: 'UserInvitation',
        tableName: 'user_invitations',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['token'],
            },
            {
                fields: ['organization_id'],
            },
            {
                fields: ['invited_by'],
            },
            {
                fields: ['email'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['expires_at'],
            },
            // Composite indexes for common query patterns
            {
                fields: ['email', 'organization_id', 'status'],
                name: 'idx_invitation_email_org_status',
            },
            {
                fields: ['organization_id', 'status'],
                name: 'idx_invitation_org_status',
            },
            {
                fields: ['status', 'expires_at'],
                name: 'idx_invitation_status_expires',
            },
        ],
    }
);

export default UserInvitation;