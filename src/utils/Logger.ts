/**
 * Enhanced Logging System
 * Requirements: 8.3, 8.4, 8.5
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  error?: Error;
  requestId?: string;
  userId?: string;
  projectId?: string;
  agentId?: string;
  stage?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableStructured: boolean;
  maxFileSize: number;
  maxFiles: number;
  logDirectory: string;
}

class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 1000;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: this.parseLogLevel(process.env.LOG_LEVEL) || LogLevel.INFO,
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE === 'true',
      enableStructured: process.env.LOG_STRUCTURED === 'true',
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      logDirectory: process.env.LOG_DIRECTORY || './logs',
      ...config
    };
  }

  private parseLogLevel(level?: string): LogLevel | undefined {
    if (!level) return undefined;
    
    const levelMap: Record<string, LogLevel> = {
      'error': LogLevel.ERROR,
      'warn': LogLevel.WARN,
      'info': LogLevel.INFO,
      'debug': LogLevel.DEBUG,
      'trace': LogLevel.TRACE
    };
    
    return levelMap[level.toLowerCase()];
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = LogLevel[entry.level].padEnd(5);
    const message = entry.message;
    
    let formatted = `[${timestamp}] ${level} ${message}`;
    
    if (entry.requestId) {
      formatted += ` [req:${entry.requestId}]`;
    }
    
    if (entry.userId) {
      formatted += ` [user:${entry.userId}]`;
    }
    
    if (entry.projectId) {
      formatted += ` [project:${entry.projectId}]`;
    }
    
    if (entry.agentId) {
      formatted += ` [agent:${entry.agentId}]`;
    }
    
    if (entry.stage !== undefined) {
      formatted += ` [stage:${entry.stage}]`;
    }
    
    if (entry.duration !== undefined) {
      formatted += ` [${entry.duration}ms]`;
    }
    
    if (entry.context) {
      formatted += ` ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      formatted += `\n${entry.error.stack || entry.error.message}`;
    }
    
    return formatted;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: any,
    error?: Error,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      requestId: metadata?.requestId,
      userId: metadata?.userId,
      projectId: metadata?.projectId,
      agentId: metadata?.agentId,
      stage: metadata?.stage,
      duration: metadata?.duration,
      metadata
    };
  }

  private writeLog(entry: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      const formatted = this.formatMessage(entry);
      
      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.DEBUG:
        case LogLevel.TRACE:
          console.log(formatted);
          break;
      }
    }

    // Structured output for monitoring systems
    if (this.config.enableStructured) {
      console.log(JSON.stringify(entry));
    }
  }

  public error(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, undefined, error, metadata);
    this.writeLog(entry);
  }

  public warn(message: string, context?: any, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context, undefined, metadata);
    this.writeLog(entry);
  }

  public info(message: string, context?: any, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context, undefined, metadata);
    this.writeLog(entry);
  }

  public debug(message: string, context?: any, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, undefined, metadata);
    this.writeLog(entry);
  }

  public trace(message: string, context?: any, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.TRACE)) return;
    
    const entry = this.createLogEntry(LogLevel.TRACE, message, context, undefined, metadata);
    this.writeLog(entry);
  }

  // Performance logging
  public performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, undefined, { ...metadata, duration });
  }

  // Agent-specific logging
  public agent(agentId: string, stage: number, message: string, context?: any, metadata?: Record<string, any>): void {
    this.info(message, context, { ...metadata, agentId, stage });
  }

  // Project-specific logging
  public project(projectId: string, message: string, context?: any, metadata?: Record<string, any>): void {
    this.info(message, context, { ...metadata, projectId });
  }

  // Request-specific logging
  public request(requestId: string, message: string, context?: any, metadata?: Record<string, any>): void {
    this.info(message, context, { ...metadata, requestId });
  }

  // Get recent logs for monitoring
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  // Get logs by level
  public getLogsByLevel(level: LogLevel, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === level)
      .slice(-count);
  }

  // Get logs by criteria
  public getLogsByCriteria(criteria: Partial<LogEntry>, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => {
        return Object.entries(criteria).every(([key, value]) => {
          return entry[key as keyof LogEntry] === value;
        });
      })
      .slice(-count);
  }

  // Get log statistics
  public getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    recentErrors: number;
    recentWarnings: number;
  } {
    const byLevel: Record<string, number> = {};
    let recentErrors = 0;
    let recentWarnings = 0;
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    this.logBuffer.forEach(entry => {
      const levelName = LogLevel[entry.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
      
      const entryTime = new Date(entry.timestamp);
      if (entryTime > oneHourAgo) {
        if (entry.level === LogLevel.ERROR) recentErrors++;
        if (entry.level === LogLevel.WARN) recentWarnings++;
      }
    });
    
    return {
      total: this.logBuffer.length,
      byLevel,
      recentErrors,
      recentWarnings
    };
  }

  // Clear logs
  public clearLogs(): void {
    this.logBuffer = [];
  }

  // Update configuration
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Create singleton instance
export const logger = new Logger();

// Export for testing and custom configurations
export { Logger };