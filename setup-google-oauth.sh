#!/bin/bash

# Google OAuth Setup Script for Tramite
# This script automatically configures Google OAuth in Supabase

set -e

echo "🔐 Google OAuth Configuration Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Supabase credentials
SUPABASE_TOKEN="sbp_b4e423b843c3afcfe8211f7d81e21b5f9673b84a"
PROJECT_ID="wdhhldevvcpsoxfyavbg"
PROJECT_URL="https://wdhhldevvcpsoxfyavbg.supabase.co"

echo -e "${YELLOW}📋 What you need:${NC}"
echo "1. Google Client ID"
echo "2. Google Client Secret"
echo ""
echo -e "${YELLOW}🌐 Get them from: https://console.cloud.google.com/apis/credentials${NC}"
echo ""
echo "Instructions:"
echo "1. Create a new OAuth 2.0 Client ID (Web application)"
echo "2. Add authorized redirect URI: ${PROJECT_URL}/auth/v1/callback"
echo "3. Add authorized redirect URI: http://localhost:3000/auth/callback"
echo ""
echo "=========================================="
echo ""

# Prompt for credentials
read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
read -sp "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET
echo ""
echo ""

if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ Error: Both Client ID and Secret are required${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Configuring Google OAuth in Supabase...${NC}"

# Configure Google OAuth via Supabase API
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "https://api.supabase.com/v1/projects/${PROJECT_ID}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"external_google_enabled\": true,
    \"external_google_client_id\": \"${GOOGLE_CLIENT_ID}\",
    \"external_google_secret\": \"${GOOGLE_CLIENT_SECRET}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✅ Google OAuth enabled successfully in Supabase!${NC}"
else
    echo -e "${RED}❌ Failed to enable Google OAuth. HTTP Code: ${HTTP_CODE}${NC}"
    echo "Response: $BODY"
    exit 1
fi

# Create/update .env.local file
echo -e "${YELLOW}📝 Creating .env.local file...${NC}"

cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${PROJECT_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo -e "${GREEN}✅ .env.local file created!${NC}"
echo ""

# Get Supabase anon key
echo -e "${YELLOW}🔑 Fetching Supabase anon key...${NC}"
ANON_KEY=$(curl -s "https://api.supabase.com/v1/projects/${PROJECT_ID}/api-keys" \
  -H "Authorization: Bearer ${SUPABASE_TOKEN}" \
  | grep -o '"anon":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ANON_KEY" ]; then
    # Update .env.local with anon key
    sed -i.bak "s|<your-anon-key>|${ANON_KEY}|g" .env.local
    rm .env.local.bak 2>/dev/null || true
    echo -e "${GREEN}✅ Anon key added to .env.local!${NC}"
else
    echo -e "${YELLOW}⚠️  Could not fetch anon key automatically${NC}"
    echo "Please add it manually to .env.local"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Google OAuth Configuration Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Go to http://localhost:3000/login"
echo "3. Click 'Sign in with Google'"
echo "4. You should be redirected to Google OAuth"
echo ""
echo -e "${YELLOW}📄 Configuration saved to .env.local${NC}"
echo ""
