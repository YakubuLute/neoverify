// Simple test to verify Express app can start
require('dotenv').config();

console.log('Testing Express app startup...');

async function testApp() {
    try {
        // Import the app
        const app = require('./dist/app.js').default;

        // Start server on a test port
        const server = app.listen(3001, () => {
            console.log('✅ Express app started successfully on port 3001');

            // Make a test request to health endpoint
            const http = require('http');
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: '/health',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    console.log('✅ Health check response:', JSON.parse(data));
                    server.close(() => {
                        console.log('✅ Server closed successfully');
                        process.exit(0);
                    });
                });
            });

            req.on('error', (error) => {
                console.error('❌ Health check failed:', error.message);
                server.close();
                process.exit(1);
            });

            req.end();
        });

        server.on('error', (error) => {
            console.error('❌ Server startup failed:', error.message);
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ App test failed:', error.message);
        process.exit(1);
    }
}

testApp();