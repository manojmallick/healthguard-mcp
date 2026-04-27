import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MinimumNecessaryTool } from '../../src/tools/minimumNecessary';
import { GeminiLLMClient } from '../../src/llm/client';
import { HIPAAMinimumNecessaryOutputSchema } from '../../src/llm/schemas';

describe('MinimumNecessaryTool', () => {
  let tool: MinimumNecessaryTool;
  let llmClient: GeminiLLMClient;

  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
    llmClient = new GeminiLLMClient({ apiKey: 'test-api-key' });
    tool = new MinimumNecessaryTool(llmClient);
  });

  describe('Treatment Purpose', () => {
    it('should approve clinical data for treatment', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'APPROVED',
          approved_elements: ['name', 'dob', 'diagnoses', 'medications'],
          flagged_elements: [],
          rationale: 'Clinical data necessary for direct patient care',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'name',
          'dob',
          'diagnoses',
          'medications',
        ],
        stated_purpose: 'TREATMENT',
        requester_role: 'treating_physician',
        care_context: 'ongoing care',
      });

      expect(result.assessment).toBe('APPROVED');
      expect(result.approved_elements).toContain('diagnoses');
      expect(result.flagged_elements).not.toContain('medications');
    });

    it('should flag full lab history for treatment', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'FLAGGED',
          approved_elements: ['lab_results'],
          flagged_elements: ['lab_full_history'],
          rationale:
            'Recent lab results sufficient for treatment; full historical series exceeds minimum necessary',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: ['lab_results', 'lab_full_history'],
        stated_purpose: 'TREATMENT',
        requester_role: 'treating_physician',
        care_context: 'routine follow-up',
      });

      expect(result.flagged_elements).toContain('lab_full_history');
      expect(result.approved_elements).toContain('lab_results');
    });
  });

  describe('Referral Purpose', () => {
    it('should approve only relevant clinical data for specialist referral', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'FLAGGED',
          approved_elements: [
            'name',
            'dob',
            'diagnoses',
            'medications',
            'allergies',
          ],
          flagged_elements: ['lab_full_history', 'mental_health'],
          rationale:
            'Specialist referral: cardiac diagnosis relevant; mental health unrelated; full history not necessary',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'name',
          'dob',
          'diagnoses',
          'medications',
          'allergies',
          'lab_full_history',
          'mental_health',
        ],
        stated_purpose: 'REFERRAL',
        requester_role: 'specialist',
        care_context: 'cardiology referral for chest pain',
      });

      expect(result.flagged_elements).toContain('mental_health');
      expect(result.flagged_elements).toContain('lab_full_history');
      expect(result.approved_elements).toContain('diagnoses');
    });

    it('should flag unrelated diagnoses in referral', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'FLAGGED',
          approved_elements: ['diagnoses'],
          flagged_elements: ['mental_health', 'substance_use'],
          rationale: 'Psychiatric and substance use diagnoses unrelated to orthopedic surgery referral',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'diagnoses',
          'mental_health',
          'substance_use',
        ],
        stated_purpose: 'REFERRAL',
        requester_role: 'specialist',
        care_context: 'orthopedic surgery referral',
      });

      expect(result.flagged_elements).toContain('mental_health');
      expect(result.flagged_elements).toContain('substance_use');
    });
  });

  describe('Payment Purpose', () => {
    it('should flag sensitive diagnoses for payment', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'FLAGGED',
          approved_elements: ['diagnoses', 'procedures', 'medications'],
          flagged_elements: ['mental_health', 'hiv_status', 'substance_use'],
          rationale:
            'Payment adjudication needs clinical data but not sensitive diagnoses that could prejudice coverage',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'diagnoses',
          'procedures',
          'medications',
          'mental_health',
          'hiv_status',
          'substance_use',
        ],
        stated_purpose: 'PAYMENT',
        requester_role: 'insurer',
        care_context: 'claim adjudication',
      });

      expect(result.flagged_elements).toContain('hiv_status');
      expect(result.flagged_elements).toContain('mental_health');
      expect(result.approved_elements).toContain('diagnoses');
    });

    it('should flag PII for payment claims', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'FLAGGED',
          approved_elements: ['name', 'dob', 'mrn'],
          flagged_elements: ['ssn', 'address', 'phone'],
          rationale:
            'Insurer already has SSN, address, phone from enrollment; not necessary for claim adjudication',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'name',
          'dob',
          'mrn',
          'ssn',
          'address',
          'phone',
        ],
        stated_purpose: 'PAYMENT',
        requester_role: 'insurer',
        care_context: 'claim submission',
      });

      expect(result.flagged_elements).toContain('ssn');
      expect(result.flagged_elements).toContain('address');
    });
  });

  describe('Patient Request', () => {
    it('should approve ALL elements for patient access request', async () => {
      const result = await tool.assess({
        phi_elements_requested: [
          'name',
          'dob',
          'diagnoses',
          'mental_health',
          'genetic_data',
          'substance_use',
        ],
        stated_purpose: 'PATIENT_REQUEST',
        requester_role: 'patient',
        care_context: 'patient exercise of right to access',
      });

      expect(result.assessment).toBe('APPROVED');
      expect(result.approved_elements).toEqual([
        'name',
        'dob',
        'diagnoses',
        'mental_health',
        'genetic_data',
        'substance_use',
      ]);
      expect(result.flagged_elements).toHaveLength(0);
      expect(result.regulatory_citation).toContain('164.524');
    });
  });

  describe('Research Purpose', () => {
    it('should flag direct identifiers for research', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'FLAGGED',
          approved_elements: ['diagnoses', 'lab_results'],
          flagged_elements: ['name', 'dob', 'ssn', 'mrn', 'address'],
          rationale:
            'Research with human subjects requires de-identification (HIPAA Safe Harbor). Direct identifiers must be removed unless waived by IRB.',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'diagnoses',
          'lab_results',
          'name',
          'dob',
          'ssn',
          'mrn',
          'address',
        ],
        stated_purpose: 'RESEARCH',
        requester_role: 'researcher',
        care_context: 'NIH-funded clinical trial',
      });

      expect(result.flagged_elements).toContain('name');
      expect(result.flagged_elements).toContain('ssn');
      expect(result.approved_elements).toContain('diagnoses');
    });
  });

  describe('Denied Access Scenario', () => {
    it('should flag critical sensitive data for inappropriate purpose', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'DENIED',
          approved_elements: [],
          flagged_elements: [
            'genetic_data',
            'hiv_status',
            'mental_health',
            'substance_use',
          ],
          rationale:
            'Employer occupational health requests cannot justify access to genetic data or sensitive diagnoses. Requires explicit patient authorization.',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'genetic_data',
          'hiv_status',
          'mental_health',
          'substance_use',
        ],
        stated_purpose: 'PAYMENT',
        requester_role: 'employer',
        care_context: 'workers compensation claim',
      });

      expect(result.assessment).toBe('DENIED');
      expect(result.flagged_elements).toContain('genetic_data');
      expect(result.approved_elements).toHaveLength(0);
    });
  });

  describe('Minimal Set Scenarios', () => {
    it('should approve minimal demographics for existing relationship', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'APPROVED',
          approved_elements: ['mrn', 'dob'],
          flagged_elements: [],
          rationale: 'Existing treatment relationship: MRN and DOB sufficient for patient identification',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: ['mrn', 'dob'],
        stated_purpose: 'TREATMENT',
        requester_role: 'treating_physician',
        care_context: 'continuity of care',
      });

      expect(result.assessment).toBe('APPROVED');
      expect(result.approved_elements.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Excess Elements', () => {
    it('should flag excessive data beyond minimum necessity', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'FLAGGED',
          approved_elements: ['name', 'dob', 'medications', 'allergies'],
          flagged_elements: [
            'lab_full_history',
            'clinical_notes',
            'genetic_data',
          ],
          rationale:
            'Request includes 10 years of historical lab data when 3-month summary sufficient. ' +
            'Full clinical notes and genetic data not necessary for prescription refill authorization.',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: [
          'name',
          'dob',
          'medications',
          'allergies',
          'lab_full_history',
          'clinical_notes',
          'genetic_data',
        ],
        stated_purpose: 'TREATMENT',
        requester_role: 'treating_physician',
        care_context: 'prescription refill authorization',
      });

      expect(result.flagged_elements.length).toBeGreaterThan(0);
      expect(result.assessment).toBe('FLAGGED');
    });
  });

  describe('All Data Types', () => {
    it('should handle medications data type correctly', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'APPROVED',
          approved_elements: ['medications', 'allergies'],
          flagged_elements: [],
          rationale: 'Medication and allergy data necessary for prescribing',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: ['medications', 'allergies'],
        stated_purpose: 'TREATMENT',
        requester_role: 'treating_physician',
        care_context: 'medication review',
      });

      expect(result.approved_elements).toContain('medications');
    });

    it('should handle lab data type correctly', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'APPROVED',
          approved_elements: ['lab_results'],
          flagged_elements: ['lab_full_history'],
          rationale: 'Recent results sufficient; full history exceeds necessity',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: ['lab_results', 'lab_full_history'],
        stated_purpose: 'TREATMENT',
        requester_role: 'treating_physician',
        care_context: 'clinical assessment',
      });

      expect(result.approved_elements).toContain('lab_results');
    });

    it('should handle imaging data type correctly', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'APPROVED',
          approved_elements: ['imaging'],
          flagged_elements: [],
          rationale: 'Imaging studies necessary for diagnosis',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: ['imaging'],
        stated_purpose: 'REFERRAL',
        requester_role: 'specialist',
        care_context: 'radiology consultation',
      });

      expect(result.approved_elements).toContain('imaging');
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid PHI elements', async () => {
      expect(
        tool.assess({
          phi_elements_requested: ['invalid_element'],
          stated_purpose: 'TREATMENT',
          requester_role: 'treating_physician',
          care_context: 'care',
        })
      ).rejects.toThrow('Invalid PHI elements');
    });

    it('should reject invalid purpose', async () => {
      expect(
        tool.assess({
          phi_elements_requested: ['medications'],
          stated_purpose: 'INVALID_PURPOSE' as never,
          requester_role: 'treating_physician',
          care_context: 'care',
        })
      ).rejects.toThrow();
    });

    it('should handle empty elements array', async () => {
      expect(
        tool.assess({
          phi_elements_requested: [],
          stated_purpose: 'TREATMENT',
          requester_role: 'treating_physician',
          care_context: 'care',
        })
      ).rejects.toThrow();
    });

    it('should handle LLM invocation failure', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: false,
        error: 'API timeout',
        retries: 3,
      });

      expect(
        tool.assess({
          phi_elements_requested: ['medications'],
          stated_purpose: 'TREATMENT',
          requester_role: 'treating_physician',
          care_context: 'care',
        })
      ).rejects.toThrow('Minimum necessary assessment failed');
    });
  });

  describe('SHARP Context', () => {
    it('should accept and preserve SHARP context fields', async () => {
      vi.spyOn(llmClient, 'invokeToolWithRetry').mockResolvedValue({
        success: true,
        result: {
          assessment: 'APPROVED',
          approved_elements: ['medications'],
          flagged_elements: [],
          rationale: 'SHARP context used for verification',
          regulatory_citation: '45 CFR §164.502(b)',
        },
        retries: 0,
      });

      const result = await tool.assess({
        phi_elements_requested: ['medications'],
        stated_purpose: 'TREATMENT',
        requester_role: 'treating_physician',
        care_context: 'care',
        _sharp_patient_id: 'patient-xyz',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'token-abc',
      });

      expect(result.assessment).toBe('APPROVED');
    });
  });
});
