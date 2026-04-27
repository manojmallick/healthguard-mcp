import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { InformationBlockingTool } from '../tools/informationBlocking.js';
import { MinimumNecessaryTool } from '../tools/minimumNecessary.js';
import { AuditEventTool } from '../tools/auditEvent.js';
import { GeminiLLMClient } from '../llm/client.js';

const llmClient = new GeminiLLMClient({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
});

const ibTool = new InformationBlockingTool(llmClient);
const mnTool = new MinimumNecessaryTool(llmClient);
const auditTool = new AuditEventTool();

const server = new Server(
  {
    name: 'healthguard-mcp',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  {
    name: 'check_information_blocking',
    description:
      'Determines if data sharing complies with ONC information blocking rules (45 CFR §171.300–309). Checks if the request falls under a valid exception and whether the data can be legally shared.',
    inputSchema: {
      type: 'object' as const,
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
      type: 'object' as const,
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
          description: 'Role of the requester (e.g., treating_provider, insurer)',
        },
        care_context: {
          type: 'string',
          description:
            'Clinical or operational context (e.g., discharge planning, claim adjudication)',
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
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['C', 'R', 'U', 'D', 'E'],
          description: 'FHIR action code: C=Create, R=Read, U=Update, D=Delete, E=Execute',
        },
        actionType: {
          type: 'string',
          description: 'Human-readable action description (e.g., DATA_ACCESS_REQUEST)',
        },
        outcome: {
          type: 'number',
          enum: [0, 4, 8, 12],
          description: 'Outcome code: 0=success, 4=minor failure, 8=serious failure, 12=major failure',
        },
        agent: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['Practitioner', 'Device', 'Organization', 'Patient'],
            },
            id: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['type', 'id'],
        },
        entity: {
          type: 'object',
          properties: {
            what: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                id: { type: 'string' },
              },
              required: ['type', 'id'],
            },
          },
          required: ['what'],
        },
        purpose: { type: 'string' },
        regulatoryCitation: { type: 'string' },
      },
      required: ['action', 'actionType', 'outcome', 'agent', 'entity', 'purpose'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'check_information_blocking') {
      const result = await ibTool.check(args as Record<string, unknown>);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else if (name === 'assess_hipaa_minimum_necessary') {
      const result = await mnTool.assess(args as Record<string, unknown>);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else if (name === 'generate_audit_event') {
      const result = await auditTool.generate(args as Record<string, unknown>);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HealthGuard MCP Server running on stdio');
}

main().catch(console.error);

export { server };
