# Contributing to HealthGuard

HealthGuard is open source and welcomes contributions of all kinds.

## Getting started

1. **Fork the repo**
   ```bash
   git clone https://github.com/yourusername/healthguard-mcp
   cd healthguard-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Add your GOOGLE_GEMINI_API_KEY from https://aistudio.google.com/apikey
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## What you can contribute

### New regulatory tools
- Additional HIPAA Privacy Rule exceptions
- State-level regulation overlays (California CMIA, Texas Health & Safety Code)
- CMS Conditions of Participation compliance checks
- EU GDPR + US HIPAA cross-border scenarios

### FHIR resource types
- Expand beyond AuditEvent and Consent (e.g., Condition, Medication, Observation)
- Add R4.1/R5 profile support
- Improve reference validation

### Test scenarios
- Real-world compliance edge cases
- Multi-jurisdiction scenarios
- Emergent override situations
- Consent lifecycle edge cases

### Documentation
- Improve docs/regulatory-reference.md with additional regulatory frameworks
- Add video tutorials for platform integration
- Expand SHARP integration guide

## Good first issues

See [issues labeled `good-first-issue`](../../issues?q=label%3A%22good+first+issue%22) for a list of tasks perfect for new contributors.

## Code standards

- **TypeScript strict mode** — all code must compile with `npx tsc --noEmit`
- **Zod schemas for all tool inputs** — runtime validation catches bad data early
- **Every LLM output validated** — before returning to caller, validate against JSON schema
- **No PHI logged** — `PHI_LOGGING_ENABLED` must stay `false` in all environments
- **FHIR resources validated** — use validator.fhir.org for any FHIR resource changes

### Naming conventions
- Tools: `*Tool.ts` (e.g., `informationBlocking.ts`)
- Tests: `*.test.ts` (Vitest format)
- Interfaces: PascalCase, prefix with domain (e.g., `AuditEventInput`, `SHARPContext`)
- Functions: camelCase, verb-first for side effects (e.g., `extractSharpContext()`, `requireFhirContext()`)

## Testing requirements

Before submitting a PR:

```bash
# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint (if configured)
npm run lint
```

All tests must pass. If you're adding a new tool or feature, add corresponding tests in `tests/`.

## Pull request process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit with clear messages
   ```bash
   git commit -m "Add [feature]: brief description of change"
   ```

3. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **PR checklist** — before submitting, verify:
   - [ ] Tests pass: `npm test`
   - [ ] TypeScript compiles: `npx tsc --noEmit`
   - [ ] Any new regulatory citation links to actual 45 CFR or state statute text
   - [ ] PHI_LOGGING_ENABLED remains `false`
   - [ ] No secrets committed (API keys, tokens)
   - [ ] FHIR resources validated (if applicable)

5. **Describe your change**
   - What problem does this solve?
   - How does it maintain regulatory accuracy?
   - Are there new tests?

## Code review process

- We review PRs for regulatory accuracy (highest priority)
- FHIR compliance (if applicable)
- Code style and structure
- Test coverage

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before opening a duplicate
- Join our [Discord](https://discord.gg/JS2bZVruUg) for discussion
- Contact: [Manoj Mallick on LinkedIn](https://linkedin.com/in/manoj-mallick-9487413a)

## Legal

By contributing to HealthGuard, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make healthcare compliance intelligence accessible to every AI agent! 🏥
