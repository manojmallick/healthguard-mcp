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
        id: 'A2A',
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

// A2A task execution endpoint (Google A2A standard)
router.post('/a2a', async (req: Request, res: Response) => {
  try {
    const request: A2ARequest = req.body;

    // Validate required fields
    if (!request.id) {
      return res.status(400).json({
        id: 'unknown',
        status: {
          state: 'failed',
          error: 'Missing required field: id',
        },
        artifacts: [],
      });
    }

    if (!request.message || !Array.isArray(request.message.parts)) {
      return res.status(400).json({
        id: request.id,
        status: {
          state: 'failed',
          error: 'Invalid message format. Expected message.parts array.',
        },
        artifacts: [],
      });
    }

    // Execute the compliance check
    const result = await executeComplianceCheck(request);
    res.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      id: req.body?.id || 'unknown',
      status: {
        state: 'failed',
        error: errorMsg,
      },
      artifacts: [],
    });
  }
});

export default router;
