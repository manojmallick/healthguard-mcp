# Contributing to HealthGuard

HealthGuard is open source and welcomes contributions of all kinds.

## Getting started

1. Fork the repo: https://github.com/manojmallick/healthguard-mcp
2. Clone: `git clone https://github.com/YOUR_USERNAME/healthguard-mcp`
3. Install: `npm install`
4. Configure: `cp .env.example .env` (add GOOGLE_GEMINI_API_KEY from https://aistudio.google.com)
5. Start: `npm run start:dev`
6. Test: `npm test`

## What you can contribute

- **New regulatory tools** — additional HIPAA or ONC rules
- **FHIR resource types** — expand beyond AuditEvent and Consent
- **State-level regulations** — California CMIA, Texas Health & Safety Code
- **Test scenarios** — real-world compliance edge cases
- **Documentation** — improve docs/regulatory-reference.md
- **Bug fixes** — report issues and submit PRs

## Good first issues

See [issues labeled good-first-issue](../../issues?label=good+first+issue)

## Code standards

- TypeScript strict mode required
- Zod schemas for all tool inputs
- Every LLM output validated against JSON schema
- No PHI logged (PHI_LOGGING_ENABLED must stay false)
- Every FHIR resource validated before returning

## Pull request checklist

- [ ] Tests pass: `npm test`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Any new regulatory citation links to actual 45 CFR text
- [ ] PHI_LOGGING_ENABLED remains false in all configs
- [ ] FHIR resources validated at https://validator.fhir.org/

## Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test file
npm test tests/tools/informationBlocking.test.ts
```

## Building and deploying locally

```bash
# Build TypeScript
npm run build

# Start dev server (rebuilds on changes)
npm run dev

# Start production server
npm start
```

## Questions?

Open an issue or reach out:
- LinkedIn: https://linkedin.com/in/manoj-mallick-9487413a
- GitHub Issues: https://github.com/manojmallick/healthguard-mcp/issues

## License

All contributions are licensed under MIT.
