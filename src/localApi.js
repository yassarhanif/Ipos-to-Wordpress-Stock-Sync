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
     * @param {Object} data - Raw response data from local API
     * @param {string} barcode - The barcode that was searched
     * @returns {Object} Parsed stock data
     */
    parseStockData(data, barcode) {
        try {
            // Handle different possible response formats
            let stockData = {};
            
            if (Array.isArray(data)) {
                // If response is an array, take the first item
                stockData = data.length > 0 ? data[0] : {};
            } else if (typeof data === 'object') {
                // If response is an object, use it directly
                stockData = data;
            } else {
                logger.warn(`Unexpected data format for barcode ${barcode}:`, typeof data);
                return null;
            }

            // Extract stock quantity - adjust these field names based on your API response
            const stockQuantity = this.extractStockQuantity(stockData);
            
            const result = {
                barcode: barcode,
                stockQuantity: stockQuantity,
                available: stockQuantity !== null,
                lastUpdated: new Date().toISOString(),
                rawData: stockData // Keep raw data for debugging
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
        // Common field names for stock quantity
        const possibleFields = [
            'stock_quantity',
            'stockQuantity',
            'stock',
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
                const quantity = parseInt(data[field], 10);
                if (!isNaN(quantity) && quantity >= 0) {
                    return quantity;
                }
            }
        }

        logger.warn('Could not find stock quantity in data:', Object.keys(data));
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
