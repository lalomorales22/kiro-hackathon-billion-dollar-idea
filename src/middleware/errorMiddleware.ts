import { Request, Response, NextFunction } from 'express';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler.js';

/**
 * Express middleware for error handling and request monitoring
 * Requirements: 7.1, 7.4
 */

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Log request start
  console.log(`[${requestId}] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    console.log(`[${requestId}] Response: ${res.statusCode} (${responseTime}ms)`);
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Rate limiting middleware
 */
export const rateLimiter = (options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
} = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests, please try again later'
  } = options;

  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }

    // Get or create client record
    let clientRecord = requests.get(clientId);
    if (!clientRecord || now > clientRecord.resetTime) {
      clientRecord = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(clientId, clientRecord);
    }

    // Check rate limit
    if (clientRecord.count >= maxRequests) {
      const error = errorHandler.createError(
        message,
        ErrorType.RATE_LIMIT_ERROR,
        ErrorSeverity.LOW,
        429,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          endpoint: req.path,
          method: req.method
        }
      );

      await errorHandler.handleError(error);
      
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message,
        statusCode: 429,
        retryAfter: Math.ceil((clientRecord.resetTime - now) / 1000)
      });
      return;
    }

    // Increment request count
    clientRecord.count++;
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - clientRecord.count).toString(),
      'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString()
    });

    next();
  };
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = errorHandler.createError(
          'Request timeout',
          ErrorType.INTERNAL_ERROR,
          ErrorSeverity.MEDIUM,
          408,
          {
            requestId: (req as any).requestId,
            endpoint: req.path,
            method: req.method,
            timeout: timeoutMs
          }
        );

        errorHandler.handleError(error);
        
        res.status(408).json({
          error: 'Request Timeout',
          message: 'Request took too long to process',
          statusCode: 408,
          timeout: timeoutMs
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Request validation middleware
 */
export const validateRequest = (options: {
  maxBodySize?: number;
  allowedMethods?: string[];
  requiredHeaders?: string[];
} = {}) => {
  const {
    maxBodySize = 10 * 1024 * 1024, // 10MB
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    requiredHeaders = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check method
      if (!allowedMethods.includes(req.method)) {
        const error = errorHandler.createError(
          `Method ${req.method} not allowed`,
          ErrorType.VALIDATION_ERROR,
          ErrorSeverity.LOW,
          405
        );
        
        await errorHandler.handleError(error);
        
        res.status(405).json({
          error: 'Method Not Allowed',
          message: `Method ${req.method} is not allowed for this endpoint`,
          statusCode: 405,
          allowedMethods
        });
        return;
      }

      // Check required headers
      for (const header of requiredHeaders) {
        if (!req.headers[header.toLowerCase()]) {
          const error = errorHandler.createError(
            `Missing required header: ${header}`,
            ErrorType.VALIDATION_ERROR,
            ErrorSeverity.LOW,
            400
          );
          
          await errorHandler.handleError(error);
          
          res.status(400).json({
            error: 'Missing Required Header',
            message: `Header '${header}' is required`,
            statusCode: 400
          });
          return;
        }
      }

      // Check content length
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > maxBodySize) {
        const error = errorHandler.createError(
          `Request body too large: ${contentLength} bytes (max: ${maxBodySize})`,
          ErrorType.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM,
          413
        );
        
        await errorHandler.handleError(error);
        
        res.status(413).json({
          error: 'Payload Too Large',
          message: `Request body exceeds maximum size of ${maxBodySize} bytes`,
          statusCode: 413,
          maxSize: maxBodySize,
          actualSize: contentLength
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Health check middleware
 */
export const healthCheck = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/health' || req.path === '/api/health') {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
    return;
  }
  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Set security headers with more permissive CSP for development
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const cspPolicy = isDevelopment 
    ? "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;"
    : "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; connect-src 'self' wss:;";

  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': cspPolicy,
    'Strict-Transport-Security': isDevelopment ? '' : 'max-age=31536000; includeSubDomains'
  });

  next();
};

/**
 * CORS middleware with error handling
 */
export const corsWithErrorHandling = (options: {
  origins?: string[];
  methods?: string[];
  allowedHeaders?: string[];
} = {}) => {
  const {
    origins = ['http://localhost:3000', 'http://localhost:3001'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-ID']
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && !origins.includes(origin) && !origins.includes('*')) {
      const error = errorHandler.createError(
        `Origin ${origin} not allowed by CORS policy`,
        ErrorType.AUTHORIZATION_ERROR,
        ErrorSeverity.LOW,
        403,
        { origin, allowedOrigins: origins } as any
      );

      await errorHandler.handleError(error);
      
      res.status(403).json({
        error: 'CORS Policy Violation',
        message: 'Origin not allowed by CORS policy',
        statusCode: 403
      });
      return;
    }

    // Set CORS headers
    res.set({
      'Access-Control-Allow-Origin': origin || origins[0],
      'Access-Control-Allow-Methods': methods.join(', '),
      'Access-Control-Allow-Headers': allowedHeaders.join(', '),
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400' // 24 hours
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
};

/**
 * Global error handler middleware (should be last)
 */
export const globalErrorHandler = errorHandler.expressErrorHandler;

/**
 * 404 handler middleware
 */
export const notFoundHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const error = errorHandler.createError(
    `Route not found: ${req.method} ${req.path}`,
    ErrorType.NOT_FOUND_ERROR,
    ErrorSeverity.LOW,
    404,
    {
      method: req.method,
      path: req.path,
      ip: req.ip
    }
  );

  await errorHandler.handleError(error);
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    availableRoutes: [
      'GET /api/health',
      'GET /api/agents',
      'GET /api/projects',
      'POST /api/projects',
      'GET /api/projects/:id',
      'PUT /api/projects/:id',
      'DELETE /api/projects/:id'
    ]
  });
};