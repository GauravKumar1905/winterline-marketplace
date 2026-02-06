const express = require('express');
const { requireAuth, attachUser } = require('../middleware/auth');

module.exports = (db, upload) => {
  const router = express.Router();
  router.use(attachUser);

  // GET /api/tools/categories - MUST be before /:id
  router.get('/categories', (req, res) => {
    try {
      const categories = db.prepare('SELECT id, name, slug, icon FROM categories ORDER BY name').all();
      res.json({ categories });
    } catch (err) {
      console.error('Get categories error:', err);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // GET /api/tools - List tools with filters
  router.get('/', (req, res) => {
    try {
      const { search, category, sort, page = 1, limit = 12 } = req.query;
      let query = `SELECT t.id, t.name, t.slug, t.description, t.short_desc, t.category, t.rating,
        t.download_count, t.install_count, t.stars, t.creator_id, t.creator_name,
        t.icon_url, t.tags, t.version, t.source, t.github_url, t.website_url,
        t.extension_store_url, t.pricing_model, t.license, t.last_updated, t.created_at
        FROM tools t WHERE 1=1`;
      let params = [];

      if (search) {
        query += ' AND (t.name LIKE ? OR t.description LIKE ? OR t.tags LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (category) {
        query += ' AND t.category = ?';
        params.push(category);
      }
      if (sort === 'newest') {
        query += ' ORDER BY t.created_at DESC';
      } else if (sort === 'highest-rated' || sort === 'rating') {
        query += ' ORDER BY t.rating DESC';
      } else if (sort === 'stars') {
        query += ' ORDER BY t.stars DESC';
      } else {
        query += ' ORDER BY t.download_count DESC';
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const tools = db.prepare(query).all(...params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM tools WHERE 1=1';
      let countParams = [];
      if (search) {
        countQuery += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (category) {
        countQuery += ' AND category = ?';
        countParams.push(category);
      }
      const countResult = db.prepare(countQuery).get(...countParams);

      res.json({
        tools,
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult ? countResult.total : 0
      });
    } catch (err) {
      console.error('Get tools error:', err);
      res.status(500).json({ error: 'Failed to fetch tools' });
    }
  });

  // GET /api/tools/:id - Single tool with all fields
  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const tool = db.prepare(`SELECT t.* FROM tools t WHERE t.id = ?`).get(id);

      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }
      res.json({ tool });
    } catch (err) {
      console.error('Get tool error:', err);
      res.status(500).json({ error: 'Failed to fetch tool' });
    }
  });

  // POST /api/tools - Create tool (auth required)
  router.post('/', requireAuth, upload.fields([
    { name: 'icon', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]), (req, res) => {
    try {
      const { name, description, short_desc, category, version, tags, download_url } = req.body;
      const userId = req.session.userId;

      if (!name || !description || !category) {
        return res.status(400).json({ error: 'Name, description, and category are required' });
      }

      const iconUrl = req.files?.icon ? `/uploads/${req.files.icon[0].filename}` : '';
      const fileUrl = req.files?.file ? `/uploads/${req.files.file[0].filename}` : (download_url || '');
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const result = db.prepare(`
        INSERT INTO tools (name, slug, description, short_desc, category, version, creator_id, icon_url, file_url, rating, download_count, tags, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'manual')
      `).run(name, slug, description, short_desc || '', category, version || '1.0.0', userId, iconUrl, fileUrl, tags || '[]');

      res.status(201).json({ message: 'Tool created', toolId: result.lastInsertRowid });
    } catch (err) {
      console.error('Create tool error:', err);
      res.status(500).json({ error: 'Failed to create tool' });
    }
  });

  // GET /api/tools/:id/reviews
  router.get('/:id/reviews', (req, res) => {
    try {
      const { id } = req.params;
      const reviews = db.prepare(`
        SELECT r.id, r.rating, r.comment, r.created_at,
          u.id as user_id, u.username, u.profile_image
        FROM reviews r
        LEFT JOIN users u ON r.creator_id = u.id
        WHERE r.tool_id = ?
        ORDER BY r.created_at DESC
      `).all(id);
      res.json({ reviews });
    } catch (err) {
      console.error('Get reviews error:', err);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  // POST /api/tools/:id/reviews - Add review (auth required)
  router.post('/:id/reviews', requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.session.userId;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const existing = db.prepare('SELECT id FROM reviews WHERE tool_id = ? AND creator_id = ?').get(id, userId);
      if (existing) {
        return res.status(409).json({ error: 'You already reviewed this tool' });
      }

      db.prepare('INSERT INTO reviews (tool_id, creator_id, rating, comment) VALUES (?, ?, ?, ?)').run(id, userId, rating, comment || '');

      // Update tool average rating
      const avg = db.prepare('SELECT AVG(rating) as avg_rating FROM reviews WHERE tool_id = ?').get(id);
      if (avg) {
        db.prepare('UPDATE tools SET rating = ? WHERE id = ?').run(Math.round(avg.avg_rating * 10) / 10, id);
      }

      res.status(201).json({ message: 'Review added' });
    } catch (err) {
      console.error('Create review error:', err);
      res.status(500).json({ error: 'Failed to create review' });
    }
  });

  return router;
};
