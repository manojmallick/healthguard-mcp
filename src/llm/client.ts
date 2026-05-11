import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

export interface LLMClientConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  requestTimeoutMs?: number;
}

export interface ToolInvocationRequest {
  toolName: string;
  input: Record<string, unknown>;
  schema: z.ZodType<unknown>;
}

export interface ToolInvocationResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  retries?: number;
}

export class GeminiLLMClient {
  private client: GoogleGenerativeAI;
  private model: string;
  private temperature: number;
  private maxRetries: number;

  constructor(config: LLMClientConfig) {
    if (!config.apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is required');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.0-flash';
    this.temperature = config.temperature ?? 0.3;
    this.maxRetries = config.maxRetries ?? 3;
  }

  async invokeToolWithRetry(
    request: ToolInvocationRequest
  ): Promise<ToolInvocationResponse> {
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.invokeToolOnce(request);
        return {
          success: true,
          result,
          retries: attempt,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        retryCount = attempt + 1;

        // Check if error is retryable
        const isRetryable =
          lastError.message.includes('429') || // Rate limit
          lastError.message.includes('DEADLINE_EXCEEDED') || // Timeout
          lastError.message.includes('SERVICE_UNAVAILABLE');

        if (!isRetryable || attempt === this.maxRetries - 1) {
          break;
        }

        // Exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return {
      success: false,
      error: `Tool invocation failed after ${retryCount} attempts: ${lastError?.message}`,
      retries: retryCount,
    };
  }

  private async invokeToolOnce(
    request: ToolInvocationRequest
  ): Promise<unknown> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const prompt = this.buildStructuredPrompt(request);

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: this.temperature,
        responseMimeType: 'application/json',
      },
    });

    const text = response.response.text();
    const parsed = JSON.parse(text);

    // Validate against schema
    const validated = request.schema.parse(parsed);
    return validated;
  }

  private buildStructuredPrompt(request: ToolInvocationRequest): string {
    // Generate schema description based on tool name
    let schemaDescription = '';

    if (request.toolName === 'check_information_blocking') {
      schemaDescription = `{
  "permitted": boolean (true/false),
  "applicable_exception": string (one of: "TREATMENT", "PAYMENT", "HEALTHCARE_OPERATIONS", "HIPAA_PERMISSION", "VITALLY_IMPORTANT", "INFEASIBLE", "SECURITY", "PRIVACY", "NONE"),
  "exception_subsection": string (valid 45 CFR citation like "45 CFR §171.302(a)"),
  "conditions_met": array of strings (conditions that are met),
  "conditions_not_met": array of strings (conditions that are not met),
  "recommended_action": string (action recommendation),
  "confidence": number between 0 and 1,
  "audit_trail_required": boolean
}`;
    } else if (request.toolName === 'assess_hipaa_minimum_necessary') {
      schemaDescription = `{
  "assessment": string (one of: "APPROVED", "FLAGGED", "DENIED"),
  "approved_elements": array of strings (PHI elements approved for sharing),
  "flagged_elements": array of strings (PHI elements flagged as excessive),
  "rationale": string (explanation of assessment),
  "regulatory_citation": string (valid 45 CFR citation like "45 CFR §164.502(b)")
}`;
    } else {
      schemaDescription = 'Return valid JSON with all required fields. Do not omit any fields.';
    }

    let basePrompt = `You are a US healthcare compliance expert.

Tool: ${request.toolName}
Input: ${JSON.stringify(request.input, null, 2)}

CRITICAL: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations.

Required output format:
${schemaDescription}

Rules:
1. All fields are REQUIRED - do not omit any field
2. Validate all enum values against fixed lists
3. Do not hallucinate regulatory citations
4. Return ONLY the JSON object`;

    // Add tool-specific guidance
    if (request.toolName === 'assess_hipaa_minimum_necessary') {
      basePrompt += `

HIPAA MINIMUM NECESSARY STANDARD (45 CFR §164.502(b)):
- Approved elements: PHI elements that are necessary and appropriate for the stated purpose
- Flagged elements: PHI elements that exceed what is necessary for the stated purpose
- TREATMENT purposes: Full medical record typically approved (45 CFR §164.502(b)(2)(i))
- PAYMENT purposes: Limited to billing-related information only
- RESEARCH: Limited to protocol-approved elements only
- QUALITY_IMPROVEMENT: Limited to performance measurement data
- PATIENT_REQUEST: All elements approved (patient can request full record)`;
    }

    return basePrompt;
  }

  async testConnection(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      await model.generateContent('test');
      return true;
    } catch {
      return false;
    }
  }
}

export function createLLMClient(
  config?: Partial<LLMClientConfig>
): GeminiLLMClient {
  const apiKey = config?.apiKey || process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GOOGLE_GEMINI_API_KEY environment variable or config.apiKey is required'
    );
  }

  return new GeminiLLMClient({
    apiKey,
    model: config?.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    temperature: config?.temperature,
    maxRetries: config?.maxRetries,
    requestTimeoutMs: config?.requestTimeoutMs,
  });
}
