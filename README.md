# IPOS to WooCommerce Stock Sync Service

A Windows background service that automatically synchronizes inventory stock from your local IPOS system to WooCommerce every 10 minutes.

## Features

- 🔄 **Automated Sync**: Runs every 10 minutes in the background
- 🎯 **One-way Sync**: Local IPOS → WooCommerce (source of truth is your local system)
- 🔍 **SKU Matching**: Maps your local barcodes to WooCommerce SKUs
- 📊 **Smart Updates**: Only updates products where stock differs
- 🛡️ **Error Handling**: Robust retry logic and comprehensive logging
- 🖥️ **Windows Service**: Runs as a background service, starts automatically on boot
- 📝 **Detailed Logging**: Daily rotating logs for monitoring and troubleshooting

## Prerequisites

- Windows 10/11 or Windows Server
- Node.js 14 or higher
- Access to your local IPOS API
- WooCommerce REST API credentials

## Installation

### 1. Download and Setup

1. Download or clone this project to your local machine
2. Open Command Prompt as Administrator
3. Navigate to the project directory:
   ```cmd
   cd "C:\path\to\Ipos to Wordpress Stock Sync"
   ```

### 2. Install Dependencies

```cmd
npm install
```

### 3. Configuration

1. Copy the example configuration file:
   ```cmd
   copy config.example.json config.json
   ```

2. Edit `config.json` with your actual credentials:
   - **WooCommerce URL**: Your WordPress site URL
   - **Consumer Key & Secret**: From WooCommerce → Settings → Advanced → REST API
   - **Local API URL**: Your IPOS API endpoint

3. Configuration options:
   - **Sync Interval**: Currently set to 10 minutes
   - **Batch Size**: Process 50 products at a time
   - **API Timeouts**: Reasonable timeouts for all API calls
   - **Logging**: Daily rotating logs with 14-day retention

⚠️ **Important**: Never commit your actual `config.json` file to version control as it contains sensitive API credentials.

### 4. Test the Setup

Before installing as a service, test the connections:

```cmd
npm test
```

This will:
- Test connectivity to both WooCommerce and local IPOS APIs
- Show sample products and their stock levels
- Verify the sync logic works correctly

### 5. Install as Windows Service

```cmd
npm run install-service
```

This will:
- Install the service with name "IPOS-WooCommerce-Stock-Sync"
- Set it to start automatically on Windows boot
- Start the service immediately

## Usage

### Service Management

**View Service Status:**
```cmd
net query "IPOS-WooCommerce-Stock-Sync"
```

**Start Service:**
```cmd
net start "IPOS-WooCommerce-Stock-Sync"
```

**Stop Service:**
```cmd
net stop "IPOS-WooCommerce-Stock-Sync"
```

**Uninstall Service:**
```cmd
npm run uninstall-service
```

### Manual Operations

**Run Single Sync:**
```cmd
node app.js --manual-sync
```

**Test Connections:**
```cmd
node app.js --test-connections
```

**View Help:**
```cmd
node app.js --help
```

**Run in Development Mode:**
```cmd
npm start
```

## Monitoring

### Log Files

Logs are stored in the `./logs` directory:

- `sync-YYYY-MM-DD.log` - All sync activities
- `error-YYYY-MM-DD.log` - Error logs only

### Windows Services Manager

1. Open `services.msc`
2. Find "IPOS-WooCommerce-Stock-Sync"
3. Right-click for options (Start, Stop, Restart, Properties)

### Log Analysis

**View Recent Logs:**
```cmd
type logs\sync-2025-06-19.log
```

**Monitor Real-time (while running manually):**
```cmd
npm start
```

## How It Works

### Sync Process

1. **Fetch Products**: Get all products from WooCommerce that have SKUs
2. **Query Local Stock**: For each SKU, query your local IPOS API
3. **Compare Stock**: Compare WooCommerce stock vs local stock
4. **Update Differences**: Only update products where stock differs
5. **Log Results**: Record all activities and any errors

### Data Flow

```
Local IPOS API ─────────┐
                        ├──► Stock Sync Service ─────► WooCommerce API
WooCommerce API ────────┘
(for current stock)                                   (update stock)
```

### Matching Logic

- **WooCommerce SKU** ↔ **Local IPOS Barcode**
- Products are matched 1:1 by this identifier
- If no match found in local API, product is skipped (logged as warning)

## Configuration Details

### API Settings

```json
{
  "woocommerce": {
    "url": "https://nibrasbogor.com",
    "timeout": 30000
  },
  "localApi": {
    "baseUrl": "https://server-ipos-5-komputer-bawah.tailed4eee.ts.net",
    "timeout": 10000
  },
  "sync": {
    "intervalMinutes": 10,
    "batchSize": 50,
    "maxRetries": 3
  }
}
```

### Sync Behavior

- **Frequency**: Every 10 minutes
- **Batch Processing**: 50 products per batch to avoid timeouts
- **Rate Limiting**: 700ms delay between WooCommerce API calls
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Handling**: Continue processing other products if one fails

## Troubleshooting

### Common Issues

**Service Won't Install:**
- Ensure you're running Command Prompt as Administrator
- Check that Node.js is in your system PATH

**API Connection Failures:**
- Verify your local IPOS API is accessible
- Check WooCommerce credentials are correct
- Ensure firewall isn't blocking connections

**No Products Updated:**
- Check that WooCommerce products have SKUs
- Verify SKUs match your local IPOS barcodes
- Review logs for specific error messages

### Log Analysis

**Check recent sync activity:**
```cmd
findstr "Stock difference" logs\sync-*.log
```

**Check for errors:**
```cmd
type logs\error-*.log
```

**Monitor service status in logs:**
```cmd
findstr "Starting\|Completed\|Failed" logs\sync-*.log
```

### Getting Help

1. Check the logs in `./logs` directory
2. Run `npm test` to verify connections
3. Try a manual sync: `node app.js --manual-sync`
4. Check Windows Event Viewer for service-related issues

## Technical Details

- **Language**: Node.js
- **Dependencies**: axios, winston, node-cron, woocommerce-api, node-windows
- **Architecture**: Modular design with separate services for each API
- **Logging**: Winston with daily rotation and multiple log levels
- **Service Management**: node-windows for Windows service integration
- **Error Handling**: Comprehensive try-catch with retry logic
- **Memory Management**: Optimized for long-running service operation

## License

MIT License - See package.json for details
