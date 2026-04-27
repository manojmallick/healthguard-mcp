import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuditEventBuilder,
  AuditEventInput,
  FHIRAuditEvent,
} from '../../src/fhir/auditEvent';
import { AuditEventTool } from '../../src/tools/auditEvent';

describe('AuditEventBuilder', () => {
  let input: AuditEventInput;

  beforeEach(() => {
    input = {
      action: 'R',
      actionType: 'read',
      outcome: 0,
      agent: {
        type: 'Practitioner',
        id: 'pract-123',
        name: 'Dr. Smith',
      },
      source: {
        site: 'EHR System',
        identifier: '192.168.1.1',
        type: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: 'ApplicationServerProcess',
          },
        ],
      },
      entity: {
        what: {
          type: 'Patient',
          id: 'patient-123',
        },
      },
      purpose: 'Treatment',
    };
  });

  describe('Building AuditEvent', () => {
    it('should generate valid AuditEvent with all required fields', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.resourceType).toBe('AuditEvent');
      expect(auditEvent.id).toBeDefined();
      expect(auditEvent.type).toBeDefined();
      expect(auditEvent.action).toBe('R');
      expect(auditEvent.recorded).toBeDefined();
      expect(auditEvent.outcome).toBe(0);
      expect(auditEvent.agent).toHaveLength(1);
      expect(auditEvent.source).toBeDefined();
      expect(auditEvent.entity).toHaveLength(1);
    });

    it('should include agent details correctly', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.agent[0]).toBeDefined();
      expect(auditEvent.agent[0].name).toBe('Dr. Smith');
      expect(auditEvent.agent[0].reference.reference).toBe(
        'Practitioner/pract-123'
      );
      expect(auditEvent.agent[0].requestor).toBe(true);
    });

    it('should include entity reference correctly', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.entity[0].what.reference).toBe('Patient/patient-123');
    });

    it('should include source with identifier', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.source.identifier.value).toBe('192.168.1.1');
      expect(auditEvent.source.site).toBe('EHR System');
      expect(auditEvent.source.type).toHaveLength(1);
    });

    it('should set recorded timestamp to ISO 8601 format', () => {
      const auditEvent = AuditEventBuilder.build(input);

      const date = new Date(auditEvent.recorded);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('should handle all action codes correctly', () => {
      const actions = ['C', 'R', 'U', 'D', 'E'];

      actions.forEach(action => {
        const testInput = { ...input, action: action as AuditEventInput['action'] };
        const auditEvent = AuditEventBuilder.build(testInput);
        expect(auditEvent.action).toBe(action);
      });
    });

    it('should handle all outcome codes correctly', () => {
      const outcomes = [0, 4, 8, 12];

      outcomes.forEach(outcome => {
        const testInput = { ...input, outcome: outcome as AuditEventInput['outcome'] };
        const auditEvent = AuditEventBuilder.build(testInput);
        expect(auditEvent.outcome).toBe(outcome);
      });
    });
  });

  describe('Regulatory Citation Extension', () => {
    it('should include regulatory citation in extension when provided', () => {
      const inputWithCitation = {
        ...input,
        regulatoryCitation: '45 CFR §171.302(a)',
      };

      const auditEvent = AuditEventBuilder.build(inputWithCitation);

      expect(auditEvent.extension).toBeDefined();
      expect(auditEvent.extension!.length).toBeGreaterThan(0);
      expect(auditEvent.extension![0].valueString).toBe(
        '45 CFR §171.302(a)'
      );
    });

    it('should not include extension when citation not provided', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.extension).toEqual([]);
    });
  });

  describe('SHA-256 Hashing', () => {
    it('should generate consistent hash for same input', () => {
      const auditEvent1 = AuditEventBuilder.build(input);
      const auditEvent2 = AuditEventBuilder.build(input);

      // Normalize IDs for comparison
      auditEvent2.id = auditEvent1.id;
      auditEvent2.recorded = auditEvent1.recorded;

      const hash1 = AuditEventBuilder.hash(auditEvent1);
      const hash2 = AuditEventBuilder.hash(auditEvent2);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const auditEvent1 = AuditEventBuilder.build(input);
      const modifiedInput = { ...input, outcome: 4 as const };
      const auditEvent2 = AuditEventBuilder.build(modifiedInput);

      // Normalize IDs for comparison
      auditEvent2.id = auditEvent1.id;
      auditEvent2.recorded = auditEvent1.recorded;

      const hash1 = AuditEventBuilder.hash(auditEvent1);
      const hash2 = AuditEventBuilder.hash(auditEvent2);

      expect(hash1).not.toBe(hash2);
    });

    it('should return 64-character hex string (SHA-256)', () => {
      const auditEvent = AuditEventBuilder.build(input);
      const hash = AuditEventBuilder.hash(auditEvent);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });
  });

  describe('AuditEvent Validation', () => {
    it('should validate correct AuditEvent as valid', () => {
      const auditEvent = AuditEventBuilder.build(input);
      const validation = AuditEventBuilder.validate(auditEvent);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing resourceType', () => {
      const auditEvent = AuditEventBuilder.build(input);
      delete (auditEvent as any).resourceType;

      const validation = AuditEventBuilder.validate(auditEvent);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing required fields', () => {
      const auditEvent = AuditEventBuilder.build(input);
      delete (auditEvent as any).id;

      const validation = AuditEventBuilder.validate(auditEvent);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('id is required');
    });

    it('should detect invalid action code', () => {
      const auditEvent = AuditEventBuilder.build(input);
      (auditEvent as any).action = 'X'; // Invalid

      const validation = AuditEventBuilder.validate(auditEvent);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('action'))).toBe(true);
    });

    it('should detect invalid outcome code', () => {
      const auditEvent = AuditEventBuilder.build(input);
      (auditEvent as any).outcome = 99; // Invalid

      const validation = AuditEventBuilder.validate(auditEvent);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('outcome'))).toBe(true);
    });

    it('should detect missing agent', () => {
      const auditEvent = AuditEventBuilder.build(input);
      auditEvent.agent = [];

      const validation = AuditEventBuilder.validate(auditEvent);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('agent'))).toBe(true);
    });

    it('should detect missing entity', () => {
      const auditEvent = AuditEventBuilder.build(input);
      auditEvent.entity = [];

      const validation = AuditEventBuilder.validate(auditEvent);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('entity'))).toBe(true);
    });
  });

  describe('FHIR Compliance', () => {
    it('should include proper FHIR type with system and code', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.type.system).toBeDefined();
      expect(auditEvent.type.code).toBeDefined();
      expect(auditEvent.type.system).toBe(
        'http://terminology.hl7.org/CodeSystem/audit-event-type'
      );
    });

    it('should include agent type with FHIR coding', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.agent[0].type.coding).toBeDefined();
      expect(auditEvent.agent[0].type.coding[0].system).toBeDefined();
      expect(auditEvent.agent[0].type.coding[0].code).toBeDefined();
    });

    it('should include source type with proper coding', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.source.type).toHaveLength(1);
      expect(auditEvent.source.type[0].system).toBeDefined();
      expect(auditEvent.source.type[0].code).toBeDefined();
    });

    it('should include meta with profile', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(auditEvent.meta).toBeDefined();
      expect(auditEvent.meta.lastUpdated).toBeDefined();
      expect(auditEvent.meta.versionId).toBeDefined();
    });

    it('should include purposeOfEvent as array', () => {
      const auditEvent = AuditEventBuilder.build(input);

      expect(Array.isArray(auditEvent.purposeOfEvent)).toBe(true);
      expect(auditEvent.purposeOfEvent[0].coding).toBeDefined();
    });
  });

  describe('Agent Types', () => {
    it('should handle Device agent type', () => {
      const deviceInput = {
        ...input,
        agent: { type: 'Device' as const, id: 'device-001' },
      };

      const auditEvent = AuditEventBuilder.build(deviceInput);

      expect(auditEvent.agent[0].reference.reference).toBe('Device/device-001');
    });

    it('should handle Organization agent type', () => {
      const orgInput = {
        ...input,
        agent: { type: 'Organization' as const, id: 'org-001' },
      };

      const auditEvent = AuditEventBuilder.build(orgInput);

      expect(auditEvent.agent[0].reference.reference).toBe('Organization/org-001');
    });

    it('should handle Patient agent type', () => {
      const patientInput = {
        ...input,
        agent: { type: 'Patient' as const, id: 'patient-001' },
      };

      const auditEvent = AuditEventBuilder.build(patientInput);

      expect(auditEvent.agent[0].reference.reference).toBe('Patient/patient-001');
    });
  });

  describe('Entity Types', () => {
    it('should handle Consent entity type', () => {
      const consentInput = {
        ...input,
        entity: { what: { type: 'Consent', id: 'consent-001' } },
      };

      const auditEvent = AuditEventBuilder.build(consentInput);

      expect(auditEvent.entity[0].what.reference).toBe('Consent/consent-001');
    });

    it('should handle Condition entity type', () => {
      const conditionInput = {
        ...input,
        entity: { what: { type: 'Condition', id: 'cond-001' } },
      };

      const auditEvent = AuditEventBuilder.build(conditionInput);

      expect(auditEvent.entity[0].what.reference).toBe('Condition/cond-001');
    });

    it('should include description for data accessed', () => {
      const descInput = {
        ...input,
        dataAccessed: 'Patient medications and allergies',
      };

      const auditEvent = AuditEventBuilder.build(descInput);

      expect(auditEvent.entity[0].description).toContain('medications');
    });
  });
});

describe('AuditEventTool', () => {
  let tool: AuditEventTool;

  beforeEach(() => {
    tool = new AuditEventTool();
  });

  it('should generate AuditEvent with hash via tool', async () => {
    const result = await tool.generate({
      action: 'R',
      actionType: 'read',
      outcome: 0,
      agent: {
        type: 'Practitioner',
        id: 'pract-123',
        name: 'Dr. Smith',
      },
      source: {
        site: 'EHR System',
        identifier: '192.168.1.1',
        type: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: 'ApplicationServerProcess',
          },
        ],
      },
      entity: {
        what: {
          type: 'Patient',
          id: 'patient-123',
        },
      },
      purpose: 'Treatment',
      regulatoryCitation: '45 CFR §171.302(a)',
    });

    expect(result.fhir_audit_event).toBeDefined();
    expect(result.sha256_hash).toBeDefined();
    expect(result.sha256_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.storage_recommendation).toBeDefined();
  });

  it('should reject invalid input', async () => {
    expect(
      tool.generate({
        action: 'INVALID' as never,
        actionType: 'read',
        outcome: 0,
        agent: {
          type: 'Practitioner',
          id: 'pract-123',
        },
        source: {
          type: [],
        },
        entity: {
          what: {
            type: 'Patient',
            id: 'patient-123',
          },
        },
        purpose: 'Treatment',
      })
    ).rejects.toThrow();
  });

  it('should include regulatory citation in generated event', async () => {
    const result = await tool.generate({
      action: 'R',
      actionType: 'read',
      outcome: 0,
      agent: {
        type: 'Practitioner',
        id: 'pract-123',
      },
      source: {
        type: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: 'ApplicationServerProcess',
          },
        ],
      },
      entity: {
        what: {
          type: 'Patient',
          id: 'patient-123',
        },
      },
      purpose: 'Treatment',
      regulatoryCitation: '45 CFR §164.502(b)',
    });

    const auditEvent = result.fhir_audit_event as unknown as FHIRAuditEvent;
    expect(auditEvent.extension).toBeDefined();
    expect(auditEvent.extension?.[0].valueString).toBe('45 CFR §164.502(b)');
  });
});
