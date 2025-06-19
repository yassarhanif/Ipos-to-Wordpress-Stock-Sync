const axios = require('axios');
const logger = require('./logger');
const config = require('../config.json');

class LocalApiService {
    constructor() {
        this.baseUrl = config.localApi.baseUrl;
        this.searchEndpoint = config.localApi.searchEndpoint;
        this.timeout = config.localApi.timeout;
        
        // Create axios instance with default configuration
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'IPOS-WooCommerce-Stock-Sync/1.0.0'
            }
        });
    }

    /**
     * Get stock information for a product by barcode/SKU
     * @param {string} barcode - The barcode/SKU to search for
     * @returns {Promise<Object|null>} Product data with stock information or null if not found
     */
    async getStockByBarcode(barcode) {
        try {
            logger.info(`Querying local API for barcode: ${barcode}`);
            
            const response = await this.client.get(this.searchEndpoint, {
                params: { barcode: barcode }
            });

            if (response.data && response.status === 200) {
                logger.debug(`Local API response for ${barcode}:`, response.data);
                return this.parseStockData(response.data, barcode);
            } else {
                logger.warn(`No data returned from local API for barcode: ${barcode}`);
                return null;
            }
        } catch (error) {
            if (error.response) {
                // API responded with error status
                logger.error(`Local API error for barcode ${barcode}: ${error.response.status} - ${error.response.statusText}`);
                if (error.response.data) {
                    logger.error('Error details:', error.response.data);
                }
            } else if (error.request) {
                // Request was made but no response received
                logger.error(`No response from local API for barcode ${barcode}: ${error.message}`);
            } else {
                // Something else happened
                logger.error(`Error setting up request for barcode ${barcode}: ${error.message}`);
            }
            return null;
        }
    }

    /**
     * Parse the stock data from local API response
     * @param {Object|Array} data - Raw response data from local API
     * @param {string} barcode - The barcode that was searched
     * @returns {Object} Parsed stock data
     */
    parseStockData(data, barcode) {
        try {
            let totalStock = 0;
            let hasValidData = false;
            
            if (Array.isArray(data)) {
                // If response is an array, sum all stock values for duplicate entries
                logger.debug(`Processing array response with ${data.length} items for barcode ${barcode}`);
                
                for (const item of data) {
                    if (item && typeof item === 'object') {
                        const stockValue = this.extractStockQuantity(item);
                        if (stockValue !== null) {
                            totalStock += stockValue;
                            hasValidData = true;
                        }
                    }
                }
                
                if (hasValidData) {
                    logger.info(`Summed stock for ${barcode}: ${totalStock} (from ${data.length} entries)`);
                } else {
                    logger.warn(`No valid stock data found in array for barcode ${barcode}`);
                    return null;
                }
                
            } else if (typeof data === 'object' && data !== null) {
                // If response is a single object
                const stockValue = this.extractStockQuantity(data);
                if (stockValue !== null) {
                    totalStock = stockValue;
                    hasValidData = true;
                } else {
                    logger.warn(`No valid stock data found in object for barcode ${barcode}`);
                    return null;
                }
            } else {
                logger.warn(`Unexpected data format for barcode ${barcode}:`, typeof data);
                return null;
            }

            const result = {
                barcode: barcode,
                stockQuantity: totalStock,
                available: hasValidData && totalStock >= 0,
                lastUpdated: new Date().toISOString(),
                rawData: data // Keep raw data for debugging
            };

            logger.debug(`Parsed stock data for ${barcode}:`, result);
            return result;
        } catch (error) {
            logger.error(`Error parsing stock data for barcode ${barcode}:`, error);
            return null;
        }
    }

    /**
     * Extract stock quantity from various possible field names
     * @param {Object} data - Product data from API
     * @returns {number|null} Stock quantity or null if not found
     */
    extractStockQuantity(data) {
        // IPOS API specific field names (prioritized order)
        const possibleFields = [
            'stock',           // Primary field from IPOS API (integer)
            'stok',            // Secondary field from IPOS API (string with decimal)
            'stock_quantity',
            'stockQuantity',
            'quantity',
            'qty',
            'available_stock',
            'availableStock',
            'inventory',
            'stock_count',
            'stockCount'
        ];

        for (const field of possibleFields) {
            if (data.hasOwnProperty(field) && data[field] !== null && data[field] !== undefined) {
                let quantity;
                
                // Handle different data types
                if (typeof data[field] === 'number') {
                    quantity = data[field];
                } else if (typeof data[field] === 'string') {
                    // Parse string values (like "1.000" to 1)
                    quantity = parseFloat(data[field]);
                } else {
                    continue; // Skip non-numeric values
                }
                
                // Validate the quantity
                if (!isNaN(quantity) && quantity >= 0) {
                    return Math.floor(quantity); // Return integer stock count
                }
            }
        }

        logger.warn(`Could not find stock quantity in data for fields [${Object.keys(data).join(', ')}]`);
        return null;
    }

    /**
     * Test connection to local API
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            logger.info('Testing connection to local API...');
            
            // Try to make a simple request - you might need to adjust this endpoint
            const response = await this.client.get('/');
            
            if (response.status === 200) {
                logger.info('Local API connection test successful');
                return true;
            } else {
                logger.warn(`Local API connection test returned status: ${response.status}`);
                return false;
            }
        } catch (error) {
            logger.error('Local API connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = LocalApiService;
