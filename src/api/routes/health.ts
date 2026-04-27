import { Request, Response, Router } from 'express';
import { GeminiLLMClient } from '../../llm/client';
import { FHIRClient } from '../../fhir/client';
import { getAllRegulations } from '../../regulatory/regulations';

const router = Router();

// Verify PHI logging is disabled (critical for HIPAA compliance)
const PHI_LOGGING_ENABLED = process.env.PHI_LOGGING_ENABLED === 'true';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  service: string;
  timestamp: string;
  region?: string;
  revision?: string;
  phiLoggingEnabled?: boolean;
}

interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: Record<string, string>;
  details?: Record<string, unknown>;
}

interface StructuredLog {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  service: string;
  timestamp: string;
  [key: string]: unknown;
}

function createStructuredLog(
  severity: StructuredLog['severity'],
  message: string,
  meta?: Record<string, unknown>
): StructuredLog {
  return {
    severity,
    message,
    service: 'healthguard-mcp',
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

// GET /health — Cloud Run liveness probe
// Returns: service metadata, version, region
// Used by: Cloud Run liveness check
router.get('/health', (req: Request, res: Response) => {
  const log = createStructuredLog('INFO', 'Health check endpoint called');
  console.log(JSON.stringify(log));

  const healthStatus: HealthStatus = {
    status: 'ok',
    version: process.env.MCP_SERVER_VERSION || '0.2.0',
    service: process.env.MCP_SERVER_NAME || 'healthguard-mcp',
    timestamp: new Date().toISOString(),
    region: process.env.K_REGION || process.env.CLOUD_RUN_REGION || 'local',
    revision: process.env.K_REVISION || 'local-dev',
    phiLoggingEnabled: PHI_LOGGING_ENABLED,
  };

  res.status(200).json(healthStatus);
});

// GET /ready — Cloud Run readiness/startup probe
// Returns: ready status + individual dependency checks
// Used by: Cloud Run startup probe (initial readiness)
//          Cloud Run readiness probe (ongoing availability)
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, string> = {};
  const details: Record<string, unknown> = {};
  let allReady = true;

  const startTime = Date.now();
  const log = createStructuredLog('INFO', 'Readiness check started');
  console.log(JSON.stringify(log));

  // 1. Check Gemini API availability
  try {
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiApiKey) {
      checks.gemini_api = 'missing_key';
      details.gemini_error = 'GOOGLE_GEMINI_API_KEY not configured';
      allReady = false;
    } else {
      const llmClient = new GeminiLLMClient({
        apiKey: geminiApiKey,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      });

      const isConnected = await llmClient.testConnection();
      checks.gemini_api = isConnected ? 'ok' : 'unavailable';
      if (!isConnected) {
        allReady = false;
        details.gemini_error = 'Failed to connect to Gemini API';
      }
    }
  } catch (err) {
    checks.gemini_api = 'error';
    details.gemini_error = err instanceof Error ? err.message : String(err);
    allReady = false;
  }

  // 2. Check FHIR server availability
  try {
    const fhirBaseUrl = process.env.FHIR_BASE_URL;
    const fhirToken = process.env.FHIR_TOKEN;

    if (!fhirBaseUrl) {
      checks.fhir_server = 'missing_url';
      details.fhir_error = 'FHIR_BASE_URL not configured';
      // FHIR is optional for startup, degraded readiness only
    } else if (!fhirToken) {
      checks.fhir_server = 'missing_token';
      details.fhir_error = 'FHIR_TOKEN not configured';
      // FHIR is optional, degraded readiness
    } else {
      const fhirClient = new FHIRClient({
        fhirBaseUrl: fhirBaseUrl,
        bearerToken: fhirToken,
        timeout: 5000, // Short timeout for readiness check
      });

      const isConnected = await fhirClient.testConnection();
      checks.fhir_server = isConnected ? 'ok' : 'unavailable';
      if (!isConnected) {
        details.fhir_error = 'FHIR server not responding';
        // Degraded readiness (FHIR is optional for some tools)
      }
    }
  } catch (err) {
    checks.fhir_server = 'error';
    details.fhir_error = err instanceof Error ? err.message : String(err);
    // Degraded readiness
  }

  // 3. Check regulatory data availability
  try {
    const regulations = getAllRegulations();
    checks.regulatory_data = regulations.length > 0 ? 'ok' : 'empty';
    details.regulatory_count = regulations.length;

    if (regulations.length === 0) {
      allReady = false;
      details.regulatory_error = 'No regulations loaded';
    }
  } catch (err) {
    checks.regulatory_data = 'error';
    details.regulatory_error = err instanceof Error ? err.message : String(err);
    allReady = false;
  }

  // 4. Verify PHI logging is disabled (critical security check)
  checks.phi_logging = PHI_LOGGING_ENABLED ? 'ENABLED' : 'disabled';
  details.phi_logging_status = PHI_LOGGING_ENABLED ? 'WARNING: PHI logging is enabled!' : 'OK';

  if (PHI_LOGGING_ENABLED) {
    // This is a security issue but doesn't block readiness
    const warningLog = createStructuredLog(
      'WARNING',
      'PHI logging is enabled - this may violate HIPAA',
      { check: 'phi_logging' }
    );
    console.log(JSON.stringify(warningLog));
  }

  const elapsedMs = Date.now() - startTime;
  details.elapsed_ms = elapsedMs;

  const readinessStatus: ReadinessStatus = {
    ready: allReady,
    timestamp: new Date().toISOString(),
    checks,
    details,
  };

  const statusCode = allReady ? 200 : 503; // 200 = ready, 503 = service unavailable
  const logLevel = allReady ? 'INFO' : 'WARNING';

  const readyLog = createStructuredLog(
    logLevel,
    `Readiness check: ${allReady ? 'ready' : 'not ready'}`,
    { checks, elapsed_ms: elapsedMs }
  );
  console.log(JSON.stringify(readyLog));

  res.status(statusCode).json(readinessStatus);
});

export default router;
