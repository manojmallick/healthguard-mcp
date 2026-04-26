// 45 CFR Part 171 — ONC Information Blocking Rule
// 21st Century Cures Act § 3022
// Exceptions to Information Blocking (§171.302–309)

export interface InformationBlockingException {
  id: string;
  name: string;
  cfr_section: string;
  statute_reference: string;
  description: string;
  conditions: string[];
  examples: string[];
}

export const INFORMATION_BLOCKING_EXCEPTIONS: Record<
  string,
  InformationBlockingException
> = {
  TREATMENT: {
    id: 'TREATMENT',
    name: 'Treatment Exception',
    cfr_section: '45 CFR §171.302',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(A)',
    description:
      'Exception for treatment purposes where information is shared between providers with treatment relationship',
    conditions: [
      'Patient is under care of both the sending and receiving provider',
      'Information is necessary for treatment, payment, or healthcare operations',
      'Sending provider reasonably believes receiving provider will use info for treatment',
      'No restrictions prevent the disclosure',
    ],
    examples: [
      'Primary care physician shares records with cardiologist for patient referred care',
      'Hospital shares discharge summary with nursing facility for post-acute care',
      'Specialist shares findings with referring physician',
    ],
  },

  PAYMENT: {
    id: 'PAYMENT',
    name: 'Payment Exception',
    cfr_section: '45 CFR §171.303',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(B)',
    description:
      'Exception for payment purposes as defined in HIPAA Privacy Rule',
    conditions: [
      'Use or disclosure is for payment purposes under HIPAA',
      'Information is limited to what is necessary for payment',
      'Receiving entity is a health plan or healthcare provider covered entity',
      'No restrictions prevent the disclosure',
    ],
    examples: [
      'Provider submits records to health insurance plan for claim adjudication',
      'Healthcare provider shares data with billing service for reimbursement',
      'Hospital submits encounter data to Medicare for payment',
    ],
  },

  HEALTHCARE_OPERATIONS: {
    id: 'HEALTHCARE_OPERATIONS',
    name: 'Healthcare Operations Exception',
    cfr_section: '45 CFR §171.304',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(C)',
    description:
      'Exception for healthcare operations as defined in HIPAA Privacy Rule, limited to within same covered entity',
    conditions: [
      'Both sending and receiving are part of same covered entity or organized healthcare arrangement',
      'Use or disclosure is for healthcare operations (quality improvement, case management, etc.)',
      'Information is limited to what is necessary for the operation',
      'No restrictions prevent the disclosure',
    ],
    examples: [
      'Department within health system shares patient data for care coordination',
      'Hospital shares quality improvement data internally',
      'Billing department requests records from clinical department for internal audit',
    ],
  },

  HIPAA_PERMISSION: {
    id: 'HIPAA_PERMISSION',
    name: 'HIPAA Permission Exception',
    cfr_section: '45 CFR §171.305',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(D)',
    description:
      'Exception when disclosure is authorized by HIPAA (patient authorization, court order, etc.)',
    conditions: [
      'Valid patient authorization exists (signed, dated, specific)',
      'OR court order authorizes disclosure',
      'OR other HIPAA-authorized disclosure scenario applies',
      'Authorization/order is current and not revoked',
    ],
    examples: [
      'Patient signs authorization allowing provider to share records with employer occupational health',
      'Court orders production of records in litigation',
      'Patient requests records for personal use or second opinion',
    ],
  },

  VITALLY_IMPORTANT: {
    id: 'VITALLY_IMPORTANT',
    name: 'Vitally Important Purposes Exception',
    cfr_section: '45 CFR §171.306',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(E)',
    description:
      'Exception when disclosure is necessary to prevent serious harm from abuse, neglect, or exploitation',
    conditions: [
      'Information is necessary to prevent serious harm',
      'Harm involves abuse, neglect, or exploitation of vulnerable person',
      'Patient has refused consent or cannot consent',
      'Law enforcement or adult/child protective services is recipient',
    ],
    examples: [
      'Physician reports suspected child abuse to state child protective services',
      'Healthcare provider discloses evidence of elder abuse to adult protective services',
      'Emergency disclosure to prevent serious injury or death',
    ],
  },

  INFEASIBLE: {
    id: 'INFEASIBLE',
    name: 'Infeasibility Exception',
    cfr_section: '45 CFR §171.307',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(F)',
    description:
      'Exception when compliance with API requirements is infeasible due to technological or operational barriers',
    conditions: [
      'Good faith effort has been made to comply with technical requirements',
      'Compliance would require substantial additional costs or system redesign',
      'Alternative method exists or will exist to provide access',
      'Entity documents the infeasibility and timeline for resolution',
    ],
    examples: [
      'Legacy EHR system lacks FHIR API capability; alternative secure transmission provided',
      'Temporary system outage prevents API access; alternative access method offered',
      'Specialized data format requires custom conversion before FHIR transmission',
    ],
  },

  SECURITY: {
    id: 'SECURITY',
    name: 'Security Provision Exception',
    cfr_section: '45 CFR §171.308',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(G)',
    description:
      'Exception when disclosure would create security risk (unencrypted unsecured channels, etc.)',
    conditions: [
      'Disclosure through requested mechanism would create significant security risk',
      'Risk assessment documents the specific vulnerability',
      'No reasonable mitigation exists',
      'Alternative secure method is offered',
    ],
    examples: [
      'Requester asks for unencrypted email; provider offers secure portal instead',
      'Patient requests data over insecure channel; provider requires encryption',
      'Third-party requester lacks adequate security infrastructure',
    ],
  },

  PRIVACY: {
    id: 'PRIVACY',
    name: 'Privacy Protection Exception',
    cfr_section: '45 CFR §171.309',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(H)',
    description:
      'Exception when disclosure would violate state privacy laws or expose proprietary information',
    conditions: [
      'State law explicitly prohibits disclosure of specific data type',
      'OR disclosure would harm competitive interests (proprietary treatment info)',
      'OR disclosure would violate genetic testing privacy rules',
      'Documentation identifies applicable law or harm',
    ],
    examples: [
      'State law prohibits disclosure of mental health records without separate authorization',
      'Genetic testing results protected under specific state statute',
      'Proprietary clinical research methodology protected from disclosure',
    ],
  },
};

export function getAllExceptions(): InformationBlockingException[] {
  return Object.values(INFORMATION_BLOCKING_EXCEPTIONS);
}

export function getException(
  id: string
): InformationBlockingException | undefined {
  return INFORMATION_BLOCKING_EXCEPTIONS[id];
}

export function getExceptionNames(): string[] {
  return Object.keys(INFORMATION_BLOCKING_EXCEPTIONS);
}
