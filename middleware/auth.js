// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

// Middleware to attach user info if logged in (optional)
function attachUser(req, res, next) {
  if (req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username,
      email: req.session.email
    };
  }
  next();
}

module.exports = {
  requireAuth,
  attachUser
};
