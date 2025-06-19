const StockSyncService = require('./src/syncService');
const logger = require('./src/logger');

async function testService() {
    const syncService = new StockSyncService();
    
    console.log('=== IPOS to WooCommerce Stock Sync - Connection Test ===');
    console.log('');
    
    try {
        console.log('🔍 Testing API connections...');
        
        // Test connections
        const wooCommerceOk = await syncService.woocommerce.testConnection();
        const localApiOk = await syncService.localApi.testConnection();
        
        console.log('');
        console.log('📊 Connection Test Results:');
        console.log(`  WooCommerce API: ${wooCommerceOk ? '✅ Connected' : '❌ Failed'}`);
        console.log(`  Local IPOS API:  ${localApiOk ? '✅ Connected' : '❌ Failed'}`);
        console.log('');
        
        if (wooCommerceOk && localApiOk) {
            console.log('🎉 All connections successful!');
            console.log('');
            
            // Test fetching a few products for demonstration
            console.log('🛒 Testing product fetch (first 5 products)...');
            try {
                const products = await syncService.woocommerce.getAllProducts();
                
                if (products.length > 0) {
                    console.log(`📦 Found ${products.length} products with SKUs in WooCommerce`);
                    console.log('');
                    console.log('Sample products:');
                    
                    const sampleProducts = products.slice(0, 5);
                    for (let i = 0; i < sampleProducts.length; i++) {
                        const product = sampleProducts[i];
                        console.log(`  ${i + 1}. ${product.name} (SKU: ${product.sku}) - Stock: ${product.stock_quantity}`);
                        
                        // Test local API query for this SKU
                        console.log(`     🔍 Checking local stock for SKU: ${product.sku}...`);
                        try {
                            const localStock = await syncService.localApi.getStockByBarcode(product.sku);
                            if (localStock && localStock.available) {
                                console.log(`     📊 Local stock: ${localStock.stockQuantity}`);
                                
                                const diff = localStock.stockQuantity - product.stock_quantity;
                                if (diff !== 0) {
                                    console.log(`     ⚠️  Stock difference: ${diff > 0 ? '+' + diff : diff}`);
                                } else {
                                    console.log(`     ✅ Stock levels match`);
                                }
                            } else {
                                console.log(`     ❌ No stock data found in local API`);
                            }
                        } catch (error) {
                            console.log(`     ❌ Error querying local API: ${error.message}`);
                        }
                        console.log('');
                    }
                } else {
                    console.log('⚠️  No products found with SKUs in WooCommerce');
                }
            } catch (error) {
                console.error('❌ Error fetching products:', error.message);
            }
            
            console.log('✅ Connection test completed successfully!');
            console.log('');
            console.log('Next steps:');
            console.log('1. Install as Windows service: npm run install-service');
            console.log('2. Or run manually: npm start');
            console.log('3. Or run single sync: node app.js --manual-sync');
            
        } else {
            console.log('❌ Connection test failed!');
            console.log('');
            console.log('Please check:');
            if (!wooCommerceOk) {
                console.log('- WooCommerce API credentials in config.json');
                console.log('- WooCommerce site URL is accessible');
                console.log('- Consumer key and secret are valid');
            }
            if (!localApiOk) {
                console.log('- Local API URL is correct and accessible');
                console.log('- Local API service is running');
                console.log('- Network connectivity to local API');
            }
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testService();
