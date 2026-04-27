# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] — 2026-05-11 — Agents Assemble submission

### Added
- Compliance decision tree visualizer (frontend/) — interactive React dashboard with color-coded decision panels
- POST /api/v1/compliance-check orchestration endpoint — sequences all 5 tools in sequence
- GET /ready readiness endpoint with dependency checks (Gemini API, FHIR server, regulatory data, PHI logging)
- SHARP context extraction utility + full TypeScript types (src/sharp/context.ts)
- GCP Cloud Run deployment configuration (Dockerfile, cloudbuild.yaml, DEPLOYMENT.md)
- Open-source signals: CONTRIBUTING.md, CHANGELOG.md, 5 GitHub Issues, regulatory-reference.md
- Dashboard route at /dashboard for visualizer access

### Changed
- Updated package.json with start/start:dev scripts
- Enhanced .env.example with FHIR_TOKEN and all required env vars
- Migrated to @google/generative-ai ^0.24.0 for latest Gemini API

### Fixed
- Module resolution in TypeScript from "bundler" to "node" for proper CommonJS resolution
- Removed dynamic require() statements in favor of proper imports
- Fixed import paths to use relative resolution

## [0.1.0] — 2026-04-28 — Initial build

### Added
- MCP server scaffold with 5 regulatory compliance tools
- **Tool 1: check_information_blocking** — 8 ONC exceptions (45 CFR §171.302–309)
- **Tool 2: assess_hipaa_minimum_necessary** — HIPAA Privacy Rule (45 CFR §164.502(b))
- **Tool 3: check_patient_consent** — FHIR R4 Consent resource query
- **Tool 4: generate_audit_event** — FHIR R4 AuditEvent with SHA-256 tamper-evidence
- **Tool 5: get_applicable_regulations** — regulatory RAG over ONC + HIPAA docs
- FHIR R4 client with SMART on FHIR auth pattern (src/fhir/client.ts)
- AuditEventBuilder with FHIR R4 validation (0 errors, 0 warnings on validator.fhir.org)
- Google Generative AI (Gemini 2.0 Flash) LLM client with retry logic
- 8 ONC information blocking exceptions with exact CFR conditions (src/regulatory/exceptions.ts)
- HIPAA Privacy Rule implementation with 25 PHI elements (src/regulatory/hipaa.ts)
- Regulatory reference database with 14 regulations (src/regulatory/regulations.ts)
- Health check endpoints: GET /health (liveness), GET /ready (readiness/startup)
- Structured Cloud Logging JSON format for Cloud Run integration
- Comprehensive test suite (189 passing tests across 8 test files)
- Published to Prompt Opinion Marketplace

### Compliance & Security
- PHI_LOGGING_ENABLED verification (critical HIPAA security check)
- SHA-256 audit event hashing for tamper-evidence chain
- SHARP context propagation (Secure Health Attribute Resource Protocol)
- Zod schema validation for all tool inputs/outputs
- LLM-as-compiler pattern (fixed enumerations, no hallucination)
- FHIR resource validation via official validator
