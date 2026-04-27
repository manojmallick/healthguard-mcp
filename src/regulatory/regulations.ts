// HIPAA Privacy Rule, HIPAA Security Rule, 21st Century Cures Act
// Comprehensive regulatory reference with enforcement details

export interface Regulation {
  id: string;
  name: string;
  citation: string;
  ecfrLink: string;
  requirement: string;
  applicableTo: string[];
  enforcementRisk: 'low' | 'medium' | 'high' | 'critical';
  penaltyRange: {
    min: number;
    max: number;
    unit: string;
    perViolation: boolean;
  };
  recentChanges?: string;
  relatedRegulations?: string[];
}

export const REGULATIONS: Record<string, Regulation> = {
  // 21st Century Cures Act - Information Blocking
  IB_TREATMENT: {
    id: 'IB_TREATMENT',
    name: '21st Century Cures Act - Treatment Exception',
    citation: '45 CFR §171.302(a)',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-171.302',
    requirement:
      'Information may be blocked if it is used or disclosed for treatment purposes between providers with a treatment relationship.',
    applicableTo: ['hospitals', 'providers', 'EHR vendors'],
    enforcementRisk: 'high',
    penaltyRange: {
      min: 0,
      max: 1000000,
      unit: 'dollars per year',
      perViolation: false,
    },
    recentChanges: 'Enforced since April 5, 2021 (21st Century Cures Act final rule)',
    relatedRegulations: ['HIPAA_TREATMENT', 'HIPAA_MINIMUM_NECESSARY'],
  },

  IB_PAYMENT: {
    id: 'IB_PAYMENT',
    name: '21st Century Cures Act - Payment Exception',
    citation: '45 CFR §171.303(a)',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-171.303',
    requirement:
      'Information may be blocked if disclosure is for payment purposes as defined in HIPAA Privacy Rule.',
    applicableTo: ['hospitals', 'providers', 'health plans', 'billing entities'],
    enforcementRisk: 'high',
    penaltyRange: {
      min: 0,
      max: 1000000,
      unit: 'dollars per year',
      perViolation: false,
    },
    relatedRegulations: ['HIPAA_PAYMENT', 'IB_TREATMENT'],
  },

  IB_OPERATIONS: {
    id: 'IB_OPERATIONS',
    name: '21st Century Cures Act - Healthcare Operations Exception',
    citation: '45 CFR §171.304(a)',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-171.304',
    requirement:
      'Information may be blocked if disclosure is for healthcare operations as defined in HIPAA Privacy Rule, limited to within same covered entity or organized healthcare arrangement.',
    applicableTo: ['hospitals', 'health systems', 'providers'],
    enforcementRisk: 'high',
    penaltyRange: {
      min: 0,
      max: 1000000,
      unit: 'dollars per year',
      perViolation: false,
    },
    relatedRegulations: ['HIPAA_OPERATIONS'],
  },

  IB_HIPAA_PERMISSION: {
    id: 'IB_HIPAA_PERMISSION',
    name: '21st Century Cures Act - HIPAA Permission Exception',
    citation: '45 CFR §171.305(a)',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-171.305',
    requirement:
      'Information may be blocked if disclosure is authorized by HIPAA (patient authorization, court order, etc.).',
    applicableTo: ['hospitals', 'providers', 'EHR vendors', 'health plans'],
    enforcementRisk: 'medium',
    penaltyRange: {
      min: 0,
      max: 1000000,
      unit: 'dollars per year',
      perViolation: false,
    },
    relatedRegulations: ['HIPAA_AUTHORIZATION'],
  },

  IB_SECURITY: {
    id: 'IB_SECURITY',
    name: '21st Century Cures Act - Security Provision Exception',
    citation: '45 CFR §171.308(a)',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-171.308',
    requirement:
      'Information may be blocked if disclosure would create an unmitigated security risk that cannot be addressed by technical or operational safeguards.',
    applicableTo: ['hospitals', 'providers', 'EHR vendors'],
    enforcementRisk: 'medium',
    penaltyRange: {
      min: 0,
      max: 1000000,
      unit: 'dollars per year',
      perViolation: false,
    },
    relatedRegulations: ['HIPAA_SECURITY_RULE'],
  },

  // HIPAA Privacy Rule
  HIPAA_PRIVACY_RULE: {
    id: 'HIPAA_PRIVACY_RULE',
    name: 'HIPAA Privacy Rule - Protected Health Information',
    citation: '45 CFR §164.102',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/part-164/subpart-A',
    requirement:
      'Covered entities must establish policies and procedures to protect the privacy of protected health information.',
    applicableTo: ['covered entities', 'business associates', 'healthcare providers'],
    enforcementRisk: 'critical',
    penaltyRange: {
      min: 100,
      max: 50000,
      unit: 'dollars per violation',
      perViolation: true,
    },
    recentChanges: 'Enforced since April 14, 2003',
    relatedRegulations: ['HIPAA_MINIMUM_NECESSARY', 'HIPAA_AUTHORIZATION'],
  },

  HIPAA_MINIMUM_NECESSARY: {
    id: 'HIPAA_MINIMUM_NECESSARY',
    name: 'HIPAA Minimum Necessary Standard',
    citation: '45 CFR §164.502(b)',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-164.502',
    requirement:
      'When using or disclosing PHI, covered entities must limit the information to the minimum necessary to accomplish the stated purpose.',
    applicableTo: ['covered entities', 'business associates'],
    enforcementRisk: 'high',
    penaltyRange: {
      min: 100,
      max: 50000,
      unit: 'dollars per violation',
      perViolation: true,
    },
    relatedRegulations: ['HIPAA_PRIVACY_RULE', 'IB_TREATMENT', 'IB_PAYMENT'],
  },

  HIPAA_AUTHORIZATION: {
    id: 'HIPAA_AUTHORIZATION',
    name: 'HIPAA Authorization Requirements',
    citation: '45 CFR §164.508',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-164.508',
    requirement:
      'Patient authorization must be in writing, signed, include specific elements, and be kept for at least 6 years.',
    applicableTo: ['covered entities', 'healthcare providers'],
    enforcementRisk: 'high',
    penaltyRange: {
      min: 100,
      max: 50000,
      unit: 'dollars per violation',
      perViolation: true,
    },
    relatedRegulations: ['HIPAA_PRIVACY_RULE', 'IB_HIPAA_PERMISSION'],
  },

  // HIPAA Security Rule
  HIPAA_SECURITY_RULE: {
    id: 'HIPAA_SECURITY_RULE',
    name: 'HIPAA Security Rule - Technical & Administrative Safeguards',
    citation: '45 CFR §164.312',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/part-164/subpart-C',
    requirement:
      'Covered entities must implement administrative, physical, and technical safeguards to protect electronic protected health information.',
    applicableTo: ['covered entities', 'business associates'],
    enforcementRisk: 'critical',
    penaltyRange: {
      min: 100,
      max: 50000,
      unit: 'dollars per violation',
      perViolation: true,
    },
    relatedRegulations: ['HIPAA_PRIVACY_RULE', 'IB_SECURITY'],
  },

  HIPAA_BREACH_NOTIFICATION: {
    id: 'HIPAA_BREACH_NOTIFICATION',
    name: 'HIPAA Breach Notification Rule',
    citation: '45 CFR §164.400',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-164.400',
    requirement:
      'Covered entities must notify individuals of breaches of unsecured PHI without unreasonable delay (60 days max).',
    applicableTo: ['covered entities', 'healthcare providers'],
    enforcementRisk: 'critical',
    penaltyRange: {
      min: 100,
      max: 50000,
      unit: 'dollars per violation per individual',
      perViolation: true,
    },
    recentChanges: 'Enhanced enforcement since 2009 HITECH Act',
    relatedRegulations: ['HIPAA_SECURITY_RULE', 'HIPAA_PRIVACY_RULE'],
  },

  // HIPAA Business Associate Agreement
  HIPAA_BAA: {
    id: 'HIPAA_BAA',
    name: 'HIPAA Business Associate Agreement Requirements',
    citation: '45 CFR §164.502(e)',
    ecfrLink: 'https://www.ecfr.gov/current/title-45/section-164.502',
    requirement:
      'Covered entities must have a written Business Associate Agreement with any business associate that will handle PHI.',
    applicableTo: ['covered entities', 'healthcare providers'],
    enforcementRisk: 'high',
    penaltyRange: {
      min: 100,
      max: 50000,
      unit: 'dollars per violation',
      perViolation: true,
    },
    relatedRegulations: ['HIPAA_PRIVACY_RULE'],
  },

  // HITRUST CSF
  HITRUST_CSF: {
    id: 'HITRUST_CSF',
    name: 'HITRUST Common Security Framework',
    citation: 'HITRUST CSF v9.6.1',
    ecfrLink: 'https://hitrustalliance.net/',
    requirement:
      'Industry-recognized security framework that aligns with HIPAA, HITECH, NIST, and other healthcare standards.',
    applicableTo: ['covered entities', 'business associates', 'healthcare vendors'],
    enforcementRisk: 'medium',
    penaltyRange: {
      min: 0,
      max: 0,
      unit: 'regulatory penalty (enforcement via BAA)',
      perViolation: false,
    },
    recentChanges: 'Version 9.6.1 released 2024',
    relatedRegulations: ['HIPAA_SECURITY_RULE', 'HIPAA_PRIVACY_RULE'],
  },
};

export interface RegulatoryCitation {
  regulations: Regulation[];
  applicableContext: string;
  complianceChecklist: string[];
  summary: string;
}

export function getRegulationsByCareContext(
  careSetting: string,
  dataType: string,
  proposedAction: string,
  state?: string
): RegulatoryCitation {
  // For all healthcare settings and data types, HIPAA applies
  const applicableRegs: Regulation[] = [
    REGULATIONS.HIPAA_PRIVACY_RULE,
    REGULATIONS.HIPAA_MINIMUM_NECESSARY,
    REGULATIONS.HIPAA_SECURITY_RULE,
  ];

  // Information blocking applies to most scenarios
  if (!['de-identified', 'research'].includes(dataType)) {
    applicableRegs.push(
      REGULATIONS.IB_TREATMENT,
      REGULATIONS.IB_PAYMENT,
      REGULATIONS.IB_OPERATIONS
    );
  }

  // If authorization needed
  if (proposedAction === 'research' || proposedAction === 'marketing') {
    applicableRegs.push(REGULATIONS.HIPAA_AUTHORIZATION);
  }

  // Breach notification applies if data access/transmission
  if (['share', 'transmit', 'export'].includes(proposedAction)) {
    applicableRegs.push(REGULATIONS.HIPAA_BREACH_NOTIFICATION);
  }

  // BAA applies if external entity
  if (proposedAction === 'share' || proposedAction === 'disclosure') {
    applicableRegs.push(REGULATIONS.HIPAA_BAA);
  }

  // Generate compliance checklist
  const checklist = generateComplianceChecklist(
    applicableRegs,
    careSetting,
    dataType,
    proposedAction
  );

  return {
    regulations: applicableRegs,
    applicableContext: `${careSetting} setting, ${dataType} data, ${proposedAction} action`,
    complianceChecklist: checklist,
    summary: generateRegulatoryNarrative(applicableRegs, careSetting),
  };
}

function generateComplianceChecklist(
  regs: Regulation[],
  careSetting: string,
  dataType: string,
  proposedAction: string
): string[] {
  const checklist: string[] = [];

  // HIPAA baseline
  checklist.push('Confirm patient authorization or HIPAA exception applies');
  checklist.push('Verify minimum necessary standard is met');
  checklist.push('Confirm data is encrypted in transit (HIPAA Security Rule)');
  checklist.push('Verify Business Associate Agreement if third-party involved');

  // Information blocking specific
  if (
    regs.some(r => r.id.startsWith('IB_')) &&
    !['de-identified', 'research'].includes(dataType)
  ) {
    checklist.push('Document applicable ONC information blocking exception');
    checklist.push('Ensure access method meets API requirements (21st Century Cures Act)');
  }

  // Data type specific
  if (['genetic_data', 'hiv_status', 'mental_health', 'substance_use'].includes(dataType)) {
    checklist.push('Verify enhanced privacy protections for sensitive data');
    checklist.push('Confirm patient consent specifically authorizes this data category');
  }

  // Action specific
  if (proposedAction === 'research') {
    checklist.push('Verify IRB approval or de-identification (Safe Harbor or Expert Determination)');
    checklist.push('Confirm research authorization obtained from patient');
  }

  if (proposedAction === 'share' || proposedAction === 'disclosure') {
    checklist.push('Create FHIR AuditEvent for audit trail');
    checklist.push('Retain audit records for at least 6 years');
  }

  return checklist;
}

function generateRegulatoryNarrative(regs: Regulation[], careSetting: string): string {
  const regNames = regs.map(r => r.name).join(', ');
  return (
    `For ${careSetting} setting, the following regulations apply: ${regNames}. ` +
    `All uses or disclosures must comply with HIPAA Privacy Rule minimum necessary standard ` +
    `and relevant 21st Century Cures Act exceptions. Maintain audit trail via FHIR AuditEvent.`
  );
}

export function getRegulationByCitation(citation: string): Regulation | undefined {
  return Object.values(REGULATIONS).find(r => r.citation === citation);
}

export function getAllRegulations(): Regulation[] {
  return Object.values(REGULATIONS);
}
