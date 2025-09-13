import { Request, Response, NextFunction } from 'express';
import { WebSocketService } from '../services/WebSocketService.js';

/**
 * Centralized error handling utility for the application.
 * Provides standardized error processing, logging, and recovery mechanisms.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  OLLAMA_ERROR = 'OLLAMA_ERROR',
  GROQ_ERROR = 'GROQ_ERROR',
  GROQ_API_KEY_INVALID = 'GROQ_API_KEY_INVALID',
  GROQ_API_KEY_MISSING = 'GROQ_API_KEY_MISSING',
  GROQ_RATE_LIMIT = 'GROQ_RATE_LIMIT',
  GROQ_QUOTA_EXCEEDED = 'GROQ_QUOTA_EXCEEDED',
  GROQ_SERVICE_UNAVAILABLE = 'GROQ_SERVICE_UNAVAILABLE',
  AGENT_ERROR = 'AGENT_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  userId?: string;
  projectId?: string;
  taskId?: string;
  agentId?: string;
  agentName?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  path?: string;
  origin?: string;
  timeout?: number;
  serviceType?: string;
  stage?: number;
  operation?: string;
  originalError?: string;
  timestamp: Date;
  stackTrace?: string;
  additionalData?: Record<string, any>;
}

export interface AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  statusCode: number;
  context: ErrorContext;
  isOperational: boolean;
  retryable: boolean;
  userMessage: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private webSocketService?: WebSocketService;
  private errorMetrics: Map<ErrorType, number> = new Map();
  private recentErrors: AppError[] = [];
  private maxRecentErrors = 100;

  private constructor() {
    // Initialize error metrics
    Object.values(ErrorType).forEach(type => {
      this.errorMetrics.set(type, 0);
    });
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public setWebSocketService(webSocketService: WebSocketService): void {
    this.webSocketService = webSocketService;
  }

  /**
   * Creates a standardized application error
   */
  public createError(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity,
    statusCode: number,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ): AppError {
    const error = new Error(message) as AppError;
    error.type = type;
    error.severity = severity;
    error.statusCode = statusCode;
    error.context = {
      timestamp: new Date(),
      stackTrace: originalError?.stack || error.stack,
      ...context
    };
    error.isOperational = this.isOperationalError(type);
    error.retryable = this.isRetryableError(type);
    error.userMessage = this.getUserFriendlyMessage(type, message);

    return error;
  }

  /**
   * Handles and processes application errors
   */
  public async handleError(error: AppError | Error, context?: Partial<ErrorContext>): Promise<void> {
    let appError: AppError;

    if (this.isAppError(error)) {
      appError = error;
      // Update context if provided
      if (context) {
        appError.context = { ...appError.context, ...context };
      }
    } else {
      // Convert regular error to AppError
      appError = this.createError(
        error.message || 'Unknown error',
        ErrorType.INTERNAL_ERROR,
        ErrorSeverity.MEDIUM,
        500,
        context,
        error
      );
    }

    // Log the error
    await this.logError(appError);

    // Update metrics
    this.updateErrorMetrics(appError);

    // Store recent error
    this.storeRecentError(appError);

    // Notify via WebSocket if applicable
    await this.notifyError(appError);

    // Handle critical errors
    if (appError.severity === ErrorSeverity.CRITICAL) {
      await this.handleCriticalError(appError);
    }
  }

  /**
   * Express error middleware
   */
  public expressErrorHandler = async (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const context: Partial<ErrorContext> = {
      requestId: req.headers['x-request-id'] as string,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userId: req.body?.userId || req.query?.userId as string,
      projectId: req.params?.id || req.body?.projectId as string
    };

    let appError: AppError;

    if (this.isAppError(error)) {
      appError = error;
      appError.context = { ...appError.context, ...context };
    } else {
      // Determine error type based on error characteristics
      const errorType = this.determineErrorType(error);
      const severity = this.determineSeverity(errorType, error);
      const statusCode = this.determineStatusCode(errorType, error);

      appError = this.createError(
        error.message,
        errorType,
        severity,
        statusCode,
        context,
        error
      );
    }

    await this.handleError(appError);

    // Send response
    if (!res.headersSent) {
      res.status(appError.statusCode).json({
        error: appError.type,
        message: appError.userMessage,
        statusCode: appError.statusCode,
        requestId: context.requestId,
        timestamp: appError.context.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          details: appError.message,
          stack: appError.context.stackTrace
        })
      });
    }
  };

  /**
   * Retry mechanism with exponential backoff
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
      retryCondition?: (error: Error) => boolean;
      context?: Partial<ErrorContext>;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      retryCondition = (error) => this.isRetryableError(this.determineErrorType(error)),
      context = {}
    } = options;

    let lastError: Error | null = null;
    let delay = baseDelay;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on last attempt
        if (attempt > maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!retryCondition(lastError)) {
          break;
        }

        // Log retry attempt
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${delay}ms:`, {
          error: lastError.message,
          context
        });

        // Wait before retry
        await this.sleep(delay);

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }

    // All retries failed, handle the error
    if (!lastError) {
      lastError = new Error('Unknown error occurred during retry operation');
    }

    const appError = this.createError(
      `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
      this.determineErrorType(lastError),
      ErrorSeverity.HIGH,
      500,
      context,
      lastError
    );

    await this.handleError(appError);
    throw appError;
  }

  /**
   * Circuit breaker pattern implementation
   */
  public createCircuitBreaker<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      monitoringPeriod?: number;
      context?: Partial<ErrorContext>;
    } = {}
  ): (...args: T) => Promise<R> {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 60000,
      context = {}
    } = options;

    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    let failureCount = 0;
    let lastFailureTime = 0;
    let successCount = 0;

    return async (...args: T): Promise<R> => {
      const now = Date.now();

      // Reset failure count if monitoring period has passed
      if (now - lastFailureTime > monitoringPeriod) {
        failureCount = 0;
      }

      // Check circuit state
      if (state === 'OPEN') {
        if (now - lastFailureTime < resetTimeout) {
          const error = this.createError(
            'Circuit breaker is OPEN - operation not allowed',
            ErrorType.INTERNAL_ERROR,
            ErrorSeverity.MEDIUM,
            503,
            context
          );
          throw error;
        } else {
          state = 'HALF_OPEN';
          successCount = 0;
        }
      }

      try {
        const result = await operation(...args);

        // Success - update circuit state
        if (state === 'HALF_OPEN') {
          successCount++;
          if (successCount >= 3) {
            state = 'CLOSED';
            failureCount = 0;
          }
        }

        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        if (state === 'HALF_OPEN') {
          state = 'OPEN';
        } else if (failureCount >= failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }

  /**
   * Gets error statistics and metrics
   */
  public getErrorMetrics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    recentErrors: AppError[];
    errorRate: number;
  } {
    const totalErrors = Array.from(this.errorMetrics.values()).reduce((sum, count) => sum + count, 0);
    const errorsByType = Object.fromEntries(this.errorMetrics.entries()) as Record<ErrorType, number>;
    
    // Calculate error rate (errors per minute in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrorCount = this.recentErrors.filter(
      error => error.context.timestamp > oneHourAgo
    ).length;
    const errorRate = recentErrorCount / 60; // errors per minute

    return {
      totalErrors,
      errorsByType,
      recentErrors: this.recentErrors.slice(-10), // Last 10 errors
      errorRate
    };
  }

  /**
   * Clears error metrics (useful for testing)
   */
  public clearMetrics(): void {
    this.errorMetrics.clear();
    this.recentErrors = [];
    Object.values(ErrorType).forEach(type => {
      this.errorMetrics.set(type, 0);
    });
  }

  // Private helper methods

  private isAppError(error: any): error is AppError {
    return error && typeof error.type === 'string' && typeof error.severity === 'string';
  }

  private isOperationalError(type: ErrorType): boolean {
    const operationalErrors = [
      ErrorType.VALIDATION_ERROR,
      ErrorType.NOT_FOUND_ERROR,
      ErrorType.AUTHENTICATION_ERROR,
      ErrorType.AUTHORIZATION_ERROR,
      ErrorType.RATE_LIMIT_ERROR
    ];
    return operationalErrors.includes(type);
  }

  private isRetryableError(type: ErrorType): boolean {
    const retryableErrors = [
      ErrorType.DATABASE_ERROR,
      ErrorType.OLLAMA_ERROR,
      ErrorType.GROQ_ERROR,
      ErrorType.GROQ_RATE_LIMIT,
      ErrorType.GROQ_SERVICE_UNAVAILABLE,
      ErrorType.NETWORK_ERROR,
      ErrorType.WEBSOCKET_ERROR
    ];
    return retryableErrors.includes(type);
  }

  private getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
    const friendlyMessages: Record<ErrorType, string> = {
      [ErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorType.DATABASE_ERROR]: 'A temporary database issue occurred. Please try again.',
      [ErrorType.OLLAMA_ERROR]: 'AI service is temporarily unavailable. Please try again.',
      [ErrorType.GROQ_ERROR]: 'Groq AI service is temporarily unavailable. Please try again.',
      [ErrorType.GROQ_API_KEY_INVALID]: 'Invalid Groq API key. Please check your API key and try again.',
      [ErrorType.GROQ_API_KEY_MISSING]: 'Groq API key is required. Please configure your API key.',
      [ErrorType.GROQ_RATE_LIMIT]: 'Groq API rate limit reached. Please wait a moment before trying again.',
      [ErrorType.GROQ_QUOTA_EXCEEDED]: 'Groq API quota exceeded. Please check your account limits.',
      [ErrorType.GROQ_SERVICE_UNAVAILABLE]: 'Groq service is temporarily unavailable. Please try again later.',
      [ErrorType.AGENT_ERROR]: 'An issue occurred while processing your request. Please try again.',
      [ErrorType.WEBSOCKET_ERROR]: 'Real-time connection issue. Please refresh the page.',
      [ErrorType.NETWORK_ERROR]: 'Network connection issue. Please check your connection.',
      [ErrorType.AUTHENTICATION_ERROR]: 'Authentication required. Please log in.',
      [ErrorType.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
      [ErrorType.NOT_FOUND_ERROR]: 'The requested resource was not found.',
      [ErrorType.RATE_LIMIT_ERROR]: 'Too many requests. Please wait and try again.',
      [ErrorType.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.'
    };

    return friendlyMessages[type] || originalMessage;
  }

  private determineErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (message.includes('database') || message.includes('prisma')) {
      return ErrorType.DATABASE_ERROR;
    }
    if (message.includes('ollama') || message.includes('ai service')) {
      return ErrorType.OLLAMA_ERROR;
    }
    // Groq-specific error detection
    if (message.includes('groq api key') && (message.includes('invalid') || message.includes('unauthorized'))) {
      return ErrorType.GROQ_API_KEY_INVALID;
    }
    if (message.includes('groq api key') && message.includes('not configured')) {
      return ErrorType.GROQ_API_KEY_MISSING;
    }
    if (message.includes('groq') && (message.includes('rate limit') || message.includes('too many requests'))) {
      return ErrorType.GROQ_RATE_LIMIT;
    }
    if (message.includes('groq') && message.includes('quota')) {
      return ErrorType.GROQ_QUOTA_EXCEEDED;
    }
    if (message.includes('groq') && message.includes('service unavailable')) {
      return ErrorType.GROQ_SERVICE_UNAVAILABLE;
    }
    if (message.includes('groq')) {
      return ErrorType.GROQ_ERROR;
    }
    if (message.includes('agent')) {
      return ErrorType.AGENT_ERROR;
    }
    if (message.includes('websocket') || message.includes('socket')) {
      return ErrorType.WEBSOCKET_ERROR;
    }
    if (message.includes('network') || message.includes('connection')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('not found')) {
      return ErrorType.NOT_FOUND_ERROR;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return ErrorType.RATE_LIMIT_ERROR;
    }
    
    return ErrorType.INTERNAL_ERROR;
  }

  private determineSeverity(type: ErrorType, error: Error): ErrorSeverity {
    const criticalTypes = [ErrorType.DATABASE_ERROR];
    const highTypes = [
      ErrorType.OLLAMA_ERROR, 
      ErrorType.GROQ_ERROR, 
      ErrorType.GROQ_SERVICE_UNAVAILABLE,
      ErrorType.AGENT_ERROR
    ];
    const mediumTypes = [
      ErrorType.GROQ_API_KEY_INVALID,
      ErrorType.GROQ_QUOTA_EXCEEDED,
      ErrorType.WEBSOCKET_ERROR, 
      ErrorType.NETWORK_ERROR
    ];
    const lowTypes = [
      ErrorType.GROQ_API_KEY_MISSING,
      ErrorType.GROQ_RATE_LIMIT
    ];
    
    if (criticalTypes.includes(type)) return ErrorSeverity.CRITICAL;
    if (highTypes.includes(type)) return ErrorSeverity.HIGH;
    if (mediumTypes.includes(type)) return ErrorSeverity.MEDIUM;
    if (lowTypes.includes(type)) return ErrorSeverity.LOW;
    
    return ErrorSeverity.LOW;
  }

  private determineStatusCode(type: ErrorType, error: Error): number {
    const statusCodes: Record<ErrorType, number> = {
      [ErrorType.VALIDATION_ERROR]: 400,
      [ErrorType.AUTHENTICATION_ERROR]: 401,
      [ErrorType.AUTHORIZATION_ERROR]: 403,
      [ErrorType.NOT_FOUND_ERROR]: 404,
      [ErrorType.RATE_LIMIT_ERROR]: 429,
      [ErrorType.DATABASE_ERROR]: 500,
      [ErrorType.OLLAMA_ERROR]: 502,
      [ErrorType.GROQ_ERROR]: 502,
      [ErrorType.GROQ_API_KEY_INVALID]: 401,
      [ErrorType.GROQ_API_KEY_MISSING]: 400,
      [ErrorType.GROQ_RATE_LIMIT]: 429,
      [ErrorType.GROQ_QUOTA_EXCEEDED]: 402,
      [ErrorType.GROQ_SERVICE_UNAVAILABLE]: 503,
      [ErrorType.AGENT_ERROR]: 500,
      [ErrorType.WEBSOCKET_ERROR]: 500,
      [ErrorType.NETWORK_ERROR]: 502,
      [ErrorType.INTERNAL_ERROR]: 500
    };

    return statusCodes[type] || 500;
  }

  private async logError(error: AppError): Promise<void> {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      isOperational: error.isOperational,
      retryable: error.retryable
    };

    console[logLevel](`[${error.type}] ${error.message}`, logData);

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.CRITICAL) {
      // Send to external monitoring service (e.g., Sentry, DataDog)
      // await this.sendToExternalLogging(error);
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  private updateErrorMetrics(error: AppError): void {
    const currentCount = this.errorMetrics.get(error.type) || 0;
    this.errorMetrics.set(error.type, currentCount + 1);
  }

  private storeRecentError(error: AppError): void {
    this.recentErrors.push(error);
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift();
    }
  }

  private async notifyError(error: AppError): Promise<void> {
    if (this.webSocketService && error.context.projectId) {
      try {
        this.webSocketService.broadcastError({
          projectId: error.context.projectId,
          taskId: error.context.taskId,
          error: error.userMessage,
          details: {
            type: error.type,
            severity: error.severity,
            timestamp: error.context.timestamp
          }
        });
      } catch (wsError) {
        console.error('Failed to broadcast error via WebSocket:', wsError);
      }
    }
  }

  private async handleCriticalError(error: AppError): Promise<void> {
    console.error('CRITICAL ERROR DETECTED:', error);
    
    // In production, you might want to:
    // 1. Send alerts to monitoring systems
    // 2. Notify administrators
    // 3. Trigger automated recovery procedures
    // 4. Scale resources if needed
    
    // For now, just log the critical error
    console.error('Critical error requires immediate attention:', {
      type: error.type,
      message: error.message,
      context: error.context,
      timestamp: new Date().toISOString()
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();