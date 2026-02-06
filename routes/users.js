const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // Get user profile
  router.get('/:id', async (req, res) => {
    try {
      const user = await db.prepare('SELECT id, username, email, profile_image, bio, created_at FROM users WHERE id = ?').get(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const tools = await db.prepare('SELECT * FROM tools WHERE creator_id = ? ORDER BY created_at DESC').all(req.params.id);

      const reviews = await db.prepare(`
        SELECT r.*, t.name as tool_name 
        FROM reviews r 
        JOIN tools t ON r.tool_id = t.id 
        WHERE r.creator_id = ? 
        ORDER BY r.created_at DESC
      `).all(req.params.id);

      res.json({ user, tools, reviews });
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
