/**
 * In-memory trace storage
 * Stores traces with automatic cleanup of old entries
 */

class TraceStorage {
  constructor(options = {}) {
    this.traces = [];
    this.maxTraces = options.maxTraces || 1000;
    this.maxAge = options.maxAge || 3600000; // 1 hour in ms

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Add a new trace
   */
  add(trace) {
    const traceData = {
      ...trace,
      id: trace.traceId || this.generateId(),
      timestamp: Date.now(),
      receivedAt: new Date().toISOString()
    };

    this.traces.unshift(traceData); // Add to beginning

    // Enforce max traces limit
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(0, this.maxTraces);
    }

    return traceData;
  }

  /**
   * Get all traces
   */
  getAll(options = {}) {
    const { limit = 100, offset = 0, service, status } = options;

    let filtered = this.traces;

    // Filter by service
    if (service) {
      filtered = filtered.filter(t => t.service === service);
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    return {
      traces: filtered.slice(offset, offset + limit),
      total: filtered.length,
      offset,
      limit
    };
  }

  /**
   * Get trace by ID
   */
  getById(id) {
    return this.traces.find(t => t.id === id || t.traceId === id);
  }

  /**
   * Get recent traces (for real-time updates)
   */
  getRecent(since) {
    return this.traces.filter(t => t.timestamp > since);
  }

  /**
   * Clear all traces
   */
  clear() {
    this.traces = [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTraces: this.traces.length,
      services: [...new Set(this.traces.map(t => t.service))],
      oldestTrace: this.traces.length > 0 ? this.traces[this.traces.length - 1].receivedAt : null,
      newestTrace: this.traces.length > 0 ? this.traces[0].receivedAt : null
    };
  }

  /**
   * Start automatic cleanup of old traces
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.maxAge;
      const beforeCount = this.traces.length;

      this.traces = this.traces.filter(t => t.timestamp > cutoff);

      const removed = beforeCount - this.traces.length;
      if (removed > 0) {
        console.log(`🧹 Cleaned up ${removed} old traces`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = TraceStorage;
