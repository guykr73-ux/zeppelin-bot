#!/bin/bash

# =============================================================================
# Zeppelin Cloud Edition: GCF Deployment Script
# This script deploys the WhatsApp Webhook function to Google Cloud Functions.
# =============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration variables (Adjust these before running)
FUNCTION_NAME="whatsappWebhook"
RUNTIME="nodejs20"
REGION="us-central1"
PROJECT_ID="YOUR_GCP_PROJECT_ID" # Replace with your GCP project ID

# Environment variables to pass to the function.
# NOTE: In production, it is highly recommended to use Google Secret Manager for sensitive API keys!
# You can reference them via: --set-secrets="GROQ_API_KEY=groq-api-key-secret:latest"
ENV_VARS="AI_PROVIDER=groq,\
GREEN_API_INSTANCE_ID=YOUR_GREEN_API_INSTANCE_ID,\
GREEN_API_TOKEN=YOUR_GREEN_API_TOKEN,\
GROQ_API_KEY=YOUR_GROQ_API_KEY,\
GEMINI_API_KEY=YOUR_GEMINI_API_KEY,\
ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY_32_CHARS,\
FIRESTORE_PROJECT_ID=${PROJECT_ID}"

echo "=== Deploying ${FUNCTION_NAME} to Google Cloud Functions (2nd Gen) ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Runtime: ${RUNTIME}"

gcloud functions deploy ${FUNCTION_NAME} \
  --gen2 \
  --runtime=${RUNTIME} \
  --region=${REGION} \
  --trigger-http \
  --entry-point=${FUNCTION_NAME} \
  --allow-unauthenticated \
  --project=${PROJECT_ID} \
  --set-env-vars="${ENV_VARS}"

echo "=== Deployment Successful! ==="
echo "Note: Make sure the service account running this function has the 'Cloud Datastore User' (roles/datastore.user)"
echo "role in GCP IAM to access the Firestore database."
