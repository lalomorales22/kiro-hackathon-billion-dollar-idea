import axios from 'axios';
import { IOllamaService, OllamaRequest, OllamaResponse, OllamaError } from '../types/index.js';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler.js';

/**
 * Service for integrating with Ollama API using gpt-oss:20b model
 * Implements retry logic, health checks, circuit breaker, and comprehensive error handling
 */
export class OllamaService implements IOllamaService {
  private client: any;
  private readonly model: string = 'gpt-oss:20b';
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000; // 1 second
  private readonly timeout: number = 300000; // 5 minutes for local usage
  
  // Circuit breaker state
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number = 5;
  private readonly resetTimeout: number = 60000; // 1 minute
  
  // Metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: new Date(),
    circuitBreakerTrips: 0
  };

  constructor(baseURL: string = 'http://localhost:11434') {
    this.client = axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config: any) => {
        console.log(`[Ollama] Request: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          console.log(`[Ollama] Request payload:`, {
            model: config.data.model,
            prompt: config.data.prompt?.substring(0, 100) + '...',
          });
        }
        return config;
      },
      (error: any) => {
        console.error('[Ollama] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response: any) => {
        console.log(`[Ollama] Response: ${response.status} ${response.statusText}`);
        if (response.data?.response) {
          console.log(`[Ollama] Response content length: ${response.data.response.length} characters`);
        }
        return response;
      },
      (error: any) => {
        console.error('[Ollama] Response error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate content using the Ollama API with retry logic
   * @param prompt The prompt to send to the model
   * @param context Optional context for the generation
   * @returns Generated content as string
   */
  async generateContent(prompt: string, context?: any): Promise<string> {
    if (!prompt || prompt.trim().length === 0) {
      const error = new Error('Prompt cannot be empty');
      await this.handleOllamaError(error, context);
      throw error;
    }

    const request: OllamaRequest = {
      model: this.model,
      prompt: prompt.trim(),
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 4000,
      },
    };

    // Add context to prompt if provided
    if (context) {
      request.prompt = this.buildContextualPrompt(prompt, context);
    }

    return this.executeWithCircuitBreaker(async () => {
      return this.executeWithRetry(async () => {
        console.log(`[Ollama] Generating content for model ${this.model}`);
        
        const response = await this.client.post('/api/generate', request);
        
        if (!response.data || !response.data.response) {
          throw new Error('Invalid response from Ollama API');
        }

        const content = response.data.response.trim();
        
        if (content.length === 0) {
          throw new Error('Empty response from Ollama API');
        }

        console.log(`[Ollama] Generation successful, content length: ${content.length}`);
        this.updateSuccessMetrics();
        return content;

      }, context);
    }, context);
  }

  /**
   * Check if the Ollama service is healthy and accessible
   * @returns Promise<boolean> indicating service health
   */
  async isHealthy(): Promise<boolean> {
    try {
      console.log('[Ollama] Performing health check...');
      
      // First, check if the service is responding
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      
      if (response.status !== 200) {
        console.error(`[Ollama] Health check failed: HTTP ${response.status}`);
        return false;
      }

      // Check if our specific model is available
      const models = response.data?.models || [];
      const modelExists = models.some((model: any) => 
        model.name === this.model || model.name.includes('gpt-oss')
      );

      if (!modelExists) {
        console.warn(`[Ollama] Model ${this.model} not found in available models`);
        // Still return true as the service is healthy, just model might need to be pulled
      }

      console.log('[Ollama] Health check passed');
      return true;

    } catch (error) {
      console.error('[Ollama] Health check failed:', error);
      return false;
    }
  }

  /**
   * Build a contextual prompt by combining the main prompt with context
   * @param prompt The main prompt
   * @param context The context object
   * @returns Combined prompt string
   */
  private buildContextualPrompt(prompt: string, context: any): string {
    let contextualPrompt = prompt;

    if (context.projectId) {
      contextualPrompt += `\n\nProject ID: ${context.projectId}`;
    }

    if (context.previousArtifacts && context.previousArtifacts.length > 0) {
      contextualPrompt += '\n\nPrevious artifacts:';
      context.previousArtifacts.forEach((artifact: any, index: number) => {
        contextualPrompt += `\n${index + 1}. ${artifact.name} (${artifact.type}): ${artifact.content.substring(0, 200)}...`;
      });
    }

    if (context.stageNumber) {
      contextualPrompt += `\n\nCurrent stage: ${context.stageNumber}`;
    }

    return contextualPrompt;
  }

  /**
   * Calculate exponential backoff delay
   * @param attempt The current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1) with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Sleep for the specified number of milliseconds
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract a meaningful error message from various error types
   * @param error The error object
   * @returns Formatted error message
   */
  private extractErrorMessage(error: any): string {
    if (!error) {
      return 'Unknown error';
    }

    // Handle Axios errors
    if (error.isAxiosError) {
      const axiosError = error as any;
      
      if (axiosError.response?.data?.error) {
        return axiosError.response.data.error;
      }
      
      if (axiosError.code === 'ECONNREFUSED') {
        return 'Ollama service is not running or not accessible';
      }
      
      if (axiosError.code === 'ETIMEDOUT') {
        return 'Request timed out';
      }
      
      return axiosError.message || 'Network error';
    }

    // Handle standard errors
    if (error.message) {
      return error.message;
    }

    // Fallback
    return String(error);
  }

  /**
   * Get service configuration and status information
   * @returns Service information object
   */
  async getServiceInfo(): Promise<{
    model: string;
    baseURL: string;
    isHealthy: boolean;
    maxRetries: number;
    timeout: number;
    circuitBreakerState: string;
    metrics: any;
  }> {
    const isHealthy = await this.isHealthy();
    
    return {
      model: this.model,
      baseURL: this.client.defaults.baseURL || 'unknown',
      isHealthy,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      circuitBreakerState: this.circuitBreakerState,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Execute operation with circuit breaker pattern
   */
  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    const now = Date.now();

    // Check circuit breaker state
    if (this.circuitBreakerState === 'OPEN') {
      if (now - this.lastFailureTime < this.resetTimeout) {
        const error = new Error('Ollama service circuit breaker is OPEN - requests blocked');
        await this.handleOllamaError(error, context);
        throw error;
      } else {
        this.circuitBreakerState = 'HALF_OPEN';
        console.log('[Ollama] Circuit breaker moving to HALF_OPEN state');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker if in HALF_OPEN
      if (this.circuitBreakerState === 'HALF_OPEN') {
        this.circuitBreakerState = 'CLOSED';
        this.failureCount = 0;
        console.log('[Ollama] Circuit breaker reset to CLOSED state');
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = now;

      if (this.circuitBreakerState === 'HALF_OPEN') {
        this.circuitBreakerState = 'OPEN';
        this.metrics.circuitBreakerTrips++;
        console.log('[Ollama] Circuit breaker tripped to OPEN state');
      } else if (this.failureCount >= this.failureThreshold) {
        this.circuitBreakerState = 'OPEN';
        this.metrics.circuitBreakerTrips++;
        console.log(`[Ollama] Circuit breaker opened after ${this.failureCount} failures`);
      }

      throw error;
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    return errorHandler.withRetry(
      async () => {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        this.metrics.lastRequestTime = new Date();

        try {
          const result = await operation();
          
          // Update success metrics
          const responseTime = Date.now() - startTime;
          this.metrics.successfulRequests++;
          this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime + responseTime) / 2;
          
          return result;
        } catch (error) {
          this.metrics.failedRequests++;
          throw error;
        }
      },
      {
        maxRetries: this.maxRetries,
        baseDelay: this.baseDelay,
        retryCondition: (error) => this.isRetryableOllamaError(error),
        context: { service: 'ollama', model: this.model, ...context }
      }
    );
  }

  /**
   * Handle Ollama-specific errors
   */
  private async handleOllamaError(error: Error, context?: any): Promise<void> {
    const errorType = this.determineOllamaErrorType(error);
    const severity = this.determineOllamaErrorSeverity(error);
    
    const appError = errorHandler.createError(
      error.message,
      errorType,
      severity,
      502, // Bad Gateway for external service errors
      {
        service: 'ollama',
        model: this.model,
        circuitBreakerState: this.circuitBreakerState,
        ...context
      },
      error
    );

    await errorHandler.handleError(appError);
  }

  /**
   * Determine if an Ollama error is retryable
   */
  private isRetryableOllamaError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'timeout',
      'network error',
      'connection error',
      'service unavailable',
      'internal server error'
    ];

    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code;

    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError) || 
      errorCode === retryableError.toUpperCase()
    );
  }

  /**
   * Determine Ollama error type
   */
  private determineOllamaErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('etimedout')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('connection') || message.includes('econnrefused')) {
      return ErrorType.OLLAMA_ERROR;
    }
    if (message.includes('circuit breaker')) {
      return ErrorType.OLLAMA_ERROR;
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return ErrorType.VALIDATION_ERROR;
    }
    
    return ErrorType.OLLAMA_ERROR;
  }

  /**
   * Determine Ollama error severity
   */
  private determineOllamaErrorSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('circuit breaker') || message.includes('service unavailable')) {
      return ErrorSeverity.HIGH;
    }
    if (message.includes('timeout') || message.includes('connection')) {
      return ErrorSeverity.MEDIUM;
    }
    if (message.includes('invalid') || message.includes('empty')) {
      return ErrorSeverity.LOW;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(): void {
    // Reset failure count on successful request
    if (this.failureCount > 0) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Get service metrics
   */
  public getMetrics(): typeof this.metrics & {
    errorRate: number;
    successRate: number;
  } {
    const errorRate = this.metrics.totalRequests > 0 
      ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100 
      : 0;
    
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      errorRate,
      successRate
    };
  }

  /**
   * Reset service metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date(),
      circuitBreakerTrips: 0
    };
  }

  /**
   * Force circuit breaker state (for testing)
   */
  public setCircuitBreakerState(state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    this.circuitBreakerState = state;
    console.log(`[Ollama] Circuit breaker manually set to ${state}`);
  }
}

// Create and export a singleton instance
export const ollamaService = new OllamaService(
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
);