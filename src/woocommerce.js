const WooCommerceAPI = require('woocommerce-api');
const logger = require('./logger');
const config = require('../config.json');

class WooCommerceService {
    constructor() {
        this.api = new WooCommerceAPI({
            url: config.woocommerce.url,
            consumerKey: config.woocommerce.consumer_key,
            consumerSecret: config.woocommerce.consumer_secret,
            wpAPI: true,
            version: config.woocommerce.version,
            timeout: config.woocommerce.timeout
        });
    }

    /**
     * Get all products from WooCommerce with their SKUs
     * @returns {Promise<Array>} Array of products with SKU and stock information
     */
    async getAllProducts() {
        try {
            logger.info('Fetching all products from WooCommerce...');
            
            let allProducts = [];
            let page = 1;
            const perPage = 100; // Maximum allowed by WooCommerce API
            
            while (true) {
                const response = await this.api.get('products', {
                    per_page: perPage,
                    page: page,
                    status: 'publish', // Only get published products
                    manage_stock: true // Only get products that manage stock
                });

                if (!response.data || response.data.length === 0) {
                    break; // No more products
                }

                // Filter products that have SKUs
                const productsWithSku = response.data.filter(product => 
                    product.sku && product.sku.trim() !== ''
                );

                allProducts = allProducts.concat(productsWithSku);
                
                logger.info(`Fetched page ${page}: ${response.data.length} products (${productsWithSku.length} with SKU)`);
                
                // If we got less than perPage, we're at the end
                if (response.data.length < perPage) {
                    break;
                }
                
                page++;
            }

            logger.info(`Total products fetched: ${allProducts.length} products with SKUs`);
            return allProducts.map(product => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                stock_quantity: product.stock_quantity || 0,
                manage_stock: product.manage_stock,
                stock_status: product.stock_status,
                type: product.type
            }));

        } catch (error) {
            logger.error('Error fetching products from WooCommerce:', error);
            throw error;
        }
    }

    /**
     * Update stock quantity for a specific product
     * @param {number} productId - WooCommerce product ID
     * @param {number} stockQuantity - New stock quantity
     * @returns {Promise<boolean>} True if update was successful
     */
    async updateProductStock(productId, stockQuantity) {
        try {
            logger.info(`Updating stock for product ID ${productId} to quantity: ${stockQuantity}`);
            
            const updateData = {
                stock_quantity: stockQuantity,
                manage_stock: true,
                stock_status: stockQuantity > 0 ? 'instock' : 'outofstock'
            };

            const response = await this.api.put(`products/${productId}`, updateData);
            
            if (response.data && response.data.id) {
                logger.info(`Successfully updated stock for product ID ${productId}`);
                return true;
            } else {
                logger.error(`Failed to update stock for product ID ${productId}: No valid response`);
                return false;
            }

        } catch (error) {
            logger.error(`Error updating stock for product ID ${productId}:`, error);
            
            if (error.response && error.response.data) {
                logger.error('WooCommerce API error details:', error.response.data);
            }
            
            return false;
        }
    }

    /**
     * Update stock for multiple products in batch
     * @param {Array} updates - Array of {productId, stockQuantity} objects
     * @returns {Promise<Object>} Results summary
     */
    async batchUpdateStock(updates) {
        logger.info(`Starting batch stock update for ${updates.length} products`);
        
        const results = {
            total: updates.length,
            successful: 0,
            failed: 0,
            errors: []
        };

        // Process updates with a small delay to respect API rate limits
        for (let i = 0; i < updates.length; i++) {
            const update = updates[i];
            
            try {
                const success = await this.updateProductStock(update.productId, update.stockQuantity);
                
                if (success) {
                    results.successful++;
                } else {
                    results.failed++;
                    results.errors.push({
                        productId: update.productId,
                        sku: update.sku,
                        error: 'Update failed'
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    productId: update.productId,
                    sku: update.sku,
                    error: error.message
                });
            }

            // Small delay to respect API rate limits (WooCommerce allows ~100 requests per minute)
            if (i < updates.length - 1) {
                await this.delay(700); // ~700ms delay between requests
            }
        }

        logger.info(`Batch update completed: ${results.successful} successful, ${results.failed} failed`);
        return results;
    }

    /**
     * Test connection to WooCommerce API
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            logger.info('Testing connection to WooCommerce API...');
            
            const response = await this.api.get('products', { per_page: 1 });
            
            if (response.data) {
                logger.info('WooCommerce API connection test successful');
                return true;
            } else {
                logger.warn('WooCommerce API connection test failed: No data returned');
                return false;
            }
        } catch (error) {
            logger.error('WooCommerce API connection test failed:', error);
            if (error.response && error.response.data) {
                logger.error('API error details:', error.response.data);
            }
            return false;
        }
    }

    /**
     * Get product by SKU
     * @param {string} sku - Product SKU
     * @returns {Promise<Object|null>} Product data or null if not found
     */
    async getProductBySku(sku) {
        try {
            const response = await this.api.get('products', {
                sku: sku,
                per_page: 1
            });

            if (response.data && response.data.length > 0) {
                return response.data[0];
            }
            
            return null;
        } catch (error) {
            logger.error(`Error fetching product by SKU ${sku}:`, error);
            return null;
        }
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

module.exports = WooCommerceService;
