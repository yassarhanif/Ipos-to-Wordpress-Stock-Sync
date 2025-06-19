const axios = require('axios');

// Test WooCommerce API directly with axios
async function testWooCommerceDirectly() {
    console.log("Testing WooCommerce API directly with axios");
    console.log("==============================================");
    
    const baseURL = "https://nibrasbogor.com/wp-json/wc/v3";
    const consumerKey = "ck_8a311d5e6b8b72453790ef2e32dedbbd49d11432";
    const consumerSecret = "cs_dbb0fe136515263a11af1f1755bf4e5bb8736eeb";
    
    try {
        console.log("Making direct API call to:", baseURL + "/products");
        
        const response = await axios.get(`${baseURL}/products`, {
            params: {
                per_page: 5,
                consumer_key: consumerKey,
                consumer_secret: consumerSecret
            },
            timeout: 30000
        });
        
        console.log("✅ SUCCESS: Direct API call works!");
        console.log(`Status: ${response.status}`);
        console.log(`Found ${response.data.length} products`);
        
        if (response.data.length > 0) {
            console.log("\nSample products:");
            response.data.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} (ID: ${product.id}, SKU: ${product.sku || 'No SKU'})`);
            });
        }
        
        return true;
        
    } catch (error) {
        console.log("❌ ERROR:", error.message);
        
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log("Response data:", error.response.data);
        }
        
        return false;
    }
}

// Test with Basic Auth
async function testWithBasicAuth() {
    console.log("\n\nTesting WooCommerce API with Basic Auth");
    console.log("=========================================");
    
    const baseURL = "https://nibrasbogor.com/wp-json/wc/v3";
    const consumerKey = "ck_8a311d5e6b8b72453790ef2e32dedbbd49d11432";
    const consumerSecret = "cs_dbb0fe136515263a11af1f1755bf4e5bb8736eeb";
    
    try {
        console.log("Making Basic Auth API call to:", baseURL + "/products");
        
        const response = await axios.get(`${baseURL}/products`, {
            params: {
                per_page: 5
            },
            auth: {
                username: consumerKey,
                password: consumerSecret
            },
            timeout: 30000
        });
        
        console.log("✅ SUCCESS: Basic Auth API call works!");
        console.log(`Status: ${response.status}`);
        console.log(`Found ${response.data.length} products`);
        
        if (response.data.length > 0) {
            console.log("\nSample products:");
            response.data.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} (ID: ${product.id}, SKU: ${product.sku || 'No SKU'})`);
            });
        }
        
        return true;
        
    } catch (error) {
        console.log("❌ ERROR:", error.message);
        
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log("Response data:", error.response.data);
        }
        
        return false;
    }
}

async function runTests() {
    const test1 = await testWooCommerceDirectly();
    const test2 = await testWithBasicAuth();
    
    console.log("\n\n=== SUMMARY ===");
    console.log(`Query String Auth: ${test1 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Basic Auth: ${test2 ? 'SUCCESS' : 'FAILED'}`);
    
    if (test1 || test2) {
        console.log("\n✅ WooCommerce API is working! The issue is with the woocommerce-api library.");
        console.log("We can fix this by updating the WooCommerce service to use axios directly.");
    } else {
        console.log("\n❌ WooCommerce API is not accessible. Please check your credentials and API settings.");
    }
}

runTests();
