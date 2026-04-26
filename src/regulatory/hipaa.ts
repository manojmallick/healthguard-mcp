// HIPAA Privacy Rule — Minimum Necessary Standard
// 45 CFR §164.502(b) — Uses and Disclosures of PHI
// 45 CFR §164.514 — De-identification Standards

export interface PHIElement {
  name: string;
  category: string;
  sensitivity_level: 'low' | 'medium' | 'high' | 'critical';
  requires_minimum_necessary_assessment: boolean;
}

export interface MinimumNecessaryRule {
  purpose: string;
  description: string;
  approved_elements: string[];
  flagged_elements: string[];
  rationale: string;
}

// Comprehensive PHI element catalog
export const PHI_ELEMENTS: Record<string, PHIElement> = {
  // Demographics
  name: {
    name: 'Patient name',
    category: 'demographics',
    sensitivity_level: 'medium',
    requires_minimum_necessary_assessment: true,
  },
  dob: {
    name: 'Date of birth',
    category: 'demographics',
    sensitivity_level: 'medium',
    requires_minimum_necessary_assessment: true,
  },
  mrn: {
    name: 'Medical record number',
    category: 'demographics',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  ssn: {
    name: 'Social security number',
    category: 'demographics',
    sensitivity_level: 'critical',
    requires_minimum_necessary_assessment: true,
  },
  phone: {
    name: 'Phone number',
    category: 'demographics',
    sensitivity_level: 'medium',
    requires_minimum_necessary_assessment: true,
  },
  address: {
    name: 'Street address',
    category: 'demographics',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },

  // Clinical
  diagnoses: {
    name: 'Diagnoses/problem list',
    category: 'clinical',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  procedures: {
    name: 'Procedures/surgical history',
    category: 'clinical',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  allergies: {
    name: 'Allergies',
    category: 'clinical',
    sensitivity_level: 'medium',
    requires_minimum_necessary_assessment: true,
  },
  medications: {
    name: 'Medications/prescriptions',
    category: 'clinical',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  vitals: {
    name: 'Vital signs',
    category: 'clinical',
    sensitivity_level: 'low',
    requires_minimum_necessary_assessment: true,
  },

  // Labs & Results
  lab_results: {
    name: 'Laboratory test results',
    category: 'labs',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  lab_full_history: {
    name: 'Full laboratory history (years)',
    category: 'labs',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  imaging: {
    name: 'Imaging studies/radiology',
    category: 'imaging',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  pathology: {
    name: 'Pathology/biopsy results',
    category: 'imaging',
    sensitivity_level: 'critical',
    requires_minimum_necessary_assessment: true,
  },

  // Genetic & Sensitive
  genetic_data: {
    name: 'Genetic testing results',
    category: 'genetic',
    sensitivity_level: 'critical',
    requires_minimum_necessary_assessment: true,
  },
  hiv_status: {
    name: 'HIV status',
    category: 'sensitive',
    sensitivity_level: 'critical',
    requires_minimum_necessary_assessment: true,
  },
  mental_health: {
    name: 'Mental health/psychiatric records',
    category: 'sensitive',
    sensitivity_level: 'critical',
    requires_minimum_necessary_assessment: true,
  },
  substance_use: {
    name: 'Substance use/addiction treatment',
    category: 'sensitive',
    sensitivity_level: 'critical',
    requires_minimum_necessary_assessment: true,
  },

  // Notes
  clinical_notes: {
    name: 'Clinical notes',
    category: 'notes',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },
  assessment_plan: {
    name: 'Assessment and plan',
    category: 'notes',
    sensitivity_level: 'high',
    requires_minimum_necessary_assessment: true,
  },

  // Administrative
  insurance_info: {
    name: 'Insurance information',
    category: 'administrative',
    sensitivity_level: 'medium',
    requires_minimum_necessary_assessment: true,
  },
  employment: {
    name: 'Employment information',
    category: 'administrative',
    sensitivity_level: 'medium',
    requires_minimum_necessary_assessment: true,
  },
};

// Purpose-specific minimum necessary rules
export const MINIMUM_NECESSARY_RULES: Record<string, MinimumNecessaryRule> = {
  TREATMENT: {
    purpose: 'Direct patient care and treatment',
    description:
      'Disclosure for treatment purposes between providers — minimum necessary standard applies',
    approved_elements: [
      'name',
      'dob',
      'mrn',
      'diagnoses',
      'medications',
      'allergies',
      'lab_results',
      'imaging',
      'clinical_notes',
      'assessment_plan',
      'vitals',
      'procedures',
    ],
    flagged_elements: [
      'ssn',
      'full_lab_history',
      'employment',
      'insurance_info',
      'complete_demographics',
    ],
    rationale:
      'Treatment sharing requires clinical data but not financial/employment information. ' +
      'SSN not necessary for clinical care. Full history may exceed necessity (recent results sufficient).',
  },

  REFERRAL: {
    purpose: 'Specialist referral for specific clinical question',
    description:
      'Sharing records with outside specialist — must limit to condition and relevant history',
    approved_elements: [
      'name',
      'dob',
      'diagnoses',
      'medications',
      'allergies',
      'relevant_lab_results',
      'relevant_imaging',
      'clinical_notes',
      'vitals',
    ],
    flagged_elements: [
      'full_lab_history',
      'unrelated_diagnoses',
      'mental_health',
      'genetic_data',
      'ssn',
      'address',
      'phone',
      'employment',
    ],
    rationale:
      'Specialist referral should include only data relevant to the referral question. ' +
      'Unrelated diagnoses, mental health, genetic data exceed minimum necessary. ' +
      'Contact info available through provider network.',
  },

  PAYMENT: {
    purpose: 'Health plan claim adjudication',
    description:
      'Disclosure to health plan for payment — limited to billing-relevant data',
    approved_elements: [
      'name',
      'dob',
      'mrn',
      'diagnoses',
      'procedures',
      'medications',
      'lab_results',
      'imaging',
      'insurance_info',
    ],
    flagged_elements: [
      'full_clinical_notes',
      'mental_health',
      'substance_use',
      'genetic_data',
      'hiv_status',
      'address',
      'phone',
      'employment',
      'ssn',
    ],
    rationale:
      'Payment claims require clinical/procedural data for adjudication but NOT detailed notes, ' +
      'sensitive diagnoses beyond what codes capture, or PII beyond what insurance already has. ' +
      'Address/phone/SSN collected separately in enrollment.',
  },

  RESEARCH: {
    purpose: 'Clinical research with IRB approval',
    description:
      'Disclosure for approved research protocol — limited to study-approved data elements',
    approved_elements: ['diagnoses', 'lab_results', 'outcomes', 'demographics'],
    flagged_elements: [
      'name',
      'address',
      'phone',
      'dob',
      'ssn',
      'mrn',
      'insurance_info',
      'employment',
      'clinical_notes',
      'sensitive_diagnoses',
    ],
    rationale:
      'Research should receive de-identified data per IRB protocol. ' +
      'Direct identifiers (name, SSN, address) require specific justification. ' +
      'Include only data elements specified in approved protocol.',
  },

  QUALITY_IMPROVEMENT: {
    purpose: 'Internal quality improvement, care coordination, case management',
    description:
      'Healthcare operations within same covered entity — focus on clinical outcomes',
    approved_elements: [
      'diagnoses',
      'procedures',
      'medications',
      'lab_results',
      'imaging',
      'outcomes',
      'clinical_notes',
      'vitals',
    ],
    flagged_elements: [
      'ssn',
      'address',
      'phone',
      'employment',
      'unrelated_clinical_data',
    ],
    rationale:
      'Internal quality improvement needs clinical outcomes but not demographic/financial PII. ' +
      'Patient identifier (MRN) sufficient; SSN not needed.',
  },

  PATIENT_REQUEST: {
    purpose: 'Patient request for their own records (patient access right)',
    description:
      'Disclosure to patient — must include all requested records (full medical record)',
    approved_elements: [
      'name',
      'dob',
      'mrn',
      'diagnoses',
      'medications',
      'allergies',
      'lab_results',
      'imaging',
      'clinical_notes',
      'assessment_plan',
      'procedures',
      'genetic_data',
      'mental_health',
      'substance_use',
    ],
    flagged_elements: [],
    rationale:
      'Patient right to access includes ALL information in the medical record. ' +
      'Minimum necessary does NOT apply to patient requests (HIPAA §164.524). ' +
      'Only redact information about other individuals or safety/security risks.',
  },

  GOVERNMENT_BENEFIT: {
    purpose: 'Social Security/Medicare disability determination',
    description: 'Disclosure to government agency for benefit determination',
    approved_elements: [
      'diagnoses',
      'procedures',
      'medications',
      'lab_results',
      'clinical_notes',
      'functional_limitations',
      'name',
      'dob',
      'ssn',
    ],
    flagged_elements: [
      'insurance_info',
      'employment',
      'unrelated_clinical_data',
      'address',
      'phone',
    ],
    rationale:
      'Benefit determinations require sufficient clinical detail to support disability claim. ' +
      'SSN needed by SSA but not address/employment (already on file). ' +
      'Include only records supporting the benefit request.',
  },
};

export function getMinimumNecessaryRule(
  purpose: string
): MinimumNecessaryRule | undefined {
  return MINIMUM_NECESSARY_RULES[purpose];
}

export function getPHIElement(elementId: string): PHIElement | undefined {
  return PHI_ELEMENTS[elementId];
}

export function getAllPHIElements(): PHIElement[] {
  return Object.values(PHI_ELEMENTS);
}

export function validatePHIElements(elementIds: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  elementIds.forEach(id => {
    if (PHI_ELEMENTS[id]) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  });

  return { valid, invalid };
}
