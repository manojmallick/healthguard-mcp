# Publishing HealthGuard to Prompt Opinion Marketplace

Complete step-by-step guide to publish HealthGuard as an A2A agent on Prompt Opinion.

---

## Prerequisites

✅ HealthGuard deployed to GCP Cloud Run (see [../DEPLOYMENT.md](../DEPLOYMENT.md))  
✅ Prompt Opinion account (register at https://app.promptopinion.ai)  
✅ Agent is live and responding to requests

**Verify your deployment is ready:**
```bash
export SERVICE_URL="https://your-healthguard-url.a.run.app"
curl $SERVICE_URL/health
# Expected: {"status":"ok","version":"0.2.0"}

curl $SERVICE_URL/ready
# Expected: {"ready":true,"checks":{...}}
```

---

## Step 1: Get Your Cloud Run URL

If you haven't already deployed, deploy now:

```bash
# From healthguard-mcp root directory
gcloud run deploy healthguard \
  --image=gcr.io/$PROJECT_ID/healthguard:latest \
  --region=europe-west1 \
  --allow-unauthenticated \
  --set-secrets="GOOGLE_GEMINI_API_KEY=healthguard-gemini-key:latest"
```

Get your service URL:
```bash
export SERVICE_URL=$(gcloud run services describe healthguard \
  --region=europe-west1 \
  --format='value(status.url)')
echo "HealthGuard URL: $SERVICE_URL"
# Example: https://healthguard-abc123-ew.a.run.app
```

Save this URL — you'll need it in Step 3.

---

## Step 2: Create Prompt Opinion Account & Login

1. **Navigate to**: https://app.promptopinion.ai
2. **Sign up** with your email (if new account)
3. **Verify email** (check inbox for verification link)
4. **Log in** with your credentials

---

## Step 3: Register Agent on Prompt Opinion

### 3a. Navigate to Agent Management

1. After login, click **"Dashboard"** (top right)
2. Look for **"Agents"** or **"Agent Management"** section
3. Click **"+ Create Agent"** or **"Add New Agent"**

### 3b. Fill Agent Registration Form

**Basic Information:**

| Field | Value |
|-------|-------|
| **Agent Name** | `HealthGuard` (or customize) |
| **Agent Type** | `A2A Server` or `MCP Server` |
| **Protocol Version** | `1.0` |
| **Base URL** | `[Your Cloud Run URL from Step 1]` |
| **Agent Card Endpoint** | `/.well-known/agent.json` |

**Example:**
```
Agent Name: HealthGuard Compliance Intelligence
Base URL: https://healthguard-abc123-ew.a.run.app
Agent Card Path: /.well-known/agent.json
```

### 3c. Advanced Settings

| Field | Value |
|-------|-------|
| **SHARP Support** | ✅ Yes (enabled) |
| **Authentication Type** | `None` (public service) |
| **Rate Limiting** | `Enabled` (default: 100 req/min) |
| **Timeout (seconds)** | `60` |
| **Retry Policy** | `Exponential backoff` |

**Description** (for marketplace display):
```
Healthcare regulatory compliance intelligence. Answers the question:
"Is this patient data access legally permissible?" using HIPAA,
ONC information blocking, and state privacy law reasoning.

5 tools: information blocking exceptions, minimum necessary assessment,
patient consent validation, FHIR audit event generation, regulatory lookup.

SHARP context supported for seamless EHR integration.
```

### 3d. Test Connection

Click **"Test Connection"** button.

**Expected response:**
```json
{
  "status": "ok",
  "version": "0.2.0",
  "service": "healthguard-mcp",
  "region": "europe-west1"
}
```

✅ If green: proceed to Step 4  
❌ If red: check Cloud Run URL is correct and service is running

---

## Step 4: Auto-Discovery of Tools

Prompt Opinion will automatically discover the 5 tools from your agent card endpoint (`/.well-known/agent.json`).

**You should see listed:**

1. ✅ **check_information_blocking**
   - Type: compliance assessment
   - Input: requester_role, data_type, care_relationship, urgency
   - Output: permitted, applicable_exception, exception_subsection

2. ✅ **assess_hipaa_minimum_necessary**
   - Type: privacy assessment
   - Input: phi_elements_requested, stated_purpose, requester_role
   - Output: assessment, approved_elements, flagged_elements

3. ✅ **check_patient_consent**
   - Type: consent validation
   - Input: patient_fhir_id, data_category, proposed_action
   - Output: consent_status, conditions, action_recommended

4. ✅ **generate_audit_event**
   - Type: compliance proof
   - Input: action, patient_id, data_accessed, outcome, purpose
   - Output: fhir_audit_event, sha256_hash

5. ✅ **get_applicable_regulations**
   - Type: regulatory lookup
   - Input: care_setting, data_type, proposed_action, state
   - Output: regulations, compliance_checklist, summary

If tools don't appear:
1. Check that `$SERVICE_URL/health` returns status "ok"
2. Try clicking "Refresh Tools" button (if available)
3. Wait 30 seconds and refresh page

---

## Step 5: Test Agent on Platform

**Test Query:**
```
"A specialist wants access to medication list for a patient referral. 
Routine urgency."
```

**Expected response:**
```json
{
  "permitted": true,
  "applicable_exception": "TREATMENT",
  "exception_subsection": "45 CFR §171.302(a)",
  "conditions_met": [
    "Requester is treating or referring provider",
    "Purpose is treatment or referral",
    "Treatment relationship exists"
  ],
  "approved_elements": ["name", "dob", "mrn", "medications"],
  "flagged_elements": ["lab_history"],
  "recommended_action": "Access permitted under HIPAA treatment exception"
}
```

**If response fails:**
- Check Cloud Run logs: `gcloud run logs read healthguard --region=europe-west1 --limit=50`
- Verify GOOGLE_GEMINI_API_KEY is set in Cloud Run environment variables
- Check FHIR server is accessible (default: https://hapi.fhir.org/baseR4)

---

## Step 6: Configure Agent Metadata

**Fill optional but recommended fields:**

### Agent Tags
```
healthcare-ai
compliance
hipaa
information-blocking
fhir
regulatory
audit-trail
a2a-protocol
```

### Version
```
0.2.0
```

### Category
```
Healthcare & Compliance
```

### Documentation URL
```
https://github.com/manojmallick/healthguard-mcp
```

### Support Email
```
your-email@example.com
```

### License
```
MIT
```

---

## Step 7: Publish to Marketplace (Optional)

If you want HealthGuard visible in the public Prompt Opinion agent marketplace:

1. Click **"Publish to Marketplace"** button
2. Accept terms of service (healthcare use cases only)
3. Confirm publication

**Marketplace listing will show:**
- Agent name & description
- 5 tools available
- SHARP support: Yes
- Rating & usage statistics (after agents use it)

**Public URL:**
```
https://app.promptopinion.ai/marketplace/healthguard
```

(Replace "healthguard" with your custom agent name if different)

---

## Step 8: Verify Publication

### Check via API
```bash
# List your agents
curl https://app.promptopinion.ai/api/agents \
  -H "Authorization: Bearer $PO_API_TOKEN"

# Get agent details
curl https://app.promptopinion.ai/api/agents/healthguard \
  -H "Authorization: Bearer $PO_API_TOKEN"
```

### Check in Platform UI
1. Dashboard → Agents
2. Should show "HealthGuard" with status "Published" or "Active"
3. Click to view details, tools, and usage statistics

### Check Marketplace (if published)
Navigate to: https://app.promptopinion.ai/marketplace/healthguard

You should see your agent card with:
- ✅ Agent name and description
- ✅ 5 tools listed
- ✅ SHARP support badge
- ✅ Usage statistics

---

## Step 9: Enable Other Agents to Call HealthGuard

**Your agent is now discoverable.**

Other agents on Prompt Opinion can call HealthGuard by:
1. Finding it in the marketplace
2. Instantiating it in their workflow
3. Passing SHARP context (patient ID, FHIR credentials)
4. Calling the 5 tools in sequence

**Example integration from another agent:**
```typescript
// Call HealthGuard check_information_blocking tool
const result = await healthguard.checkInformationBlocking({
  requested_data_type: 'medications',
  requester_role: 'specialist',
  care_relationship: 'referral',
  urgency: 'routine',
  _sharp_patient_id: 'patient-123',
  _sharp_fhir_base_url: 'https://hapi.fhir.org/baseR4'
});
```

---

## Troubleshooting

### Agent doesn't appear after registration

**Issue:** Tools not discovered  
**Solution:**
1. Verify `curl $SERVICE_URL/.well-known/agent.json` returns agent card
2. Check if JSON is valid (copy output to https://jsonlint.com/)
3. Restart Cloud Run service: `gcloud run deploy healthguard --region=europe-west1`

### Tests fail with "GOOGLE_GEMINI_API_KEY is required"

**Issue:** LLM API key not available  
**Solution:**
```bash
# Check if secret is set
gcloud run services describe healthguard --region=europe-west1 \
  --format='value(spec.template.spec.containers[0].env[?(@.name=="GOOGLE_GEMINI_API_KEY")])'

# If missing, update:
gcloud run deploy healthguard --region=europe-west1 \
  --set-secrets="GOOGLE_GEMINI_API_KEY=healthguard-gemini-key:latest"
```

### FHIR validator shows errors

**Issue:** AuditEvent doesn't pass validator.fhir.org  
**Solution:**
1. Check Cloud Run logs: `gcloud run logs read healthguard --region=europe-west1`
2. Verify AuditEvent JSON structure in `src/tools/auditEvent.ts`
3. Manually test: `curl $SERVICE_URL/api/v1/compliance-check` and copy auditEvent JSON to validator

### Timeout errors

**Issue:** Requests timing out  
**Solution:**
1. Check Cloud Run CPU allocation: should be ≥1 vCPU
2. Increase timeout in Prompt Opinion settings (default 60s)
3. Monitor Cloud Run metrics for slow requests

---

## Monitoring & Maintenance

### View Agent Usage

Dashboard → Agents → HealthGuard → Analytics
- Total calls per day
- Tool usage breakdown
- Average response time
- Error rate

### View Logs

```bash
gcloud run logs read healthguard --region=europe-west1 --limit=100
# Filter by severity
gcloud run logs read healthguard --region=europe-west1 --limit=100 | grep ERROR
```

### Update Agent

To deploy a new version:

```bash
# Build new image
docker build -t gcr.io/$PROJECT_ID/healthguard:v2 .
docker push gcr.io/$PROJECT_ID/healthguard:v2

# Deploy
gcloud run deploy healthguard \
  --image=gcr.io/$PROJECT_ID/healthguard:v2 \
  --region=europe-west1

# Platform auto-discovers updated agent card
```

### Update Tools

Changes to tool schemas automatically picked up by Prompt Opinion within 30 seconds. No republishing needed.

---

## Support

**For Prompt Opinion platform questions:**
- Join Discord: https://discord.gg/JS2bZVruUg
- Email: support@promptopinion.ai

**For HealthGuard questions:**
- GitHub Issues: https://github.com/manojmallick/healthguard-mcp/issues
- Email: [your-email]

---

## Checklist: Before Going Live

- [ ] Cloud Run service deployed and responding to `/health`
- [ ] Agent registered on Prompt Opinion
- [ ] Agent card endpoint returns valid JSON
- [ ] 5 tools discovered and listed
- [ ] Test query returns expected compliance decision
- [ ] GOOGLE_GEMINI_API_KEY set in Cloud Run secrets
- [ ] FHIR server connectivity verified (test query against HAPI)
- [ ] Marketplace visibility set correctly (public/private)
- [ ] Documentation link points to GitHub repo
- [ ] Support email configured

✅ You're live and ready for healthcare AI agents to use HealthGuard!
