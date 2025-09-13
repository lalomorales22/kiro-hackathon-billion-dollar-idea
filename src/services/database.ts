import { PrismaClient } from '@prisma/client';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler.js';

export class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private reconnectInterval: number = 5000; // 5 seconds
  private healthCheckInterval?: NodeJS.Timeout;
  private connectionMetrics = {
    totalQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0,
    lastHealthCheck: new Date(),
    connectionUptime: new Date()
  };

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });

    // Set up query monitoring
    this.setupQueryMonitoring();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    const connectWithRetry = async (): Promise<void> => {
      try {
        await this.prisma.$connect();
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.connectionMetrics.connectionUptime = new Date();
        console.log('✅ Database connected successfully');
        
        // Start health check monitoring
        this.startHealthCheckMonitoring();
        
      } catch (error) {
        this.isConnected = false;
        this.connectionAttempts++;
        
        const appError = errorHandler.createError(
          `Database connection failed (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}): ${error instanceof Error ? error.message : 'Unknown error'}`,
          ErrorType.DATABASE_ERROR,
          ErrorSeverity.CRITICAL,
          500,
          { additionalData: { connectionAttempts: this.connectionAttempts } },
          error as Error
        );

        await errorHandler.handleError(appError);

        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          throw appError;
        }

        console.log(`⚠️ Retrying database connection in ${this.reconnectInterval}ms...`);
        await this.sleep(this.reconnectInterval);
        return connectWithRetry();
      }
    };

    return connectWithRetry();
  }

  public async disconnect(): Promise<void> {
    try {
      // Stop health check monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      const appError = errorHandler.createError(
        `Database disconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.MEDIUM,
        500,
        {},
        error as Error
      );

      await errorHandler.handleError(appError);
      throw appError;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Clean up test data
      if (process.env.NODE_ENV === 'test') {
        await this.prisma.artifact.deleteMany();
        await this.prisma.task.deleteMany();
        await this.prisma.project.deleteMany();
        await this.prisma.user.deleteMany();
      }
      
      await this.disconnect();
    } catch (error) {
      console.error('Database cleanup failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{ 
    status: 'healthy' | 'unhealthy'; 
    message: string; 
    timestamp: Date;
    metrics: any;
  }> {
    try {
      const startTime = Date.now();
      
      // Perform a simple query to test database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      const queryTime = Date.now() - startTime;
      this.connectionMetrics.lastHealthCheck = new Date();
      
      return {
        status: 'healthy',
        message: 'Database is responding normally',
        timestamp: new Date(),
        metrics: {
          ...this.connectionMetrics,
          lastQueryTime: queryTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      
      const appError = errorHandler.createError(
        `Database health check failed: ${errorMessage}`,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        500,
        {},
        error as Error
      );

      await errorHandler.handleError(appError);
      
      return {
        status: 'unhealthy',
        message: appError.message,
        timestamp: new Date(),
        metrics: this.connectionMetrics
      };
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      context?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000, context = {} } = options;

    return errorHandler.withRetry(
      async () => {
        const startTime = Date.now();
        try {
          const result = await operation();
          
          // Update metrics
          this.connectionMetrics.totalQueries++;
          const queryTime = Date.now() - startTime;
          this.connectionMetrics.averageQueryTime = 
            (this.connectionMetrics.averageQueryTime + queryTime) / 2;
          
          return result;
        } catch (error) {
          this.connectionMetrics.failedQueries++;
          throw error;
        }
      },
      {
        maxRetries,
        baseDelay,
        retryCondition: (error) => this.isDatabaseRetryableError(error),
        context: { operation: 'database_query', ...context }
      }
    );
  }

  public async transaction<T>(
    operations: (prisma: any) => Promise<T>,
    options: {
      maxRetries?: number;
      timeout?: number;
      context?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, timeout = 30000, context = {} } = options;

    return this.executeWithRetry(
      async () => {
        return this.prisma.$transaction(
          async (tx) => {
            return operations(tx);
          },
          {
            timeout,
            maxWait: 5000, // Maximum time to wait for a transaction slot
          }
        );
      },
      { maxRetries, context: { operation: 'database_transaction', ...context } }
    );
  }

  /**
   * Executes a query with automatic connection recovery
   */
  public async executeQuery<T>(
    query: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (error) {
        const appError = errorHandler.createError(
          'Database connection lost and reconnection failed',
          ErrorType.DATABASE_ERROR,
          ErrorSeverity.CRITICAL,
          500,
          context,
          error as Error
        );
        throw appError;
      }
    }

    return this.executeWithRetry(query, { context });
  }

  /**
   * Gets database performance metrics
   */
  public getMetrics(): typeof this.connectionMetrics & {
    errorRate: number;
    uptime: number;
  } {
    const now = Date.now();
    const uptime = now - this.connectionMetrics.connectionUptime.getTime();
    const errorRate = this.connectionMetrics.totalQueries > 0 
      ? (this.connectionMetrics.failedQueries / this.connectionMetrics.totalQueries) * 100 
      : 0;

    return {
      ...this.connectionMetrics,
      errorRate,
      uptime
    };
  }

  /**
   * Resets connection metrics (useful for monitoring)
   */
  public resetMetrics(): void {
    this.connectionMetrics = {
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      lastHealthCheck: new Date(),
      connectionUptime: new Date()
    };
  }

  // Private helper methods

  private setupQueryMonitoring(): void {
    // Monitor slow queries - commented out due to Prisma version compatibility
    // this.prisma.$use(async (params: any, next: any) => {
    //   const startTime = Date.now();
    //   const result = await next(params);
    //   const queryTime = Date.now() - startTime;

    //   // Log slow queries
    //   if (queryTime > 1000) { // Queries taking more than 1 second
    //     console.warn(`Slow query detected: ${params.model}.${params.action} took ${queryTime}ms`);
    //   }

    //   return result;
    // });
  }

  private startHealthCheckMonitoring(): void {
    // Perform health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error('Scheduled health check failed:', error);
      }
    }, 30000);
  }

  private isDatabaseRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'P1001', // Prisma connection error
      'P1002', // Prisma timeout error
      'P1008', // Prisma operation timeout
      'P1017', // Prisma server closed connection
    ];

    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code;

    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) || 
      errorCode === retryableError
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();