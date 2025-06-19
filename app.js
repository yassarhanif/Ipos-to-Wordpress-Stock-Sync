const StockSyncService = require('./src/syncService');
const logger = require('./src/logger');

// Global error handlers
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Initialize the sync service
const syncService = new StockSyncService();

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    syncService.stop();
    
    setTimeout(() => {
        logger.info('Graceful shutdown completed');
        process.exit(0);
    }, 2000);
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Main function
async function main() {
    try {
        logger.info('=== IPOS to WooCommerce Stock Sync Service ===');
        logger.info('Version: 1.0.0');
        logger.info('Starting application...');
        
        // Start the sync service
        await syncService.start();
        
        // Keep the process running
        logger.info('Service is running. Press Ctrl+C to stop.');
        
        // If running manually (not as service), show stats periodically
        if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
            setInterval(() => {
                const stats = syncService.getStats();
                logger.info('Service Status:', {
                    isRunning: stats.isRunning,
                    totalSyncs: stats.totalSyncs,
                    totalProducts: stats.totalProducts,
                    totalUpdates: stats.totalUpdates,
                    totalErrors: stats.totalErrors,
                    lastSyncTime: stats.lastSyncTime
                });
            }, 60000); // Show stats every minute
        }
        
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--manual-sync')) {
    // Run a single manual sync and exit
    logger.info('Running manual sync...');
    
    const manualSync = async () => {
        try {
            await syncService.testConnections();
            await syncService.performSync();
            logger.info('Manual sync completed successfully');
            process.exit(0);
        } catch (error) {
            logger.error('Manual sync failed:', error);
            process.exit(1);
        }
    };
    
    manualSync();
} else if (args.includes('--test-connections')) {
    // Test API connections and exit
    logger.info('Testing API connections...');
    
    const testConnections = async () => {
        try {
            await syncService.testConnections();
            logger.info('All connections successful');
            process.exit(0);
        } catch (error) {
            logger.error('Connection test failed:', error);
            process.exit(1);
        }
    };
    
    testConnections();
} else if (args.includes('--help')) {
    // Show help
    console.log('IPOS to WooCommerce Stock Sync Service');
    console.log('');
    console.log('Usage:');
    console.log('  node app.js                    Start the service with scheduled sync');
    console.log('  node app.js --manual-sync      Run a single sync and exit');
    console.log('  node app.js --test-connections Test API connections and exit');
    console.log('  node app.js --help             Show this help message');
    console.log('');
    console.log('Service Commands:');
    console.log('  npm run install-service        Install as Windows service');
    console.log('  npm run uninstall-service      Uninstall Windows service');
    console.log('  npm start                      Start normally');
    console.log('  npm test                       Test connections');
    process.exit(0);
} else {
    // Normal startup - run as service
    main();
}
