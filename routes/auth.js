const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, attachUser } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();
  router.use(attachUser);

  // POST /api/auth/register - Create new user
  router.post('/register', (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
      if (existingUser) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user
      const result = db.prepare(
        'INSERT INTO users (username, email, password_hash, bio, profile_image) VALUES (?, ?, ?, ?, ?)'
      ).run(username, email, hashedPassword, '', null);

      res.status(201).json({
        message: 'User registered successfully',
        userId: result.lastInsertRowid
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // POST /api/auth/login - Verify credentials and set session
  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Find user
      const user = db.prepare('SELECT id, username, email, password_hash FROM users WHERE username = ?').get(username);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const passwordValid = bcrypt.compareSync(password, user.password_hash);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.email = user.email;

      res.json({
        message: 'Logged in successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // POST /api/auth/logout - Destroy session
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // GET /api/auth/me - Get current user from session
  router.get('/me', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    try {
      const user = db.prepare('SELECT id, username, email, bio, profile_image, created_at FROM users WHERE id = ?').get(req.session.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  return router;
};
