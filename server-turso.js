require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client');
const path = require('path');
const multer = require('multer');

const app = express();

// Turso database client
const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

// Database wrapper for compatibility
const dbWrapper = {
  prepare(sql) {
    return {
      async run(...params) {
        try {
          const result = await db.execute({ sql, args: params });
          return {
            lastInsertRowid: Number(result.lastInsertRowid) || 0,
            changes: result.rowsAffected || 0
          };
        } catch (err) {
          console.error('DB run error:', err);
          throw err;
        }
      },
      async get(...params) {
        try {
          const result = await db.execute({ sql, args: params });
          return result.rows[0] || null;
        } catch (err) {
          console.error('DB get error:', err);
          throw err;
        }
      },
      async all(...params) {
        try {
          const result = await db.execute({ sql, args: params });
          return result.rows || [];
        } catch (err) {
          console.error('DB all error:', err);
          throw err;
        }
      }
    };
  }
};

// Multer for file uploads (serverless-compatible)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: process.env.TURSO_URL ? 'connected' : 'not configured'
  });
});

// Mount routes
try {
  const authRoutes = require('./routes/auth');
  const toolRoutes = require('./routes/tools');
  const userRoutes = require('./routes/users');
  
  app.use('/api/auth', authRoutes(dbWrapper));
  app.use('/api/tools', toolRoutes(dbWrapper, upload));
  app.use('/api/users', userRoutes(dbWrapper));
} catch (err) {
  console.error('Error loading routes:', err);
}

// Serve pages
const servePage = (page) => (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', page));
};

app.get('/', servePage('home.html'));
app.get('/browse', servePage('browse.html'));
app.get('/tool/:id', servePage('tool-detail.html'));
app.get('/submit', servePage('submit.html'));
app.get('/login', servePage('login.html'));
app.get('/register', servePage('register.html'));
app.get('/profile/:id', servePage('profile.html'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Export for Vercel
module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`WinterLine running at http://localhost:${PORT}`);
  });
}
