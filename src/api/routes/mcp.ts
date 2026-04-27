import { Router, Request, Response } from 'express';
import { InformationBlockingTool } from '../../tools/informationBlocking';
import { MinimumNecessaryTool } from '../../tools/minimumNecessary';
import { PatientConsentTool } from '../../tools/patientConsent';
import { AuditEventTool } from '../../tools/auditEvent';
import { RegulationLookupTool } from '../../tools/regulationLookup';
import { GeminiLLMClient } from '../../llm/client';

const router = Router();

// Initialize tools lazily to avoid errors at module load time
let ibTool: InformationBlockingTool | null = null;
let mnTool: MinimumNecessaryTool | null = null;
let consentTool: PatientConsentTool | null = null;
let auditTool: AuditEventTool | null = null;
let regTool: RegulationLookupTool | null = null;

function initializeTools() {
  if (!ibTool || !mnTool || !consentTool || !auditTool || !regTool) {
    const llmClient = new GeminiLLMClient({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    });

    ibTool = new InformationBlockingTool(llmClient);
    mnTool = new MinimumNecessaryTool(llmClient);
    consentTool = new PatientConsentTool(); // FHIRClient is optional
    auditTool = new AuditEventTool();
    regTool = new RegulationLookupTool();
  }
}

// MCP base endpoint - GET returns error (must use POST for Streamable HTTP)
router.get('/', (req: Request, res: Response) => {
  res.status(400).json({
    error: 'Use POST for MCP Streamable HTTP.',
  });
});

// Handle POST requests to base endpoint (JSON-RPC 2.0 protocol)
router.post('/', async (req: Request, res: Response) => {
  // Validate Accept header for Streamable HTTP
  const acceptHeader = req.headers.accept || '';
  if (!acceptHeader.includes('application/json') || !acceptHeader.includes('text/event-stream')) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Not Acceptable: Client must accept both application/json and text/event-stream',
      },
      id: req.body.id || null,
    });
  }

  // Validate JSON-RPC format
  if (!req.body.jsonrpc || !req.body.method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON-RPC message',
      },
      id: req.body.id || null,
    });
  }

  // Handle initialize method
  if (req.body.method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          extensions: {
            'ai.promptopinion/fhir-context': {
              scopes: [
                { name: 'patient/Patient.read', required: true },
                { name: 'patient/Consent.read', required: true },
                { name: 'patient/AuditEvent.write', required: false },
              ],
            },
          },
        },
        serverInfo: {
          name: 'healthguard-mcp',
          version: '0.2.0',
        },
      },
    });
  }

  // Handle notifications/initialized (no-op for Streamable HTTP)
  if (req.body.method === 'notifications/initialized') {
    return res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: {},
    });
  }

  // Handle list_tools method
  if (req.body.method === 'tools/list') {
    initializeTools();
    return res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        tools: [
          {
            name: 'check_information_blocking',
            description:
              'Determines if data sharing complies with ONC information blocking rules (45 CFR §171.300–309).',
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
                },
                care_relationship: {
                  type: 'string',
                  enum: ['treatment', 'referral', 'payment', 'none'],
                },
                urgency: {
                  type: 'string',
                  enum: ['routine', 'urgent', 'emergent'],
                },
              },
              required: ['requested_data_type', 'requester_role', 'care_relationship', 'urgency'],
            },
          },
          {
            name: 'assess_hipaa_minimum_necessary',
            description: 'Evaluates whether requested PHI elements meet the HIPAA minimum necessary standard.',
            inputSchema: {
              type: 'object',
              properties: {
                phi_elements_requested: {
                  type: 'array',
                  items: { type: 'string' },
                },
                stated_purpose: {
                  type: 'string',
                  enum: ['TREATMENT', 'PAYMENT', 'OPERATIONS', 'PATIENT_REQUEST', 'RESEARCH'],
                },
                requester_role: { type: 'string' },
                care_context: { type: 'string' },
              },
              required: ['phi_elements_requested', 'stated_purpose', 'requester_role', 'care_context'],
            },
          },
          {
            name: 'check_patient_consent',
            description: 'Queries FHIR Consent resources to verify patient consent status for data access.',
            inputSchema: {
              type: 'object',
              properties: {
                patient_fhir_id: { type: 'string' },
                data_category: { type: 'string' },
                proposed_action: {
                  type: 'string',
                  enum: ['read', 'share', 'research'],
                },
              },
              required: ['patient_fhir_id', 'data_category', 'proposed_action'],
            },
          },
          {
            name: 'generate_audit_event',
            description: 'Generates a FHIR R5 compliant AuditEvent with SHA-256 hash for compliance evidence.',
            inputSchema: {
              type: 'object',
              properties: {
                action_performed: { type: 'string' },
                patient_fhir_id: { type: 'string' },
                acting_agent_id: { type: 'string' },
                data_accessed: { type: 'array', items: { type: 'string' } },
                outcome: {
                  type: 'string',
                  enum: ['success', 'denied', 'error'],
                },
                purpose_of_use: { type: 'string' },
              },
              required: ['action_performed', 'patient_fhir_id', 'acting_agent_id', 'outcome'],
            },
          },
          {
            name: 'get_applicable_regulations',
            description: 'Returns applicable healthcare regulations (HIPAA, 21st Century Cures Act) with CFR citations.',
            inputSchema: {
              type: 'object',
              properties: {
                care_setting: { type: 'string' },
                data_type: { type: 'string' },
                proposed_action: { type: 'string' },
              },
              required: ['care_setting', 'data_type', 'proposed_action'],
            },
          },
        ],
      },
    });
  }

  // Handle tools/call method
  if (req.body.method === 'tools/call') {
    const toolName = req.body.params?.name;
    const args = req.body.params?.arguments;

    try {
      initializeTools();

      if (toolName === 'check_information_blocking') {
        const result = await ibTool!.check(args);
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } else if (toolName === 'assess_hipaa_minimum_necessary') {
        const result = await mnTool!.assess(args);
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } else if (toolName === 'check_patient_consent') {
        const result = await consentTool!.check(args);
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } else if (toolName === 'generate_audit_event') {
        const result = await auditTool!.generate(args);
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } else if (toolName === 'get_applicable_regulations') {
        const result = await regTool!.getApplicableRegulations(args);
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } else {
        return res.status(400).json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: -32602,
            message: `Unknown tool: ${toolName}`,
          },
        });
      }
    } catch (error) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: req.body.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  // Unknown method
  res.status(400).json({
    jsonrpc: '2.0',
    error: {
      code: -32601,
      message: `Unknown method: ${req.body.method}`,
    },
    id: req.body.id,
  });
});

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
  // Accept both "tool" (REST) and "name" (standard MCP) field names
  const toolName = req.body.tool || req.body.name;
  const args = req.body.arguments;

  try {
    initializeTools();

    if (toolName === 'check_information_blocking') {
      const result = await ibTool!.check(args);
      res.json({
        success: true,
        result,
      });
    } else if (toolName === 'assess_hipaa_minimum_necessary') {
      const result = await mnTool!.assess(args);
      res.json({
        success: true,
        result,
      });
    } else if (toolName === 'generate_audit_event') {
      const result = await auditTool!.generate(args);
      res.json({
        success: true,
        result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Unknown tool: ${toolName}`,
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
