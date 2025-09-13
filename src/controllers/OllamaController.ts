import { Request, Response } from 'express';
import { OllamaService } from '../services/ollama.js';

/**
 * Controller for handling Ollama-related HTTP requests.
 * Provides endpoints for retrieving available Ollama models and service information.
 * Requirements: 6.1, 6.2, 6.3, 6.5, 9.4
 */
export class OllamaController {
  private ollamaService: OllamaService;

  constructor(ollamaService: OllamaService) {
    this.ollamaService = ollamaService;
  }

  /**
   * Retrieves all available Ollama models from the local Ollama service.
   * GET /api/ollama/models
   * Requirements: 6.1, 6.2, 6.3, 6.5, 9.4
   */
  getModels = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[OllamaController] Fetching available models...');

      // Make request to Ollama service to get available models
      const response = await fetch('http://localhost:11434/api/tags');
      
      if (!response.ok) {
        console.error(`[OllamaController] Ollama service returned ${response.status}: ${response.statusText}`);
        
        if (response.status === 404) {
          res.status(502).json({
            success: false,
            message: 'Ollama service endpoint not found',
            error: 'The Ollama service may not be running or may be using a different version',
            troubleshooting: {
              steps: [
                'Ensure Ollama is installed and running',
                'Check if Ollama is accessible at http://localhost:11434',
                'Try running "ollama serve" to start the service',
                'Verify Ollama version compatibility'
              ]
            }
          });
          return;
        }

        throw new Error(`Ollama service returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { models?: any[] };
      const models = data.models || [];

      console.log(`[OllamaController] Found ${models.length} available models`);

      res.status(200).json({
        success: true,
        data: {
          models: models.map((model: any) => ({
            name: model.name,
            size: model.size,
            digest: model.digest,
            modified_at: model.modified_at,
            details: model.details
          })),
          count: models.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[OllamaController] Error fetching models:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific connection errors
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        res.status(502).json({
          success: false,
          message: 'Failed to connect to Ollama service',
          error: 'Ollama service is not running or not accessible',
          troubleshooting: {
            steps: [
              'Ensure Ollama is installed on your system',
              'Start the Ollama service by running "ollama serve"',
              'Check if Ollama is accessible at http://localhost:11434',
              'Verify no firewall is blocking the connection',
              'Try running "ollama list" to see if models are available'
            ],
            commonSolutions: [
              'Install Ollama from https://ollama.ai',
              'Run "ollama pull llama2" to install a model',
              'Restart the Ollama service'
            ]
          }
        });
        return;
      }

      // Handle timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        res.status(504).json({
          success: false,
          message: 'Ollama service request timed out',
          error: 'The Ollama service is taking too long to respond',
          troubleshooting: {
            steps: [
              'Check if Ollama service is overloaded',
              'Restart the Ollama service',
              'Check system resources (CPU, memory)',
              'Try again in a few moments'
            ]
          }
        });
        return;
      }

      // Generic error response
      res.status(502).json({
        success: false,
        message: 'Failed to retrieve Ollama models',
        error: errorMessage,
        troubleshooting: {
          steps: [
            'Ensure Ollama service is running',
            'Check Ollama service logs for errors',
            'Verify Ollama installation is complete',
            'Try restarting the Ollama service'
          ]
        },
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Retrieves Ollama service health and configuration information.
   * GET /api/ollama/health
   * Requirements: 6.5, 9.4
   */
  getHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[OllamaController] Checking Ollama service health...');

      const isHealthy = await this.ollamaService.isHealthy();
      const serviceInfo = await this.ollamaService.getServiceInfo();
      const metrics = this.ollamaService.getMetrics();

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
          message: 'Ollama service is unhealthy',
          data: {
            status: 'unhealthy',
            service: serviceInfo,
            metrics,
            timestamp: new Date().toISOString()
          },
          troubleshooting: {
            steps: [
              'Check if Ollama service is running',
              'Verify Ollama installation',
              'Check system resources',
              'Review Ollama service logs'
            ]
          }
        });
      }

    } catch (error) {
      console.error('[OllamaController] Error checking health:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(503).json({
        success: false,
        message: 'Failed to check Ollama service health',
        error: errorMessage,
        troubleshooting: {
          steps: [
            'Ensure Ollama service is installed and running',
            'Check network connectivity to Ollama service',
            'Verify Ollama service configuration'
          ]
        },
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };
}