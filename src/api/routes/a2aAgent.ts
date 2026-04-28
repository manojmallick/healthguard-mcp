import { Router, Request, Response } from 'express';
import { executeComplianceCheck, A2ARequest } from '../../agent/orchestrator';

const router = Router();

// Agent card endpoint (Google A2A standard + Prompt Opinion variant)
const getAgentCard = (req: Request, res: Response) => {
  res.json({
    name: 'HealthGuard Compliance Agent',
    version: '0.2.0',
    description:
      'Healthcare regulatory compliance intelligence — checks HIPAA, ONC information blocking rules, patient consent, and generates FHIR-compliant audit trails. Orchestrates all 5 compliance tools in an intelligent pipeline for comprehensive healthcare data access decisions.',
    url: 'https://healthguard-908307939543.europe-west1.run.app/a2a',
    supportedInterfaces: [
      {
        url: 'https://healthguard-908307939543.europe-west1.run.app/a2a',
        protocolBinding: 'HTTP+JSON',
        protocolVersion: '1.0',
      },
      {
        url: 'https://healthguard-908307939543.europe-west1.run.app/tasks',
        protocolBinding: 'HTTP+JSON',
        protocolVersion: '1.0',
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],
    skills: [
      {
        id: 'compliance-check',
        name: 'Full Compliance Check',
        description:
          'Runs complete healthcare regulatory compliance check: information blocking exceptions (45 CFR §171), HIPAA minimum necessary (45 CFR §164), patient consent verification via FHIR, applicable regulations lookup, and generates FHIR R5-compliant AuditEvent with SHA-256 tamper-evidence hashing.',
        inputDescription:
          'Natural language healthcare scenario (e.g., "A specialist wants access to medication list for a patient referral")',
        outputDescription:
          'Structured compliance decision with applicable regulations, conditions met, approved/flagged PHI elements, audit evidence, and actionable recommendations.',
        tags: ['healthcare', 'compliance', 'hipaa', 'regulatory', 'fhir', 'audit'],
      },
    ],
  });
};

// Register both agent card endpoints (Google A2A uses agent.json, Prompt Opinion uses agent-card.json)
router.get('/.well-known/agent.json', getAgentCard);
router.get('/.well-known/agent-card.json', getAgentCard);

// A2A task execution handler (shared logic)
const handleA2ATask = async (req: Request, res: Response) => {
  try {
    let request: A2ARequest;
    const body = req.body as any;

    // Log incoming request with full details
    const logRequest = {
      severity: 'INFO',
      message: 'A2A task received',
      method: req.method,
      path: req.path,
      url: req.url,
      contentType: req.get('content-type'),
      bodyKeys: Object.keys(body),
      hasExternalAgentId: !!body.externalAgentId,
      hasMessage: !!body.message,
      messageType: typeof body.message,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logRequest));

    // Convert various formats to our internal A2ARequest format
    if (body.a2aConnectionId && body.messages && Array.isArray(body.messages)) {
      // Prompt Opinion's native A2A protocol format
      const messageText = body.messages
        .filter((m: any) => m.message && typeof m.message === 'string')
        .map((m: any) => m.message)
        .join('\n');
      request = {
        id: body.a2aConnectionId || `a2a-${Date.now()}`,
        message: {
          role: 'user',
          parts: [{ type: 'text', text: messageText }],
        },
        metadata: body.metadata || {},
      };
    } else if (body.externalAgentId && typeof body.message === 'string') {
      // Prompt Opinion's SendA2AMessage format: { externalAgentId, message: "text" }
      request = {
        id: body.externalAgentId || `po-${Date.now()}`,
        message: {
          role: 'user',
          parts: [{ type: 'text', text: body.message }],
        },
        metadata: body.metadata,
      };
    } else if (body.message && body.message.parts && body.message.messageId) {
      // Google A2A protocol format: { message: { parts, messageId, role } }
      request = {
        id: body.message.messageId || `a2a-${Date.now()}`,
        message: {
          role: body.message.role === 'ROLE_USER' ? 'user' : (body.message.role || 'user'),
          parts: body.message.parts,
        },
        metadata: body.metadata,
      };
    } else {
      // Fallback: assume it's already in our format
      request = body;
    }

    // Validate required fields
    if (!request.id) {
      console.log(JSON.stringify({
        severity: 'ERROR',
        message: 'Missing id in request',
        body: body,
        timestamp: new Date().toISOString(),
      }));
      return res.status(400).json({
        id: `error-${Date.now()}`,
        sessionId: `session-${Date.now()}`,
        status: {
          state: 'TASK_STATE_FAILED',
          message: 'Missing required field: id',
        },
        artifacts: [],
      });
    }

    if (!request.message || !Array.isArray(request.message.parts)) {
      console.log(JSON.stringify({
        severity: 'ERROR',
        message: 'Invalid message format',
        request: { id: request.id, message: request.message },
        timestamp: new Date().toISOString(),
      }));
      return res.status(400).json({
        id: request.id,
        sessionId: request.id,
        status: {
          state: 'TASK_STATE_FAILED',
          message: 'Invalid message format. Expected message.parts array.',
        },
        artifacts: [],
      });
    }

    // Execute the compliance check
    const result = await executeComplianceCheck(request);

    // Return A2A protocol task format (direct task object, not JSON-RPC wrapped)
    const statusMap: Record<string, string> = {
      completed: 'TASK_STATE_COMPLETED',
      failed: 'TASK_STATE_FAILED',
      pending: 'TASK_STATE_PENDING',
    };

    const task = {
      id: result.id,
      sessionId: body.message?.messageId || request.id,
      contextId: `ctx-${result.id}`,
      status: {
        state: statusMap[result.status.state] || 'TASK_STATE_COMPLETED',
      },
      artifacts: result.artifacts,
    };

    console.log(JSON.stringify({
      severity: 'INFO',
      message: 'A2A task response',
      taskId: task.id,
      status: task.status.state,
      artifactCount: task.artifacts.length,
      timestamp: new Date().toISOString(),
    }));

    // Return wrapped in task field for Prompt Opinion compatibility
    return res.json({ task });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const taskId = req.body?.id || req.body?.externalAgentId || `task-${Date.now()}`;
    res.status(500).json({
      id: taskId,
      sessionId: req.body?.message?.messageId || taskId,
      status: {
        state: 'TASK_STATE_FAILED',
        message: errorMsg,
      },
      artifacts: [],
    });
  }
};

// Register all A2A task endpoints (Google A2A protocol standard paths)
router.post('/a2a/v1/message:send', handleA2ATask);
router.post('/a2a/v1/messages:send', handleA2ATask);
// Fallback paths for compatibility
router.post('/', handleA2ATask);
router.post('/a2a', handleA2ATask);
router.post('/tasks', handleA2ATask);
router.post('/.well-known/agent.json', handleA2ATask);
router.post('/.well-known/agent-card.json', handleA2ATask);

export default router;
