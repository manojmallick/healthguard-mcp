# Devpost Submission Guide

## Cover Image Specification

**Dimensions**: 1200 × 630px (standard Devpost cover)  
**Format**: PNG or JPG  
**Design tool**: Canva (recommended) or Figma

### Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  LEFT PANEL (0–600px)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  HealthGuard                    (white, 48px bold) │   │
│  │  Regulatory compliance          (gray, 18px)       │   │
│  │  for healthcare AI              (gray, 18px)       │   │
│  │                                                     │   │
│  │  Badges (stacked vertically):                       │   │
│  │  ┌───────────────────────────────┐               │   │
│  │  │ ✓ PERMITTED                  │ (green pill)   │   │
│  │  ├───────────────────────────────┤               │   │
│  │  │ ⚠ Over-broad PHI             │ (amber pill)   │   │
│  │  ├───────────────────────────────┤               │   │
│  │  │ ✓ FHIR AuditEvent            │ (teal pill)    │   │
│  │  └───────────────────────────────┘               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RIGHT PANEL (600–1200px)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Code snippet (monospace, dark box):               │   │
│  │  ┌─────────────────────────────────┐             │   │
│  │  │ {                               │             │   │
│  │  │   "exception":                  │             │   │
│  │  │     "Treatment Exception",      │             │   │
│  │  │   "citation":                   │             │   │
│  │  │     "45 CFR §171.302(a)",       │             │   │
│  │  │   "permitted": true             │             │   │
│  │  │ }                               │             │   │
│  │  └─────────────────────────────────┘             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  BOTTOM STRIP (full width, last 60px)                      │
│  MCP · FHIR R4 · SHARP · A2A · Prompt Opinion             │
│  (gray text, slightly lighter dark background)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Color Palette

| Element | Color | Hex Code |
|---------|-------|----------|
| Background | Very dark gray | #0a0a0f |
| Primary text | Off-white | #f8f9fa |
| Secondary text | Light gray | #aaaaaa |
| Success (green) | Teal/green | #1d9e75 |
| Warning (amber) | Orange | #ef9f27 |
| Info (teal) | Light teal | #17b8a0 |
| Code background | Slightly lighter dark | #16161e |
| Border/accent | Dark gray | #333333 |

### Typography

- **Title** ("HealthGuard"): Bold, 48px, #f8f9fa
- **Subtitle** ("Regulatory compliance for healthcare AI"): Regular, 18px, #aaaaaa
- **Badge text**: Regular, 14px, white
- **Code snippet**: Monospace, 12px, #f8f9fa
- **Bottom text**: Regular, 13px, #aaaaaa

### Creation Steps (Canva)

1. Create new design: 1200 × 630px
2. Set background: #0a0a0f
3. Add text box (left): "HealthGuard" (48px bold)
4. Add text box (left): "Regulatory compliance for healthcare AI" (18px)
5. Add 3 rounded rectangles (left, stacked):
   - Green: "✓ PERMITTED" (#1d9e75)
   - Amber: "⚠ Over-broad PHI" (#ef9f27)
   - Teal: "✓ FHIR AuditEvent" (#17b8a0)
6. Add code snippet box (right):
   - Background: #16161e
   - Monospace font, 12px
   - Copy JSON from "Code snippet" section above
7. Add bottom banner with text: "MCP · FHIR R4 · SHARP · A2A · Prompt Opinion"

**Export as**: PNG (transparent background not needed)

---

## FHIR Validator Screenshot

**Required**: Screenshot of AuditEvent passing validator.fhir.org at 0 errors, 0 warnings.

### How to capture

1. **Generate a test AuditEvent**:
   ```bash
   curl -X POST http://localhost:3100/api/v1/compliance-check \
     -H "Content-Type: application/json" \
     -d '{
       "data_type":"medications",
       "requester_role":"specialist",
       "care_relationship":"referral",
       "urgency":"routine"
     }' | jq '.audit_event_json'
   ```

2. **Copy the JSON output**

3. **Validate at https://validator.fhir.org/**:
   - Click "Validate FHIR Resource"
   - Paste AuditEvent JSON
   - Select profile: "FHIR R4 → AuditEvent"
   - Click "Validate"

4. **Screenshot the results page** showing:
   - Green checkmark ✓
   - "0 errors, 0 warnings"
   - Resource type: "AuditEvent"
   - Timestamp of validation

5. **Save as**: `docs/fhir-validation-screenshot.png`

6. **Reference in README**:
   ```markdown
   ![FHIR Validator — 0 errors](docs/fhir-validation-screenshot.png)
   ```

---

## Devpost Submission Fields

### Title
```
HealthGuard — Regulatory Compliance Intelligence for Healthcare AI Agents
```

### Tagline (optional, ~60 chars)
```
HIPAA + information blocking compliance for every AI agent.
```

### Description (copy from README, ~300 words)

Focus on:
1. The problem (nurse scenario — 90 seconds → 2 seconds)
2. What it does (5 tools, exact CFR citations)
3. Why it matters (compliance penalties, market size)
4. What makes it unique (FHIR R4 validation, SHARP context)

**Key selling points for judges**:
- Josh Mandel: "FHIR AuditEvent passes validator at 0 errors"
- Joshua Hickey (Mayo): "Stateless MCP, SMART on FHIR, deployable today"
- Piyush Mathur (clinician): "Enables sharing, not refuses it"
- Stephon Proctor (CHOP): "Platform-publishable, SHARP support"
- Parth Tripathi (Google): "GCP Cloud Run, Secret Manager, structured logging"

### Links

- **GitHub**: https://github.com/manojmallick/healthguard-mcp
- **Marketplace**: https://app.promptopinion.ai/marketplace/healthguard
- **Live Demo**: https://healthguard-[deployment-hash]-ew.a.run.app/dashboard
- **Video**: https://youtube.com/[your-video-id]

### Video

- Duration: Under 3 minutes
- Format: MP4
- Content:
  1. 0:00–0:12: Problem (nurse scenario)
  2. 0:12–0:40: Decision tree in action (green PERMITTED panel)
  3. 0:40–1:00: Minimum necessary check (amber flags)
  4. 1:00–1:25: FHIR validator screenshot (0 errors)
  5. 1:25–1:50: Architecture signal (GCP Cloud Run, Marketplace)
  6. 1:50–2:20: Market impact (penalties, US hospitals)
  7. 2:20–2:30: Call to action (GitHub + Marketplace URLs)

**Tools**: CapCut (free), Loom, or OBS Studio

### Categories

Select all that apply:
- [ ] Healthcare
- [ ] AI/ML
- [ ] Compliance
- [ ] Open Source
- [ ] APIs

### Hashtags

```
#HIPAA #HealthcareAI #Compliance #InformationBlocking #FHIR #RegulatoryCom pliance #MCP #HealthTech
```

---

## Pre-Submission Checklist

### Code Quality
- [ ] `npm run build` succeeds (0 TypeScript errors)
- [ ] `npm test` passes (180+ tests)
- [ ] `git grep "api_key\|fhir_token\|secret"` returns 0 results
- [ ] `.env.example` has all required vars
- [ ] `PHI_LOGGING_ENABLED=false` in all configs

### Regulatory Accuracy (CRITICAL)
- [ ] 45 CFR §171.302–309 read in full (actual text, not summaries)
- [ ] Every tool response validated against 3 real scenarios
- [ ] Exception names match CFR text exactly
- [ ] docs/regulatory-reference.md links to ecfr.gov
- [ ] AuditEvent validated at validator.fhir.org (0 errors)

### FHIR Compliance
- [ ] AuditEvent passes validator.fhir.org at 0 errors, 0 warnings
- [ ] Consent resource parses all status values
- [ ] `docs/fhir-validation-screenshot.png` captured and committed
- [ ] README references validator screenshot

### Submission Assets
- [ ] Devpost cover image (1200×630px) created
- [ ] Demo video (under 3 minutes) recorded
- [ ] Video uploaded to YouTube (public or unlisted)
- [ ] GitHub repository public and fully populated
- [ ] Marketplace entry published with correct link

### Documentation
- [ ] README.md complete with judge-aligned language
- [ ] CONTRIBUTING.md committed
- [ ] CHANGELOG.md committed
- [ ] docs/regulatory-reference.md committed
- [ ] DEPLOYMENT.md with copy-paste commands
- [ ] GITHUB_ISSUES.md with 5 issues documented

### Devpost Fields
- [ ] Title filled in
- [ ] Tagline (if applicable)
- [ ] Description (300+ words, highlights for each judge)
- [ ] GitHub link
- [ ] Marketplace link
- [ ] Live demo URL (if deployed)
- [ ] Video uploaded
- [ ] Cover image uploaded
- [ ] Categories selected
- [ ] Hashtags added

### Final Verification (Day of submission)
- [ ] Fresh incognito browser: GitHub loads
- [ ] Fresh incognito browser: Marketplace loads
- [ ] Fresh incognito browser: Live demo loads (if deployed)
- [ ] Video plays and is under 3 minutes
- [ ] README renders correctly on GitHub
- [ ] All links work
- [ ] No console errors (dev tools)

---

## Submission Timeline

| Day | Task | Time |
|-----|------|------|
| May 5 | Regulatory accuracy audit + FHIR validation | 4h |
| May 6 | Video script + first recording | 2h |
| May 7 | Video editing (CapCut) + cover image | 2h |
| May 8–9 | Stress test (20+ scenarios) + bug fixes | 4h |
| May 10 | Final submission prep + README polish | 2h |
| May 11 | 09:00 Final E2E test | 1h |
| May 11 | 15:00 Devpost submission | 0.5h |

**Buffer**: 14 hours before deadline (11pm EDT = 5am May 12 Amsterdam)

---

## Judge-Specific Signals

### For Josh Mandel (FHIR architect)
- FHIR AuditEvent validator screenshot (0 errors) in README
- Correct DICOM audit event codes
- SMART on FHIR pattern documented

### For Joshua Hickey (Mayo TPM)
- "Deployable today" language
- Cloud Run + Secret Manager in DEPLOYMENT.md
- Health check endpoints documented

### For Piyush Mathur (Clinician)
- Nurse scenario in description
- "Enables sharing" (not refuses) framing
- Real-world care relationship examples

### For Stephon Proctor (CHOP ACHIO)
- SHARP context support highlighted
- Prompt Opinion Marketplace link prominent
- 5 MCP tools cleanly documented

### For Parth Tripathi (Google Vertex AI)
- GCP Cloud Run + Secret Manager prominently featured
- Cloud Logging structured JSON logging shown
- europe-west1 region (Amsterdam-adjacent) mentioned
- Gemini 2.0 Flash LLM used

### For Alice Zheng (VC)
- Market size mentioned ($2.5B)
- Use cases (every US hospital)
- Network effects (MCP server on Marketplace)
