import { z } from 'zod';
import { PatientConsentOutputSchema, ConsentStatus } from '../llm/schemas';
import { FHIRClient, FHIRConsent } from '../fhir/client';

// SHARP context interface
export interface SHARPContext {
  patient_id?: string;
  fhir_base_url?: string;
  fhir_token?: string;
  encounter_id?: string;
  practitioner_id?: string;
  organization_id?: string;
}

// Tool input schema
const CheckPatientConsentInput = z.object({
  patient_fhir_id: z.string().optional(),
  data_category: z.enum([
    'medications',
    'lab_results',
    'imaging',
    'clinical_notes',
    'genetic_data',
    'mental_health',
    'substance_use',
    'full_record',
  ]),
  proposed_action: z.enum(['read', 'share', 'research']),
  // SHARP context fields
  _sharp_patient_id: z.string().optional(),
  _sharp_fhir_base_url: z.string().optional(),
  _sharp_fhir_token: z.string().optional(),
  _sharp_encounter_id: z.string().optional(),
  _sharp_practitioner_id: z.string().optional(),
  _sharp_organization_id: z.string().optional(),
});

export type CheckPatientConsentInput = z.infer<typeof CheckPatientConsentInput>;

export class PatientConsentTool {
  private fhirClient: FHIRClient | null = null;

  constructor(fhirClient?: FHIRClient) {
    this.fhirClient = fhirClient || null;
  }

  private extractSHARPContext(
    input: Record<string, unknown>
  ): SHARPContext {
    return {
      patient_id: input._sharp_patient_id as string | undefined,
      fhir_base_url: input._sharp_fhir_base_url as string | undefined,
      fhir_token: input._sharp_fhir_token as string | undefined,
      encounter_id: input._sharp_encounter_id as string | undefined,
      practitioner_id: input._sharp_practitioner_id as string | undefined,
      organization_id: input._sharp_organization_id as string | undefined,
    };
  }

  private requireFhirContext(sharp: SHARPContext): void {
    if (!sharp.fhir_base_url || !sharp.fhir_token) {
      throw new Error(
        'FHIR context required: fhir_base_url and fhir_token must be provided ' +
          '(via SHARP context or explicit input). ' +
          'Ensure the calling agent has SHARP context propagation enabled.'
      );
    }
  }

  async check(
    rawInput: Record<string, unknown>
  ): Promise<z.infer<typeof PatientConsentOutputSchema>> {
    // Validate input
    const input = CheckPatientConsentInput.parse(rawInput);

    // Extract SHARP context
    const sharp = this.extractSHARPContext(rawInput);

    // Determine patient ID (SHARP takes precedence)
    const patientId = sharp.patient_id || input.patient_fhir_id;
    if (!patientId) {
      throw new Error('Patient ID required (SHARP or explicit input)');
    }

    // Require FHIR context for Consent query
    this.requireFhirContext(sharp);

    // Create FHIR client if not already created
    if (!this.fhirClient) {
      this.fhirClient = new FHIRClient({
        fhirBaseUrl: sharp.fhir_base_url!,
        bearerToken: sharp.fhir_token!,
      });
    }

    // Query for patient consents
    let consents: FHIRConsent[];
    try {
      consents = await this.fhirClient.getPatientConsents(patientId);
    } catch (err) {
      throw new Error(
        `Failed to query patient consents: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Evaluate consents
    return this.evaluateConsents(
      consents,
      patientId,
      input.data_category,
      input.proposed_action
    );
  }

  private evaluateConsents(
    consents: FHIRConsent[],
    patientId: string,
    dataCategory: string,
    proposedAction: string
  ): z.infer<typeof PatientConsentOutputSchema> {
    // Filter active consents
    const activeConsents = consents.filter(c => c.status === 'active');
    const expiredConsents = consents.filter(c => c.status === 'entered-in-error' || c.status === 'refused');

    // If explicit refusal, return denied
    if (expiredConsents.some(c => c.status === 'refused')) {
      return {
        consent_status: 'DENIED' as ConsentStatus,
        consent_fhir_resource: expiredConsents[0] as unknown as Record<string, unknown>,
        expiry_date: expiredConsents[0]?.dateTime,
        conditions: ['Patient has explicitly refused consent'],
        action_recommended: 'Cannot proceed without patient authorization',
      };
    }

    // Check for active permits
    const permits = activeConsents.filter(
      c => c.provision?.type === 'permit'
    );

    if (permits.length === 0) {
      // Check for expired active consents
      const expiredActive = activeConsents.filter(c => {
        const endDate = c.provision?.period?.end;
        if (endDate) {
          return new Date(endDate) < new Date();
        }
        return false;
      });

      if (expiredActive.length > 0) {
        return {
          consent_status: 'EXPIRED' as ConsentStatus,
          consent_fhir_resource: expiredActive[0] as unknown as Record<string, unknown>,
          expiry_date: expiredActive[0].provision?.period?.end,
          conditions: ['Existing consent has expired'],
          action_recommended:
            'Request patient to provide updated consent before proceeding',
        };
      }

      // No consent found
      return {
        consent_status: 'ABSENT' as ConsentStatus,
        conditions: ['No consent on file'],
        action_recommended:
          'Obtain explicit patient consent before proceeding with data access',
      };
    }

    // Evaluate first active permit
    const activePermit = permits[0];
    const endDate = activePermit.provision?.period?.end;
    const isExpired = endDate ? new Date(endDate) < new Date() : false;

    if (isExpired) {
      return {
        consent_status: 'EXPIRED' as ConsentStatus,
        consent_fhir_resource: activePermit as unknown as Record<string, unknown>,
        expiry_date: endDate,
        conditions: ['Consent has expired'],
        action_recommended:
          'Request patient to renew consent before proceeding',
      };
    }

    // Consent is active and valid
    const conditions: string[] = [];

    // Extract conditions from provision
    if (activePermit.provision?.period?.start) {
      conditions.push(
        `Valid from: ${new Date(activePermit.provision.period.start).toLocaleDateString()}`
      );
    }

    if (endDate) {
      conditions.push(
        `Expires: ${new Date(endDate).toLocaleDateString()}`
      );
    }

    if (activePermit.provision?.purpose) {
      conditions.push(
        `Permitted purposes: ${activePermit.provision.purpose.map(p => p.code).join(', ')}`
      );
    }

    if (activePermit.provision?.class) {
      conditions.push(
        `Permitted data classes: ${activePermit.provision.class.map(c => c.code).join(', ')}`
      );
    }

    return {
      consent_status: 'ACTIVE' as ConsentStatus,
      consent_fhir_resource: activePermit as unknown as Record<string, unknown>,
      expiry_date: endDate,
      conditions: conditions.length > 0 ? conditions : undefined,
      action_recommended: 'Proceed with data access — valid consent on file',
    };
  }
}

export function createPatientConsentTool(
  fhirClient?: FHIRClient
): PatientConsentTool {
  return new PatientConsentTool(fhirClient);
}
