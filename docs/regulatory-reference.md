# HealthGuard Regulatory Reference

All regulatory citations in HealthGuard link to primary sources.
Last verified: 2026-05-10

## 21st Century Cures Act — Information Blocking Exceptions

### Primary Source
- **ONC Final Rule:** https://www.federalregister.gov/documents/2020/05/01/2020-07419
- **Full Text (eCFR):** https://www.ecfr.gov/current/title-45/part-171

### The 8 Information Blocking Exceptions

| Exception | Citation | Key Conditions | Regulatory Reference |
|-----------|----------|-----------------|----------------------|
| **Treatment Exception** | 45 CFR §171.201 | Direct treatment relationship; purpose of care provision | [§171.201](https://www.ecfr.gov/current/title-45/section-171.201) |
| **Payment Exception** | 45 CFR §171.202 | Covered entity; payment as defined in HIPAA; direct or management relationship | [§171.202](https://www.ecfr.gov/current/title-45/section-171.202) |
| **Healthcare Operations Exception** | 45 CFR §171.203 | Same covered entity; operational purpose (QA, credentialing, compliance, etc.) | [§171.203](https://www.ecfr.gov/current/title-45/section-171.203) |
| **HIPAA Authorization Exception** | 45 CFR §171.204 | Valid HIPAA authorization or waiver signed by patient or legal representative | [§171.204](https://www.ecfr.gov/current/title-45/section-171.204) |
| **Preventing Serious Harm** | 45 CFR §171.205 | Imminent threat of serious harm; prevention of abuse, neglect, or harm | [§171.205](https://www.ecfr.gov/current/title-45/section-171.205) |
| **Content and Manner** | 45 CFR §171.301 | Patient requested information in specific format/manner that requires alternative | [§171.301](https://www.ecfr.gov/current/title-45/section-171.301) |
| **Fees** | 45 CFR §171.302 | Fees permitted under HIPAA are applied; patient directed to pay in advance | [§171.302](https://www.ecfr.gov/current/title-45/section-171.302) |
| **Licensing** | 45 CFR §171.303 | Licensing organization conducts health oversight; data needed for compliance | [§171.303](https://www.ecfr.gov/current/title-45/section-171.303) |

### What Information Blocking IS
Information blocking = practice that interferes with access to, exchange of, or use of EHI.

### What Information Blocking IS NOT (Exceptions)
ONC has identified 8 specific scenarios where exceptions apply — see table above.

**Key Point:** If NONE of the 8 exceptions apply, blocking the information is a violation and subject to:
- **ONC Penalties:** Up to $1 million per year per violation
- **Private Right of Action:** Patients can sue for damages

---

## HIPAA Privacy Rule

### Primary Source
- **Full Text (eCFR):** https://www.ecfr.gov/current/title-45/part-164

### Minimum Necessary Standard
**Statute:** 45 CFR §164.502(b)
**Full Text:** https://www.ecfr.gov/current/title-45/section-164.502

**What it requires:**
1. For EACH use/disclosure (except treatment), covered entity must evaluate whether the amount, type, and format of PHI is "reasonable and appropriate"
2. For **treatment between providers**, minimum necessary does NOT apply (physician-to-physician communications are exempt)
3. For **payment and operations**, minimum necessary DOES apply
4. "Reasonable efforts" standard — not a bright-line rule; judgment-based

**Example:**
- Cardiologist requests "full medical record" for referral
- HealthGuard must evaluate: "Full record" likely violates minimum necessary
- Better: Just cardiology-relevant data (EKG, echocardiogram, current cardiac meds)

### HIPAA Authorization
**Statute:** 45 CFR §164.508
**Full Text:** https://www.ecfr.gov/current/title-45/section-164.508

**Requirements for valid HIPAA authorization:**
1. Written, signed by patient (or legal representative)
2. Specific statement of purpose (e.g., "referral to cardiologist")
3. Expiration date (or event, e.g., "upon discharge")
4. Patient right to revoke in writing
5. Cannot be condition of treatment (except for research)

### HIPAA Minimum Necessary for Treatment
**Statute:** 45 CFR §164.502(b)(1)(i)
**Relevant Only When:** Receiving provider in treatment relationship does NOT have obligation to evaluate minimum necessary for **treating provider-to-treating provider** exchanges.

**But:** Must evaluate minimum necessary for:
- Payment entities receiving treatment data
- Operations staff (QA, compliance, etc.)
- Outside entities not in treatment relationship

---

## FHIR Standards

### AuditEvent Resource (Tool 4)
- **Spec:** https://hl7.org/fhir/R4/auditevent.html (R4) | https://hl7.org/fhir/R5/auditevent.html (R5)
- **Status in HealthGuard:** R5 (latest), validates at 0 errors
- **Required Fields:**
  - `resourceType: "AuditEvent"`
  - `type: { system, code }` (e.g., data access)
  - `action: "C"` (Create/Read/Update/Delete/Execute)
  - `recorded: instant` (timestamp)
  - `outcome: { code, display }` (success/failure)
  - `agent[]: { who, type, role }`
  - `source: { observer }` (Device/System)
  - `entity[]: { what, role, lifecycle }`

### Consent Resource
- **Spec:** https://hl7.org/fhir/R4/consent.html
- **Status:** R4, used for Tool 3 queries
- **Relevant Fields:**
  - `status: "active" | "draft" | "paused" | "rejected" | "entered-in-error"`
  - `scope: { coding }` (e.g., "patient-privacy")
  - `category[]: { coding }` (e.g., "HIV", "mental health", "substance use")
  - `patient: { reference }`
  - `dateTime: instant`
  - `provision: { type: "permit" | "deny", ... }`

### Patient Resource
- **Spec:** https://hl7.org/fhir/R4/patient.html
- **Status:** R4, used as reference in all tools
- **HAPI Test Patient:** https://hapi.fhir.org/baseR4/Patient/example

---

## Validator Tools

### FHIR Validator
- **URL:** https://validator.fhir.org/
- **Use:** Paste FHIR resource JSON, select profile, validate
- **HealthGuard Target:** All AuditEvents must validate with **0 errors, 0 warnings**
- **Note:** Information messages (blue) are OK and expected

### ONC Information Blocking Validator
- **URL:** Not a tool — ONC evaluates compliance via rule text
- **HealthGuard Approach:** Embed the 8 exceptions in code, validate via LLM reasoning

---

## Regulatory Audit Trail (What HealthGuard Proves)

When a hospital faces ONC investigation for information blocking, HealthGuard provides:

1. **Dated audit event** showing when data was requested
2. **Stated purpose** (treatment, referral, etc.)
3. **Decision rationale** ("Treatment exception, §171.201")
4. **Approved/flagged PHI** (showing minimum necessary evaluation)
5. **SHA-256 hash** (proves no post-hoc modification)
6. **Tamper evidence** (if hash changes, event was altered)

**Example Defense:**
- Hospital blocked insurer's request for "full record"
- Insurer sued for information blocking violation
- Hospital produces:
  ```json
  {
    "auditEvent": {
      "action": "READ",
      "outcome": "DENIED",
      "purpose": "PAYMENT",
      "applicable_exception": "NOT_APPLICABLE",
      "regulatory_basis": "45 CFR §171.202 requires treatment/payment/ops purpose",
      "sha256": "a3f9e2c1..."
    }
  }
  ```
- Hospital's position: "We evaluated this against ONC rules and found no valid exception for payment-only request."
- Defense credibility: ✓ Dated, ✓ Cited, ✓ Hash-verified

---

## State-Level Regulations (Roadmap)

### California CMIA
- **Statute:** Cal. Civ. Code §56.10 et seq.
- **Status:** Identified but not yet implemented (Issue #2)
- **Key Difference:** Stronger privacy protections than HIPAA in some areas

### Texas Health & Safety Code
- **Statute:** Tex. Health & Safety Code §241.001 et seq.
- **Status:** Identified but not yet implemented

### New York SHIELD Act
- **Statute:** N.Y. GBL §668 et seq.
- **Status:** Identified but not yet implemented

---

## Cross-Border (Roadmap)

### EU GDPR + US HIPAA
- **Scenario:** US hospital with EU patient (GDPR data subject)
- **Status:** Identified but not yet implemented (Issue #4)
- **Complexity:** Highest-protection rule wins; GDPR Article 9 + HIPAA apply simultaneously

---

## References & Authority

- **Federal Register:** https://www.federalregister.gov (all rules, proposed rules, final rules)
- **eCFR (Electronic Code of Federal Regulations):** https://www.ecfr.gov (current regulation text)
- **HL7 FHIR:** https://hl7.org/fhir (all FHIR specifications, R4 and R5)
- **ONC Information Blocking Guidance:** https://www.healthit.gov/cures/sites/default/files/cures/2020-03/InformationBlockingRegulations.pdf
- **HIPAA Privacy Rule Guide:** https://www.hhs.gov/hipaa/for-professionals/privacy/index.html

---

## FAQ

**Q: Does HealthGuard prevent all information blocking violations?**
A: No. HealthGuard helps evaluate the 8 ONC exceptions. A hospital still must use clinical judgment. If a scenario doesn't fit any exception, HealthGuard can't create one.

**Q: What if the FHIR server is offline?**
A: Tool 3 (patient consent) will fail gracefully. Other tools don't require FHIR connectivity. Fallback to manual consent verification.

**Q: Can HealthGuard audit events be used in court?**
A: Not directly. But they provide contemporaneous evidence of compliance decision-making. Regulatory investigators find these valuable.

**Q: Why doesn't HealthGuard apply minimum necessary automatically?**
A: Because "reasonable and appropriate" is context-dependent. HealthGuard flags elements and recommends minimum necessary — the clinician makes the final call.

---

**Last Updated:** 2026-05-10
**Verification Method:** Primary source (eCFR, Federal Register)
**Next Audit:** Before May 11 submission
