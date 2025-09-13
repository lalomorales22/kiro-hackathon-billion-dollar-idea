import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { ProjectController } from './controllers/ProjectController.js';
import { AgentController } from './controllers/AgentController.js';
import { OllamaController } from './controllers/OllamaController.js';
import { GroqController } from './controllers/GroqController.js';
import { ProjectService } from './services/ProjectService.js';
import { AgentOrchestrator } from './services/AgentOrchestrator.js';
import { WebSocketService } from './services/WebSocketService.js';
import { databaseService } from './services/database.js';
import { ollamaService } from './services/ollama.js';
import { groqService } from './services/groq.js';
import { AgentRegistry } from './agents/AgentRegistry.js';
import { AgentLoader } from './services/AgentLoader.js';
import { AgentManager } from './services/AgentManager.js';
import { errorHandler } from './utils/ErrorHandler.js';
import { logger } from './utils/Logger.js';
import { monitoring } from './utils/Monitoring.js';
import { cache } from './utils/Cache.js';
import {
  requestLogger,
  rateLimiter,
  requestTimeout,
  validateRequest,
  healthCheck,
  securityHeaders,
  corsWithErrorHandling,
  globalErrorHandler,
  notFoundHandler
} from './middleware/errorMiddleware.js';

// Enhanced global error handlers
if (process.env.NODE_ENV !== 'test') {
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await errorHandler.handleError(error);
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (reason instanceof Error) {
      await errorHandler.handleError(reason);
    }
    process.exit(1);
  });
}

/**
 * Express Application Setup
 * Requirements: 7.1, 7.4, 8.3
 */
class Application {
  private app: express.Application;
  private server: any;
  private isShuttingDown = false;
  private agentRegistry: AgentRegistry;
  private agentLoader: AgentLoader;
  private agentManager: AgentManager;
  private webSocketService?: WebSocketService;
  private agentOrchestrator?: AgentOrchestrator;
  private projectService?: ProjectService;

  constructor() {
    this.app = express();

    // Initialize agent system
    this.agentRegistry = new AgentRegistry(ollamaService);
    this.agentLoader = new AgentLoader(this.agentRegistry, ollamaService);
    this.agentManager = new AgentManager(this.agentLoader);

    this.setupMiddleware();
  }

  /**
   * Configure Express middleware with enhanced error handling
   * Requirements: 7.1, 7.2, 7.3, 7.4, 8.3
   */
  private setupMiddleware(): void {
    // Security headers (first)
    this.app.use(securityHeaders);

    // CORS with error handling
    this.app.use(corsWithErrorHandling({
      origins: config.nodeEnv === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Requested-With']
    }));

    // Request processing middleware
    this.app.use(requestLogger);
    this.app.use(requestTimeout(320000)); // 5+ minute timeout for AI processing
    this.app.use(rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: config.nodeEnv === 'production' ? 100 : 1000,
      message: 'Too many requests from this IP, please try again later'
    }));

    // Body parsing with enhanced validation
    this.app.use(express.json({
      limit: '10mb',
      strict: true,
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf.toString());
        } catch (e) {
          throw new Error('Invalid JSON payload');
        }
      }
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    // Request validation
    this.app.use(validateRequest({
      maxBodySize: 10 * 1024 * 1024, // 10MB
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      requiredHeaders: [] // No required headers by default
    }));

    // Health check middleware (handles /health and /api/health)
    this.app.use(healthCheck);

    // Enhanced health endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const dbHealth = await databaseService.healthCheck();
        const errorMetrics = errorHandler.getErrorMetrics();
        const dbMetrics = databaseService.getMetrics();
        const agentStats = this.agentLoader.getLoadingStats();
        const monitoringHealth = monitoring.getHealthStatus();
        const cacheStats = cache.getStats();
        const logStats = logger.getLogStats();

        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          version: process.env.npm_package_version || '1.0.0',
          memory: process.memoryUsage(),
          services: {
            database: dbHealth,
            agents: {
              loaded: agentStats.isLoaded,
              totalAgents: agentStats.totalAgents,
              activeAgents: agentStats.activeAgents,
              stageDistribution: agentStats.stageDistribution,
              missingStages: agentStats.missingStages
            },
            monitoring: monitoringHealth,
            cache: {
              enabled: true,
              entries: cacheStats.totalEntries,
              hitRate: cacheStats.hitRate,
              memoryUsage: cacheStats.memoryUsage
            }
          },
          metrics: {
            errors: {
              total: errorMetrics.totalErrors,
              rate: errorMetrics.errorRate,
              recent: errorMetrics.recentErrors.length
            },
            database: {
              totalQueries: dbMetrics.totalQueries,
              errorRate: dbMetrics.errorRate,
              averageQueryTime: dbMetrics.averageQueryTime,
              uptime: dbMetrics.uptime
            },
            logs: {
              total: logStats.total,
              recentErrors: logStats.recentErrors,
              recentWarnings: logStats.recentWarnings,
              byLevel: logStats.byLevel
            }
          }
        });
      } catch (error) {
        logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)), { component: 'health' });
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Health check failed'
        });
      }
    });

    // Error metrics endpoint
    this.app.get('/api/metrics/errors', (req, res) => {
      const metrics = errorHandler.getErrorMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    });

    // Database metrics endpoint
    this.app.get('/api/metrics/database', (req, res) => {
      const metrics = databaseService.getMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    });

    // Monitoring metrics endpoint
    this.app.get('/api/metrics/monitoring', (req, res) => {
      const metrics = monitoring.getApplicationMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    });

    // Cache metrics endpoint
    this.app.get('/api/metrics/cache', (req, res) => {
      const stats = cache.getDetailedStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    });

    // Log metrics endpoint
    this.app.get('/api/metrics/logs', (req, res) => {
      const stats = logger.getLogStats();
      const recentLogs = logger.getRecentLogs(50);
      res.json({
        success: true,
        data: {
          stats,
          recentLogs
        },
        timestamp: new Date().toISOString()
      });
    });

    // Serve static files from public directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const publicPath = path.join(__dirname, '..', 'public');
    this.app.use(express.static(publicPath));

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        name: 'Billion Dollar Idea Platform API',
        version: '1.0.0',
        description: 'AI-powered platform that transforms business ideas into complete venture plans',
        endpoints: {
          projects: '/api/projects',
          agents: '/api/agents',
          websocket: '/ws',
          health: '/api/health',
          metrics: {
            errors: '/api/metrics/errors',
            database: '/api/metrics/database'
          }
        },
        documentation: '/api/docs',
        features: [
          'Enhanced error handling and resilience',
          'Circuit breaker pattern for external services',
          'Comprehensive monitoring and metrics',
          'Rate limiting and security headers',
          'Graceful degradation and recovery'
        ]
      });
    });
  }

  /**
   * Setup API routes
   * Requirements: 7.1
   */
  private async setupRoutes(): Promise<void> {
    try {
      // Initialize database connection
      await databaseService.connect();
      console.log('Database connected successfully');

      // Load agents from database
      logger.info('Loading agents from database...', undefined, { component: 'startup' });
      const agentLoadResult = await this.agentLoader.loadAgents();

      if (agentLoadResult.successful > 0) {
        logger.info(`Successfully loaded ${agentLoadResult.successful} agents`,
          { successful: agentLoadResult.successful, failed: agentLoadResult.failed },
          { component: 'startup' }
        );
        if (agentLoadResult.failed > 0) {
          logger.warn(`Failed to load ${agentLoadResult.failed} agents`,
            { failed: agentLoadResult.failed },
            { component: 'startup' }
          );
        }
      } else {
        logger.warn('No agents were loaded. Consider running the seed script.',
          undefined,
          { component: 'startup' }
        );
      }

      // Initialize controllers (WebSocket will be initialized after server creation)
      const agentController = new AgentController(this.agentRegistry, databaseService);
      const ollamaController = new OllamaController(ollamaService);
      const groqController = new GroqController(groqService);

      // Agent routes
      const agentRouter = express.Router();
      agentRouter.get('/', agentController.getAgents);
      agentRouter.get('/stats', agentController.getAgentStats);
      agentRouter.get('/search', agentController.searchAgents);
      agentRouter.get('/stage/:stage', agentController.getAgentsByStage);
      agentRouter.get('/:id', agentController.getAgent);

      // Ollama routes
      const ollamaRouter = express.Router();
      ollamaRouter.get('/models', ollamaController.getModels);
      ollamaRouter.get('/health', ollamaController.getHealth);

      // Groq routes
      const groqRouter = express.Router();
      groqRouter.post('/validate-key', groqController.validateApiKey);
      groqRouter.get('/health', groqController.getHealth);
      groqRouter.get('/model', groqController.getModelInfo);

      // Mount routers
      this.app.use('/api/agents', agentRouter);
      this.app.use('/api/ollama', ollamaRouter);
      this.app.use('/api/groq', groqRouter);

      console.log('API routes configured successfully');
    } catch (error) {
      console.error('Error setting up routes:', error);
      throw error;
    }
  }

  /**
   * Setup enhanced error handling middleware
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  private setupErrorHandling(): void {
    // 404 handler (before global error handler)
    this.app.use(notFoundHandler);

    // Global error handler with centralized error handling (must be last)
    this.app.use(globalErrorHandler);
  }

  /**
   * Start the server with WebSocket integration
   * Requirements: 7.1, 8.3
   */
  public async start(): Promise<void> {
    try {
      // Setup routes first
      await this.setupRoutes();

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize WebSocket service and related services after server creation
      const webSocketService = new WebSocketService(this.server);
      const agentOrchestrator = new AgentOrchestrator(databaseService, this.agentRegistry, webSocketService);
      const projectService = new ProjectService(databaseService, agentOrchestrator);
      const projectController = new ProjectController(projectService);

      // Setup project routes BEFORE error handling
      const projectRouter = express.Router();
      projectRouter.post('/', projectController.createProject);
      projectRouter.get('/', projectController.getProjects);
      projectRouter.get('/stats/:userId', projectController.getProjectStats);
      projectRouter.get('/:id', projectController.getProject);
      projectRouter.put('/:id', projectController.updateProject);
      projectRouter.delete('/:id', projectController.deleteProject);
      projectRouter.post('/:id/restart', projectController.restartProject);

      // Mount project router
      this.app.use('/api/projects', projectRouter);

      // Setup error handling AFTER all routes are configured
      this.setupErrorHandling();

      // Start server
      await new Promise<void>((resolve, reject) => {
        this.server.listen(config.port, (error?: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      logger.info('Server started successfully!', {
        httpServer: `http://localhost:${config.port}`,
        webSocketServer: `ws://localhost:${config.port}/ws`,
        environment: config.nodeEnv,
        healthCheck: `http://localhost:${config.port}/health`,
        apiInfo: `http://localhost:${config.port}/api`,
        frontendClient: `http://localhost:${config.port}/`
      }, { component: 'startup' });

    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown handling
   * Requirements: 7.4
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Initiating graceful shutdown...', undefined, { component: 'shutdown' });

    try {
      // Close HTTP server
      if (this.server) {
        logger.info('Closing HTTP server...', undefined, { component: 'shutdown' });
        await new Promise<void>((resolve, reject) => {
          this.server.close((error?: Error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      // Close database connections
      logger.info('Closing database connections...', undefined, { component: 'shutdown' });
      await databaseService.disconnect();

      // Cleanup monitoring and cache
      monitoring.cleanup();
      cache.shutdown();

      logger.info('Graceful shutdown completed', undefined, { component: 'shutdown' });
    } catch (error) {
      logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)), { component: 'shutdown' });
      throw error;
    }
  }

  /**
   * Get Express app instance for testing
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Get server instance for testing
   */
  public getServer(): any {
    return this.server;
  }
}

// Only start the application if not in test mode
if (process.env.NODE_ENV !== 'test') {
  // Initialize and start application
  const app = new Application();

  // Setup graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
    try {
      await app.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Start the application
  app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export { Application };