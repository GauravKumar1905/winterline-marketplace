# WinterLine Deployment Guide

## Quick Deployment (Free Hosting) - 30 Minutes

### Option 1: Vercel + Turso (RECOMMENDED) ✨

**Why:** Serverless, SQLite-compatible, zero config, global CDN

**Cost:** **FREE** for up to 10K users/month

#### Step 1: Setup Turso Database (5 min)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth signup

# Create database
turso db create winterline

# Get connection info
turso db show winterline
# Copy: Database URL and Auth Token

# Push schema and data
turso db shell winterline < db/schema.sql
turso db shell winterline < db/seed.sql

# Verify
turso db shell winterline
# Run: SELECT COUNT(*) FROM tools;
# Should show: 115
```

#### Step 2: Update Code for Turso (5 min)

```bash
# Install dependencies
npm install dotenv @libsql/client

# Create environment file
cat > .env.example << 'EOF'
TURSO_URL=your-database-url-here
TURSO_TOKEN=your-auth-token-here
EOF
```

**Edit `server.js` - Replace database connection:**

```javascript
// OLD: const Database = require('better-sqlite3');
// NEW:
require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

// Update all db.prepare() calls to async:
// OLD: const result = db.prepare('SELECT * FROM tools').all();
// NEW: const result = await db.execute('SELECT * FROM tools');
```

#### Step 3: Deploy to Vercel (10 min)

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial WinterLine marketplace"

# Push to GitHub
gh repo create winterline-marketplace --public --source=. --push

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to GitHub repo? Yes
# - Project name: winterline-marketplace
# - Build command: (leave default)
# - Output directory: public

# Add environment variables in Vercel Dashboard
vercel env add TURSO_URL
vercel env add TURSO_TOKEN

# Redeploy with env vars
vercel --prod
```

**🎉 DONE! Your marketplace is live at: `https://winterline-marketplace.vercel.app`**

---

### Option 2: Railway + PlanetScale (Alternative)

**Why:** Full Node.js server, MySQL database, easy scaling

**Cost:** FREE with $5 monthly credit (500+ hours)

#### Step 1: Setup PlanetScale (MySQL)

```bash
# Install CLI
brew install planetscale/tap/pscale

# Login
pscale auth login

# Create database
pscale database create winterline --region us-east

# Connect
pscale shell winterline main

# Migrate schema (convert SQLite -> MySQL)
# See schema-mysql.sql below

# Create connection string
pscale password create winterline main winterline-password
# Save: Connection string
```

#### Step 2: Convert Schema to MySQL

Create `db/schema-mysql.sql`:

```sql
-- MySQL version of schema
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_image TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS tools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT NOT NULL,
  short_desc TEXT,
  full_description TEXT,
  category VARCHAR(100),
  version VARCHAR(50),
  creator_id INT,
  creator_name VARCHAR(255),
  icon_url TEXT,
  file_url TEXT,
  website_url TEXT,
  github_url TEXT,
  extension_store_url TEXT,
  source VARCHAR(50) DEFAULT 'manual',
  source_id VARCHAR(255),
  rating DECIMAL(3,1) DEFAULT 0,
  download_count INT DEFAULT 0,
  install_count INT DEFAULT 0,
  stars INT DEFAULT 0,
  tags JSON,
  license VARCHAR(50),
  pricing_model VARCHAR(20) DEFAULT 'free',
  last_updated VARCHAR(50),
  problem_solved TEXT,
  target_audience VARCHAR(100),
  setup_difficulty VARCHAR(50),
  best_for TEXT,
  alternatives TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  INDEX idx_source (source),
  INDEX idx_category (category),
  INDEX idx_slug (slug),
  INDEX idx_github_url (github_url)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tool_id INT NOT NULL,
  creator_id INT NOT NULL,
  rating INT NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tools(id),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS raw_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  source VARCHAR(50) NOT NULL,
  search_query TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  data_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_source (source)
);
```

#### Step 3: Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to GitHub repo
railway link

# Add environment variables
railway variables set DATABASE_URL="mysql://user:pass@host/db"

# Deploy
railway up

# Domain
railway domain
```

**🎉 LIVE at: `https://winterline-production.up.railway.app`**

---

### Option 3: Render + Supabase (PostgreSQL)

**Why:** Generous free tier, PostgreSQL with built-in auth

**Cost:** FREE (750 hours/month server + 500MB DB)

#### Setup Supabase (PostgreSQL)

1. Go to https://supabase.com/dashboard
2. Create new project: "winterline"
3. Get connection string from Settings → Database
4. Use schema-postgres.sql (similar to MySQL conversion)

#### Deploy to Render

1. Go to https://render.com/dashboard
2. New → Web Service
3. Connect GitHub repo
4. Add env var: `DATABASE_URL`
5. Deploy

---

## Comparison Table

| Platform | DB | Free Tier | Cold Start | Best For |
|----------|-----|-----------|------------|----------|
| **Vercel + Turso** | SQLite | Unlimited | ~100ms | Serverless, global |
| **Railway + PlanetScale** | MySQL | $5 credit | None | Full server |
| **Render + Supabase** | PostgreSQL | 750hrs | ~1min | PostgreSQL features |
| **Cloudflare Pages + D1** | SQLite | 100K req/day | ~50ms | Edge computing |

---

## Production Checklist

### Security
- [ ] Add rate limiting (`express-rate-limit`)
- [ ] Enable CORS with whitelist
- [ ] Add helmet.js for security headers
- [ ] Use HTTPS only (enforced by platforms)
- [ ] Add input validation (express-validator)

### Performance
- [ ] Add Redis caching (Upstash free tier)
- [ ] Enable gzip compression
- [ ] Add CDN for static assets
- [ ] Database connection pooling
- [ ] Implement pagination (100 items/page)

### Monitoring
- [ ] Add Sentry for error tracking (free tier)
- [ ] Setup Vercel Analytics (free)
- [ ] Add Uptime monitoring (UptimeRobot - free)
- [ ] Database query logging

### Features
- [ ] Search functionality (full-text search)
- [ ] Filter by category, stars, pricing
- [ ] User authentication (optional)
- [ ] Tool submission form
- [ ] RSS feed for new tools
- [ ] API endpoint for tools list

---

## Cost Scaling

### When Free Tier Runs Out

**0-10K users/month:** FREE
**10-100K users/month:** $20-50/month
- Vercel Pro: $20/mo
- Turso Scaler: $29/mo (25GB)

**100K-1M users/month:** $100-200/month
- Add CDN (Cloudflare): FREE
- Add Redis caching (Upstash): $10/mo
- Upgrade database: $50-100/mo

---

## Migration Scripts

### SQLite → Turso (No changes needed!)
```bash
# Direct copy
turso db shell winterline < db/schema.sql
turso db shell winterline < db/seed.sql
```

### SQLite → MySQL
```bash
# Convert with sqlite3-to-mysql
npm install -g sqlite3-to-mysql
sqlite3-to-mysql --sqlite-file winterline.db --mysql-host host --mysql-database db
```

### SQLite → PostgreSQL
```bash
# Use pgloader
brew install pgloader
pgloader winterline.db postgresql://user:pass@host/db
```

---

## Continuous Deployment

### Automatic Updates from GitHub

**Vercel:**
- Push to `main` branch → auto-deploys
- Pull requests → preview deployments

**Railway:**
- Push to `main` → auto-deploys
- Rollback in 1 click

**Render:**
- Push to `main` → auto-deploys
- Manual approval option available

---

## Domain Setup (Optional)

### Custom Domain (if you have one)

**Vercel:**
```bash
vercel domains add winterline.io
# Add DNS records as shown
```

**Railway:**
```bash
railway domain add winterline.io
```

**Free Domain Options:**
- Vercel: `yourname.vercel.app` (FREE)
- Railway: `yourname.up.railway.app` (FREE)
- Render: `yourname.onrender.com` (FREE)

---

## Next Steps

1. **Choose your stack** (recommended: Vercel + Turso)
2. **Setup database** (5 min)
3. **Deploy code** (10 min)
4. **Add custom domain** (optional, 5 min)
5. **Share the link!** 🚀

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Turso Docs:** https://docs.turso.tech
- **Railway Docs:** https://docs.railway.app
- **PlanetScale Docs:** https://planetscale.com/docs

---

## Automated Scraping (Future)

To keep tools data fresh:

### Option 1: GitHub Actions (Free)

Create `.github/workflows/update-data.yml`:

```yaml
name: Update Tool Data
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch: # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node scripts/collect-data.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: node scripts/rebuild-db.js
      - name: Deploy to Turso
        run: |
          turso db shell winterline < db/seed.sql
```

### Option 2: Vercel Cron Jobs

Add `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/update-tools",
    "schedule": "0 0 * * 0"
  }]
}
```

---

**🎉 Your AI Tools Marketplace is ready to go live!**

**Recommended:** Start with Vercel + Turso for the easiest setup and best performance.
