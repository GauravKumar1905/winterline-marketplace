const express = require('express');

module.exports = (db, upload) => {
  const router = express.Router();

  // Get all tools with search and filters
  router.get('/', async (req, res) => {
    try {
      const { search, category, sort, limit = 50, offset = 0 } = req.query;
      
      let sql = 'SELECT * FROM tools WHERE 1=1';
      const params = [];

      if (search) {
        sql += ' AND (name LIKE ? OR description LIKE ? OR short_desc LIKE ? OR tags LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (category && category !== 'all') {
        sql += ' AND category = ?';
        params.push(category);
      }

      switch (sort) {
        case 'stars': sql += ' ORDER BY stars DESC'; break;
        case 'recent': sql += ' ORDER BY created_at DESC'; break;
        case 'rating': sql += ' ORDER BY rating DESC'; break;
        case 'name': sql += ' ORDER BY name ASC'; break;
        default: sql += ' ORDER BY stars DESC';
      }

      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const tools = await db.prepare(sql).all(...params);

      let countSql = 'SELECT COUNT(*) as total FROM tools WHERE 1=1';
      const countParams = [];
      if (search) {
        countSql += ' AND (name LIKE ? OR description LIKE ? OR short_desc LIKE ? OR tags LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      if (category && category !== 'all') {
        countSql += ' AND category = ?';
        countParams.push(category);
      }

      const countResult = await db.prepare(countSql).get(...countParams);
      const total = countResult ? countResult.total : 0;

      res.json({ tools, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (err) {
      console.error('Get tools error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get single tool by ID
  router.get('/:id', async (req, res) => {
    try {
      const tool = await db.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }

      const reviews = await db.prepare(`
        SELECT r.*, u.username, u.profile_image 
        FROM reviews r 
        JOIN users u ON r.creator_id = u.id 
        WHERE r.tool_id = ? 
        ORDER BY r.created_at DESC
      `).all(req.params.id);

      tool.reviews = reviews;
      res.json({ tool });
    } catch (err) {
      console.error('Get tool error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Submit new tool (requires auth)
  router.post('/', upload.single('icon'), async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, description, category, website_url, github_url } = req.body;

      if (!name || !description || !category) {
        return res.status(400).json({ error: 'Name, description, and category required' });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const result = await db.prepare(`
        INSERT INTO tools (name, slug, description, short_desc, category, creator_id, creator_name, website_url, github_url, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user-submitted')
      `).run(
        name, slug, description, description.substring(0, 150),
        category, req.session.userId, req.session.username,
        website_url || '', github_url || ''
      );

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      console.error('Submit tool error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Add review (requires auth)
  router.post('/:id/reviews', async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { rating, comment } = req.body;
      const toolId = req.params.id;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const tool = await db.prepare('SELECT id FROM tools WHERE id = ?').get(toolId);
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }

      const existing = await db.prepare('SELECT id FROM reviews WHERE tool_id = ? AND creator_id = ?').get(toolId, req.session.userId);
      if (existing) {
        return res.status(400).json({ error: 'You already reviewed this tool' });
      }

      const result = await db.prepare('INSERT INTO reviews (tool_id, creator_id, rating, comment) VALUES (?, ?, ?, ?)').run(toolId, req.session.userId, rating, comment || '');

      const avgResult = await db.prepare('SELECT AVG(rating) as avgRating FROM reviews WHERE tool_id = ?').get(toolId);
      if (avgResult && avgResult.avgRating) {
        await db.prepare('UPDATE tools SET rating = ? WHERE id = ?').run(avgResult.avgRating, toolId);
      }

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      console.error('Add review error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get categories
  router.get('/meta/categories', async (req, res) => {
    try {
      const categories = await db.prepare('SELECT * FROM categories ORDER BY name').all();
      res.json({ categories });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
