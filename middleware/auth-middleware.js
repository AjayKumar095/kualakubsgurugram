/**
 * middleware/auth-middleware.js
 * Session-based authentication for admin panel
 */

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.adminAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Middleware to check if NOT authenticated (for login page redirect)
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.adminAuthenticated) {
    return res.redirect('/admin');
  }
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
};
