# HealthGuard Devpost Submission Checklist

**Deadline**: May 11, 2026 @ 11:00 PM EDT (May 12, 5:00 AM Amsterdam)  
**Buffer**: 14 hours before deadline  
**Submit at**: https://devpost.com/software

---

## REGULATORY ACCURACY (CRITICAL — Do this first)

- [ ] Read 45 CFR §171.302–309 in full (actual Federal Register text, NOT summaries)
  - Start: https://www.ecfr.gov/current/title-45/part-171
  - Time budget: 2-3 hours
  - Goal: Can explain each exception from memory
  
- [ ] Verify every tool response against 3 real scenarios:
  - Scenario 1: Treatment referral (should return §171.302)
  - Scenario 2: Payment query (should return §171.303)
  - Scenario 3: Denied case (should return "NONE")

- [ ] Check exception names match CFR text EXACTLY
  - No typos or variations
  - Subsection numbers correct (§171.302a, not §171.302)

- [ ] Verify HIPAA minimum necessary logic (§164.502)
  - Treatment exception excludes minimum necessary
  - Other purposes require minimum necessary evaluation

- [ ] Validate AuditEvent at https://validator.fhir.org/
  - Generate test AuditEvent
  - Paste into validator
  - Select FHIR R4 → AuditEvent
  - Result must show: **0 errors, 0 warnings**
  - Screenshot the results page

---

## CODE QUALITY

- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm test` shows 180+ passing tests
- [ ] `git grep "api_key\|fhir_token\|secret"` returns 0 results
- [ ] No console errors on `npm start`
- [ ] PHI_LOGGING_ENABLED=false in .env.example and all configs
- [ ] All dependencies properly installed and locked

---

## FHIR COMPLIANCE

- [ ] AuditEvent passes validator.fhir.org (0 errors, 0 warnings)
- [ ] `docs/fhir-validation-screenshot.png` saved
- [ ] Consent resource test passes
- [ ] FHIR resources use correct coding systems
- [ ] README references validator screenshot

---

## GITHUB REPOSITORY

- [ ] README.md is complete and well-formatted
- [ ] CONTRIBUTING.md is present
- [ ] CHANGELOG.md is present with v0.2.0 entry
- [ ] docs/regulatory-reference.md is present with CFR links
- [ ] Repository is public
- [ ] All links in README work
- [ ] No sensitive data committed (check .gitignore)

---

## DEPLOYMENT & LIVE DEMO

- [ ] GCP Cloud Run deployed (if you want a live demo)
  - [ ] Dockerfile builds successfully
  - [ ] Docker image pushes to GCR
  - [ ] Cloud Run service is public and accessible
  - [ ] Health endpoint responds: `/health`
  - [ ] Readiness endpoint responds: `/ready`
  - [ ] Compliance check endpoint works: `/api/v1/compliance-check`
  - [ ] Dashboard loads: `/dashboard`

- [ ] OR: Provide "how to run locally" instructions (acceptable alternative)
  - [ ] `npm install`
  - [ ] `npm run build`
  - [ ] `npm start` works
  - [ ] Instructions in README

---

## SUBMISSION ASSETS

### Cover Image
- [ ] Dimensions exactly 1200×630px
- [ ] Dark theme (#0a0a0f background)
- [ ] "HealthGuard" title visible and readable
- [ ] Three color-coded badges (green/amber/teal)
- [ ] Code snippet on right side
- [ ] Bottom text: "MCP · FHIR R4 · SHARP · A2A · Prompt Opinion"
- [ ] No text or elements cut off
- [ ] File format: PNG or JPG
- [ ] File size: Under 1MB
- [ ] See COVER_IMAGE_DESIGN.txt for detailed spec

**How to create**: Use Canva (free, no experience needed)
1. Go to canva.com
2. Create custom size 1200×630
3. Follow steps in COVER_IMAGE_DESIGN.txt
4. Export as PNG
5. Upload to Devpost

### Demo Video
- [ ] Duration: Under 3 minutes (target 2:30)
- [ ] Shows the nurse scenario in action
- [ ] Clear audio (no background noise)
- [ ] Screen recording of visualizer + validator screenshot
- [ ] Content includes:
  - Problem statement (0:00–0:12)
  - Decision tree rendering (0:12–0:40)
  - Minimum necessary checks (0:40–1:00)
  - FHIR validator screenshot (1:00–1:25)
  - Architecture/deployment (1:25–1:50)
  - Market impact (1:50–2:20)
  - Call to action (2:20–2:30)
- [ ] Uploaded to YouTube (public or unlisted)
- [ ] URL is working and accessible

**Tools to create**: CapCut (free), Loom, or OBS Studio

### Marketplace Link
- [ ] Published on Prompt Opinion Marketplace
- [ ] URL: https://app.promptopinion.ai/marketplace/healthguard
- [ ] (Or confirm different URL and update links)

---

## DEVPOST FORM FIELDS

### Basic Info
- [ ] Project title: "HealthGuard — Regulatory Compliance Intelligence for Healthcare AI Agents"
- [ ] Tagline: "HIPAA + information blocking compliance for every AI agent." (~60 chars)
- [ ] Cover image uploaded (1200×630px PNG/JPG)

### Description
- [ ] 300+ words
- [ ] Opens with nurse scenario
- [ ] Explains 5 tools
- [ ] Mentions penalties and market ($2.5B)
- [ ] Highlights FHIR validation
- [ ] References CFR citations
- [ ] Notes GCP Cloud Run deployment
- [ ] Includes "Deployed at: [URL]" (if applicable)

### Links
- [ ] GitHub: https://github.com/manojmallick/healthguard-mcp
- [ ] Marketplace: https://app.promptopinion.ai/marketplace/healthguard
- [ ] Live Demo (optional): https://healthguard-[hash]-ew.a.run.app/dashboard
- [ ] Website/Blog (optional): [your URL if applicable]

### Video
- [ ] Uploaded to YouTube
- [ ] Duration under 3 minutes
- [ ] YouTube URL pasted into Devpost
- [ ] Video is public or unlisted (not private)

### Categories
Check ALL that apply:
- [ ] Healthcare
- [ ] AI/ML
- [ ] Compliance & Regulations
- [ ] Open Source
- [ ] APIs
- [ ] Distributed Web/Decentralization (if applicable)

### Hashtags
```
#HIPAA #HealthcareAI #Compliance #InformationBlocking #FHIR #RegulatoryCom pliance #MCP #HealthTech #AI #OpenSource
```

---

## FINAL VERIFICATION (Day of Submission)

**Run these checks 2 hours before deadline:**

### Code
```bash
git status                    # Should be clean
npm run build                 # Should succeed
npm test                      # Should show 180+ passing
npm start                     # Should start without errors
```

### GitHub
- [ ] Open https://github.com/manojmallick/healthguard-mcp
- [ ] Verify README renders correctly
- [ ] Check all links work
- [ ] Confirm latest commit is visible
- [ ] Check release/tags (if applicable)

### Live Demo (if deployed)
- [ ] Open in fresh incognito window
- [ ] `/health` endpoint returns JSON
- [ ] `/ready` endpoint returns JSON
- [ ] `/dashboard` loads visualizer
- [ ] `/api/v1/compliance-check` POST works
- [ ] No console errors (press F12)

### Marketplace
- [ ] https://app.promptopinion.ai/marketplace/healthguard loads
- [ ] Description is visible
- [ ] All 5 tools are listed

### Devpost Form
- [ ] All fields filled in
- [ ] Cover image uploaded and displays correctly
- [ ] Video can be played
- [ ] All links clickable
- [ ] Preview looks good

---

## SUBMISSION COMMAND (Final Step)

1. Go to: https://devpost.com/software
2. Click "Submit a project"
3. Fill in all fields (see DEVPOST FORM FIELDS above)
4. Review preview
5. Click "Submit"
6. Confirm submission confirmation email

**Screenshot the confirmation page and save it** (proof of submission)

---

## POST-SUBMISSION

- [ ] Share on LinkedIn with @judges
- [ ] Share on Twitter/X with #hackathon hashtag
- [ ] Monitor Devpost for comments
- [ ] Be ready for judging questions (May 11–12)

---

## EMERGENCY CONTACT

If something breaks right before submission:

**Issue**: Devpost form not accepting submission
- Solution: Try different browser (Chrome, Safari, Firefox)

**Issue**: Video won't upload
- Solution: Try uploading to different URL or embed YouTube link instead

**Issue**: GCP deployment down
- Solution: Delete "Live Demo" link from submission (not required)

**Issue**: Time crunch
- Solution: You have 14 hours buffer — prioritize regulatory accuracy over polish

---

## CONFIDENCE CHECK

Before submitting, answer these questions:

1. **Can you explain 45 CFR §171.302 without looking it up?**
   - If no: Read the actual regulation before submitting
   
2. **Does the FHIR AuditEvent pass validator.fhir.org at 0 errors?**
   - If no: Fix the AuditEvent schema before submitting
   
3. **Can you run through the nurse scenario end-to-end?**
   - If no: Test the visualizer locally before submitting
   
4. **Are you confident every CFR citation in the code is correct?**
   - If no: Do the regulatory accuracy audit (Section: REGULATORY ACCURACY)

If you answer YES to all 4, you're ready to submit.

---

## SUBMISSION TIME WINDOW

**Best times to submit** (avoid peak hours):
- May 11 at 9:00 AM EDT (before business hours surge)
- May 11 at 3:00 PM EDT (after lunch, before evening rush)
- May 11 at 10:00 PM EDT (1 hour before deadline — risky but ensures latest code)

**Recommended**: May 11 at 2:00 PM EDT (8 hours before deadline, no rush pressure)

---

**Final reminder**: Regulatory accuracy is worth more than polish. If you must choose between a perfect cover image and correct CFR citations, choose correct citations.

Good luck! 🚀
