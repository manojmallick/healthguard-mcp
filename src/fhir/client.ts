// FHIR R4 Client for querying Consent and other resources
// Uses SMART on FHIR Bearer token authentication

export interface FHIRClientConfig {
  fhirBaseUrl: string;
  bearerToken: string;
  timeout?: number;
}

export interface FHIRBundle<T> {
  resourceType: 'Bundle';
  type: string;
  total: number;
  entry: Array<{
    resource: T;
  }>;
}

export interface FHIRConsent {
  resourceType: 'Consent';
  id: string;
  status: 'draft' | 'proposed' | 'active' | 'refused' | 'entered-in-error';
  scope: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  patient: {
    reference: string;
  };
  dateTime: string;
  performer: Array<{
    reference: string;
  }>;
  organization: Array<{
    reference: string;
  }>;
  sourceAttachment?: {
    url?: string;
    data?: string;
  };
  provision?: {
    type: 'permit' | 'deny';
    period?: {
      start?: string;
      end?: string;
    };
    actor?: Array<{
      role: {
        coding: Array<{
          system: string;
          code: string;
        }>;
      };
      reference: {
        reference: string;
      };
    }>;
    action?: Array<{
      coding: Array<{
        system: string;
        code: string;
      }>;
    }>;
    class?: Array<{
      system: string;
      code: string;
    }>;
    code?: Array<{
      system: string;
      code: string;
    }>;
    dataPeriod?: {
      start?: string;
      end?: string;
    };
    securityLabel?: Array<{
      system: string;
      code: string;
    }>;
    purpose?: Array<{
      system: string;
      code: string;
    }>;
    provision?: Array<unknown>;
  };
}

export class FHIRClient {
  private baseUrl: string;
  private bearerToken: string;
  private timeout: number;

  constructor(config: FHIRClientConfig) {
    this.baseUrl = config.fhirBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.bearerToken = config.bearerToken;
    this.timeout = config.timeout || 30000;
  }

  async getPatientConsents(patientId: string): Promise<FHIRConsent[]> {
    const url = `${this.baseUrl}/Consent?patient=${patientId}`;

    try {
      const response = await this.fetch(url);

      const responseObj = response as Record<string, unknown>;
      if (responseObj.resourceType !== 'Bundle') {
        throw new Error(`Expected FHIR Bundle, got ${responseObj.resourceType}`);
      }

      const bundle = response as FHIRBundle<FHIRConsent>;

      return (
        bundle.entry?.map(entry => entry.resource).filter(r => r) || []
      );
    } catch (err) {
      throw new Error(
        `Failed to query patient consents: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async getConsentById(consentId: string): Promise<FHIRConsent> {
    const url = `${this.baseUrl}/Consent/${consentId}`;

    try {
      const response = await this.fetch(url);

      const responseObj = response as Record<string, unknown>;
      if (responseObj.resourceType !== 'Consent') {
        throw new Error(
          `Expected Consent resource, got ${responseObj.resourceType}`
        );
      }

      return response as FHIRConsent;
    } catch (err) {
      throw new Error(
        `Failed to get consent: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  private async fetch(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const httpResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Accept': 'application/fhir+json',
        },
        signal: controller.signal as RequestInit['signal'],
      });

      clearTimeout(timeoutId);

      if (!httpResponse.ok) {
        const text = await httpResponse.text();
        throw new Error(
          `FHIR server returned ${httpResponse.status}: ${text || httpResponse.statusText}`
        );
      }

      const data = await httpResponse.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error(
          'Fetch failed: Check FHIR base URL and network connectivity'
        );
      }

      throw err;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetch(`${this.baseUrl}/metadata`);
      return !!(response && typeof response === 'object');
    } catch {
      return false;
    }
  }
}

export function createFHIRClient(config: FHIRClientConfig): FHIRClient {
  return new FHIRClient(config);
}
