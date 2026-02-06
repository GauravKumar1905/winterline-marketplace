/**
 * WinterLine App Core Module
 * Shared utilities for API calls, authentication, UI rendering, and navigation
 */

// ============================================================================
// API Helper Functions
// ============================================================================

const API = {
  baseURL: '/api',

  /**
   * Fetch JSON from API endpoint
   * @param {string} endpoint - API endpoint (e.g., '/tools', '/categories')
   * @returns {Promise<any>} - Parsed JSON response
   */
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API GET error on ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Post JSON to API endpoint
   * @param {string} endpoint - API endpoint
   * @param {object} data - Data to post
   * @returns {Promise<any>} - Parsed JSON response
   */
  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API POST error on ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Put JSON to API endpoint
   * @param {string} endpoint - API endpoint
   * @param {object} data - Data to put
   * @returns {Promise<any>} - Parsed JSON response
   */
  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API PUT error on ${endpoint}:`, error);
      throw error;
    }
  },
};

// ============================================================================
// Authentication State Management
// ============================================================================

const Auth = {
  user: null,

  /**
   * Check current authentication status
   * @returns {Promise<object|null>} - Current user object or null
   */
  async check() {
    try {
      const data = await API.get('/auth/me');
      this.user = data.user;
      return this.user;
    } catch (error) {
      this.user = null;
      return null;
    }
  },

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - User object
   */
  async login(email, password) {
    try {
      const data = await API.post('/auth/login', { email, password });
      this.user = data.user;
      localStorage.setItem('token', data.token);
      return this.user;
    } catch (error) {
      showToast('Login failed. Please check your credentials.', 'error');
      throw error;
    }
  },

  /**
   * Register new user
   * @param {string} username - Username
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - User object
   */
  async register(username, email, password) {
    try {
      const data = await API.post('/auth/register', { username, email, password });
      this.user = data.user;
      localStorage.setItem('token', data.token);
      return this.user;
    } catch (error) {
      showToast('Registration failed. Please try again.', 'error');
      throw error;
    }
  },

  /**
   * Logout current user
   */
  async logout() {
    try {
      await API.post('/auth/logout', {});
      this.user = null;
      localStorage.removeItem('token');
      showToast('Logged out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
};

// ============================================================================
// UI Rendering Functions
// ============================================================================

/**
 * Render navigation bar with logo and links
 * @param {string|HTMLElement} container - Selector or element to render navbar into
 */
function renderNavbar(container) {
  const element = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!element) return;

  const authHTML = Auth.user
    ? `
      <div class="nav-auth">
        <span class="nav-username">${Auth.user.username}</span>
        <button class="nav-logout gel-btn gel-btn-sm" onclick="handleLogout()">Logout</button>
      </div>
    `
    : `
      <div class="nav-auth">
        <button class="nav-login gel-btn gel-btn-sm" onclick="navigateTo('/login')">Login</button>
        <button class="nav-register gel-btn gel-btn-sm" onclick="navigateTo('/register')">Register</button>
      </div>
    `;

  element.innerHTML = `
    <nav class="navbar gel-packet" style="background: #000000; border-bottom: 1px solid #333333;">
      <div class="navbar-brand">
        <a href="/" class="navbar-logo" style="color: #000000;">
          <span class="logo-text" style="color: #000000; font-weight: bold; font-size: 20px;">WinterLine</span>
        </a>
      </div>
      <ul class="navbar-links">
        <li><a href="/" class="nav-link" style="color: #ffffff;">Home</a></li>
        <li><a href="/browse" class="nav-link" style="color: #ffffff;">Browse</a></li>
        <li><a href="/upload" class="nav-link" style="color: #ffffff;">Upload</a></li>
      </ul>
      ${authHTML}
    </nav>
  `;
}

/**
 * Render footer
 * @param {string|HTMLElement} container - Selector or element to render footer into
 */
function renderFooter(container) {
  const element = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!element) return;

  element.innerHTML = `
    <footer class="footer gel-packet" style="background: #000000; border-top: 1px solid #333333;">
      <div class="footer-content">
        <div class="footer-section">
          <h3 class="footer-title" style="color: #ffffff;">WinterLine</h3>
          <p class="footer-desc" style="color: #aaaaaa;">Discover and share AI tools, Claude Code skills, and automation workflows.</p>
        </div>
        <div class="footer-section">
          <h4 class="footer-heading" style="color: #ffffff;">Quick Links</h4>
          <ul class="footer-links">
            <li><a href="/browse" style="color: #aaaaaa; transition: color 0.3s;">Browse Tools</a></li>
            <li><a href="/upload" style="color: #aaaaaa; transition: color 0.3s;">Upload Tool</a></li>
            <li><a href="/about" style="color: #aaaaaa; transition: color 0.3s;">About Us</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4 class="footer-heading" style="color: #ffffff;">Resources</h4>
          <ul class="footer-links">
            <li><a href="/docs" style="color: #aaaaaa; transition: color 0.3s;">Documentation</a></li>
            <li><a href="/faq" style="color: #aaaaaa; transition: color 0.3s;">FAQ</a></li>
            <li><a href="/contact" style="color: #aaaaaa; transition: color 0.3s;">Contact</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4 class="footer-heading" style="color: #ffffff;">Legal</h4>
          <ul class="footer-links">
            <li><a href="/privacy" style="color: #aaaaaa; transition: color 0.3s;">Privacy Policy</a></li>
            <li><a href="/terms" style="color: #aaaaaa; transition: color 0.3s;">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom" style="color: #aaaaaa; border-top: 1px solid #333333;">
        <p>&copy; 2024 WinterLine. All rights reserved.</p>
      </div>
    </footer>
  `;
}

/**
 * Render star rating display
 * @param {number} rating - Rating value (0-5)
 * @returns {string} - HTML string of stars
 */
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let starsHTML = '';

  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<span class="star full">★</span>';
  }

  if (hasHalfStar) {
    starsHTML += '<span class="star half">★</span>';
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<span class="star empty">☆</span>';
  }

  return starsHTML;
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const toastContainer = document.getElementById('toast-container') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Create toast container if it doesn't exist
 * @returns {HTMLElement} - Toast container element
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format time ago string (e.g., "2 days ago")
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted time ago string
 */
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';

  return Math.floor(seconds) + ' seconds ago';
}

/**
 * Navigate to a page
 * @param {string} path - Path to navigate to
 */
function navigateTo(path) {
  window.location.href = path;
}

/**
 * Get URL query parameters as object
 * @returns {object} - Query parameters
 */
function getQueryParams() {
  const params = {};
  const searchParams = new URLSearchParams(window.location.search);
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
}

/**
 * Format number as download count (e.g., "1.2K", "1.5M")
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
function formatCount(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Handle logout
 */
async function handleLogout() {
  await Auth.logout();
  navigateTo('/');
}

// ============================================================================
// CSS for Toast Notifications (injected on page load)
// ============================================================================

const toastStyles = `
  #toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .toast {
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    opacity: 0;
    transform: translateX(400px);
    transition: all 0.3s ease;
    max-width: 400px;
  }

  .toast.show {
    opacity: 1;
    transform: translateX(0);
  }

  .toast-success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }

  .toast-error {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  }

  .toast-info {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
  }

  .toast-warning {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
  }
`;

// Inject toast styles on module load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = toastStyles;
    document.head.appendChild(style);
  });
} else {
  const style = document.createElement('style');
  style.textContent = toastStyles;
  document.head.appendChild(style);
}
