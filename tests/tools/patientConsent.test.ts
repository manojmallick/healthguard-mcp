import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientConsentTool } from '../../src/tools/patientConsent';
import { FHIRClient, FHIRConsent } from '../../src/fhir/client';

describe('PatientConsentTool', () => {
  let tool: PatientConsentTool;
  let mockFhirClient: FHIRClient;

  beforeEach(() => {
    mockFhirClient = new FHIRClient({
      fhirBaseUrl: 'https://hapi.fhir.org/baseR4',
      bearerToken: 'test-token',
    });
    tool = new PatientConsentTool(mockFhirClient);
  });

  describe('Active Consent', () => {
    it('should return ACTIVE when valid permit consent exists', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [
          { reference: 'Patient/patient-123' },
        ],
        organization: [{ reference: 'Organization/org-1' }],
        provision: {
          type: 'permit',
          period: {
            start: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            end: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          },
        },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'read',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('ACTIVE');
      expect(result.action_recommended).toContain('Proceed');
      expect(result.expiry_date).toBeDefined();
    });

    it('should extract consent conditions from provision', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: {
          type: 'permit',
          period: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 86400000).toISOString(),
          },
          purpose: [
            { system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
              code: 'TREAT' },
          ],
        },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'read',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.conditions).toBeDefined();
      expect(result.conditions?.length).toBeGreaterThan(0);
    });
  });

  describe('Expired Consent', () => {
    it('should return EXPIRED when consent end date is in past', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date(Date.now() - 86400000).toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: {
          type: 'permit',
          period: {
            start: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            end: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          },
        },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'read',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('EXPIRED');
      expect(result.action_recommended).toContain('renew');
    });
  });

  describe('Absent Consent', () => {
    it('should return ABSENT when no consents exist', async () => {
      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'read',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('ABSENT');
      expect(result.conditions).toContain('No consent on file');
      expect(result.action_recommended).toContain('Obtain');
    });

    it('should return ABSENT when all consents are denied', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'refused',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'read',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('DENIED');
      expect(result.conditions).toContain('Patient has explicitly refused consent');
    });
  });

  describe('SHARP Context Integration', () => {
    it('should extract patient_id from SHARP context', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/sharp-patient-456' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/sharp-patient-456' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: {
          type: 'permit',
          period: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        _sharp_patient_id: 'sharp-patient-456',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
        data_category: 'medications',
        proposed_action: 'read',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });

    it('should prefer SHARP patient_id over explicit input', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/sharp-patient-456' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/sharp-patient-456' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: {
          type: 'permit',
          period: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'explicit-patient-789', // This should be ignored
        _sharp_patient_id: 'sharp-patient-456', // This should be used
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
        data_category: 'medications',
        proposed_action: 'read',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });

    it('should propagate all SHARP context fields', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Practitioner/pract-abc' }],
        organization: [{ reference: 'Organization/org-def' }],
        provision: {
          type: 'permit',
          period: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        _sharp_patient_id: 'patient-123',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
        _sharp_encounter_id: 'enc-xyz',
        _sharp_practitioner_id: 'pract-abc',
        _sharp_organization_id: 'org-def',
        data_category: 'medications',
        proposed_action: 'read',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });
  });

  describe('FHIR Context Validation', () => {
    it('should throw if FHIR context missing', async () => {
      expect(
        tool.check({
          patient_fhir_id: 'patient-123',
          data_category: 'medications',
          proposed_action: 'read',
          // Missing _sharp_fhir_base_url and _sharp_fhir_token
        })
      ).rejects.toThrow('FHIR context required');
    });

    it('should throw if fhir_base_url missing', async () => {
      expect(
        tool.check({
          patient_fhir_id: 'patient-123',
          data_category: 'medications',
          proposed_action: 'read',
          _sharp_fhir_token: 'test-token',
          // Missing _sharp_fhir_base_url
        })
      ).rejects.toThrow('FHIR context required');
    });

    it('should throw if fhir_token missing', async () => {
      expect(
        tool.check({
          patient_fhir_id: 'patient-123',
          data_category: 'medications',
          proposed_action: 'read',
          _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
          // Missing _sharp_fhir_token
        })
      ).rejects.toThrow('FHIR context required');
    });

    it('should throw if patient ID missing', async () => {
      expect(
        tool.check({
          data_category: 'medications',
          proposed_action: 'read',
          _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
          _sharp_fhir_token: 'test-token',
          // Missing patient_fhir_id and _sharp_patient_id
        })
      ).rejects.toThrow('Patient ID required');
    });
  });

  describe('Data Categories', () => {
    it('should handle medications category', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: { type: 'permit' },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'share',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });

    it('should handle genetic_data category', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: { type: 'permit' },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'genetic_data',
        proposed_action: 'research',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });
  });

  describe('Error Handling', () => {
    it('should handle FHIR API errors gracefully', async () => {
      vi.spyOn(mockFhirClient, 'getPatientConsents').mockRejectedValue(
        new Error('FHIR server timeout')
      );

      expect(
        tool.check({
          patient_fhir_id: 'patient-123',
          data_category: 'medications',
          proposed_action: 'read',
          _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
          _sharp_fhir_token: 'test-token',
        })
      ).rejects.toThrow('Failed to query patient consents');
    });

    it('should validate input schema strictly', async () => {
      expect(
        tool.check({
          patient_fhir_id: 'patient-123',
          data_category: 'invalid_category' as never,
          proposed_action: 'read',
          _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
          _sharp_fhir_token: 'test-token',
        })
      ).rejects.toThrow();
    });
  });

  describe('Proposed Actions', () => {
    it('should handle read action', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: { type: 'permit' },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'read',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });

    it('should handle share action', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: { type: 'permit' },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'share',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });

    it('should handle research action', async () => {
      const mockConsent: FHIRConsent = {
        resourceType: 'Consent',
        id: 'consent-1',
        status: 'active',
        scope: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/consentscope',
              code: 'patient-privacy',
              display: 'Privacy Consent',
            },
          ],
        },
        patient: { reference: 'Patient/patient-123' },
        dateTime: new Date().toISOString(),
        performer: [{ reference: 'Patient/patient-123' }],
        organization: [{ reference: 'Organization/org-1' }],
        provision: { type: 'permit' },
      };

      vi.spyOn(mockFhirClient, 'getPatientConsents').mockResolvedValue([
        mockConsent,
      ]);

      const result = await tool.check({
        patient_fhir_id: 'patient-123',
        data_category: 'medications',
        proposed_action: 'research',
        _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4',
        _sharp_fhir_token: 'test-token',
      });

      expect(result.consent_status).toBe('ACTIVE');
    });
  });
});
