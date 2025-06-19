const Service = require('node-windows').Service;
const path = require('path');
const logger = require('./src/logger');

// Create a new service object
const svc = new Service({
    name: 'IPOS-WooCommerce-Stock-Sync',
    description: 'Syncs inventory stock from local IPOS to WooCommerce every 10 minutes',
    script: path.join(__dirname, 'app.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: {
        name: "NODE_ENV",
        value: "production"
    }
});

// Listen for the "install" event, which indicates the process is available as a service
svc.on('install', function() {
    console.log('✅ Service installed successfully!');
    console.log('📝 Service Name: IPOS-WooCommerce-Stock-Sync');
    console.log('🔧 Service Description: Syncs inventory stock from local IPOS to WooCommerce every 10 minutes');
    console.log('');
    console.log('The service has been installed and will start automatically.');
    console.log('You can manage it through Windows Services or use the following commands:');
    console.log('');
    console.log('To start the service manually:');
    console.log('  net start "IPOS-WooCommerce-Stock-Sync"');
    console.log('');
    console.log('To stop the service:');
    console.log('  net stop "IPOS-WooCommerce-Stock-Sync"');
    console.log('');
    console.log('To uninstall the service:');
    console.log('  npm run uninstall-service');
    console.log('');
    console.log('📊 Logs will be available in the ./logs directory');
    console.log('🔄 The service will sync stock every 10 minutes automatically');
    
    // Start the service
    svc.start();
});

svc.on('alreadyinstalled', function() {
    console.log('⚠️  Service is already installed.');
    console.log('To reinstall, first run: npm run uninstall-service');
});

svc.on('start', function() {
    console.log('🚀 Service started successfully!');
    console.log('The stock sync service is now running in the background.');
    console.log('');
    console.log('Monitor the service:');
    console.log('- Check logs in: ./logs/sync-[date].log');
    console.log('- Windows Services: services.msc');
    console.log('- Service status: net query "IPOS-WooCommerce-Stock-Sync"');
});

svc.on('error', function(err) {
    console.error('❌ Service installation failed:', err);
    process.exit(1);
});

// Check if Node.js is available
try {
    const { execSync } = require('child_process');
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    console.log('📦 Node.js version:', nodeVersion);
} catch (error) {
    console.error('❌ Node.js is not available in PATH. Please ensure Node.js is properly installed.');
    process.exit(1);
}

// Install the service
console.log('🔧 Installing IPOS to WooCommerce Stock Sync Service...');
console.log('📍 Script path:', path.join(__dirname, 'app.js'));
console.log('');

try {
    svc.install();
} catch (error) {
    console.error('❌ Failed to install service:', error);
    console.log('');
    console.log('💡 Make sure you are running this command as Administrator');
    console.log('💡 Right-click Command Prompt and select "Run as administrator"');
    process.exit(1);
}
