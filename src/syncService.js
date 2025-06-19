const cron = require('node-cron');
const logger = require('./logger');
const WooCommerceService = require('./woocommerce');
const LocalApiService = require('./localApi');
const config = require('../config.json');

class StockSyncService {
    constructor() {
        this.woocommerce = new WooCommerceService();
        this.localApi = new LocalApiService();
        this.isRunning = false;
        this.lastSyncTime = null;
        this.syncStats = {
            totalSyncs: 0,
            totalProducts: 0,
            totalUpdates: 0,
            totalErrors: 0
        };
        
        // Cron job for scheduled syncing
        this.cronJob = null;
    }

    /**
     * Start the sync service with scheduled runs
     */
    async start() {
        try {
            logger.info('Starting Stock Sync Service...');
            
            // Test connections first
            await this.testConnections();
            
            // Run initial sync
            await this.performSync();
            
            // Set up scheduled sync if enabled
            if (config.sync.enabled) {
                this.setupScheduledSync();
            }
            
            logger.info('Stock Sync Service started successfully');
            
        } catch (error) {
            logger.error('Failed to start Stock Sync Service:', error);
            throw error;
        }
    }

    /**
     * Stop the sync service
     */
    stop() {
        logger.info('Stopping Stock Sync Service...');
        
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        
        logger.info('Stock Sync Service stopped');
    }

    /**
     * Test connections to both APIs
     */
    async testConnections() {
        logger.info('Testing API connections...');
        
        const wooCommerceOk = await this.woocommerce.testConnection();
        const localApiOk = await this.localApi.testConnection();
        
        if (!wooCommerceOk) {
            throw new Error('WooCommerce API connection failed');
        }
        
        if (!localApiOk) {
            throw new Error('Local API connection failed');
        }
        
        logger.info('All API connections successful');
    }

    /**
     * Set up scheduled sync using cron
     */
    setupScheduledSync() {
        const cronExpression = `*/${config.sync.intervalMinutes} * * * *`;
        
        logger.info(`Setting up scheduled sync every ${config.sync.intervalMinutes} minutes`);
        
        this.cronJob = cron.schedule(cronExpression, async () => {
            if (!this.isRunning) {
                await this.performSync();
            } else {
                logger.warn('Sync already in progress, skipping scheduled run');
            }
        }, {
            scheduled: true,
            timezone: "Asia/Jakarta"  // Adjust to your timezone
        });
        
        this.cronJob.start();
        logger.info('Scheduled sync activated');
    }

    /**
     * Perform the main stock synchronization
     */
    async performSync() {
        if (this.isRunning) {
            logger.warn('Sync already in progress');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();
        
        logger.info('=== Starting Stock Synchronization ===');
        
        try {
            // Get all products from WooCommerce
            const products = await this.woocommerce.getAllProducts();
            
            if (products.length === 0) {
                logger.warn('No products found in WooCommerce with SKUs');
                return;
            }

            logger.info(`Found ${products.length} products to sync`);
            
            // Process products in batches
            const updates = [];
            const batchSize = config.sync.batchSize;
            
            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);
                logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`);
                
                const batchUpdates = await this.processBatch(batch);
                updates.push(...batchUpdates);
                
                // Small delay between batches to prevent overwhelming the APIs
                if (i + batchSize < products.length) {
                    await this.delay(1000);
                }
            }

            // Apply updates to WooCommerce
            if (updates.length > 0) {
                logger.info(`Applying ${updates.length} stock updates to WooCommerce`);
                const results = await this.woocommerce.batchUpdateStock(updates);
                
                // Update statistics
                this.syncStats.totalUpdates += results.successful;
                this.syncStats.totalErrors += results.failed;
                
                if (results.failed > 0) {
                    logger.warn(`${results.failed} updates failed:`, results.errors);
                }
            } else {
                logger.info('No stock updates required - all products are in sync');
            }

            // Update sync statistics
            this.syncStats.totalSyncs++;
            this.syncStats.totalProducts += products.length;
            this.lastSyncTime = new Date();
            
            const duration = (new Date() - startTime) / 1000;
            logger.info(`=== Sync Completed in ${duration.toFixed(2)} seconds ===`);
            logger.info(`Stats: ${updates.length} updates applied, ${products.length} products checked`);
            
        } catch (error) {
            logger.error('Sync failed:', error);
            this.syncStats.totalErrors++;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Process a batch of products
     * @param {Array} products - Batch of products to process
     * @returns {Promise<Array>} Array of updates to apply
     */
    async processBatch(products) {
        const updates = [];
        
        for (const product of products) {
            try {
                const localStock = await this.getLocalStock(product.sku);
                
                if (localStock !== null) {
                    // Compare stock levels
                    const currentStock = product.stock_quantity || 0;
                    
                    if (localStock !== currentStock) {
                        logger.info(`Stock difference found for ${product.sku}: WooCommerce=${currentStock}, Local=${localStock}`);
                        
                        updates.push({
                            productId: product.id,
                            sku: product.sku,
                            stockQuantity: localStock,
                            currentStock: currentStock,
                            productName: product.name
                        });
                    } else {
                        logger.debug(`Stock in sync for ${product.sku}: ${currentStock}`);
                    }
                } else {
                    logger.warn(`Could not get stock for SKU: ${product.sku}`);
                }
                
            } catch (error) {
                logger.error(`Error processing product ${product.sku}:`, error);
            }
        }
        
        return updates;
    }

    /**
     * Get stock quantity from local API with retry logic
     * @param {string} sku - Product SKU/barcode
     * @returns {Promise<number|null>} Stock quantity or null if not found
     */
    async getLocalStock(sku) {
        let retries = 0;
        const maxRetries = config.sync.maxRetries;
        
        while (retries < maxRetries) {
            try {
                const stockData = await this.localApi.getStockByBarcode(sku);
                
                if (stockData && stockData.available) {
                    return stockData.stockQuantity;
                } else {
                    logger.debug(`No stock data available for SKU: ${sku}`);
                    return null;
                }
                
            } catch (error) {
                retries++;
                logger.warn(`Retry ${retries}/${maxRetries} for SKU ${sku}: ${error.message}`);
                
                if (retries < maxRetries) {
                    await this.delay(config.sync.retryDelayMs * retries); // Exponential backoff
                } else {
                    logger.error(`Failed to get stock for SKU ${sku} after ${maxRetries} retries`);
                    return null;
                }
            }
        }
        
        return null;
    }

    /**
     * Get current sync statistics
     * @returns {Object} Sync statistics
     */
    getStats() {
        return {
            ...this.syncStats,
            isRunning: this.isRunning,
            lastSyncTime: this.lastSyncTime,
            nextSyncTime: this.cronJob ? 'Every ' + config.sync.intervalMinutes + ' minutes' : 'Not scheduled'
        };
    }

    /**
     * Manually trigger a sync (for testing or manual runs)
     */
    async manualSync() {
        logger.info('Manual sync triggered');
        await this.performSync();
    }

    /**
     * Utility function to add delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = StockSyncService;
