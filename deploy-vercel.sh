#!/bin/bash
# Quick deployment script for Vercel + Turso

echo "🚀 WinterLine Deployment to Vercel + Turso"
echo "=========================================="
echo ""

# Check if required commands exist
command -v turso >/dev/null 2>&1 || {
  echo "❌ Turso CLI not found. Installing..."
  curl -sSfL https://get.tur.so/install.sh | bash
}

command -v vercel >/dev/null 2>&1 || {
  echo "❌ Vercel CLI not found. Installing..."
  npm i -g vercel
}

echo "✅ All CLI tools ready"
echo ""

# Step 1: Turso setup
echo "📊 Step 1: Setting up Turso database"
echo "-----------------------------------"
turso auth login

read -p "Enter database name (default: winterline): " DB_NAME
DB_NAME=${DB_NAME:-winterline}

echo "Creating database: $DB_NAME"
turso db create $DB_NAME

echo "Pushing schema and seed data..."
turso db shell $DB_NAME < db/schema.sql
turso db shell $DB_NAME < db/seed.sql

echo "Getting connection details..."
turso db show $DB_NAME

read -p "Enter TURSO_URL: " TURSO_URL
read -p "Enter TURSO_TOKEN: " TURSO_TOKEN

# Create .env file
cat > .env << EOF
TURSO_URL=$TURSO_URL
TURSO_TOKEN=$TURSO_TOKEN
EOF

echo "✅ Database configured"
echo ""

# Step 2: Update package.json
echo "📦 Step 2: Installing dependencies"
echo "-----------------------------------"
npm install dotenv @libsql/client

echo "✅ Dependencies installed"
echo ""

# Step 3: Git setup
echo "🔧 Step 3: Git repository"
echo "-----------------------------------"
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial commit - WinterLine AI Marketplace"
fi

echo "✅ Git initialized"
echo ""

# Step 4: Deploy to Vercel
echo "🌐 Step 4: Deploying to Vercel"
echo "-----------------------------------"
vercel

echo ""
echo "Adding environment variables to Vercel..."
vercel env add TURSO_URL production <<< "$TURSO_URL"
vercel env add TURSO_TOKEN production <<< "$TURSO_TOKEN"

echo ""
echo "Deploying to production..."
vercel --prod

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Your marketplace is now live! 🎉"
echo ""
echo "Next steps:"
echo "1. Visit your Vercel dashboard to see the live URL"
echo "2. Add a custom domain (optional)"
echo "3. Setup monitoring and analytics"
echo ""
echo "📖 See DEPLOYMENT.md for more details"
