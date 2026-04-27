# HealthGuard Deployment Guide

## GCP Cloud Run Deployment

### Prerequisites

1. **Google Cloud Account**: https://cloud.google.com/
2. **Google Cloud SDK**: https://cloud.google.com/sdk/docs/install
3. **Docker**: https://docs.docker.com/get-docker/
4. **Gemini API Key**: https://aistudio.google.com

### Quick Start

```bash
# 1. Set your GCP project ID
export PROJECT_ID=your-gcp-project-id
gcloud config set project $PROJECT_ID

# 2. Enable required APIs
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com

# 3. Create Secret Manager secret for Gemini API key
echo -n "your-google-gemini-api-key-here" | \
  gcloud secrets create healthguard-gemini-key \
  --data-file=-

# 4. Grant Cloud Run service account access to secret
gcloud secrets add-iam-policy-binding healthguard-gemini-key \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID \
    --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 5. Build and push Docker image
docker build -t gcr.io/$PROJECT_ID/healthguard:v1 .
docker push gcr.io/$PROJECT_ID/healthguard:v1

# 6. Deploy to Cloud Run
gcloud run deploy healthguard \
  --image=gcr.io/$PROJECT_ID/healthguard:v1 \
  --region=europe-west1 \
  --platform=managed \
  --port=3100 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=60 \
  --allow-unauthenticated \
  --set-secrets="GOOGLE_GEMINI_API_KEY=healthguard-gemini-key:latest" \
  --set-env-vars="NODE_ENV=production,\
FHIR_BASE_URL=https://hapi.fhir.org/baseR4,\
MCP_SERVER_NAME=healthguard,\
MCP_SERVER_VERSION=0.2.0,\
GEMINI_MODEL=gemini-2.0-flash,\
AUDIT_HASH_ALGORITHM=sha256,\
PHI_LOGGING_ENABLED=false,\
IB_EXCEPTIONS_VERSION=2024"

# 7. Get the service URL
export SERVICE_URL=$(gcloud run services describe healthguard \
  --region=europe-west1 \
  --format='value(status.url)')
echo "HealthGuard live at: $SERVICE_URL"
```

### Verification

```bash
# Health check (liveness probe)
curl $SERVICE_URL/health

# Readiness check
curl $SERVICE_URL/ready

# Compliance check endpoint
curl -X POST $SERVICE_URL/api/v1/compliance-check \
  -H "Content-Type: application/json" \
  -d '{
    "data_type":"medications",
    "requester_role":"specialist",
    "care_relationship":"referral",
    "urgency":"routine"
  }'

# Access visualizer dashboard
open $SERVICE_URL/dashboard
```

### Monitoring

View logs in Cloud Console:
```bash
gcloud run logs read healthguard --region=europe-west1 --limit 50
```

### Updating Deployment

After code changes:
```bash
docker build -t gcr.io/$PROJECT_ID/healthguard:v2 .
docker push gcr.io/$PROJECT_ID/healthguard:v2

gcloud run deploy healthguard \
  --image=gcr.io/$PROJECT_ID/healthguard:v2 \
  --region=europe-west1 \
  --platform=managed
```

### Cost Estimation

- Cloud Run: Free tier covers 2M requests/month
- Container Registry: Free tier covers 1GB storage
- Secret Manager: Free tier covers 10K operations/month
- Cloud Build: Free tier covers 120 build-minutes/day

**Total for hackathon window**: $0 with free tiers + GCP credits
