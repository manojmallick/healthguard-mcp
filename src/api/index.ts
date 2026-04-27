import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import healthRouter from './routes/health';
import complianceRouter from './routes/complianceCheck';

const app = express();
const PORT = process.env.PORT || 3100;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Request logging middleware (Cloud Logging JSON format)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Capture response details
  const originalJson = res.json;
  res.json = function (data: unknown) {
    const duration = Date.now() - start;

    // Log structured format for Cloud Logging
    if (NODE_ENV !== 'test') {
      const log = {
        severity: res.statusCode >= 400 ? 'ERROR' : 'INFO',
        message: `${req.method} ${req.path} ${res.statusCode}`,
        service: 'healthguard-mcp',
        timestamp: new Date().toISOString(),
        httpRequest: {
          requestMethod: req.method,
          requestUrl: req.originalUrl,
          status: res.statusCode,
          latency: `${duration}ms`,
          userAgent: req.headers['user-agent'],
        },
        duration_ms: duration,
      };
      console.log(JSON.stringify(log));
    }

    return originalJson.call(this, data);
  };

  next();
});

// Health check routes
app.use(healthRouter);

// Compliance decision visualizer
app.use(complianceRouter);

// Visualizer dashboard route
app.get('/dashboard', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorLog = {
    severity: 'ERROR',
    message: err.message,
    service: 'healthguard-mcp',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
  };

  console.log(JSON.stringify(errorLog));

  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    const startLog = {
      severity: 'INFO',
      message: `HealthGuard MCP Server started`,
      service: 'healthguard-mcp',
      timestamp: new Date().toISOString(),
      port: PORT,
      environment: NODE_ENV,
    };
    console.log(JSON.stringify(startLog));
  });
}

export default app;
