/**
 * Comprehensive Monitoring System
 * Requirements: 8.3, 8.4, 8.5
 */

import { logger } from './Logger.js';

export interface MetricValue {
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  uptime: number;
  timestamp: Date;
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    requestsPerMinute: number;
  };
  agents: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    executionsPerStage: Record<number, number>;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    failed: number;
    averageCompletionTime: number;
  };
  websockets: {
    activeConnections: number;
    totalConnections: number;
    messagesPerMinute: number;
  };
  database: {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageQueryTime: number;
    connectionPoolSize: number;
  };
}

class MonitoringService {
  private metrics: Map<string, MetricValue[]> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private systemMetricsHistory: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics;
  private readonly maxMetricHistory = 1000;
  private readonly maxPerformanceHistory = 500;
  private readonly maxSystemHistory = 100;
  private metricsInterval?: NodeJS.Timeout;

  constructor() {
    this.applicationMetrics = this.initializeApplicationMetrics();
    this.startMetricsCollection();
  }

  private initializeApplicationMetrics(): ApplicationMetrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        requestsPerMinute: 0
      },
      agents: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        executionsPerStage: {}
      },
      projects: {
        total: 0,
        active: 0,
        completed: 0,
        failed: 0,
        averageCompletionTime: 0
      },
      websockets: {
        activeConnections: 0,
        totalConnections: 0,
        messagesPerMinute: 0
      },
      database: {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageQueryTime: 0,
        connectionPoolSize: 0
      }
    };
  }

  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    this.metricsInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 30000);

    logger.info('Monitoring service started', { component: 'monitoring' });
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const systemMetrics: SystemMetrics = {
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          loadAverage: process.platform !== 'win32' ? (await import('os')).loadavg() : [0, 0, 0]
        },
        memory: {
          used: memoryUsage.rss,
          free: (await import('os')).freemem(),
          total: (await import('os')).totalmem(),
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external
        },
        uptime: process.uptime(),
        timestamp: new Date()
      };

      this.systemMetricsHistory.push(systemMetrics);
      
      // Keep only recent history
      if (this.systemMetricsHistory.length > this.maxSystemHistory) {
        this.systemMetricsHistory.shift();
      }

      // Log high resource usage
      const memoryUsagePercent = (systemMetrics.memory.used / systemMetrics.memory.total) * 100;
      if (memoryUsagePercent > 80) {
        logger.warn('High memory usage detected', { 
          memoryUsagePercent: memoryUsagePercent.toFixed(2),
          component: 'monitoring'
        });
      }

    } catch (error) {
      logger.error('Failed to collect system metrics', error instanceof Error ? error : new Error(String(error)), { component: 'monitoring' });
    }
  }

  // Record custom metrics
  public recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricValue = {
      value,
      timestamp: new Date(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only recent history
    if (metricHistory.length > this.maxMetricHistory) {
      metricHistory.shift();
    }

    logger.trace('Metric recorded', { name, value, tags }, { component: 'monitoring' });
  }

  // Record performance metrics
  public recordPerformance(
    name: string,
    duration: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    const performanceMetric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      success,
      error,
      metadata
    };

    this.performanceMetrics.push(performanceMetric);

    // Keep only recent history
    if (this.performanceMetrics.length > this.maxPerformanceHistory) {
      this.performanceMetrics.shift();
    }

    // Log slow operations
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow operation detected', { 
        operation: name, 
        duration, 
        success,
        error,
        metadata 
      }, { component: 'monitoring' });
    }

    logger.debug('Performance metric recorded', { name, duration, success }, { component: 'monitoring' });
  }

  // Request metrics
  public recordRequest(success: boolean, responseTime: number, endpoint?: string): void {
    this.applicationMetrics.requests.total++;
    
    if (success) {
      this.applicationMetrics.requests.successful++;
    } else {
      this.applicationMetrics.requests.failed++;
    }

    // Update average response time (simple moving average)
    const total = this.applicationMetrics.requests.total;
    const currentAvg = this.applicationMetrics.requests.averageResponseTime;
    this.applicationMetrics.requests.averageResponseTime = 
      ((currentAvg * (total - 1)) + responseTime) / total;

    this.recordMetric('http_requests_total', 1, { success: success.toString(), endpoint: endpoint || 'unknown' });
    this.recordMetric('http_request_duration', responseTime, { endpoint: endpoint || 'unknown' });
  }

  // Agent execution metrics
  public recordAgentExecution(
    agentId: string,
    stage: number,
    success: boolean,
    duration: number,
    error?: string
  ): void {
    this.applicationMetrics.agents.totalExecutions++;
    
    if (success) {
      this.applicationMetrics.agents.successfulExecutions++;
    } else {
      this.applicationMetrics.agents.failedExecutions++;
    }

    // Update stage execution count
    if (!this.applicationMetrics.agents.executionsPerStage[stage]) {
      this.applicationMetrics.agents.executionsPerStage[stage] = 0;
    }
    this.applicationMetrics.agents.executionsPerStage[stage]++;

    // Update average execution time
    const total = this.applicationMetrics.agents.totalExecutions;
    const currentAvg = this.applicationMetrics.agents.averageExecutionTime;
    this.applicationMetrics.agents.averageExecutionTime = 
      ((currentAvg * (total - 1)) + duration) / total;

    this.recordMetric('agent_executions_total', 1, { 
      agent: agentId, 
      stage: stage.toString(), 
      success: success.toString() 
    });
    this.recordMetric('agent_execution_duration', duration, { 
      agent: agentId, 
      stage: stage.toString() 
    });

    logger.agent(agentId, stage, 'Agent execution recorded', { 
      success, 
      duration, 
      error 
    }, { component: 'monitoring' });
  }

  // Project metrics
  public recordProject(status: 'created' | 'completed' | 'failed', duration?: number): void {
    switch (status) {
      case 'created':
        this.applicationMetrics.projects.total++;
        this.applicationMetrics.projects.active++;
        break;
      case 'completed':
        this.applicationMetrics.projects.completed++;
        this.applicationMetrics.projects.active--;
        if (duration) {
          const total = this.applicationMetrics.projects.completed;
          const currentAvg = this.applicationMetrics.projects.averageCompletionTime;
          this.applicationMetrics.projects.averageCompletionTime = 
            ((currentAvg * (total - 1)) + duration) / total;
        }
        break;
      case 'failed':
        this.applicationMetrics.projects.failed++;
        this.applicationMetrics.projects.active--;
        break;
    }

    this.recordMetric('projects_total', 1, { status });
    if (duration) {
      this.recordMetric('project_completion_duration', duration);
    }
  }

  // WebSocket metrics
  public recordWebSocketConnection(connected: boolean): void {
    if (connected) {
      this.applicationMetrics.websockets.activeConnections++;
      this.applicationMetrics.websockets.totalConnections++;
    } else {
      this.applicationMetrics.websockets.activeConnections--;
    }

    this.recordMetric('websocket_connections', this.applicationMetrics.websockets.activeConnections);
  }

  public recordWebSocketMessage(): void {
    this.recordMetric('websocket_messages_total', 1);
  }

  // Database metrics
  public recordDatabaseQuery(success: boolean, duration: number, operation?: string): void {
    this.applicationMetrics.database.totalQueries++;
    
    if (success) {
      this.applicationMetrics.database.successfulQueries++;
    } else {
      this.applicationMetrics.database.failedQueries++;
    }

    // Update average query time
    const total = this.applicationMetrics.database.totalQueries;
    const currentAvg = this.applicationMetrics.database.averageQueryTime;
    this.applicationMetrics.database.averageQueryTime = 
      ((currentAvg * (total - 1)) + duration) / total;

    this.recordMetric('database_queries_total', 1, { 
      success: success.toString(), 
      operation: operation || 'unknown'
    });
    this.recordMetric('database_query_duration', duration, { operation: operation || 'unknown' });
  }

  // Get metrics
  public getMetric(name: string, limit?: number): MetricValue[] {
    const metrics = this.metrics.get(name) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  public getPerformanceMetrics(limit?: number): PerformanceMetric[] {
    return limit ? this.performanceMetrics.slice(-limit) : this.performanceMetrics;
  }

  public getSystemMetrics(limit?: number): SystemMetrics[] {
    return limit ? this.systemMetricsHistory.slice(-limit) : this.systemMetricsHistory;
  }

  public getApplicationMetrics(): ApplicationMetrics {
    return { ...this.applicationMetrics };
  }

  // Get aggregated metrics
  public getAggregatedMetrics(name: string, timeWindow: number = 3600000): {
    count: number;
    sum: number;
    average: number;
    min: number;
    max: number;
    latest: number;
  } {
    const cutoff = new Date(Date.now() - timeWindow);
    const metrics = this.getMetric(name).filter(m => m.timestamp > cutoff);

    if (metrics.length === 0) {
      return { count: 0, sum: 0, average: 0, min: 0, max: 0, latest: 0 };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: metrics.length,
      sum,
      average: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1]
    };
  }

  // Health check
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: {
      errorRate: number;
      averageResponseTime: number;
      memoryUsage: number;
      activeConnections: number;
    };
  } {
    const recentErrors = this.getAggregatedMetrics('http_requests_total', 300000); // 5 minutes
    const errorRate = recentErrors.count > 0 ? 
      (this.applicationMetrics.requests.failed / this.applicationMetrics.requests.total) * 100 : 0;

    const latestSystemMetrics = this.systemMetricsHistory[this.systemMetricsHistory.length - 1];
    const memoryUsage = latestSystemMetrics ? 
      (latestSystemMetrics.memory.used / latestSystemMetrics.memory.total) * 100 : 0;

    const checks = {
      lowErrorRate: errorRate < 5,
      acceptableResponseTime: this.applicationMetrics.requests.averageResponseTime < 2000,
      memoryUsageOk: memoryUsage < 90,
      hasActiveConnections: this.applicationMetrics.websockets.activeConnections >= 0
    };

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: {
        errorRate,
        averageResponseTime: this.applicationMetrics.requests.averageResponseTime,
        memoryUsage,
        activeConnections: this.applicationMetrics.websockets.activeConnections
      }
    };
  }

  // Cleanup
  public cleanup(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    logger.info('Monitoring service stopped', { component: 'monitoring' });
  }

  // Reset metrics (for testing)
  public reset(): void {
    this.metrics.clear();
    this.performanceMetrics = [];
    this.systemMetricsHistory = [];
    this.applicationMetrics = this.initializeApplicationMetrics();
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Export for testing
export { MonitoringService };