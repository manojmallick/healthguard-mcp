import { z } from 'zod';
import { RegulationsOutputSchema } from '../llm/schemas';
import { getRegulationsByCareContext, getAllRegulations } from '../regulatory/regulations';

// Tool input schema
const GetApplicableRegulationsInput = z.object({
  care_setting: z.enum([
    'hospital',
    'ambulatory',
    'urgent_care',
    'telehealth',
    'home_health',
    'nursing_home',
    'mental_health',
    'research',
  ]),
  data_type: z.enum([
    'medications',
    'lab_results',
    'imaging',
    'genetic_data',
    'hiv_status',
    'mental_health',
    'substance_use',
    'full_record',
    'de-identified',
  ]),
  proposed_action: z.enum([
    'read',
    'share',
    'research',
    'payment',
    'quality_improvement',
    'treatment',
    'disclosure',
    'transmit',
    'export',
    'marketing',
  ]),
  state: z.string().optional(),
  // SHARP context (optional)
  _sharp_patient_id: z.string().optional(),
  _sharp_fhir_base_url: z.string().optional(),
  _sharp_fhir_token: z.string().optional(),
});

export type GetApplicableRegulationsInput = z.infer<
  typeof GetApplicableRegulationsInput
>;

export class RegulationLookupTool {
  async getApplicableRegulations(
    rawInput: Record<string, unknown>
  ): Promise<z.infer<typeof RegulationsOutputSchema>> {
    // Validate input
    const input = GetApplicableRegulationsInput.parse(rawInput);

    // Get regulations based on care context
    const result = getRegulationsByCareContext(
      input.care_setting,
      input.data_type,
      input.proposed_action,
      input.state
    );

    // Format output
    return {
      regulations: result.regulations.map(reg => ({
        name: reg.name,
        citation: reg.citation,
        requirement: reg.requirement,
        enforcement_risk: reg.enforcementRisk,
        penalty_range: `${reg.penaltyRange.min}–${reg.penaltyRange.max} ${reg.penaltyRange.unit}`,
        recent_changes: reg.recentChanges || 'No recent changes',
      })),
      compliance_checklist: result.complianceChecklist,
      summary: result.summary,
    };
  }
}

export function createRegulationLookupTool(): RegulationLookupTool {
  return new RegulationLookupTool();
}
