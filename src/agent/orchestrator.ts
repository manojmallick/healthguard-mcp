import { InformationBlockingTool } from '../tools/informationBlocking';
import { MinimumNecessaryTool } from '../tools/minimumNecessary';
import { PatientConsentTool } from '../tools/patientConsent';
import { AuditEventTool } from '../tools/auditEvent';
import { RegulationLookupTool } from '../tools/regulationLookup';
import { GeminiLLMClient } from '../llm/client';

export interface A2ARequest {
  id: string;
  message: {
    role: 'user' | 'assistant';
    parts: Array<{ type: 'text'; text: string }>;
  };
  metadata?: {
    _sharp_patient_id?: string;
    _sharp_fhir_base_url?: string;
    _sharp_fhir_token?: string;
    _sharp_encounter_id?: string;
    _sharp_practitioner_id?: string;
    _sharp_organization_id?: string;
  };
}

export interface A2AResponse {
  id: string;
  status: { state: 'completed' | 'failed'; error?: string };
  artifacts: Array<{
    parts: Array<{
      type: 'text' | 'data';
      text?: string;
      data?: Record<string, unknown>;
    }>;
  }>;
}

export interface IntentParsed {
  data_type:
    | 'medications'
    | 'lab_results'
    | 'imaging'
    | 'clinical_notes'
    | 'problem_list'
    | 'allergies'
    | 'vital_signs'
    | 'full_record';
  requester_role:
    | 'treating_physician'
    | 'specialist'
    | 'hospital_admin'
    | 'patient'
    | 'patient_advocate'
    | 'insurer'
    | 'employer'
    | 'researcher';
  care_relationship: 'treatment' | 'referral' | 'payment' | 'none';
  urgency: 'routine' | 'urgent' | 'emergent';
  care_setting:
    | 'hospital'
    | 'ambulatory'
    | 'urgent_care'
    | 'telehealth'
    | 'home_health'
    | 'nursing_home'
    | 'mental_health'
    | 'research';
}

const PHI_BY_DATA_TYPE: Record<string, string[]> = {
  medications: ['name', 'dob', 'mrn', 'medications', 'allergies'],
  lab_results: ['name', 'dob', 'lab_results'],
  imaging: ['name', 'dob', 'mrn', 'imaging'],
  clinical_notes: ['name', 'dob', 'mrn', 'clinical_notes'],
  problem_list: ['name', 'dob', 'problem_list'],
  allergies: ['name', 'dob', 'allergies'],
  vital_signs: ['name', 'dob', 'vital_signs'],
  full_record: [
    'name',
    'dob',
    'mrn',
    'ssn',
    'diagnoses',
    'medications',
    'lab_results',
    'imaging',
    'procedures',
  ],
};

const PURPOSE_BY_RELATIONSHIP: Record<string, string> = {
  treatment: 'TREATMENT',
  referral: 'REFERRAL',
  payment: 'PAYMENT',
  none: 'OPERATIONS',
};

const ROLE_MAPPING: Record<string, string> = {
  treating_physician: 'treating_provider',
  specialist: 'treating_provider',
  hospital_admin: 'hospital_admin',
  patient: 'patient',
  patient_advocate: 'patient',
  insurer: 'payment_entity',
  employer: 'employer',
  researcher: 'researcher',
};

async function parseIntentFromMessage(
  userMessage: string,
  llmClient: GeminiLLMClient
): Promise<IntentParsed> {
  // Fallback: if message contains specific keywords, infer intent directly
  const messageLower = userMessage.toLowerCase();

  // Try to infer from keywords
  let data_type = 'full_record';
  if (messageLower.includes('medication')) data_type = 'medications';
  else if (messageLower.includes('lab')) data_type = 'lab_results';
  else if (messageLower.includes('imaging') || messageLower.includes('scan')) data_type = 'imaging';
  else if (messageLower.includes('allerg')) data_type = 'allergies';

  let requester_role = 'treating_physician';
  if (messageLower.includes('specialist')) requester_role = 'specialist';
  else if (messageLower.includes('patient')) requester_role = 'patient';
  else if (messageLower.includes('insurer') || messageLower.includes('insurance')) requester_role = 'insurer';
  else if (messageLower.includes('researcher')) requester_role = 'researcher';

  let care_relationship = 'treatment';
  if (messageLower.includes('referral')) care_relationship = 'referral';
  else if (messageLower.includes('payment') || messageLower.includes('billing')) care_relationship = 'payment';

  let urgency = 'routine';
  if (messageLower.includes('urgent') && !messageLower.includes('routine')) urgency = 'urgent';
  else if (messageLower.includes('emergent') || messageLower.includes('emergency')) urgency = 'emergent';

  let care_setting = 'ambulatory';
  if (messageLower.includes('hospital')) care_setting = 'hospital';
  else if (messageLower.includes('telehealth') || messageLower.includes('remote')) care_setting = 'telehealth';
  else if (messageLower.includes('home health')) care_setting = 'home_health';
  else if (messageLower.includes('urgent care')) care_setting = 'urgent_care';

  return {
    data_type: data_type as IntentParsed['data_type'],
    requester_role: requester_role as IntentParsed['requester_role'],
    care_relationship: care_relationship as IntentParsed['care_relationship'],
    urgency: urgency as IntentParsed['urgency'],
    care_setting: care_setting as IntentParsed['care_setting'],
  };
}

export async function executeComplianceCheck(
  request: A2ARequest
): Promise<A2AResponse> {
  const taskId = request.id;
  // Extract text from message parts (handle both typed and untyped parts)
  // Google A2A protocol doesn't include 'type' field in parts
  const userMessage = request.message.parts
    .filter((p: any) => p.type === 'text' || !p.type) // Accept text type or parts without type field
    .map((p: any) => p.text)
    .join(' ');

  if (!userMessage) {
    return {
      id: taskId,
      status: { state: 'failed', error: 'No text message provided' },
      artifacts: [],
    };
  }

  try {

    const llmClient = new GeminiLLMClient({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    });

    // Step 0: Parse intent from natural language
    const intent = await parseIntentFromMessage(userMessage, llmClient);

    // Initialize tools
    const ibTool = new InformationBlockingTool(llmClient);
    const mnTool = new MinimumNecessaryTool(llmClient);
    const consentTool = new PatientConsentTool();
    const auditTool = new AuditEventTool();
    const regTool = new RegulationLookupTool();

    // Build shared SHARP context
    const sharpContext = {
      _sharp_patient_id: request.metadata?._sharp_patient_id,
      _sharp_fhir_base_url: request.metadata?._sharp_fhir_base_url,
      _sharp_fhir_token: request.metadata?._sharp_fhir_token,
      _sharp_encounter_id: request.metadata?._sharp_encounter_id,
      _sharp_practitioner_id: request.metadata?._sharp_practitioner_id,
      _sharp_organization_id: request.metadata?._sharp_organization_id,
    };

    // Step 1+5 (PARALLEL): IB check + Regulations lookup
    const [ibResult, regResult] = await Promise.all([
      ibTool.check({
        requested_data_type: intent.data_type,
        requester_role: intent.requester_role,
        care_relationship: intent.care_relationship,
        urgency: intent.urgency,
        ...sharpContext,
      }),
      regTool.getApplicableRegulations({
        care_setting: intent.care_setting,
        data_type: intent.data_type,
        proposed_action:
          intent.care_relationship === 'treatment'
            ? 'treatment'
            : intent.care_relationship === 'referral'
              ? 'share'
              : 'payment',
        ...sharpContext,
      }),
    ]);

    // Step 2: Minimum necessary assessment
    const phiElements = PHI_BY_DATA_TYPE[intent.data_type] || [];
    const purpose = PURPOSE_BY_RELATIONSHIP[intent.care_relationship];
    const mnResult = await mnTool.assess({
      phi_elements_requested: phiElements,
      stated_purpose: purpose,
      requester_role: ROLE_MAPPING[intent.requester_role],
      care_context: intent.care_relationship,
      ...sharpContext,
    });

    // Step 3: Patient consent check (if SHARP context available)
    let consentResult = null;
    let consentNote = '';
    if (sharpContext._sharp_fhir_base_url && sharpContext._sharp_fhir_token) {
      try {
        consentResult = await consentTool.check({
          patient_fhir_id: sharpContext._sharp_patient_id,
          data_category: intent.data_type,
          proposed_action: intent.care_relationship === 'none' ? 'read' : 'share',
          ...sharpContext,
        });
      } catch (err) {
        consentNote = `Consent check failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      consentNote = 'Consent check skipped: No FHIR context provided (optional for this request)';
    }

    // Step 4: Audit event generation
    const auditResult = await auditTool.generate({
      action: 'R',
      actionType: 'DATA_ACCESS_REQUEST',
      outcome: ibResult.permitted ? 0 : 4,
      agent: {
        type: 'Device',
        id: 'healthguard-a2a-agent',
        name: 'HealthGuard A2A Agent',
      },
      source: {
        site: 'healthguard-a2a',
        type: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/audit-source-type',
            code: 'ApplicationServerProcess',
          },
        ],
      },
      entity: {
        what: {
          type: 'Patient',
          id: sharpContext._sharp_patient_id || 'patient-unknown',
        },
        role: {
          system: 'http://terminology.hl7.org/CodeSystem/object-role',
          code: '1',
          display: 'Patient',
        },
      },
      purpose: purpose,
      regulatoryCitation: ibResult.exception_subsection,
      dataAccessed: phiElements.join(', '),
      ...sharpContext,
    });

    // Step 6: Synthesize results into human-readable decision
    const decisionText = formatComplianceDecision({
      ibResult,
      mnResult,
      consentResult,
      auditResult,
      regResult,
      consentNote,
      intent,
    });

    const structuredResult = {
      permitted: ibResult.permitted,
      decision: ibResult.permitted ? 'PERMITTED' : 'NOT PERMITTED',
      applicable_exception: ibResult.applicable_exception,
      exception_subsection: ibResult.exception_subsection,
      conditions_met: ibResult.conditions_met || [],
      approved_elements: mnResult.approved_elements || [],
      flagged_elements: mnResult.flagged_elements || [],
      consent_status: consentResult?.consent_status || null,
      audit_hash: auditResult.sha256_hash,
      regulations: regResult.regulations || [],
      user_query: userMessage,
    };

    return {
      id: taskId,
      status: { state: 'completed' },
      artifacts: [
        {
          parts: [
            { type: 'text', text: decisionText },
            { type: 'data', data: structuredResult },
          ],
        },
      ],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      id: taskId,
      status: { state: 'failed', error: errorMsg },
      artifacts: [
        {
          parts: [
            {
              type: 'text',
              text: `## Compliance Check Failed\n\nError: ${errorMsg}`,
            },
          ],
        },
      ],
    };
  }
}

function formatComplianceDecision(results: {
  ibResult: any;
  mnResult: any;
  consentResult: any;
  auditResult: any;
  regResult: any;
  consentNote: string;
  intent: IntentParsed;
}): string {
  const {
    ibResult,
    mnResult,
    consentResult,
    auditResult,
    regResult,
    consentNote,
    intent,
  } = results;

  const status = ibResult.permitted ? '✓ PERMITTED' : '✗ NOT PERMITTED';
  const statusEmoji = ibResult.permitted ? '✓' : '✗';

  let output = `# ${statusEmoji} Compliance Decision: ${ibResult.permitted ? 'PERMITTED' : 'NOT PERMITTED'}\n\n`;

  output += `## Scenario\n`;
  output += `- **Data Type**: ${intent.data_type}\n`;
  output += `- **Requester Role**: ${intent.requester_role}\n`;
  output += `- **Care Relationship**: ${intent.care_relationship}\n`;
  output += `- **Urgency**: ${intent.urgency}\n`;
  output += `- **Care Setting**: ${intent.care_setting}\n\n`;

  output += `## Information Blocking Assessment (ONC 45 CFR §171)\n`;
  output += `- **Exception**: ${ibResult.applicable_exception}\n`;
  output += `- **Citation**: ${ibResult.exception_subsection}\n`;
  if (ibResult.conditions_met && ibResult.conditions_met.length > 0) {
    output += `- **Conditions Met**:\n`;
    ibResult.conditions_met.forEach((c: string) => {
      output += `  - ✓ ${c}\n`;
    });
  }
  output += `\n`;

  output += `## HIPAA Minimum Necessary (45 CFR §164.502)\n`;
  output += `- **Assessment**: ${mnResult.assessment}\n`;
  if (mnResult.approved_elements && mnResult.approved_elements.length > 0) {
    output += `- **Approved Elements**:\n`;
    mnResult.approved_elements.forEach((e: string) => {
      output += `  - ✓ ${e}\n`;
    });
  }
  if (mnResult.flagged_elements && mnResult.flagged_elements.length > 0) {
    output += `- **Flagged Elements** (review before disclosure):\n`;
    mnResult.flagged_elements.forEach((e: string) => {
      output += `  - ⚠ ${e}\n`;
    });
  }
  output += `\n`;

  if (consentResult) {
    output += `## Patient Consent Status (FHIR Consent)\n`;
    output += `- **Status**: ${consentResult.consent_status}\n`;
    if (consentResult.expiry_date) {
      output += `- **Expires**: ${consentResult.expiry_date}\n`;
    }
    if (consentResult.conditions && consentResult.conditions.length > 0) {
      output += `- **Conditions**:\n`;
      consentResult.conditions.forEach((cond: string) => {
        output += `  - ${cond}\n`;
      });
    }
    output += `\n`;
  } else if (consentNote) {
    output += `## Patient Consent\n`;
    output += `- ${consentNote}\n\n`;
  }

  output += `## Applicable Regulations\n`;
  if (regResult.regulations && regResult.regulations.length > 0) {
    regResult.regulations.slice(0, 3).forEach((reg: any) => {
      output += `- **${reg.name}** (${reg.citation}): ${reg.requirement}\n`;
    });
  }
  output += `\n`;

  output += `## Audit Evidence\n`;
  output += `- **SHA-256 Hash**: ${auditResult.sha256_hash.slice(0, 32)}...\n`;
  output += `- **Purpose**: ${results.intent.care_relationship === 'treatment' ? 'TREATMENT' : results.intent.care_relationship === 'referral' ? 'REFERRAL' : 'PAYMENT'}\n`;
  output += `- **Audit Trail**: Generated and ready for compliance logging\n\n`;

  output += `---\n*Generated by HealthGuard A2A Compliance Agent v0.2.0*`;

  return output;
}
