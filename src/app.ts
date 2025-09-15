import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authentication } from './middleware/authentication';
import { requestLogger } from './middleware/requestLogger';

// Route imports
import { athleteRoutes } from './api/routes/athletes';
import { dealRoutes } from './api/routes/deals';
import { complianceRoutes } from './api/routes/compliance';
import { analyticsRoutes } from './api/routes/analytics';
import { platformRoutes } from './api/routes/platforms';
import { webhookRoutes } from './api/routes/webhooks';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging and rate limiting
app.use(requestLogger);
app.use(rateLimiter);

// Health check endpoint (before authentication)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
  });
});

// API routes with authentication
app.use(`/api/${config.apiVersion}/athletes`, authentication, athleteRoutes);
app.use(`/api/${config.apiVersion}/deals`, authentication, dealRoutes);
app.use(`/api/${config.apiVersion}/compliance`, authentication, complianceRoutes);
app.use(`/api/${config.apiVersion}/analytics`, authentication, analyticsRoutes);
app.use(`/api/${config.apiVersion}/platforms`, authentication, platformRoutes);

// Webhook routes (no authentication required for external webhooks)
app.use(`/api/${config.apiVersion}/webhooks`, webhookRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    // Database initialization would go here
    logger.info('Initializing database connections...');
    
    // Start server
    app.listen(config.port, () => {
      logger.info(`NIL Transparency Network API started on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`API Version: ${config.apiVersion}`);
      logger.info(`Documentation available at: http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server and database connections
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

export { app };