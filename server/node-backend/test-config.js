// Simple test to verify configuration loads correctly
require('dotenv').config();

console.log('Testing configuration loading...');

try {
    // Test environment variables
    console.log('Environment variables loaded:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- PORT:', process.env.PORT);
    console.log('- POSTGRES_DB_HOST:', process.env.POSTGRES_DB_HOST);
    console.log('- JWT_SECRET length:', process.env.JWT_SECRET?.length);

    // Test config loading
    const config = require('./dist/config/env.js').default;
    console.log('\nConfiguration loaded successfully:');
    console.log('- Environment:', config.env);
    console.log('- Port:', config.port);
    console.log('- Database host:', config.database.host);
    console.log('- Redis host:', config.redis.host);
    console.log('- CORS origins:', config.cors.origins);

    console.log('\n✅ Configuration test passed!');
} catch (error) {
    console.error('\n❌ Configuration test failed:', error.message);
    process.exit(1);
}