#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const TraceStorage = require('./storage');
const { createWebSocketServer } = require('./websocket');

class LocalUIServer {
  constructor(options = {}) {
    this.port = options.port || 9999;
    this.app = express();
    this.storage = new TraceStorage();
    this.wsServer = null;
    this.server = null;
  }

  setup() {
    // Middleware
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });

    // API Routes
    this.setupRoutes();

    // Serve static frontend (if built)
    const clientBuildPath = path.join(__dirname, '../client/dist');
    this.app.use(express.static(clientBuildPath));

    // Catch-all for SPA
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        stats: this.storage.getStats()
      });
    });

    // Receive traces from SDKs (OpenTelemetry format)
    this.app.post('/v1/traces', (req, res) => {
      try {
        const { resourceSpans } = req.body;

        if (!resourceSpans || !Array.isArray(resourceSpans)) {
          return res.status(400).json({ error: 'Invalid trace format' });
        }

        let tracesReceived = 0;

        // Process each resource span
        resourceSpans.forEach(resourceSpan => {
          const resource = resourceSpan.resource || {};
          const attributes = resource.attributes || [];

          // Extract service name
          const serviceAttr = attributes.find(a => a.key === 'service.name');
          const serviceName = serviceAttr?.value?.stringValue || 'unknown';

          // Process spans
          const scopeSpans = resourceSpan.scopeSpans || [];
          scopeSpans.forEach(scopeSpan => {
            const spans = scopeSpan.spans || [];

            spans.forEach(span => {
              const trace = this.normalizeSpan(span, serviceName);
              this.storage.add(trace);

              // Broadcast to WebSocket clients
              if (this.wsServer) {
                this.wsServer.broadcast({ type: 'new_trace', trace });
              }

              tracesReceived++;
            });
          });
        });

        console.log(`✓ Received ${tracesReceived} traces from ${req.headers['user-agent'] || 'SDK'}`);

        res.json({ success: true, tracesReceived });
      } catch (error) {
        console.error('Error processing traces:', error);
        res.status(500).json({ error: 'Failed to process traces' });
      }
    });

    // Get all traces
    this.app.get('/api/traces', (req, res) => {
      const { limit, offset, service, status } = req.query;

      const result = this.storage.getAll({
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0,
        service,
        status
      });

      res.json(result);
    });

    // Get single trace by ID
    this.app.get('/api/traces/:id', (req, res) => {
      const trace = this.storage.getById(req.params.id);

      if (!trace) {
        return res.status(404).json({ error: 'Trace not found' });
      }

      res.json(trace);
    });

    // Get statistics
    this.app.get('/api/stats', (req, res) => {
      res.json(this.storage.getStats());
    });

    // Clear all traces
    this.app.delete('/api/traces', (req, res) => {
      this.storage.clear();

      if (this.wsServer) {
        this.wsServer.broadcast({ type: 'traces_cleared' });
      }

      res.json({ success: true, message: 'All traces cleared' });
    });
  }

  /**
   * Normalize OpenTelemetry span to simpler format
   */
  normalizeSpan(span, serviceName) {
    const startTime = parseInt(span.startTimeUnixNano) / 1000000; // Convert to ms
    const endTime = parseInt(span.endTimeUnixNano) / 1000000;
    const duration = endTime - startTime;

    // Extract attributes
    const attrs = {};
    (span.attributes || []).forEach(attr => {
      const value = attr.value?.stringValue ||
                   attr.value?.intValue ||
                   attr.value?.doubleValue ||
                   attr.value?.boolValue;
      attrs[attr.key] = value;
    });

    // Determine status
    let status = 'ok';
    if (span.status) {
      if (span.status.code === 2) status = 'error';
      else if (span.status.code === 1) status = 'ok';
    }

    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      service: serviceName,
      name: span.name,
      kind: this.getSpanKind(span.kind),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: Math.round(duration * 100) / 100, // Round to 2 decimals
      status,
      attributes: attrs,
      events: span.events || [],
      links: span.links || []
    };
  }

  /**
   * Convert span kind to readable string
   */
  getSpanKind(kind) {
    const kinds = {
      0: 'UNSPECIFIED',
      1: 'INTERNAL',
      2: 'SERVER',
      3: 'CLIENT',
      4: 'PRODUCER',
      5: 'CONSUMER'
    };
    return kinds[kind] || 'UNSPECIFIED';
  }

  async findAvailablePort(startPort) {
    const net = require('net');

    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(startPort, () => {
        const { port } = server.address();
        server.close(() => resolve(port));
      });

      server.on('error', () => {
        // Port in use, try next
        resolve(this.findAvailablePort(startPort + 1));
      });
    });
  }

  async start() {
    // Find available port
    this.port = await this.findAvailablePort(this.port);

    this.setup();

    // Start HTTP server
    this.server = this.app.listen(this.port, () => {
      console.log('');
      console.log('🚀 TraceKit Local UI Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Dashboard: http://localhost:${this.port}`);
      console.log(`🔌 API Endpoint: http://localhost:${this.port}/v1/traces`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✓ Ready to receive traces');
      console.log('');
    });

    // Start WebSocket server
    this.wsServer = createWebSocketServer(this.server);

    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop() {
    console.log('\n🛑 Shutting down TraceKit Local UI...');

    this.storage.stopCleanup();

    if (this.wsServer) {
      this.wsServer.close();
    }

    if (this.server) {
      this.server.close(() => {
        console.log('✓ Server stopped');
        process.exit(0);
      });
    }
  }
}

// Run if called directly
if (require.main === module) {
  const server = new LocalUIServer();
  server.start();
}

module.exports = LocalUIServer;
