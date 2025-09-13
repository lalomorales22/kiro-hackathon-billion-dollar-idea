import Groq from 'groq-sdk';
import { IGroqService, GroqRequest, GroqServiceInfo, GroqMetrics } from '../types/index.js';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler.js';

/**
 * Service for integrating with Groq API using openai/gpt-oss-120b model
 * Implements retry logic, health checks, circuit breaker, and comprehensive error handling
 */
export class GroqService implements IGroqService {
  private client: Groq | null = null;
  private readonly model: string = 'openai/gpt-oss-120b';
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000; // 1 second
  private readonly timeout: number = 60000; // 1 minute for cloud API
  private apiKey: string | null = null;
  
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

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  /**
   * Set the API key and initialize the Groq client
   * @param apiKey The Groq API key
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new Groq({
      apiKey: apiKey,
    });
    console.log('[Groq] API key configured and client initialized');
  }

  /**
   * Generate content using the Groq API with retry logic
   * @param prompt The prompt to send to the model
   * @param context Optional context for the generation
   * @returns Generated content as string
   */
  async generateContent(prompt: string, context?: any): Promise<string> {
    if (!this.client || !this.apiKey) {
      const error = new Error('Groq API key not configured');
      await this.handleGroqError(error, context);
      throw error;
    }

    if (!prompt || prompt.trim().length === 0) {
      const error = new Error('Prompt cannot be empty');
      await this.handleGroqError(error, context);
      throw error;
    }

    const request: GroqRequest = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: this.buildContextualPrompt(prompt, context)
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
      stream: false,
    };

    return this.executeWithCircuitBreaker(async () => {
      return this.executeWithRetry(async () => {
        console.log(`[Groq] Generating content for model ${this.model}`);
        
        const response = await this.client!.chat.completions.create(request) as any;
        
        if (!response.choices || response.choices.length === 0) {
          throw new Error('Invalid response from Groq API - no choices returned');
        }

        const content = response.choices[0].message?.content?.trim();
        
        if (!content || content.length === 0) {
          throw new Error('Empty response from Groq API');
        }

        console.log(`[Groq] Generation successful, content length: ${content.length}`);
        this.updateSuccessMetrics();
        return content;

      }, context);
    }, context);
  }

  /**
   * Validate the provided API key by making a test request
   * @param apiKey The API key to validate
   * @returns Promise<boolean> indicating if the key is valid
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      console.log('[Groq] Validating API key...');
      
      const testClient = new Groq({ apiKey });
      
      // Make a minimal test request
      const response = await testClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 1,
        temperature: 0
      }) as any;

      const isValid = response && response.choices && response.choices.length > 0;
      console.log(`[Groq] API key validation ${isValid ? 'successful' : 'failed'}`);
      return isValid;

    } catch (error: any) {
      console.error('[Groq] API key validation failed:', error.message);
      
      // Check for specific authentication errors
      if (error.status === 401 || error.message?.includes('authentication') || error.message?.includes('api key')) {
        return false;
      }
      
      // For other errors, we can't be sure about the key validity
      throw error;
    }
  }

  /**
   * Check if the Groq service is healthy and accessible
   * @returns Promise<boolean> indicating service health
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client || !this.apiKey) {
        console.log('[Groq] Health check failed: No API key configured');
        return false;
      }

      console.log('[Groq] Performing health check...');
      
      // Make a minimal test request to check service availability
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'test'
          }
        ],
        max_tokens: 1,
        temperature: 0
      }) as any;

      const isHealthy = response && response.choices && response.choices.length > 0;
      console.log(`[Groq] Health check ${isHealthy ? 'passed' : 'failed'}`);
      return isHealthy;

    } catch (error: any) {
      console.error('[Groq] Health check failed:', error.message);
      
      // If it's an authentication error, the service is healthy but key is invalid
      if (error.status === 401) {
        console.log('[Groq] Service is healthy but API key is invalid');
        return false;
      }
      
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

    if (context?.projectId) {
      contextualPrompt += `\n\nProject ID: ${context.projectId}`;
    }

    if (context?.previousArtifacts && context.previousArtifacts.length > 0) {
      contextualPrompt += '\n\nPrevious artifacts:';
      context.previousArtifacts.forEach((artifact: any, index: number) => {
        contextualPrompt += `\n${index + 1}. ${artifact.name} (${artifact.type}): ${artifact.content.substring(0, 200)}...`;
      });
    }

    if (context?.stageNumber) {
      contextualPrompt += `\n\nCurrent stage: ${context.stageNumber}`;
    }

    return contextualPrompt;
  }

  /**
   * Get service configuration and status information
   * @returns Service information object
   */
  async getServiceInfo(): Promise<GroqServiceInfo> {
    const isHealthy = await this.isHealthy();
    
    return {
      model: this.model,
      apiKeyConfigured: !!this.apiKey,
      isHealthy,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      circuitBreakerState: this.circuitBreakerState,
      metrics: this.getMetrics()
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
        const error = new Error('Groq service circuit breaker is OPEN - requests blocked');
        await this.handleGroqError(error, context);
        throw error;
      } else {
        this.circuitBreakerState = 'HALF_OPEN';
        console.log('[Groq] Circuit breaker moving to HALF_OPEN state');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker if in HALF_OPEN
      if (this.circuitBreakerState === 'HALF_OPEN') {
        this.circuitBreakerState = 'CLOSED';
        this.failureCount = 0;
        console.log('[Groq] Circuit breaker reset to CLOSED state');
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = now;

      if (this.circuitBreakerState === 'HALF_OPEN') {
        this.circuitBreakerState = 'OPEN';
        this.metrics.circuitBreakerTrips++;
        console.log('[Groq] Circuit breaker tripped to OPEN state');
      } else if (this.failureCount >= this.failureThreshold) {
        this.circuitBreakerState = 'OPEN';
        this.metrics.circuitBreakerTrips++;
        console.log(`[Groq] Circuit breaker opened after ${this.failureCount} failures`);
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
        retryCondition: (error) => this.isRetryableGroqError(error),
        context: { service: 'groq', model: this.model, ...context }
      }
    );
  }

  /**
   * Handle Groq-specific errors
   */
  private async handleGroqError(error: Error, context?: any): Promise<void> {
    const errorType = this.determineGroqErrorType(error);
    const severity = this.determineGroqErrorSeverity(error);
    
    const appError = errorHandler.createError(
      error.message,
      errorType,
      severity,
      502, // Bad Gateway for external service errors
      {
        service: 'groq',
        model: this.model,
        circuitBreakerState: this.circuitBreakerState,
        ...context
      },
      error
    );

    await errorHandler.handleError(appError);
  }

  /**
   * Determine if a Groq error is retryable
   */
  private isRetryableGroqError(error: any): boolean {
    // Don't retry authentication errors
    if (error.status === 401 || error.status === 403) {
      return false;
    }

    // Don't retry client errors (4xx except rate limiting)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }

    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ENOTFOUND',
      'timeout',
      'network error',
      'connection error',
      'service unavailable',
      'internal server error',
      'rate limit',
      'too many requests'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;

    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError) || 
      errorCode === retryableError.toUpperCase() ||
      error.status === 429 || // Rate limiting
      error.status >= 500 // Server errors
    );
  }

  /**
   * Determine Groq error type
   */
  private determineGroqErrorType(error: any): ErrorType {
    const message = error.message?.toLowerCase() || '';
    
    // API key related errors
    if (error.status === 401 || error.status === 403) {
      if (message.includes('api key') || message.includes('authentication')) {
        return ErrorType.GROQ_API_KEY_INVALID;
      }
      return ErrorType.AUTHENTICATION_ERROR;
    }
    
    // Missing API key
    if (message.includes('groq api key not configured') || message.includes('api key not configured')) {
      return ErrorType.GROQ_API_KEY_MISSING;
    }
    
    // Rate limiting
    if (error.status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.GROQ_RATE_LIMIT;
    }
    
    // Quota exceeded
    if (error.status === 402 || message.includes('quota') || message.includes('billing')) {
      return ErrorType.GROQ_QUOTA_EXCEEDED;
    }
    
    // Service unavailable
    if (error.status === 503 || message.includes('service unavailable') || message.includes('circuit breaker')) {
      return ErrorType.GROQ_SERVICE_UNAVAILABLE;
    }
    
    // Network errors
    if (message.includes('timeout') || message.includes('etimedout')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('connection') || message.includes('econnrefused')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return ErrorType.VALIDATION_ERROR;
    }
    
    // Default to generic Groq error
    return ErrorType.GROQ_ERROR;
  }

  /**
   * Determine Groq error severity
   */
  private determineGroqErrorSeverity(error: any): ErrorSeverity {
    const message = error.message?.toLowerCase() || '';
    
    // Critical errors that prevent service operation
    if (message.includes('circuit breaker') || message.includes('service unavailable')) {
      return ErrorSeverity.HIGH;
    }
    
    // High severity for quota and service issues
    if (error.status === 402 || message.includes('quota') || error.status === 503) {
      return ErrorSeverity.HIGH;
    }
    
    // Medium severity for authentication and network issues
    if (error.status === 401 || error.status === 403) {
      return ErrorSeverity.MEDIUM;
    }
    if (message.includes('timeout') || message.includes('connection')) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Low severity for rate limiting and validation issues
    if (error.status === 429 || message.includes('rate limit')) {
      return ErrorSeverity.LOW;
    }
    if (message.includes('invalid') || message.includes('empty') || message.includes('not configured')) {
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
  public getMetrics(): GroqMetrics {
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
    console.log(`[Groq] Circuit breaker manually set to ${state}`);
  }
}

// Create and export a singleton instance (without API key initially)
export const groqService = new GroqService();