const express = require('express');
const { requireAuth, attachUser } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();
  router.use(attachUser);

  // GET /api/users/:id - Get user profile with their tools
  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;

      // Get user info
      const user = db.prepare(`
        SELECT id, username, email, bio, profile_image, created_at
        FROM users WHERE id = ?
      `).get(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's tools
      const tools = db.prepare(`
        SELECT id, name, description, category, rating, download_count, icon_url, created_at
        FROM tools WHERE creator_id = ?
        ORDER BY created_at DESC
      `).all(id);

      // Get user statistics
      const stats = db.prepare(`
        SELECT
          COUNT(DISTINCT id) as tool_count,
          SUM(download_count) as total_downloads,
          AVG(rating) as avg_rating
        FROM tools WHERE creator_id = ?
      `).get(id);

      res.json({
        user,
        tools,
        stats: {
          toolCount: stats.tool_count || 0,
          totalDownloads: stats.total_downloads || 0,
          avgRating: stats.avg_rating || 0
        }
      });
    } catch (err) {
      console.error('Get user profile error:', err);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // PUT /api/users/:id - Update user profile (auth required)
  router.put('/:id', requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const { username, bio, email } = req.body;

      // Check if user is updating their own profile
      if (parseInt(id) !== userId) {
        return res.status(403).json({ error: 'You can only update your own profile' });
      }

      // Check if user exists
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if new username/email is already taken by another user
      if (username) {
        const existingUsername = db.prepare(
          'SELECT id FROM users WHERE username = ? AND id != ?'
        ).get(username, id);
        if (existingUsername) {
          return res.status(409).json({ error: 'Username already taken' });
        }
      }

      if (email) {
        const existingEmail = db.prepare(
          'SELECT id FROM users WHERE email = ? AND id != ?'
        ).get(email, id);
        if (existingEmail) {
          return res.status(409).json({ error: 'Email already in use' });
        }
      }

      // Update user
      const updates = [];
      const values = [];

      if (username) {
        updates.push('username = ?');
        values.push(username);
      }
      if (bio) {
        updates.push('bio = ?');
        values.push(bio);
      }
      if (email) {
        updates.push('email = ?');
        values.push(email);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);

      // Update session if username/email changed
      if (username) {
        req.session.username = username;
      }
      if (email) {
        req.session.email = email;
      }

      res.json({ message: 'Profile updated successfully' });
    } catch (err) {
      console.error('Update user profile error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  return router;
};
