import { z } from 'zod';
import { GeminiLLMClient } from '../llm/client';
import { HIPAAMinimumNecessaryOutputSchema } from '../llm/schemas';
import {
  getMinimumNecessaryRule,
  validatePHIElements,
  getPHIElement,
  PHI_ELEMENTS,
} from '../regulatory/hipaa';

// Tool input schema
const AssessHIPAAMinimumNecessaryInput = z.object({
  phi_elements_requested: z.array(z.string()).min(1),
  stated_purpose: z.enum([
    'TREATMENT',
    'REFERRAL',
    'PAYMENT',
    'RESEARCH',
    'QUALITY_IMPROVEMENT',
    'PATIENT_REQUEST',
    'GOVERNMENT_BENEFIT',
  ]),
  requester_role: z.string(),
  care_context: z.string(),
  // SHARP context fields
  _sharp_patient_id: z.string().optional(),
  _sharp_fhir_base_url: z.string().optional(),
  _sharp_fhir_token: z.string().optional(),
});

export type AssessHIPAAMinimumNecessaryInput = z.infer<
  typeof AssessHIPAAMinimumNecessaryInput
>;

export class MinimumNecessaryTool {
  private llmClient: GeminiLLMClient;

  constructor(llmClient: GeminiLLMClient) {
    this.llmClient = llmClient;
  }

  async assess(
    rawInput: Record<string, unknown>
  ): Promise<z.infer<typeof HIPAAMinimumNecessaryOutputSchema>> {
    // Validate input
    const input = AssessHIPAAMinimumNecessaryInput.parse(rawInput);

    // Validate PHI elements exist
    const { valid: validElements, invalid: invalidElements } =
      validatePHIElements(input.phi_elements_requested);

    if (invalidElements.length > 0) {
      throw new Error(
        `Invalid PHI elements: ${invalidElements.join(', ')}. ` +
          `Valid elements: ${Object.keys(PHI_ELEMENTS).join(', ')}`
      );
    }

    // Get minimum necessary rule for stated purpose
    const rule = getMinimumNecessaryRule(input.stated_purpose);
    if (!rule) {
      throw new Error(`Unknown purpose: ${input.stated_purpose}`);
    }

    // Build assessment prompt
    const prompt = this.buildAssessmentPrompt(input, rule, validElements);

    // Invoke LLM with retry
    const response = await this.llmClient.invokeToolWithRetry({
      toolName: 'assess_hipaa_minimum_necessary',
      input: {
        elements: validElements,
        purpose: input.stated_purpose,
        context: input.care_context,
      },
      schema: HIPAAMinimumNecessaryOutputSchema,
    });

    if (!response.success) {
      throw new Error(`Minimum necessary assessment failed: ${response.error}`);
    }

    const result = response.result as z.infer<
      typeof HIPAAMinimumNecessaryOutputSchema
    >;

    // Validate assessment results
    return this.validateAssessmentResult(result, input, rule);
  }

  private buildAssessmentPrompt(
    input: AssessHIPAAMinimumNecessaryInput,
    rule: any,
    validElements: string[]
  ): string {
    const elementDescriptions = validElements
      .map(id => {
        const elem = getPHIElement(id);
        return `${id}: ${elem?.name} (${elem?.sensitivity_level})`;
      })
      .join('\n');

    return `You are a HIPAA Privacy Rule expert specializing in 45 CFR §164.502(b) minimum necessary standard.

SCENARIO:
Purpose: ${input.stated_purpose}
Care context: ${input.care_context}
Requester role: ${input.requester_role}

REQUESTED PHI ELEMENTS:
${elementDescriptions}

HIPAA MINIMUM NECESSARY STANDARD:
Purpose rule: ${rule.description}

Approved elements for this purpose:
${rule.approved_elements.join('\n')}

Typically flagged elements for this purpose:
${rule.flagged_elements.join('\n')}

Rationale: ${rule.rationale}

TASK:
1. Determine which requested elements are necessary for the stated purpose
2. Separate into APPROVED and FLAGGED
3. Provide HIPAA regulatory citation (45 CFR §164.502(b))
4. Explain rationale for each flagged element

CRITICAL RULES:
- "Minimum necessary" means limiting to what is reasonably necessary for the stated purpose
- For PATIENT_REQUEST, all elements are approved (patient has right to all their records)
- Consider sensitivity: genetic data, mental health, HIV status, substance use require strong justification
- Do NOT approve full historical data if recent/summary data is sufficient
- Requester relationship and care context matter (specialist referral ≠ insurer request)

Respond with ONLY valid JSON matching this schema:
{
  "assessment": "APPROVED|FLAGGED|DENIED",
  "approved_elements": ["element1", "element2"],
  "flagged_elements": ["element3", "element4"],
  "rationale": "explanation of assessment",
  "regulatory_citation": "45 CFR §164.502(b)"
}`;
  }

  private validateAssessmentResult(
    result: z.infer<typeof HIPAAMinimumNecessaryOutputSchema>,
    input: AssessHIPAAMinimumNecessaryInput,
    rule: any
  ): z.infer<typeof HIPAAMinimumNecessaryOutputSchema> {
    // For PATIENT_REQUEST, all elements should be approved
    if (input.stated_purpose === 'PATIENT_REQUEST') {
      return {
        assessment: 'APPROVED',
        approved_elements: input.phi_elements_requested,
        flagged_elements: [],
        rationale:
          'Patient right to access all medical records (HIPAA §164.524). ' +
          'Minimum necessary does not apply.',
        regulatory_citation: '45 CFR §164.502(b), §164.524',
      };
    }

    // Validate citation is HIPAA-related
    if (!result.regulatory_citation.includes('164.502')) {
      result.regulatory_citation = '45 CFR §164.502(b)';
    }

    // Ensure all elements are accounted for
    const accounted = new Set([
      ...result.approved_elements,
      ...result.flagged_elements,
    ]);
    const missing = input.phi_elements_requested.filter(e => !accounted.has(e));

    if (missing.length > 0) {
      result.flagged_elements.push(...missing);
    }

    return result;
  }
}

export function createMinimumNecessaryTool(
  llmClient: GeminiLLMClient
): MinimumNecessaryTool {
  return new MinimumNecessaryTool(llmClient);
}
