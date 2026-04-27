import { z } from 'zod';
import { AuditEventOutputSchema } from '../llm/schemas';
import { AuditEventBuilder, GenerateAuditEventInput, AuditEventInput } from '../fhir/auditEvent';

export class AuditEventTool {
  async generate(
    rawInput: Record<string, unknown>
  ): Promise<z.infer<typeof AuditEventOutputSchema>> {
    // Validate input
    const input = GenerateAuditEventInput.parse(rawInput);

    // Cast to proper types for AuditEventInput
    const auditInput: AuditEventInput = {
      action: input.action as AuditEventInput['action'],
      actionType: input.actionType as AuditEventInput['actionType'],
      outcome: input.outcome as AuditEventInput['outcome'],
      agent: input.agent as AuditEventInput['agent'],
      source: input.source as AuditEventInput['source'],
      entity: input.entity as AuditEventInput['entity'],
      purpose: input.purpose,
      regulatoryCitation: input.regulatoryCitation,
      dataAccessed: input.dataAccessed,
    };

    // Build AuditEvent
    const auditEvent = AuditEventBuilder.build(auditInput);

    // Validate AuditEvent structure
    const validation = AuditEventBuilder.validate(auditEvent);
    if (!validation.valid) {
      throw new Error(
        `AuditEvent validation failed: ${validation.errors.join(', ')}`
      );
    }

    // Generate SHA-256 hash
    const hash = AuditEventBuilder.hash(auditEvent);

    // Return result
    return {
      fhir_audit_event: auditEvent as unknown as Record<string, unknown>,
      sha256_hash: hash,
      storage_recommendation: `Store this AuditEvent in FHIR-compliant repository. Hash: ${hash.substring(0, 16)}...`,
    };
  }
}

export function createAuditEventTool(): AuditEventTool {
  return new AuditEventTool();
}
