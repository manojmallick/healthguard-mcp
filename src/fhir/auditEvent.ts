import { createHash } from 'crypto';
import { z } from 'zod';

// FHIR R4 AuditEvent Resource Builder
// Validates against: https://hl7.org/fhir/R4/auditevent.html
// Must pass validator.fhir.org at 0 errors, 0 warnings

export interface AuditEventInput {
  action: 'C' | 'R' | 'U' | 'D' | 'E'; // Create, Read, Update, Delete, Execute
  actionType:
    | 'access'
    | 'amendment'
    | 'attribution'
    | 'create'
    | 'delete'
    | 'disclosure'
    | 'export'
    | 'import'
    | 'login'
    | 'logout'
    | 'print'
    | 'read'
    | 'receive'
    | 'securityEvent'
    | 'transmit'
    | 'view';
  outcome: 0 | 4 | 8 | 12; // 0=success, 4=minor failure, 8=serious failure, 12=major failure
  agent: {
    type: 'Device' | 'Practitioner' | 'Organization' | 'Patient';
    id: string; // FHIR resource ID
    name?: string;
    altId?: string;
  };
  source: {
    site?: string;
    identifier?: string; // Can be IP address, hostname, etc.
    type: Array<{
      system: string; // Usually http://terminology.hl7.org/CodeSystem/security-source-type
      code:
        | 'ApplicationServerProcess'
        | 'ApplicationClient'
        | 'DatabaseServer'
        | 'SecurityServer'
        | 'ISC'
        | 'WebServer'
        | 'MobileDevice'
        | 'Other';
    }>;
  };
  entity: {
    what: {
      type: 'Patient' | 'AllergyIntolerance' | 'Consent' | 'Condition' | 'Medication' | 'Observation' | 'Bundle';
      id: string;
    };
    role?: {
      system: string;
      code: string;
      display?: string;
    };
    lifecycle?: string;
    securityLabel?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  purpose: string; // Free text: treatment, payment, operations, research, etc.
  regulatoryCitation?: string; // e.g., "45 CFR §171.302(a)"
  dataAccessed?: string; // Summary of what was accessed
}

export interface FHIRAuditEvent {
  resourceType: 'AuditEvent';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
    profile: string[];
  };
  text: {
    status: string;
    div: string;
  };
  code: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  action: string;
  recorded: string;
  outcome: {
    code: {
      system: string;
      code: string;
      display?: string;
    };
  };
  agent: Array<{
    type: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
    who: {
      reference: string;
      display?: string;
    };
    requestor: boolean;
  }>;
  source: {
    site?: string;
    observer: {
      reference: string;
      display?: string;
    };
    type: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  entity: Array<{
    what: {
      reference: string;
    };
    role?: {
      system: string;
      code: string;
      display?: string;
    };
    lifecycle?: {
      system: string;
      code: string;
      display?: string;
    };
    securityLabel?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    description?: string;
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
  }>;
}

export class AuditEventBuilder {
  static build(input: AuditEventInput): FHIRAuditEvent {
    const now = new Date().toISOString();
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Map action code to DICOM code (required by FHIR spec)
    const actionCodeMap: Record<string, { code: string; display: string }> = {
      C: { code: 'Create', display: 'Create' },
      R: { code: 'Read', display: 'Read' },
      U: { code: 'Update', display: 'Update' },
      D: { code: 'Delete', display: 'Delete' },
      E: { code: 'Execute', display: 'Execute' },
    };

    const actionInfo = actionCodeMap[input.action] || { code: 'Other', display: 'Other' };

    // Map outcome code
    const outcomeMap: Record<number, string> = {
      0: 'Success',
      4: 'Minor failure',
      8: 'Serious failure',
      12: 'Major failure',
    };

    const auditEvent: FHIRAuditEvent = {
      resourceType: 'AuditEvent',
      id: auditId,
      meta: {
        versionId: '1',
        lastUpdated: now,
        profile: [
          'http://hl7.org/fhir/StructureDefinition/AuditEvent',
        ],
      },
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>Audit event for ${input.actionType}</p></div>`,
      },
      code: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
            code: 'rest',
            display: 'RESTful Operation',
          },
        ],
      },
      action: input.action,
      recorded: now,
      outcome: {
        code: {
          system: 'http://hl7.org/fhir/audit-event-outcome',
          code: input.outcome.toString(),
          display: outcomeMap[input.outcome],
        },
      },
      agent: [
        {
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/participation-role-type',
                code: 'AUTHMGT',
                display: 'Authentication',
              },
            ],
          },
          who: {
            reference: `${input.agent.type}/${input.agent.id}`,
            display: input.agent.name || input.agent.id,
          },
          requestor: true,
        },
      ],
      source: {
        site: input.source.site || 'HealthGuard MCP',
        observer: {
          reference: `Device/${input.source.identifier || 'healthguard-mcp'}`,
          display: 'HealthGuard MCP Server',
        },
        type: input.source.type,
      },
      entity: [
        {
          what: {
            reference: `${input.entity.what.type}/${input.entity.what.id}`,
          },
          role: input.entity.role,
          lifecycle: input.entity.lifecycle
            ? {
                system: 'http://terminology.hl7.org/CodeSystem/iso-11238',
                code: input.entity.lifecycle,
                display: input.entity.lifecycle,
              }
            : undefined,
          securityLabel: input.entity.securityLabel,
          description: input.dataAccessed || `${input.actionType} on ${input.entity.what.type}`,
        },
      ],
      extension: [],
    };

    // Add regulatory citation extension if provided
    if (input.regulatoryCitation) {
      auditEvent.extension!.push({
        url: 'http://healthguard.example.com/extension/regulatory-citation',
        valueString: input.regulatoryCitation,
      });
    }

    // Return as-is (optional fields can be undefined)
    return auditEvent;
  }

  static hash(auditEvent: FHIRAuditEvent): string {
    // Create deterministic JSON string
    const jsonString = JSON.stringify(auditEvent, Object.keys(auditEvent).sort(), 2);
    return createHash('sha256').update(jsonString).digest('hex');
  }

  static validate(auditEvent: FHIRAuditEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!auditEvent.resourceType || auditEvent.resourceType !== 'AuditEvent') {
      errors.push('resourceType must be "AuditEvent"');
    }
    if (!auditEvent.id) errors.push('id is required');
    if (!auditEvent.code) errors.push('code is required');
    if (auditEvent.action === undefined) errors.push('action is required');
    if (!auditEvent.recorded) errors.push('recorded is required');
    if (auditEvent.outcome === undefined) errors.push('outcome is required');
    if (!auditEvent.agent || auditEvent.agent.length === 0) {
      errors.push('at least one agent is required');
    }
    if (!auditEvent.source) errors.push('source is required');
    if (!auditEvent.entity || auditEvent.entity.length === 0) {
      errors.push('at least one entity is required');
    }

    // Code validation
    if (auditEvent.code && !auditEvent.code.coding) {
      errors.push('code.coding is required');
    }

    // Action validation (must be single character)
    const validActions = ['C', 'R', 'U', 'D', 'E'];
    if (!validActions.includes(auditEvent.action)) {
      errors.push(`action must be one of: ${validActions.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Input schema for tool
export const GenerateAuditEventInput = z.object({
  action: z.enum(['C', 'R', 'U', 'D', 'E']),
  actionType: z.string(),
  outcome: z.union([z.literal(0), z.literal(4), z.literal(8), z.literal(12)]),
  agent: z.object({
    type: z.enum(['Device', 'Practitioner', 'Organization', 'Patient']),
    id: z.string(),
    name: z.string().optional(),
    altId: z.string().optional(),
  }),
  source: z.object({
    site: z.string().optional(),
    identifier: z.string().optional(),
    type: z.array(
      z.object({
        system: z.string(),
        code: z.string(),
      })
    ),
  }),
  entity: z.object({
    what: z.object({
      type: z.string(),
      id: z.string(),
    }),
    role: z
      .object({
        system: z.string(),
        code: z.string(),
        display: z.string().optional(),
      })
      .optional(),
    securityLabel: z
      .array(
        z.object({
          system: z.string(),
          code: z.string(),
          display: z.string().optional(),
        })
      )
      .optional(),
  }),
  purpose: z.string(),
  regulatoryCitation: z.string().optional(),
  dataAccessed: z.string().optional(),
  _sharp_patient_id: z.string().optional(),
  _sharp_fhir_base_url: z.string().optional(),
  _sharp_fhir_token: z.string().optional(),
});

export type GenerateAuditEventInput = z.infer<typeof GenerateAuditEventInput>;
