#!/bin/bash
set -e

echo "🚀 Tramite Automated Deployment Script"
echo "======================================="

# Check if .env.deploy exists
if [ ! -f .env.deploy ]; then
  echo ""
  echo "❌ ERROR: .env.deploy file not found!"
  echo ""
  echo "Create .env.deploy with these credentials:"
  echo ""
  cat << 'EOF'
# Supabase Management API
SUPABASE_ACCESS_TOKEN=sbp_xxx

# Render API
RENDER_API_KEY=rnd_xxx

# Resend API
RESEND_API_KEY=re_xxx

# Your GitHub username
GITHUB_USERNAME=illmethinks0
EOF
  echo ""
  exit 1
fi

# Load environment variables
source .env.deploy

echo ""
echo "✅ Credentials loaded"
echo ""

# ============================================
# STEP 1: Create Supabase Project
# ============================================
echo "📦 Creating Supabase project..."

PROJECT_NAME="tramite-production"
DB_PASSWORD=$(openssl rand -base64 32)
REGION="us-east-1"

SUPABASE_RESPONSE=$(curl -s -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$PROJECT_NAME\",
    \"organization_id\": \"$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://api.supabase.com/v1/organizations | jq -r '.[0].id')\",
    \"region\": \"$REGION\",
    \"plan\": \"free\",
    \"db_pass\": \"$DB_PASSWORD\"
  }")

PROJECT_ID=$(echo $SUPABASE_RESPONSE | jq -r '.id')

if [ "$PROJECT_ID" == "null" ]; then
  echo "❌ Failed to create Supabase project"
  echo $SUPABASE_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Supabase project created: $PROJECT_ID"
echo "⏳ Waiting for project to be ready (this takes ~2 minutes)..."

# Wait for project to be ready
for i in {1..60}; do
  STATUS=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$PROJECT_ID" | jq -r '.status')

  if [ "$STATUS" == "ACTIVE_HEALTHY" ]; then
    echo "✅ Project is ready!"
    break
  fi

  echo "  Status: $STATUS (attempt $i/60)"
  sleep 5
done

# Get project details
PROJECT_DETAILS=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_ID")

SUPABASE_URL=$(echo $PROJECT_DETAILS | jq -r '.endpoint')
SUPABASE_ANON_KEY=$(curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_ID/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq -r '.anon')
SUPABASE_SERVICE_KEY=$(curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_ID/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq -r '.service_role')

echo ""
echo "📝 Supabase Credentials:"
echo "URL: $SUPABASE_URL"
echo "Anon Key: ${SUPABASE_ANON_KEY:0:20}..."
echo "Service Key: ${SUPABASE_SERVICE_KEY:0:20}..."
echo ""

# ============================================
# STEP 2: Run Database Migrations
# ============================================
echo "🗄️  Running database migrations..."

for MIGRATION in supabase/migrations/*.sql; do
  echo "  Running: $(basename $MIGRATION)"

  SQL_CONTENT=$(cat $MIGRATION)

  curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" > /dev/null

  echo "  ✅ Migration completed"
done

echo "✅ All migrations completed"
echo ""

# ============================================
# STEP 3: Create Storage Buckets
# ============================================
echo "🪣 Creating storage buckets..."

# Create pdf-templates bucket (private)
curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "pdf-templates",
    "name": "pdf-templates",
    "public": false,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["application/pdf"]
  }' > /dev/null

echo "✅ Created pdf-templates bucket (private)"

# Create generated-pdfs bucket (public)
curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "generated-pdfs",
    "name": "generated-pdfs",
    "public": true,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["application/pdf"]
  }' > /dev/null

echo "✅ Created generated-pdfs bucket (public)"
echo ""

# ============================================
# STEP 4: Create Render Web Service
# ============================================
echo "🌐 Creating Render web service..."

RENDER_SERVICE_RESPONSE=$(curl -s -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_service\",
    \"name\": \"tramite-production\",
    \"repo\": \"https://github.com/$GITHUB_USERNAME/tramite\",
    \"branch\": \"main\",
    \"buildCommand\": \"npm install && npm run build\",
    \"startCommand\": \"npm start\",
    \"envVars\": [
      {\"key\": \"NODE_VERSION\", \"value\": \"18.17.0\"},
      {\"key\": \"NEXT_PUBLIC_SUPABASE_URL\", \"value\": \"$SUPABASE_URL\"},
      {\"key\": \"NEXT_PUBLIC_SUPABASE_ANON_KEY\", \"value\": \"$SUPABASE_ANON_KEY\"},
      {\"key\": \"SUPABASE_SERVICE_ROLE_KEY\", \"value\": \"$SUPABASE_SERVICE_KEY\"},
      {\"key\": \"RESEND_API_KEY\", \"value\": \"$RESEND_API_KEY\"},
      {\"key\": \"RESEND_FROM_EMAIL\", \"value\": \"onboarding@resend.dev\"}
    ],
    \"region\": \"oregon\",
    \"plan\": \"free\"
  }")

SERVICE_ID=$(echo $RENDER_SERVICE_RESPONSE | jq -r '.service.id')

if [ "$SERVICE_ID" == "null" ]; then
  echo "❌ Failed to create Render service"
  echo $RENDER_SERVICE_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Render service created: $SERVICE_ID"

# Get service URL
SERVICE_URL=$(echo $RENDER_SERVICE_RESPONSE | jq -r '.service.serviceDetails.url')

echo "🌍 Your app will be available at: https://$SERVICE_URL"
echo ""

# Update NEXT_PUBLIC_APP_URL
curl -s -X PUT "https://api.render.com/v1/services/$SERVICE_ID/env-vars/NEXT_PUBLIC_APP_URL" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"value\": \"https://$SERVICE_URL\"}" > /dev/null

echo "✅ Updated app URL environment variable"
echo ""

# ============================================
# STEP 5: Trigger Deployment
# ============================================
echo "🚀 Triggering deployment..."

DEPLOY_RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "clear"}')

DEPLOY_ID=$(echo $DEPLOY_RESPONSE | jq -r '.id')

echo "✅ Deployment triggered: $DEPLOY_ID"
echo "⏳ Waiting for deployment to complete (this takes ~10 minutes)..."
echo ""

# Monitor deployment
for i in {1..120}; do
  DEPLOY_STATUS=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
    "https://api.render.com/v1/services/$SERVICE_ID/deploys/$DEPLOY_ID" | jq -r '.status')

  if [ "$DEPLOY_STATUS" == "live" ]; then
    echo "✅ Deployment successful!"
    break
  elif [ "$DEPLOY_STATUS" == "build_failed" ] || [ "$DEPLOY_STATUS" == "deploy_failed" ]; then
    echo "❌ Deployment failed with status: $DEPLOY_STATUS"
    exit 1
  fi

  echo "  Status: $DEPLOY_STATUS (attempt $i/120)"
  sleep 5
done

echo ""
echo "============================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "📝 Save these credentials:"
echo ""
echo "Supabase URL: $SUPABASE_URL"
echo "Supabase Anon Key: $SUPABASE_ANON_KEY"
echo "Supabase Service Key: $SUPABASE_SERVICE_KEY"
echo "Database Password: $DB_PASSWORD"
echo ""
echo "Application URL: https://$SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Visit your app: https://$SERVICE_URL"
echo "2. Create an account"
echo "3. Test the workflow"
echo ""
