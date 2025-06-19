const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'IPOS-WooCommerce-Stock-Sync',
    script: path.join(__dirname, 'app.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', function() {
    console.log('✅ Service uninstalled successfully!');
    console.log('📝 Service Name: IPOS-WooCommerce-Stock-Sync');
    console.log('');
    console.log('The service has been completely removed from your system.');
    console.log('');
    console.log('To reinstall the service later:');
    console.log('  npm run install-service');
    console.log('');
    console.log('📁 Log files in ./logs directory have been preserved.');
});

svc.on('doesnotexist', function() {
    console.log('⚠️  Service does not exist or is not installed.');
    console.log('Nothing to uninstall.');
});

svc.on('error', function(err) {
    console.error('❌ Service uninstallation failed:', err);
    process.exit(1);
});

// Stop the service first, then uninstall
console.log('🛑 Stopping and uninstalling IPOS to WooCommerce Stock Sync Service...');
console.log('');

try {
    // Stop the service if it's running
    svc.stop();
    
    // Wait a moment then uninstall
    setTimeout(() => {
        svc.uninstall();
    }, 2000);
    
} catch (error) {
    console.error('❌ Failed to uninstall service:', error);
    console.log('');
    console.log('💡 Make sure you are running this command as Administrator');
    console.log('💡 Right-click Command Prompt and select "Run as administrator"');
    console.log('');
    console.log('You can also try manually stopping the service first:');
    console.log('  net stop "IPOS-WooCommerce-Stock-Sync"');
    process.exit(1);
}
