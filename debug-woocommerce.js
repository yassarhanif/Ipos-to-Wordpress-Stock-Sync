const WooCommerceAPI = require('woocommerce-api');

// Test different configurations
const configs = [
    {
        name: "Full API URL",
        config: {
            url: "https://nibrasbogor.com/wp-json/wc/v3",
            consumerKey: "ck_8a311d5e6b8b72453790ef2e32dedbbd49d11432",
            consumerSecret: "cs_dbb0fe136515263a11af1f1755bf4e5bb8736eeb",
            wpAPI: false,
            timeout: 30000,
            queryStringAuth: true
        }
    },
    {
        name: "Base URL with wpAPI=true",
        config: {
            url: "https://nibrasbogor.com",
            consumerKey: "ck_8a311d5e6b8b72453790ef2e32dedbbd49d11432",
            consumerSecret: "cs_dbb0fe136515263a11af1f1755bf4e5bb8736eeb",
            wpAPI: true,
            version: "wc/v3",
            timeout: 30000,
            queryStringAuth: true
        }
    },
    {
        name: "Base URL with trailing slash",
        config: {
            url: "https://nibrasbogor.com/",
            consumerKey: "ck_8a311d5e6b8b72453790ef2e32dedbbd49d11432",
            consumerSecret: "cs_dbb0fe136515263a11af1f1755bf4e5bb8736eeb",
            wpAPI: true,
            version: "wc/v3",
            timeout: 30000,
            queryStringAuth: true
        }
    }
];

async function testConfig(name, config) {
    console.log(`\n=== Testing: ${name} ===`);
    
    try {
        const api = new WooCommerceAPI(config);
        console.log("API instance created successfully");
        
        const response = await api.get('products', { per_page: 1 });
        
        if (response.data) {
            console.log("✅ SUCCESS: Connection works!");
            console.log(`Found ${response.data.length} product(s)`);
            if (response.data.length > 0) {
                console.log(`Sample product: ${response.data[0].name} (ID: ${response.data[0].id})`);
            }
        } else {
            console.log("❌ FAILED: No data returned");
        }
        
    } catch (error) {
        console.log("❌ ERROR:", error.message);
        if (error.response && error.response.data) {
            console.log("Response data:", error.response.data);
        }
    }
}

async function runTests() {
    console.log("WooCommerce API Connection Debug Test");
    console.log("=====================================");
    
    for (const test of configs) {
        await testConfig(test.name, test.config);
    }
}

runTests();
