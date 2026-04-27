# GitHub Issues Template

These 5 issues should be created in the GitHub repository. Use the content below for each issue.

---

## Issue #1: [enhancement] Add state-level regulation overlay (California CMIA)

**Labels**: `enhancement`, `roadmap`

**Body**:
```
HealthGuard currently covers federal regulations (HIPAA + 21st Century
Cures Act). California's Confidentiality of Medical Information Act (CMIA)
provides stronger privacy protections than HIPAA in some areas.

Proposed addition to get_applicable_regulations tool:
- Accept optional `state` parameter
- If state = "CA", overlay CMIA requirements on HIPAA baseline
- Return highest-protection rule where state > federal floor

Relevant statute: Cal. Civ. Code §56.10 et seq.
Good reference: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml
```

---

## Issue #2: [good first issue] Add FHIR Condition resource to consent scope check

**Labels**: `good first issue`, `fhir`

**Body**:
```
Currently check_patient_consent queries Consent resources for general
data categories. Adding Condition-specific consent checking would allow
agents to verify consent for sensitive diagnosis disclosure (e.g., HIV,
mental health, substance use).

FHIR Consent.provision.data can reference specific FHIR resource types.
This issue involves extending patientConsent.ts to:
1. Accept an optional `fhir_resource_type` parameter
2. Filter Consent resources whose provision covers that type

Good starting point for new contributors — only requires
extending the FHIR query in src/tools/patientConsent.ts
```

---

## Issue #3: [enhancement] Add CMS Conditions of Participation compliance tool

**Labels**: `enhancement`, `roadmap`

**Body**:
```
Hospital CMS Conditions of Participation (CoP) include specific
requirements for patient data access and disclosure timing (e.g., 48-hour
requirement for patient access requests under CURES Act).

Proposed Tool 6: check_cms_cop_compliance
- Input: action_type (patient_access_request, discharge_summary, etc.)
- Output: applicable CoP requirement, timeline, documentation needed
- Regulatory basis: 42 CFR Part 482
```

---

## Issue #4: [roadmap] Multi-jurisdiction mode for US + EU cross-border scenarios

**Labels**: `roadmap`, `gdpr`

**Body**:
```
HealthGuard currently covers US regulations. For US health systems
with EU-based patients (e.g., international patients, EU clinical trials),
GDPR Article 9 (special category health data) intersects with HIPAA.

Proposed: dual-regulation mode that returns both HIPAA and GDPR
assessments for cross-border data sharing scenarios.
This would leverage the builder's EU FinTech regulatory expertise.
```

---

## Issue #5: [good first issue] Add example FHIR resources to test fixtures

**Labels**: `good first issue`, `testing`

**Body**:
```
Current test fixtures (tests/fixtures/) have minimal FHIR resources.
Adding realistic example resources would improve test coverage:

1. fhir-patient-with-consent.json — Patient with active Consent resource
2. fhir-patient-consent-expired.json — Patient with expired consent
3. fhir-patient-no-consent.json — Patient with no consent on file
4. fhir-auditevent-example.json — Valid AuditEvent for reference

Resources should use HAPI FHIR test data format and be validated
at https://validator.fhir.org/ before committing.
```

---

## How to create these issues in GitHub

1. Go to: https://github.com/manojmallick/healthguard-mcp/issues/new
2. Copy the **Title** field
3. Copy the **Body** content into the issue description
4. Add the listed **Labels** by clicking the Labels dropdown
5. Click "Submit new issue"
6. Repeat for all 5 issues

Alternatively, use the GitHub CLI:
```bash
gh issue create --title "Issue title" --body "Issue body" --label "label1,label2"
```
