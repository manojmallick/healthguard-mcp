# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-05-11 — Agents Assemble submission

### Added
- **Compliance Decision Visualizer** — interactive React UI showing compliance decision tree in real time
- **POST /api/v1/compliance-check** — orchestration endpoint combining Tools 1+2+4 for nurse scenario demo
- **GET /ready** endpoint — dependency health checks (Gemini API, FHIR server, regulatory data)
- **SHARP Context Extraction** — full TypeScript support for SHARP field injection from Prompt Opinion platform
- **SHARPContext Interface** — type-safe extraction of `_sharp_*` fields (patient_id, fhir_base_url, fhir_token, etc.)
- **SHARP Integration Test Suite** — tests/sharp/sharpIntegration.test.ts covering context propagation scenarios
- **GCP Cloud Run Deployment** — production-grade deployment to europe-west1 with Secret Manager integration
- **Cloud Logging Support** — structured JSON logging compatible with GCP Cloud Logging
- **Prompt Opinion Marketplace Publishing** — MCP server discoverable in Prompt Opinion Marketplace
- **docs/regulatory-reference.md** — full primary-source citations for all 45 CFR regulations
- **CONTRIBUTING.md** — contributor guide with good-first-issues and code standards
- **5 GitHub Issues** — roadmap items for state-level regulations, FHIR resource expansion, and bulk testing

### Fixed
- Schema validation in compliance-check endpoint: entity.role and dataAccessed types now match AuditEventInput schema
- FHIR R5 AuditEvent structure: outcome field now object with code structure (not primitive)
- Data type enum validation: accepts both "medication_list" and "medications" for visualizer compatibility

### Changed
- MCP tool registration: lazy initialization in route handlers (prevents import-time Gemini API errors)
- FHIR endpoint default: remains HAPI public test server (https://hapi.fhir.org/baseR4) — no auth required for demo
- Regulatory citation structure: all 8 ONC exceptions now map to actual 45 CFR §171.201-309 subsections

### Verified
- All 189 unit tests passing (up from 172 after regulatory audit)
- FHIR AuditEvent validation: 0 errors, 0 warnings at https://validator.fhir.org
- Regulatory accuracy: all 8 information blocking exceptions verified against actual Federal Register text
- TypeScript strict mode: 0 compilation errors

## [0.1.0] — 2026-04-28 — Initial build

### Added
- **MCP Server Scaffold** — JSON-RPC 2.0 protocol handler with Streamable HTTP support
- **5 Regulatory Compliance Tools:**
  - Tool 1: check_information_blocking — 8 ONC exceptions with 45 CFR §171.201-309 citations
  - Tool 2: assess_hipaa_minimum_necessary — PHI element filtering per 45 CFR §164.502(b)
  - Tool 3: check_patient_consent — FHIR R4 Consent resource query and lifecycle check
  - Tool 4: generate_audit_event — FHIR R5 AuditEvent with SHA-256 tamper-evidence
  - Tool 5: get_applicable_regulations — regulatory framework lookup (HIPAA + 21st Century Cures Act)
- **FHIR R4 Client** — SMART on FHIR auth pattern, Consent query, Patient lookup
- **Google Gemini LLM Integration** — LLM-as-compiler pattern with fixed enumeration (no hallucination on compliance)
- **AuditEvent Builder** — FHIR R4 resource generation with SHA-256 hashing
- **Zod Validation** — runtime schema validation for all MCP inputs and LLM outputs
- **Unit Test Suite** — 172 tests covering all tools, edge cases, FHIR resources
- **GitHub Repository** — open source on GitHub with MIT license

### Technical Details
- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 20+ LTS
- **Framework:** Express.js (MCP server)
- **Testing:** Vitest + nock for HTTP mocking
- **FHIR:** HL7 FHIR R4 (R5 for AuditEvent)
- **Validation:** Zod schemas
- **LLM:** Google Gemini 2.0 Flash
- **Deployment:** GCP Cloud Run (v0.2.0+)

---

## Migration Guide: 0.1.0 → 0.2.0

### For MCP Server Operators
1. Set environment variable: `FHIR_TOKEN=` (leave empty for HAPI public server)
2. Update endpoint URL in Prompt Opinion dashboard to Cloud Run URL
3. Verify `/ready` endpoint returns `{"ready": true}`

### For Tool Integrators
1. SHARP context now auto-extracted from `_sharp_*` fields — no code changes needed
2. Use new `POST /api/v1/compliance-check` endpoint for bundled tool responses
3. AuditEvent schema unchanged, but now validates at 0 FHIR errors

### For Contributors
1. New `docs/regulatory-reference.md` for citation verification
2. New 5 GitHub Issues — start with `good-first-issue` label
3. All PRs must verify with: `npm test && npx tsc --noEmit`

---

## Known Limitations

- FHIR server: Public test server only (HAPI), no private EHR integration
- Patient consent: FHIR Consent queries only (no HL7 v2 interface)
- Regulatory scope: US federal only (no state-level rules yet — see Issue #2)
- Language: English only (no i18n)

---

## Upcoming (Post-Hackathon Roadmap)

- [ ] State-level regulation overlay (California CMIA, Texas Health & Safety Code)
- [ ] FHIR R5 full migration (currently AuditEvent only)
- [ ] CMS Conditions of Participation tool
- [ ] EU GDPR + US HIPAA cross-border scenarios
- [ ] Real-time audit trail visualization
- [ ] Multi-jurisdiction policy synthesis

---

**For questions:** Open an issue on GitHub or contact [Manoj Mallick](https://linkedin.com/in/manoj-mallick-9487413a)
