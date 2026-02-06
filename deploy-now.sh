#!/bin/bash
set -e

echo "🚀 WinterLine - Automated Deployment"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Turso CLI is installed
if ! command -v turso &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Turso CLI...${NC}"
    curl -sSfL https://get.tur.so/install.sh | bash
    export PATH="$HOME/.turso:$PATH"
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✅ All tools ready${NC}"
echo ""

# Step 1: Turso setup
echo -e "${YELLOW}📊 Step 1/4: Database Setup${NC}"
echo "----------------------------"

turso auth login

DB_NAME="winterline-$(date +%s)"
echo "Creating database: $DB_NAME"
turso db create "$DB_NAME"

echo "Uploading schema and data (115 tools)..."
turso db shell "$DB_NAME" < db/schema.sql
turso db shell "$DB_NAME" < db/seed.sql

echo "Verifying data..."
turso db shell "$DB_NAME" "SELECT COUNT(*) FROM tools;"

echo "Getting connection details..."
TURSO_URL=$(turso db show "$DB_NAME" --url)
TURSO_TOKEN=$(turso db tokens create "$DB_NAME")

echo ""
echo -e "${GREEN}✅ Database ready!${NC}"
echo ""

# Step 2: Create .env file
echo -e "${YELLOW}🔐 Step 2/4: Environment Configuration${NC}"
echo "----------------------------------------"

SESSION_SECRET=$(openssl rand -base64 32)

cat > .env << ENVEOF
TURSO_URL=$TURSO_URL
TURSO_TOKEN=$TURSO_TOKEN
SESSION_SECRET=$SESSION_SECRET
NODE_ENV=production
ENVEOF

echo -e "${GREEN}✅ Environment configured${NC}"
echo ""

# Step 3: Git setup
echo -e "${YELLOW}📝 Step 3/4: Git Repository${NC}"
echo "----------------------------"

if [ ! -d .git ]; then
    git init
    git add .
    git commit -m "WinterLine AI Marketplace - Production Ready"
fi

echo -e "${GREEN}✅ Git ready${NC}"
echo ""

# Step 4: Deploy to Vercel
echo -e "${YELLOW}🚀 Step 4/4: Deploying to Vercel${NC}"
echo "----------------------------------"

vercel --yes

echo "Adding environment variables..."
echo "$TURSO_URL" | vercel env add TURSO_URL production
echo "$TURSO_TOKEN" | vercel env add TURSO_TOKEN production
echo "$SESSION_SECRET" | vercel env add SESSION_SECRET production

echo "Deploying to production..."
vercel --prod --yes

echo ""
echo "========================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "========================================"
echo ""
echo "🎉 Your AI Tools Marketplace is LIVE!"
echo ""
