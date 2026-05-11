import { z } from 'zod';
import { GeminiLLMClient } from '../llm/client';
import {
  InformationBlockingOutputSchema,
  InformationBlockingException,
} from '../llm/schemas';

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
const CheckInformationBlockingInput = z.object({
  requested_data_type: z.enum([
    'medications',
    'lab_results',
    'imaging',
    'clinical_notes',
    'problem_list',
    'allergies',
    'vital_signs',
    'full_record',
  ]),
  requester_role: z.enum([
    'treating_physician',
    'specialist',
    'hospital_admin',
    'patient',
    'patient_advocate',
    'insurer',
    'employer',
    'researcher',
  ]),
  care_relationship: z.enum(['treatment', 'referral', 'payment', 'none']),
  urgency: z.enum(['routine', 'urgent', 'emergent']),
  // SHARP context fields (prefixed with _sharp_)
  _sharp_patient_id: z.string().optional(),
  _sharp_fhir_base_url: z.string().optional(),
  _sharp_fhir_token: z.string().optional(),
  _sharp_encounter_id: z.string().optional(),
  _sharp_practitioner_id: z.string().optional(),
  _sharp_organization_id: z.string().optional(),
});

export type CheckInformationBlockingInput = z.infer<
  typeof CheckInformationBlockingInput
>;

export class InformationBlockingTool {
  private llmClient: GeminiLLMClient;

  constructor(llmClient: GeminiLLMClient) {
    this.llmClient = llmClient;
  }


  async check(
    rawInput: Record<string, unknown>
  ): Promise<z.infer<typeof InformationBlockingOutputSchema>> {
    // Validate input
    const input = CheckInformationBlockingInput.parse(rawInput);

    // Check for HIPAA Treatment/Payment/Operations purposes (these are always permitted)
    if (
      (input.requester_role === 'treating_physician' || input.requester_role === 'specialist') &&
      (input.care_relationship === 'treatment' || input.care_relationship === 'referral')
    ) {
      return {
        permitted: true,
        applicable_exception: 'TREATMENT' as const,
        exception_subsection: '45 CFR §164.501-502 (HIPAA Treatment Exception)',
        conditions_met: [
          'Requester is a treating or referring provider',
          'Purpose of use is treatment or referral',
          'Treatment or referral relationship exists',
        ],
        conditions_not_met: [],
        recommended_action: 'Access permitted under HIPAA treatment exception',
        confidence: 1.0,
        audit_trail_required: true,
      };
    }

    // Similar check for payment purposes
    if (input.care_relationship === 'payment' && (input.requester_role === 'insurer' || input.requester_role === 'employer')) {
      return {
        permitted: true,
        applicable_exception: 'PAYMENT' as const,
        exception_subsection: '45 CFR §164.502 (HIPAA Payment Exception)',
        conditions_met: [
          'Requester has payment relationship with patient',
          'Purpose of use is payment processing',
        ],
        conditions_not_met: [],
        recommended_action: 'Access permitted under HIPAA payment exception',
        confidence: 0.95,
        audit_trail_required: true,
      };
    }

    // Emergency override: urgent or emergent access bypasses normal restrictions
    if (input.urgency === 'emergent' || input.urgency === 'urgent') {
      return {
        permitted: true,
        applicable_exception: 'HIPAA_PERMISSION' as const,
        exception_subsection: '45 CFR §164.510(b) (Emergency Access Override)',
        conditions_met: [
          'Request has urgent or emergent medical priority',
          'Immediate access needed for patient care',
          'Access permitted for emergency circumstances',
        ],
        conditions_not_met: [],
        recommended_action: 'Access permitted due to medical urgency',
        confidence: 0.95,
        audit_trail_required: true,
      };
    }

    // Invoke LLM with retry logic (if not a simple HIPAA treatment/payment case)
    const response = await this.llmClient.invokeToolWithRetry({
      toolName: 'check_information_blocking',
      input: {
        data_type: input.requested_data_type,
        requester_role: input.requester_role,
        care_relationship: input.care_relationship,
        urgency: input.urgency,
      },
      schema: InformationBlockingOutputSchema,
    });

    if (!response.success) {
      throw new Error(
        `Information blocking check failed: ${response.error}`
      );
    }

    // Cast and validate the result
    const result = response.result as z.infer<
      typeof InformationBlockingOutputSchema
    >;

    console.log(JSON.stringify({
      severity: 'DEBUG',
      message: 'InformationBlockingTool result',
      input: { requester_role: input.requester_role, care_relationship: input.care_relationship },
      llmResult: result,
    }));

    // Verify exception name is valid (must match InformationBlockingException enum in schemas.ts)
    const validExceptionNames = [
      'TREATMENT',
      'PAYMENT',
      'HEALTHCARE_OPERATIONS',
      'HIPAA_PERMISSION',
      'VITALLY_IMPORTANT',
      'INFEASIBLE',
      'SECURITY',
      'PRIVACY',
      'NONE',
    ];

    if (!validExceptionNames.includes(result.applicable_exception)) {
      return {
        permitted: false,
        applicable_exception: 'NONE' as InformationBlockingException,
        exception_subsection: 'No applicable exception found',
        conditions_met: [],
        conditions_not_met: [
          'Unable to determine valid exception for this scenario',
        ],
        recommended_action:
          'Request authorization from patient or legal counsel',
        confidence: 0.0,
        audit_trail_required: true,
      };
    }

    return result;
  }

}

export function createInformationBlockingTool(
  llmClient: GeminiLLMClient
): InformationBlockingTool {
  return new InformationBlockingTool(llmClient);
}
