
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const development = {
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.POSTGRES_DB_NAME || 'neoverify_dev',
    host: process.env.POSTGRES_DB_HOST || 'localhost',
    port: process.env.POSTGRES_DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
            require: true,
            rejectUnauthorized: false,
        } : false,
    },
};
export const test = {
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.POSTGRES_DB_NAME || 'neoverify_test',
    host: process.env.POSTGRES_DB_HOST || 'localhost',
    port: process.env.POSTGRES_DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
            require: true,
            rejectUnauthorized: false,
        } : false,
    },
};
export const production = {
    username: process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.POSTGRES_DB_NAME,
    host: process.env.POSTGRES_DB_HOST,
    port: process.env.POSTGRES_DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
    },
};