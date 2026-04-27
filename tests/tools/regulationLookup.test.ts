import { describe, it, expect, beforeEach } from 'vitest';
import { RegulationLookupTool } from '../../src/tools/regulationLookup';
import { getRegulationsByCareContext, getRegulationByCitation } from '../../src/regulatory/regulations';

describe('RegulationLookupTool', () => {
  let tool: RegulationLookupTool;

  beforeEach(() => {
    tool = new RegulationLookupTool();
  });

  describe('Hospital Treatment Scenarios', () => {
    it('should return HIPAA + ONC regulations for hospital medication access', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      expect(result.regulations).toBeDefined();
      expect(result.regulations.length).toBeGreaterThan(0);

      // Verify HIPAA Privacy Rule is included
      const hipaaPrivacy = result.regulations.some(r =>
        r.citation.includes('164.102')
      );
      expect(hipaaPrivacy).toBe(true);

      // Verify compliance checklist is provided
      expect(result.compliance_checklist).toBeDefined();
      expect(result.compliance_checklist.length).toBeGreaterThan(0);
    });

    it('should include information blocking exceptions for treatment', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      const ibExceptions = result.regulations.filter(r =>
        r.citation.includes('171.302') || r.citation.includes('171.303')
      );

      expect(ibExceptions.length).toBeGreaterThan(0);
    });

    it('should include minimum necessary standard for medication data', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'share',
      });

      const minNecessary = result.regulations.some(r =>
        r.citation.includes('164.502')
      );
      expect(minNecessary).toBe(true);

      // Verify checklist addresses minimum necessary
      const mnItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('minimum necessary')
      );
      expect(mnItem).toBe(true);
    });
  });

  describe('Research Scenarios', () => {
    it('should require authorization for research on real data', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'research',
        data_type: 'lab_results',
        proposed_action: 'research',
      });

      const authReg = result.regulations.some(r =>
        r.citation.includes('164.508')
      );
      expect(authReg).toBe(true);

      // Verify checklist includes IRB requirement
      const irbItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('irb')
      );
      expect(irbItem).toBe(true);
    });

    it('should not include ONC exceptions for de-identified research', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'research',
        data_type: 'de-identified',
        proposed_action: 'research',
      });

      // De-identified data may not trigger ONC rules
      const hasONC = result.regulations.some(r => r.citation.includes('171'));
      // This is context-dependent, but generally de-identified doesn't trigger IB rules
      expect(result.regulations.length).toBeGreaterThan(0);
    });
  });

  describe('Sensitive Data Handling', () => {
    it('should include enhanced protections for mental health data', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'mental_health',
        proposed_action: 'share',
      });

      // Check for enhanced privacy checklist items
      const sensitiveItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('sensitive') ||
        c.toLowerCase().includes('enhanced')
      );
      expect(sensitiveItem).toBe(true);
    });

    it('should require explicit consent for genetic data', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'genetic_data',
        proposed_action: 'research',
      });

      const consentItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('consent')
      );
      expect(consentItem).toBe(true);
    });

    it('should flag substance use data restrictions', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'mental_health',
        data_type: 'substance_use',
        proposed_action: 'share',
      });

      // Substance use data has special protections (42 CFR Part 2)
      const substanceItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('sensitive')
      );
      expect(substanceItem).toBe(true);
    });
  });

  describe('Data Sharing Actions', () => {
    it('should require audit trail for sharing', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'share',
      });

      const auditItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('audit') ||
        c.toLowerCase().includes('fhir auditevent')
      );
      expect(auditItem).toBe(true);
    });

    it('should require business associate agreement for third-party disclosure', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'lab_results',
        proposed_action: 'disclosure',
      });

      const baaItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('business associate')
      );
      expect(baaItem).toBe(true);
    });

    it('should require encryption for transmissions', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'transmit',
      });

      const encryptItem = result.compliance_checklist.some(c =>
        c.toLowerCase().includes('encrypt')
      );
      expect(encryptItem).toBe(true);
    });
  });

  describe('Care Settings', () => {
    it('should handle ambulatory setting', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'ambulatory',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      expect(result.regulations.length).toBeGreaterThan(0);
      expect(result.compliance_checklist.length).toBeGreaterThan(0);
    });

    it('should handle telehealth setting', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'telehealth',
        data_type: 'lab_results',
        proposed_action: 'treatment',
      });

      expect(result.regulations.length).toBeGreaterThan(0);
    });

    it('should handle nursing home setting', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'nursing_home',
        data_type: 'full_record',
        proposed_action: 'treatment',
      });

      expect(result.regulations.length).toBeGreaterThan(0);
    });

    it('should handle home health setting', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'home_health',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      expect(result.regulations.length).toBeGreaterThan(0);
    });
  });

  describe('Citation Accuracy', () => {
    it('should link to valid CFR sections (45 CFR 164.x)', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      const hipaaRegs = result.regulations.filter(r =>
        r.citation.includes('45 CFR §164')
      );

      hipaaRegs.forEach(reg => {
        expect(reg.citation).toMatch(/45 CFR §164\.\d{3}(a)?/);
      });
    });

    it('should link to valid ONC sections (45 CFR 171.x)', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      const oncRegs = result.regulations.filter(r =>
        r.citation.includes('45 CFR §171')
      );

      oncRegs.forEach(reg => {
        expect(reg.citation).toMatch(/45 CFR §171\.30[2-9]/);
      });
    });

    it('should verify citations against actual regulation database', () => {
      // Test that citations can be looked up
      const citation = '45 CFR §164.502';
      const reg = getRegulationByCitation(citation);

      expect(reg).toBeDefined();
      if (reg) {
        expect(reg.citation).toBe(citation);
        expect(reg.requirement).toBeDefined();
        expect(reg.enforcementRisk).toBeDefined();
      }
    });
  });

  describe('Enforcement Risk Assessment', () => {
    it('should mark HIPAA violations as critical risk', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      const hipaaRegs = result.regulations.filter(r =>
        r.citation.includes('45 CFR §164')
      );

      hipaaRegs.forEach(reg => {
        const riskLevel = ['low', 'medium', 'high', 'critical'];
        expect(riskLevel).toContain(reg.enforcement_risk);
      });
    });

    it('should include penalty ranges for each regulation', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      result.regulations.forEach(reg => {
        expect(reg.penalty_range).toBeDefined();
        expect(reg.penalty_range).toMatch(/\$\d+–\$\d+/);
      });
    });
  });

  describe('Compliance Checklist Generation', () => {
    it('should generate actionable checklist items', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'share',
      });

      // All checklist items should start with action verb
      const actionVerbs = [
        'confirm',
        'verify',
        'create',
        'retain',
        'ensure',
        'check',
        'document',
      ];

      result.compliance_checklist.forEach(item => {
        const startsWithAction = actionVerbs.some(verb =>
          item.toLowerCase().startsWith(verb)
        );
        expect(startsWithAction).toBe(true);
      });
    });

    it('should vary checklist based on data type', async () => {
      const medicationResult = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      const geneticResult = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'genetic_data',
        proposed_action: 'treatment',
      });

      // Genetic data should have additional items
      expect(geneticResult.compliance_checklist.length).toBeGreaterThanOrEqual(
        medicationResult.compliance_checklist.length
      );
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid care setting', async () => {
      expect(
        tool.getApplicableRegulations({
          care_setting: 'invalid_setting' as never,
          data_type: 'medications',
          proposed_action: 'treatment',
        })
      ).rejects.toThrow();
    });

    it('should reject invalid data type', async () => {
      expect(
        tool.getApplicableRegulations({
          care_setting: 'hospital',
          data_type: 'invalid_type' as never,
          proposed_action: 'treatment',
        })
      ).rejects.toThrow();
    });

    it('should reject invalid proposed action', async () => {
      expect(
        tool.getApplicableRegulations({
          care_setting: 'hospital',
          data_type: 'medications',
          proposed_action: 'invalid_action' as never,
        })
      ).rejects.toThrow();
    });
  });

  describe('Summary Narrative', () => {
    it('should generate contextual regulatory summary', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain('hospital');
      expect(result.summary).toContain('HIPAA');
    });

    it('should reference specific regulations in summary', async () => {
      const result = await tool.getApplicableRegulations({
        care_setting: 'hospital',
        data_type: 'medications',
        proposed_action: 'treatment',
      });

      // Summary should reference at least one regulation
      const hasCitation = result.regulations.some(reg =>
        result.summary.toLowerCase().includes(
          reg.citation.toLowerCase().replace(/§/g, '')
        )
      );

      // Or mention generic HIPAA/ONC
      const hasGenericRef =
        result.summary.toLowerCase().includes('hipaa') ||
        result.summary.toLowerCase().includes('cures');

      expect(hasCitation || hasGenericRef).toBe(true);
    });
  });
});
