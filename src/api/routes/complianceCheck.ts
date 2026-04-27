import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { InformationBlockingTool } from '../../tools/informationBlocking';
import { MinimumNecessaryTool } from '../../tools/minimumNecessary';
import { AuditEventTool } from '../../tools/auditEvent';
import { GeminiLLMClient } from '../../llm/client';

const router = Router();

const ComplianceCheckInput = z.object({
  data_type: z.enum(['medications', 'medication_list', 'lab_results', 'imaging', 'full_record', 'de-identified']).transform(v => {
    // Normalize medication_list to medications
    return v === 'medication_list' ? 'medications' : v;
  }),
  requester_role: z.enum(['specialist', 'treating_physician', 'patient', 'insurer']),
  care_relationship: z.enum(['treatment', 'referral', 'none']),
  urgency: z.enum(['routine', 'urgent', 'emergent']),
});

type ComplianceCheckInput = z.infer<typeof ComplianceCheckInput>;

interface ComplianceCheckResult {
  permitted: boolean;
  applicable_exception: string;
  exception_subsection: string;
  conditions_met: string[];
  approved_elements: string[];
  flagged_elements: string[];
  audit_event_hash: string;
  audit_valid: boolean;
  error?: string;
}

// Map data types to PHI elements for minimum necessary evaluation
const PHI_BY_DATA_TYPE: Record<string, string[]> = {
  medications: ['name', 'dob', 'mrn', 'medications', 'allergies'],
  lab_results: ['name', 'dob', 'lab_results'],
  imaging: ['name', 'dob', 'mrn', 'imaging'],
  full_record: ['name', 'dob', 'mrn', 'ssn', 'diagnoses', 'medications', 'lab_results', 'imaging', 'procedures'],
  'de-identified': ['patient_id_hash'],
};

// Map requester roles to HIPAA-relevant roles
const ROLE_MAPPING: Record<string, string> = {
  specialist: 'treating_provider',
  treating_physician: 'treating_provider',
  patient: 'patient',
  insurer: 'payment_entity',
};

// Map care relationships to stated purposes
const PURPOSE_MAPPING: Record<string, string> = {
  treatment: 'TREATMENT',
  referral: 'REFERRAL',
  none: 'PAYMENT',
};

router.post('/api/v1/compliance-check', async (req: Request, res: Response) => {
  const traceId = generateTraceId();

  try {
    const input = ComplianceCheckInput.parse(req.body);

    // Initialize LLM client for tools that need it
    const llmClient = new GeminiLLMClient({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    });

    const ibTool = new InformationBlockingTool(llmClient);
    const mnTool = new MinimumNecessaryTool(llmClient);
    const auditTool = new AuditEventTool();

    // Step 1: Check information blocking exception
    const ibResult = await ibTool.check({
      requested_data_type: input.data_type,
      requester_role: input.requester_role as 'specialist' | 'treating_physician' | 'hospital_admin' | 'patient' | 'patient_advocate' | 'insurer' | 'employer' | 'researcher',
      care_relationship: input.care_relationship,
      urgency: input.urgency,
    });

    // Step 2: Evaluate minimum necessary for the data type
    const phiElements = PHI_BY_DATA_TYPE[input.data_type] || [];
    const purpose = PURPOSE_MAPPING[input.care_relationship];

    const mnResult = await mnTool.assess({
      phi_elements_requested: phiElements,
      stated_purpose: purpose,
      requester_role: ROLE_MAPPING[input.requester_role],
      care_context: input.care_relationship,
    });

    // Step 3: Generate audit event for the decision
    const auditResult = await auditTool.generate({
      action: 'R', // Read action
      actionType: 'DATA_ACCESS_REQUEST',
      outcome: ibResult.permitted ? 0 : 4, // 0 = success, 4 = minor failure
      agent: {
        type: 'Device',
        id: 'healthguard-visualizer',
        name: 'HealthGuard Compliance Visualizer',
      },
      source: {
        site: 'healthguard-demo',
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
          id: 'patient-example',
        },
        role: {
          system: 'http://terminology.hl7.org/CodeSystem/object-role',
          code: '1', // Patient
          display: 'Patient',
        },
        lifecycle: 'Access/Use',
        name: 'PatientRecord',
        description: `Data access: ${phiElements.join(', ')}`,
      },
      purpose: purpose,
      regulatoryCitation: ibResult.exception_subsection,
      dataAccessed: phiElements.join(', '),
    });

    const result: ComplianceCheckResult = {
      permitted: ibResult.permitted,
      applicable_exception: ibResult.applicable_exception,
      exception_subsection: ibResult.exception_subsection,
      conditions_met: ibResult.conditions_met || [],
      approved_elements: mnResult.approved_elements || [],
      flagged_elements: mnResult.flagged_elements || [],
      audit_event_hash: auditResult.sha256_hash,
      audit_valid: true,
    };

    res.json(result);
  } catch (err) {
    const errorLog = {
      severity: 'ERROR',
      message: err instanceof Error ? err.message : String(err),
      service: 'healthguard-mcp',
      timestamp: new Date().toISOString(),
      traceId,
    };
    console.log(JSON.stringify(errorLog));

    res.status(400).json({
      permitted: false,
      applicable_exception: 'ERROR',
      exception_subsection: 'Unknown',
      conditions_met: [],
      approved_elements: [],
      flagged_elements: [],
      audit_event_hash: '',
      audit_valid: false,
      error: err instanceof Error ? err.message : 'Compliance check failed',
    });
  }
});

function generateTraceId(): string {
  return `healthguard-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default router;
