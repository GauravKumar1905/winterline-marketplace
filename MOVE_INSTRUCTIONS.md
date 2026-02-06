# 📦 Moving WinterLine to Your Desktop

## Current Location
Your WinterLine project is currently at:
`/sessions/happy-keen-hamilton/mnt/WinterLine/`

This is a **mounted folder** - it's already somewhere on your computer!

## To Move to Desktop

### Option 1: Using Finder (macOS)
1. Open Finder
2. Press `Cmd+Shift+G` (Go to Folder)
3. Navigate to where WinterLine currently is
4. Copy the entire `WinterLine` folder
5. Navigate to `/Users/gauravkumar/Desktop/Personal/`
6. Paste the folder there
7. You'll have: `/Users/gauravkumar/Desktop/Personal/WinterLine/`

### Option 2: Using Terminal
```bash
# Create Personal directory if it doesn't exist
mkdir -p /Users/gauravkumar/Desktop/Personal

# Copy WinterLine to Desktop
# (Replace SOURCE_PATH with where WinterLine currently is)
cp -r SOURCE_PATH/WinterLine /Users/gauravkumar/Desktop/Personal/

# Or move it:
mv SOURCE_PATH/WinterLine /Users/gauravkumar/Desktop/Personal/
```

### Option 3: Fresh Start on Desktop
If you want a clean copy on your Desktop:

```bash
cd /Users/gauravkumar/Desktop/Personal
mkdir -p WinterLine
cd WinterLine

# Then copy these essential files from the old location:
# - All .js, .json, .md, .sh files
# - routes/ folder
# - db/ folder
# - scripts/ folder
# - public/ folder
# - .env.example, .gitignore, vercel.json
```

## ⚠️ Important: Before Moving

1. **Check Git status:**
   ```bash
   cd WinterLine
   git status
   ```

2. **Commit any changes:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   ```

3. **Backup database:**
   ```bash
   cp winterline.db winterline.db.backup
   ```

## After Moving

1. **Navigate to new location:**
   ```bash
   cd /Users/gauravkumar/Desktop/Personal/WinterLine
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Test locally:**
   ```bash
   npm start
   # Visit http://localhost:3000
   ```

4. **Deploy:**
   ```bash
   ./deploy-now.sh
   ```

## What to Copy

**Essential files (must copy):**
- ✅ `server.js`, `server-turso.js`
- ✅ `package.json`, `package-lock.json`
- ✅ `vercel.json`
- ✅ `.env.example`, `.gitignore`
- ✅ `routes/` folder (auth, tools, users)
- ✅ `db/` folder (schema.sql, seed.sql)
- ✅ `scripts/` folder (all .js files)
- ✅ `public/` folder (if you have HTML/CSS)
- ✅ All `.md` files (documentation)
- ✅ All `.sh` files (deployment scripts)

**Skip these (will be recreated):**
- ❌ `node_modules/` (run `npm install` after moving)
- ❌ `winterline.db` (production uses Turso)
- ❌ `data/` folder (temporary scraping data)
- ❌ `.vercel/` folder (deployment cache)

## Quick Copy Command

To copy just the essential files:

```bash
# Create destination
mkdir -p /Users/gauravkumar/Desktop/Personal/WinterLine

# Copy essential directories
cp -r routes db scripts public /Users/gauravkumar/Desktop/Personal/WinterLine/

# Copy essential files
cp *.js *.json *.md *.sh .env.example .gitignore vercel.json \
   /Users/gauravkumar/Desktop/Personal/WinterLine/

# Navigate to new location
cd /Users/gauravkumar/Desktop/Personal/WinterLine

# Install dependencies
npm install

# Ready to deploy!
./deploy-now.sh
```

## Verification Checklist

After moving, verify you have:
- [ ] All route files (auth.js, tools.js, users.js)
- [ ] Database files (schema.sql, seed.sql with 115 tools)
- [ ] Deployment scripts (deploy-now.sh, deploy-vercel.sh)
- [ ] Configuration (vercel.json, package.json)
- [ ] Documentation (all .md files)

Then you're ready to deploy! 🚀
