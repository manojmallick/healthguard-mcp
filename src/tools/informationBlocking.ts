import { z } from 'zod';
import { GeminiLLMClient } from '../llm/client';
import {
  InformationBlockingOutputSchema,
  InformationBlockingException,
} from '../llm/schemas';
import { getAllExceptions } from '../regulatory/exceptions';

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

  async check(
    rawInput: Record<string, unknown>
  ): Promise<z.infer<typeof InformationBlockingOutputSchema>> {
    // Validate input
    const input = CheckInformationBlockingInput.parse(rawInput);

    // Extract SHARP context
    const sharp = this.extractSHARPContext(rawInput);

    // Build regulatory context from exceptions
    const exceptionsList = getAllExceptions();
    const exceptionsContext = exceptionsList
      .map(
        e =>
          `${e.name} (${e.cfr_section}): ${e.description}\n` +
          `Conditions: ${e.conditions.join('; ')}`
      )
      .join('\n\n');

    // Build prompt for LLM to determine applicable exception
    const prompt = this.buildExceptionCheckPrompt(
      input,
      sharp,
      exceptionsContext
    );

    // Invoke LLM with retry logic
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

    // Verify exception name is valid (prevent hallucination)
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

  private buildExceptionCheckPrompt(
    input: CheckInformationBlockingInput,
    sharp: SHARPContext,
    exceptionsContext: string
  ): string {
    const sharpInfo = sharp.patient_id
      ? `\nSHARP Context: Patient ${sharp.patient_id} in encounter ${sharp.encounter_id || 'unknown'}`
      : '';

    return `You are a US healthcare compliance expert specializing in ONC information blocking rules (45 CFR §171.300–309).

SCENARIO:
Data requested: ${input.requested_data_type}
Requester role: ${input.requester_role}
Care relationship: ${input.care_relationship}
Urgency: ${input.urgency}${sharpInfo}

AVAILABLE EXCEPTIONS (select ONE):
${exceptionsContext}

TASK:
1. Determine which exception (if any) applies to this scenario
2. List conditions MET for the selected exception
3. List conditions NOT MET
4. Cite the exact 45 CFR §171.xxx subsection
5. Rate your confidence (0.0–1.0)

CRITICAL RULES:
- You MUST select from: TREATMENT, PAYMENT, HEALTHCARE_OPERATIONS, HIPAA_PERMISSION, VITALLY_IMPORTANT, INFEASIBLE, SECURITY, PRIVACY, or NONE
- If no clear exception applies, return NONE
- Always cite the exact CFR section (e.g., "45 CFR §171.302(a)")
- Never invent exceptions or citations
- Favor permitting access when exception conditions are substantially met

Respond with ONLY valid JSON matching this schema:
{
  "permitted": boolean,
  "applicable_exception": "EXCEPTION_NAME",
  "exception_subsection": "45 CFR §171.xxx",
  "conditions_met": ["condition1", "condition2"],
  "conditions_not_met": ["condition3"],
  "recommended_action": "string",
  "confidence": 0.0-1.0,
  "audit_trail_required": boolean
}`;
  }
}

export function createInformationBlockingTool(
  llmClient: GeminiLLMClient
): InformationBlockingTool {
  return new InformationBlockingTool(llmClient);
}
