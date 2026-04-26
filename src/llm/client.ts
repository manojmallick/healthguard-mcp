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
    const schemaStr = typeof request.schema === 'object'
      ? JSON.stringify((request.schema as unknown as Record<string, unknown>).description || 'No description')
      : String(request.schema);

    return `You are a healthcare compliance specialist.

Tool: ${request.toolName}
Input: ${JSON.stringify(request.input, null, 2)}

Output schema: Respond ONLY with valid JSON matching this structure.
Do not include markdown, code blocks, or explanations.
Validate all outputs against fixed enumerations (no hallucinated values).

Schema details:
${schemaStr}

Respond with ONLY the JSON object.`;
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
