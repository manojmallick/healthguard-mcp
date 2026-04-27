// 45 CFR Part 171 — ONC Information Blocking Rule
// 21st Century Cures Act § 3022
// Exceptions to Information Blocking (§171.201–206 and §171.301–303)

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
  PREVENTING_HARM: {
    id: 'PREVENTING_HARM',
    name: 'Preventing Harm Exception',
    cfr_section: '45 CFR §171.201',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(A)',
    description:
      'Exception for practices that are reasonable and necessary to prevent serious harm to a patient or another person',
    conditions: [
      'Practice is reasonable and necessary to prevent serious harm',
      'Harm could result from disclosure (e.g., abuse, exploitation, harm to vulnerable person)',
      'Actor documents the serious harm being prevented',
    ],
    examples: [
      'Physician withholds records from abusive family member to prevent patient harm',
      'Healthcare provider prevents disclosure to someone with documented history of abuse',
      'Data access restricted to prevent self-harm by suicidal patient',
    ],
  },

  PRIVACY: {
    id: 'PRIVACY',
    name: 'Privacy Exception',
    cfr_section: '45 CFR §171.202',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(B)',
    description:
      'Exception when actor does not fulfill request to protect individual privacy under HIPAA or state/tribal law',
    conditions: [
      'State law explicitly restricts disclosure of specific health information',
      'Disclosure would violate HIPAA Privacy Rule authorization requirements',
      'Patient has placed restrictions on disclosure',
      'Actor documents the legal basis for privacy protection',
    ],
    examples: [
      'State law requires separate authorization for mental health records',
      'Genetic testing results protected under state genetic privacy statute',
      'Patient-imposed restrictions prevent disclosure to specified parties',
    ],
  },

  SECURITY: {
    id: 'SECURITY',
    name: 'Security Exception',
    cfr_section: '45 CFR §171.203',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(C)',
    description:
      'Exception when actor interferes with access to protect the security of electronic health information',
    conditions: [
      'Disclosure through requested mechanism would create significant security risk',
      'Risk assessment documents the specific security vulnerability',
      'Alternative secure method of disclosure is offered',
      'Actor documents the security risk and mitigation offered',
    ],
    examples: [
      'Requester asks for unencrypted email; provider offers secure portal instead',
      'Patient requests data over insecure channel; provider requires encryption',
      'Third-party requester lacks adequate security infrastructure for transmission',
    ],
  },

  INFEASIBILITY: {
    id: 'INFEASIBILITY',
    name: 'Infeasibility Exception',
    cfr_section: '45 CFR §171.204',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(D)',
    description:
      'Exception when actor does not fulfill request due to technical or operational infeasibility',
    conditions: [
      'Good faith effort has been made to comply with technical requirements',
      'Compliance would require substantial additional costs or system redesign',
      'Alternative method exists or will exist to provide access',
      'Actor documents the infeasibility and timeline for resolution',
    ],
    examples: [
      'Legacy EHR system lacks FHIR API capability; alternative transmission offered',
      'Temporary system outage prevents API access; alternative method provided',
      'Specialized data format requires custom conversion before standard transmission',
    ],
  },

  HEALTH_IT_PERFORMANCE: {
    id: 'HEALTH_IT_PERFORMANCE',
    name: 'Health IT Performance Exception',
    cfr_section: '45 CFR §171.205',
    statute_reference: '42 U.S.C. 300jj-50(a)(1)(E)',
    description:
      'Exception when actor takes reasonable and necessary measures to maintain or improve health IT performance',
    conditions: [
      'Practice is necessary to optimize overall health IT performance',
      'Temporary unavailability or degraded performance benefits patient care',
      'Actor documents the performance issue and expected resolution time',
      'Alternative access method is offered where possible',
    ],
    examples: [
      'System maintenance window temporarily prevents API access (documented in advance)',
      'Load balancing temporarily queues requests during peak demand',
      'Database optimization temporarily degrades query response time',
    ],
  },

  CONTENT_AND_MANNER: {
    id: 'CONTENT_AND_MANNER',
    name: 'Content and Manner Exception',
    cfr_section: '45 CFR §171.301',
    statute_reference: '42 U.S.C. 300jj-50(a)(2)(A)',
    description:
      'Exception when actor limits content of response or manner of fulfilling request within standards specifications',
    conditions: [
      'Limits use certified health IT (API, standards)',
      'Uses federal government or ANSI-accredited standards-developing organization standards',
      'OR agrees on alternative machine-readable format with requester',
      'Actor documents the technical basis for content/manner limitation',
    ],
    examples: [
      'Provider requires use of HL7 FHIR standard format specified by requestor',
      'EHR returns data in ONC-certified API format per federal specification',
      'Provider and requester agree on alternative machine-readable format',
    ],
  },

  FEES: {
    id: 'FEES',
    name: 'Fees Exception',
    cfr_section: '45 CFR §171.302',
    statute_reference: '42 U.S.C. 300jj-50(a)(2)(B)',
    description:
      'Exception when actor charges reasonable fees for accessing, exchanging, or using electronic health information',
    conditions: [
      'Fee is reasonable and includes reasonable profit margin',
      'Fee does not include excluded categories (development, maintenance, overhead)',
      'Fee is transparently disclosed to requester',
      'Actor documents the reasonable fee structure',
    ],
    examples: [
      'Provider charges cost-based fee for retrieving and transmitting records',
      'HIE network charges membership fee for participation and data exchange',
      'EHR vendor charges per-record fee for API calls',
    ],
  },

  LICENSING: {
    id: 'LICENSING',
    name: 'Licensing Exception',
    cfr_section: '45 CFR §171.303',
    statute_reference: '42 U.S.C. 300jj-50(a)(2)(C)',
    description:
      'Exception when actor licenses interoperability elements for electronic health information access and exchange',
    conditions: [
      'License is for interoperability elements (API, standards implementation)',
      'Licensing terms do not prevent information sharing compliant with regulations',
      'License royalties do not effectively block access or exchange',
      'Actor documents licensing terms and interoperability impact',
    ],
    examples: [
      'EHR vendor licenses FHIR API implementation from technology company',
      'Health system licenses standards-based data exchange platform',
      'Provider licenses certified health IT solution for interoperability',
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
