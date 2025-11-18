// src/main.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import companyRoutes from './modules/companies/company.routes';
import brandRoutes from './modules/brands/brands.routes';
import branchRoutes from './modules/branches/branch.routes';
import personRoutes from './modules/people/person.routes';
import documentRoutes from './modules/documents/document.routes';
import templateRoutes from './modules/templates/template.routes';
import reportRoutes from './modules/reports/report.routes';
import calendarRoutes from './modules/calendar/calendar.routes';
import presentationRoutes from './modules/presentations/presentation.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import settingsRoutes from './modules/settings/settings.routes';
import uploadRoutes from './modules/upload/upload.routes';
import { BrandsModule } from './modules/brands/brands.module'; // ADD THIS


// Import middleware
import { errorHandler } from './common/middlewares/error.middleware';
import { notFoundHandler } from './common/middlewares/notFound.middleware';
import { requestLogger } from './common/middlewares/logger.middleware';
import { rateLimiter } from './common/middlewares/rateLimit.middleware';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Redis Client
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use('/api/auth/login', rateLimiter(5, 15) as any);

// Rate limiting
app.use('/api/auth/login', rateLimiter(5, 15)); // 5 attempts per 15 minutes
app.use('/api/auth/register', rateLimiter(3, 60)); // 3 attempts per hour
app.use('/api', rateLimiter(100, 15)); // 100 requests per 15 minutes for general API

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus,
        api: 'running',
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================
// API ROUTES
// ============================================

const API_PREFIX = '/api';

// Authentication
app.use(`${API_PREFIX}/auth`, authRoutes);

// Core entities
app.use(`${API_PREFIX}/companies`, companyRoutes);
app.use(`${API_PREFIX}/brands`, brandRoutes);
app.use(`${API_PREFIX}/branches`, branchRoutes);
app.use(`${API_PREFIX}/people`, personRoutes);

// Documents & Templates
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/templates`, templateRoutes);

// Reports
app.use(`${API_PREFIX}/reports`, reportRoutes);

// Calendar
app.use(`${API_PREFIX}/calendar`, calendarRoutes);

// Presentations
app.use(`${API_PREFIX}/presentations`, presentationRoutes);

// Dashboard
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// Settings
app.use(`${API_PREFIX}/settings`, settingsRoutes);

// File upload
app.use(`${API_PREFIX}/upload`, uploadRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'CRM System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs', // For future Swagger integration
    },
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler as any);

// Global error handler
app.use(errorHandler as any);

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Redis connected successfully');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║     🚀 CRM System API Server Running         ║
║                                               ║
║     Environment: ${process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT'}                    ║
║     Port: ${PORT}                                ║
║     URL: http://localhost:${PORT}              ║
║                                               ║
║     Database: PostgreSQL ✅                   ║
║     Cache: Redis ✅                           ║
║     Storage: MinIO ✅                         ║
║                                               ║
╚═══════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Start the server
startServer();

export default app;