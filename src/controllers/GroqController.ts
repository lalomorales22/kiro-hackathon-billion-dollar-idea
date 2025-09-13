import { Request, Response } from 'express';
import { GroqService } from '../services/groq.js';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler.js';

/**
 * Controller for handling Groq-related HTTP requests.
 * Provides endpoints for API key validation, service health checks, and model information.
 * Requirements: 2.2, 6.4
 */
export class GroqController {
  private groqService: GroqService;

  constructor(groqService: GroqService) {
    this.groqService = groqService;
  }

  /**
   * Validates a Groq API key by making a test request to the Groq service.
   * POST /api/groq/validate-key
   * Requirements: 2.2
   */
  validateApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { apiKey } = req.body;

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'API key is required',
          error: 'Please provide a valid Groq API key',
          troubleshooting: {
            steps: [
              'Ensure you have a valid Groq API key',
              'Check that the API key is not empty or whitespace',
              'Verify the API key format is correct'
            ]
          }
        });
        return;
      }

      console.log('[GroqController] Validating API key...');

      const isValid = await this.groqService.validateApiKey(apiKey.trim());

      if (isValid) {
        console.log('[GroqController] API key validation successful');
        res.status(200).json({
          success: true,
          data: {
            valid: true,
            message: 'API key is valid and working',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        console.log('[GroqController] API key validation failed');
        res.status(401).json({
          success: false,
          message: 'Invalid Groq API key',
          error: 'The provided API key is not valid or has insufficient permissions',
          troubleshooting: {
            steps: [
              'Verify your Groq API key is correct',
              'Check that your API key has not expired',
              'Ensure your Groq account has sufficient credits',
              'Verify the API key has access to the required model'
            ],
            commonSolutions: [
              'Get a new API key from https://console.groq.com',
              'Check your Groq account billing status',
              'Ensure you have access to the openai/gpt-oss-120b model'
            ]
          }
        });
      }

    } catch (error) {
      console.error('[GroqController] Error validating API key:', error);
      
      // Use centralized error handling
      const appError = errorHandler.createError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.determineGroqErrorType(error),
        ErrorSeverity.MEDIUM,
        this.determineStatusCode(error),
        {
          operation: 'validate-api-key',
          endpoint: '/api/groq/validate-key',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        },
        error as Error
      );

      await errorHandler.handleError(appError);

      // Send appropriate response based on error type
      res.status(appError.statusCode).json({
        success: false,
        message: appError.userMessage,
        error: appError.message,
        troubleshooting: this.getGroqTroubleshooting(appError.type),
        details: process.env.NODE_ENV === 'development' ? appError.message : undefined
      });
    }
  };

  /**
   * Retrieves Groq service health and configuration information.
   * GET /api/groq/health
   * Requirements: 2.2, 6.4
   */
  getHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[GroqController] Checking Groq service health...');

      const isHealthy = await this.groqService.isHealthy();
      const serviceInfo = await this.groqService.getServiceInfo();
      const metrics = this.groqService.getMetrics();

      if (isHealthy) {
        res.status(200).json({
          success: true,
          data: {
            status: 'healthy',
            service: serviceInfo,
            metrics,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'Groq service is unhealthy',
          data: {
            status: 'unhealthy',
            service: serviceInfo,
            metrics,
            timestamp: new Date().toISOString()
          },
          troubleshooting: {
            steps: [
              'Check if Groq API key is configured',
              'Verify Groq service is accessible',
              'Check your internet connection',
              'Verify Groq account status and credits'
            ]
          }
        });
      }

    } catch (error) {
      console.error('[GroqController] Error checking health:', error);
      
      // Use centralized error handling
      const appError = errorHandler.createError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        ErrorType.GROQ_SERVICE_UNAVAILABLE,
        ErrorSeverity.MEDIUM,
        503,
        {
          operation: 'health-check',
          endpoint: '/api/groq/health',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        },
        error as Error
      );

      await errorHandler.handleError(appError);
      
      res.status(503).json({
        success: false,
        message: appError.userMessage,
        error: appError.message,
        troubleshooting: this.getGroqTroubleshooting(ErrorType.GROQ_SERVICE_UNAVAILABLE),
        details: process.env.NODE_ENV === 'development' ? appError.message : undefined
      });
    }
  };

  /**
   * Retrieves Groq model information and availability.
   * GET /api/groq/model
   * Requirements: 6.4
   */
  getModelInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[GroqController] Fetching Groq model information...');

      const serviceInfo = await this.groqService.getServiceInfo();
      const metrics = this.groqService.getMetrics();

      res.status(200).json({
        success: true,
        data: {
          model: {
            name: serviceInfo.model,
            type: 'cloud',
            provider: 'groq',
            description: 'OpenAI GPT OSS 120B model via Groq API',
            capabilities: [
              'text-generation',
              'conversation',
              'code-generation',
              'analysis'
            ]
          },
          service: {
            apiKeyConfigured: serviceInfo.apiKeyConfigured,
            isHealthy: serviceInfo.isHealthy,
            circuitBreakerState: serviceInfo.circuitBreakerState
          },
          metrics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[GroqController] Error fetching model info:', error);
      
      // Use centralized error handling
      const appError = errorHandler.createError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        ErrorType.GROQ_ERROR,
        ErrorSeverity.LOW,
        502,
        {
          operation: 'get-model-info',
          endpoint: '/api/groq/model',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        },
        error as Error
      );

      await errorHandler.handleError(appError);
      
      res.status(502).json({
        success: false,
        message: appError.userMessage,
        error: appError.message,
        troubleshooting: this.getGroqTroubleshooting(ErrorType.GROQ_ERROR),
        details: process.env.NODE_ENV === 'development' ? appError.message : undefined
      });
    }
  };

  /**
   * Determine Groq error type from error object
   */
  private determineGroqErrorType(error: unknown): ErrorType {
    if (!(error instanceof Error)) return ErrorType.GROQ_ERROR;
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return ErrorType.GROQ_API_KEY_INVALID;
    }
    if (errorMessage.includes('api key not configured') || errorMessage.includes('api key not provided')) {
      return ErrorType.GROQ_API_KEY_MISSING;
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('too many requests')) {
      return ErrorType.GROQ_RATE_LIMIT;
    }
    if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('402')) {
      return ErrorType.GROQ_QUOTA_EXCEEDED;
    }
    if (errorMessage.includes('service unavailable') || errorMessage.includes('503') || errorMessage.includes('circuit breaker')) {
      return ErrorType.GROQ_SERVICE_UNAVAILABLE;
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout') || errorMessage.includes('network')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    return ErrorType.GROQ_ERROR;
  }

  /**
   * Determine HTTP status code from error
   */
  private determineStatusCode(error: unknown): number {
    if (!(error instanceof Error)) return 500;
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('401') || errorMessage.includes('authentication')) return 401;
    if (errorMessage.includes('402') || errorMessage.includes('quota')) return 402;
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) return 429;
    if (errorMessage.includes('503') || errorMessage.includes('service unavailable')) return 503;
    if (errorMessage.includes('504') || errorMessage.includes('timeout')) return 504;
    if (errorMessage.includes('network') || errorMessage.includes('connection')) return 502;
    
    return 502; // Bad Gateway for external service errors
  }

  /**
   * Get troubleshooting steps for different Groq error types
   */
  private getGroqTroubleshooting(errorType: ErrorType): { steps: string[]; commonSolutions?: string[] } {
    const troubleshooting = {
      [ErrorType.GROQ_API_KEY_INVALID]: {
        steps: [
          'Verify your Groq API key is correct',
          'Check that your API key has not expired',
          'Ensure your Groq account has sufficient credits',
          'Verify the API key has access to the required model'
        ],
        commonSolutions: [
          'Get a new API key from https://console.groq.com',
          'Check your Groq account billing status',
          'Ensure you have access to the openai/gpt-oss-120b model'
        ]
      },
      [ErrorType.GROQ_API_KEY_MISSING]: {
        steps: [
          'Enter your Groq API key in the model selector',
          'Verify the API key is saved properly',
          'Check that the API key is not empty'
        ],
        commonSolutions: [
          'Visit https://console.groq.com to get an API key',
          'Make sure to save the API key after entering it'
        ]
      },
      [ErrorType.GROQ_RATE_LIMIT]: {
        steps: [
          'Wait a moment before trying again',
          'Check your API usage limits',
          'Consider upgrading your Groq plan if needed'
        ],
        commonSolutions: [
          'Use Ollama models as an alternative while waiting',
          'Upgrade your Groq plan for higher rate limits'
        ]
      },
      [ErrorType.GROQ_QUOTA_EXCEEDED]: {
        steps: [
          'Check your Groq account billing status',
          'Add payment method or increase spending limit',
          'Upgrade to a higher tier plan'
        ],
        commonSolutions: [
          'Use Ollama models as a free alternative',
          'Visit https://console.groq.com/settings/billing to manage billing'
        ]
      },
      [ErrorType.GROQ_SERVICE_UNAVAILABLE]: {
        steps: [
          'Try again in a few minutes',
          'Check Groq status page for updates',
          'Use Ollama models as an alternative',
          'The system will automatically retry failed requests'
        ],
        commonSolutions: [
          'Check https://status.groq.com for service status',
          'Switch to Ollama models temporarily'
        ]
      },
      [ErrorType.NETWORK_ERROR]: {
        steps: [
          'Check your internet connection',
          'Try again in a moment',
          'Use Ollama models if the issue persists',
          'Contact support if timeouts continue'
        ]
      },
      [ErrorType.GROQ_ERROR]: {
        steps: [
          'Ensure your internet connection is stable',
          'Check Groq service status',
          'Verify your API key format is correct',
          'Try again in a few moments'
        ],
        commonSolutions: [
          'Use Ollama models as an alternative',
          'Check https://console.groq.com for account status'
        ]
      },
      [ErrorType.VALIDATION_ERROR]: {
        steps: [
          'Check that your API key is properly formatted',
          'Ensure all required fields are provided',
          'Verify the request format matches the API specification'
        ],
        commonSolutions: [
          'Double-check your API key format',
          'Review the API documentation for correct request structure'
        ]
      }
    };

    return troubleshooting[errorType as keyof typeof troubleshooting] || {
      steps: [
        'Try again in a few moments',
        'Check your internet connection',
        'Use Ollama models as an alternative'
      ]
    };
  }
}