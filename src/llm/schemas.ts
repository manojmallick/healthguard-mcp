import { z } from 'zod';

// Information Blocking Exception Enumeration (8 fixed values per 45 CFR 171.300–309)
export const InformationBlockingException = z.enum([
  'TREATMENT',
  'PAYMENT',
  'HEALTHCARE_OPERATIONS',
  'HIPAA_PERMISSION',
  'VITALLY_IMPORTANT',
  'INFEASIBLE',
  'SECURITY',
  'PRIVACY',
  'NONE', // When no exception applies
]);

export type InformationBlockingException = z.infer<
  typeof InformationBlockingException
>;

// Information Blocking Tool Output Schema
export const InformationBlockingOutputSchema = z.object({
  permitted: z.boolean(),
  applicable_exception: InformationBlockingException,
  exception_subsection: z.string().describe('45 CFR §171.xxx citation'),
  conditions_met: z.array(z.string()),
  conditions_not_met: z.array(z.string()),
  recommended_action: z.string(),
  confidence: z.number().min(0).max(1),
  audit_trail_required: z.boolean(),
});

export type InformationBlockingOutput = z.infer<
  typeof InformationBlockingOutputSchema
>;

// HIPAA Minimum Necessary Assessment Output Schema
export const HIPAAMinimumNecessaryOutputSchema = z.object({
  assessment: z.enum(['APPROVED', 'FLAGGED', 'DENIED']),
  approved_elements: z.array(z.string()),
  flagged_elements: z.array(z.string()),
  rationale: z.string(),
  regulatory_citation: z.string().describe('45 CFR §164.xxx citation'),
});

export type HIPAAMinimumNecessaryOutput = z.infer<
  typeof HIPAAMinimumNecessaryOutputSchema
>;

// Patient Consent Status Enumeration
export const ConsentStatus = z.enum([
  'ACTIVE',
  'EXPIRED',
  'DENIED',
  'ABSENT',
  'CONDITIONAL',
]);

export type ConsentStatus = z.infer<typeof ConsentStatus>;

// Patient Consent Tool Output Schema
export const PatientConsentOutputSchema = z.object({
  consent_status: ConsentStatus,
  consent_fhir_resource: z.record(z.string(), z.unknown()).optional(),
  expiry_date: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  action_recommended: z.string(),
});

export type PatientConsentOutput = z.infer<typeof PatientConsentOutputSchema>;

// FHIR AuditEvent Generation Output Schema
export const AuditEventOutputSchema = z.object({
  fhir_audit_event: z.record(z.string(), z.unknown()),
  sha256_hash: z.string(),
  storage_recommendation: z.string(),
});

export type AuditEventOutput = z.infer<typeof AuditEventOutputSchema>;

// Regulatory Lookup Output Schema
export const RegulationSchema = z.object({
  name: z.string(),
  citation: z.string(),
  requirement: z.string(),
  enforcement_risk: z.string(),
  penalty_range: z.string(),
  recent_changes: z.string().optional(),
});

export const RegulationsOutputSchema = z.object({
  regulations: z.array(RegulationSchema),
  compliance_checklist: z.array(z.string()),
  summary: z.string(),
});

export type RegulationsOutput = z.infer<typeof RegulationsOutputSchema>;
