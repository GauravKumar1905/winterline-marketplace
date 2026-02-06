const express = require('express');
const session = require('express-session');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Database paths
const dbPath = path.join(__dirname, 'winterline.db');
const schemaPath = path.join(__dirname, 'db', 'schema.sql');
const seedPath = path.join(__dirname, 'db', 'seed.sql');

// sql.js wrapper to match better-sqlite3 API
function createDbWrapper(sqlDb) {
  return {
    prepare(sql) {
      return {
        run(...params) {
          sqlDb.run(sql, params);
          const lastId = sqlDb.exec("SELECT last_insert_rowid() as id");
          const changes = sqlDb.getRowsModified();
          return {
            lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
            changes
          };
        },
        get(...params) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            return row;
          }
          stmt.free();
          return null;
        },
        all(...params) {
          const results = [];
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            results.push(row);
          }
          stmt.free();
          return results;
        }
      };
    },
    exec(sql) {
      sqlDb.exec(sql);
      return this;
    },
    _save() {
      const data = sqlDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  };
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'winterline-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Start the server
async function start() {
  const SQL = await initSqlJs();
  let sqlDb;

  if (fs.existsSync(dbPath)) {
    console.log('Loading existing database...');
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    console.log('Creating new database...');
    sqlDb = new SQL.Database();
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    sqlDb.exec(schema);
    console.log('Schema created. Seeding...');
    const seed = fs.readFileSync(seedPath, 'utf-8');
    sqlDb.exec(seed);
    console.log('Seeded.');
    // Save to disk
    const data = sqlDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }

  const db = createDbWrapper(sqlDb);

  // Auto-save database every 30 seconds
  setInterval(() => { db._save(); }, 30000);

  // Mount API routes
  const authRoutes = require('./routes/auth');
  const toolRoutes = require('./routes/tools');
  const userRoutes = require('./routes/users');
  app.use('/api/auth', authRoutes(db));
  app.use('/api/tools', toolRoutes(db, upload));
  app.use('/api/users', userRoutes(db));

  // Client-side routing
  const servePage = (page) => (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', page));
  };
  app.get('/', servePage('home.html'));
  app.get('/browse', servePage('browse.html'));
  app.get('/tool/:id', servePage('tool-detail.html'));
  app.get('/upload', servePage('upload.html'));
  app.get('/profile/:id', servePage('profile.html'));

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.listen(PORT, () => {
    console.log(`WinterLine running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
