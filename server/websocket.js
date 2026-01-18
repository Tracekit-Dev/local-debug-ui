const WebSocket = require('ws');

function createWebSocketServer(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  const clients = new Set();

  wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to TraceKit Local UI'
    }));
  });

  // Broadcast to all connected clients
  function broadcast(message) {
    const data = JSON.stringify(message);

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Close all connections
  function close() {
    clients.forEach((client) => {
      client.close();
    });
    wss.close();
  }

  return {
    broadcast,
    close,
    clients
  };
}

module.exports = { createWebSocketServer };
