# TraceKit Local UI

**Local debug UI for TraceKit** - View traces and debug your application locally without requiring a cloud account.

## Quick Start

```bash
# Install
npm install -g @tracekit/local-ui

# Start
tracekit-local
```

Browser opens automatically at `http://localhost:9999`

## What It Does

- **Zero Setup**: No account needed for local development
- **Real-Time**: See traces appear instantly as your app runs
- **All SDKs**: Works with Node.js, Python, PHP, Go, and more
- **Offline**: Debug without internet connection
- **Fast**: In-memory storage, <1ms trace ingestion

## Usage

### 1. Start the Local UI

```bash
tracekit-local

# Output:
# 🚀 TraceKit Local UI Started
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📊 Dashboard: http://localhost:9999
# 🔌 API Endpoint: http://localhost:9999/v1/traces
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ✓ Ready to receive traces
```

### 2. Run Your Application

Your TraceKit SDK will automatically detect the local UI and send traces to it.

```javascript
// Node.js
const tracekit = require('@tracekit/node-apm');

tracekit.init({
  serviceName: 'my-app',
  // Local UI auto-detected in development
});
```

```python
# Python
import tracekit

tracekit.init(
    service_name='my-app',
    # Local UI auto-detected in development
)
```

### 3. View Traces

Open `http://localhost:9999` to see your traces in real-time.

## Features

### Current (v0.1)
- ✅ Real-time trace ingestion
- ✅ Trace list view
- ✅ WebSocket live updates
- ✅ In-memory storage (1000 traces, 1 hour retention)
- ✅ OpenTelemetry compatible
- ✅ Auto-cleanup old traces

### Coming Soon
- ⏳ Trace waterfall visualization
- ⏳ Search and filters
- ⏳ Breakpoint snapshots view
- ⏳ Dark mode
- ⏳ Export traces

## API

### POST /v1/traces

Receive traces in OpenTelemetry format.

**Example:**
```bash
curl -X POST http://localhost:9999/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "api-gateway"}}
        ]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "5bf69505396329aa160366e9f6e4cdb3",
          "spanId": "a1b2c3d4e5f6",
          "name": "GET /api/users",
          "startTimeUnixNano": "1705593600000000000",
          "endTimeUnixNano": "1705593600050000000"
        }]
      }]
    }]
  }'
```

### GET /api/traces

Get all traces.

**Query Parameters:**
- `limit` - Max traces to return (default: 100)
- `offset` - Pagination offset (default: 0)
- `service` - Filter by service name
- `status` - Filter by status (ok, error)

**Example:**
```bash
curl http://localhost:9999/api/traces?limit=10&service=api-gateway
```

### GET /api/traces/:id

Get single trace by ID.

### GET /api/stats

Get statistics about stored traces.

### DELETE /api/traces

Clear all traces.

## CLI Options

```bash
tracekit-local [options]

Options:
  -p, --port <port>   Port to run on (default: 9999)
  --no-open           Do not auto-open browser
  -h, --help          Display help
  -V, --version       Display version
```

**Examples:**

```bash
# Run on custom port
tracekit-local -p 8080

# Don't open browser automatically
tracekit-local --no-open

# Disable browser via env var
TRACEKIT_NO_BROWSER=1 tracekit-local
```

## How It Works

```
┌──────────────┐
│ Your App     │
│ (Node/Python)│
└──────┬───────┘
       │ Traces (HTTP)
       ▼
┌──────────────────┐
│ TraceKit Local UI│
│ localhost:9999   │
│ - API Server     │
│ - WebSocket      │
│ - Storage        │
└──────┬───────────┘
       │ Real-time
       ▼
┌──────────────┐
│ Browser      │
│ Dashboard    │
└──────────────┘
```

## Configuration

### Storage Limits

```javascript
// Default configuration
{
  maxTraces: 1000,      // Max traces in memory
  maxAge: 3600000       // 1 hour in milliseconds
}
```

Traces are automatically cleaned up when:
- Total exceeds 1000 traces
- Traces are older than 1 hour

### Port Selection

If port 9999 is in use, the next available port is automatically selected (10000, 10001, etc.)

## Troubleshooting

### Port Already in Use

The UI auto-finds an available port. Check the console output for the actual port:

```bash
📊 Dashboard: http://localhost:10000  # Port 9999 was in use
```

### No Traces Appearing

1. **Check SDK is running**
   ```bash
   # Your app should be running
   node app.js
   ```

2. **Verify local UI is detected**
   ```bash
   # SDK should log:
   # 🔍 Local UI detected at http://localhost:9999
   ```

3. **Test manually**
   ```bash
   curl -X POST http://localhost:9999/v1/traces \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
   ```

4. **Check console for errors**
   ```bash
   # Local UI logs all incoming requests
   POST /v1/traces
   ✓ Received 1 traces from SDK
   ```

### WebSocket Not Connecting

Ensure your browser supports WebSocket and check browser console for errors.

## Development

```bash
# Clone repo
git clone https://github.com/tracekit/tracekit

# Install dependencies
cd tracekit/local-ui
npm install

# Run in development
npm run dev

# Build frontend (when ready)
npm run build:client
```

## Requirements

- Node.js 18+
- Modern browser (Chrome, Firefox, Safari, Edge)

## License

MIT

## Support

- [Documentation](https://docs.tracekit.dev)
- [GitHub Issues](https://github.com/tracekit/tracekit/issues)
- [Discord Community](https://discord.gg/tracekit)
