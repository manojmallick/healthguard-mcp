import { Router, Request, Response } from 'express';
import { InformationBlockingTool } from '../../tools/informationBlocking';
import { MinimumNecessaryTool } from '../../tools/minimumNecessary';
import { AuditEventTool } from '../../tools/auditEvent';
import { GeminiLLMClient } from '../../llm/client';

const router = Router();

// Initialize tools lazily to avoid errors at module load time
let ibTool: InformationBlockingTool | null = null;
let mnTool: MinimumNecessaryTool | null = null;
let auditTool: AuditEventTool | null = null;

function initializeTools() {
  if (!ibTool || !mnTool || !auditTool) {
    const llmClient = new GeminiLLMClient({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    });

    ibTool = new InformationBlockingTool(llmClient);
    mnTool = new MinimumNecessaryTool(llmClient);
    auditTool = new AuditEventTool();
  }
}

// MCP Tools discovery endpoint
router.get('/tools', (req: Request, res: Response) => {
  const tools = [
    {
      name: 'check_information_blocking',
      description:
        'Determines if data sharing complies with ONC information blocking rules (45 CFR §171.300–309). Checks if the request falls under a valid exception and whether the data can be legally shared.',
      inputSchema: {
        type: 'object',
        properties: {
          requested_data_type: {
            type: 'string',
            enum: [
              'medications',
              'lab_results',
              'imaging',
              'clinical_notes',
              'problem_list',
              'allergies',
              'vital_signs',
              'full_record',
            ],
            description: 'Type of data being requested for sharing',
          },
          requester_role: {
            type: 'string',
            enum: [
              'treating_physician',
              'specialist',
              'hospital_admin',
              'patient',
              'patient_advocate',
              'insurer',
              'employer',
              'researcher',
            ],
            description: 'Role of the person/entity requesting data',
          },
          care_relationship: {
            type: 'string',
            enum: ['treatment', 'referral', 'payment', 'none'],
            description:
              'Type of care relationship between patient and requester',
          },
          urgency: {
            type: 'string',
            enum: ['routine', 'urgent', 'emergent'],
            description: 'Urgency of the request',
          },
        },
        required: [
          'requested_data_type',
          'requester_role',
          'care_relationship',
          'urgency',
        ],
      },
    },
    {
      name: 'assess_hipaa_minimum_necessary',
      description:
        'Evaluates whether requested PHI elements meet the HIPAA minimum necessary standard (45 CFR §164.502(b)). Identifies which data elements are approved for sharing and which exceed minimum necessity.',
      inputSchema: {
        type: 'object',
        properties: {
          phi_elements_requested: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of specific PHI elements being requested',
          },
          stated_purpose: {
            type: 'string',
            enum: [
              'TREATMENT',
              'PAYMENT',
              'OPERATIONS',
              'PATIENT_REQUEST',
              'RESEARCH',
            ],
            description: 'Purpose for which PHI is requested',
          },
          requester_role: {
            type: 'string',
            description: 'Role of the requester',
          },
          care_context: {
            type: 'string',
            description: 'Clinical or operational context',
          },
        },
        required: [
          'phi_elements_requested',
          'stated_purpose',
          'requester_role',
          'care_context',
        ],
      },
    },
    {
      name: 'generate_audit_event',
      description:
        'Generates a FHIR R4 compliant AuditEvent with SHA-256 hash for compliance audit trails. Records data access decisions with regulatory basis.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['C', 'R', 'U', 'D', 'E'],
            description: 'FHIR action code',
          },
          actionType: {
            type: 'string',
            description: 'Human-readable action description',
          },
          outcome: {
            type: 'number',
            enum: [0, 4, 8, 12],
            description: 'Outcome code',
          },
        },
        required: ['action', 'actionType', 'outcome'],
      },
    },
  ];

  res.json({ tools });
});

// MCP Tool call endpoint
router.post('/call', async (req: Request, res: Response) => {
  const { tool, arguments: args } = req.body;

  try {
    initializeTools();

    if (tool === 'check_information_blocking') {
      const result = await ibTool!.check(args);
      res.json({
        success: true,
        result,
      });
    } else if (tool === 'assess_hipaa_minimum_necessary') {
      const result = await mnTool!.assess(args);
      res.json({
        success: true,
        result,
      });
    } else if (tool === 'generate_audit_event') {
      const result = await auditTool!.generate(args);
      res.json({
        success: true,
        result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Unknown tool: ${tool}`,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
