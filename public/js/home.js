/**
 * WinterLine Home Page Logic
 * Handles category loading, featured tools display, search, and navigation
 */

// ============================================================================
// Page Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize page
  await initializePage();
});

/**
 * Initialize the home page
 */
async function initializePage() {
  try {
    // Render navbar and footer
    renderNavbar('#navbar-container');
    renderFooter('#footer-container');

    // Check authentication status
    await Auth.check();

    // Update navbar with auth status
    renderNavbar('#navbar-container');

    // Load page data
    await Promise.all([
      loadCategories(),
      loadFeaturedTools(),
      loadStats(),
    ]);

    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize page:', error);
    showToast('Failed to load page content', 'error');
  }
}

// ============================================================================
// Data Loading Functions
// ============================================================================

/**
 * Load and render categories
 */
async function loadCategories() {
  try {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    const response = await API.get('/categories');
    const categories = response.categories || [];

    if (categories.length === 0) {
      container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #7B8794;">No categories available</p>';
      return;
    }

    categories.forEach(category => {
      const pill = document.createElement('div');
      pill.className = 'category-pill';
      pill.textContent = category.name;
      pill.setAttribute('data-slug', category.slug);
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');

      pill.addEventListener('click', () => handleCategoryClick(category.slug));
      pill.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleCategoryClick(category.slug);
        }
      });

      container.appendChild(pill);
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
    const container = document.getElementById('categories-container');
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #FF6B00;">Failed to load categories</p>';
  }
}

/**
 * Load and render featured tools
 */
async function loadFeaturedTools() {
  try {
    const container = document.getElementById('tools-container');
    container.innerHTML = '';

    const response = await API.get('/tools?sort=popular&limit=6');
    const tools = response.tools || [];

    if (tools.length === 0) {
      container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #7B8794;">No tools available</p>';
      return;
    }

    tools.forEach(tool => {
      const card = createToolCard(tool);
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Failed to load featured tools:', error);
    const container = document.getElementById('tools-container');
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #FF6B00;">Failed to load tools</p>';
  }
}

/**
 * Load and display statistics
 */
async function loadStats() {
  try {
    const response = await API.get('/stats');

    const toolsCount = response.tools_count || 0;
    const downloadsCount = response.total_downloads || 0;
    const creatorsCount = response.active_creators || 0;

    // Animate number updates
    animateCounter('stat-tools', toolsCount);
    animateCounter('stat-downloads', downloadsCount);
    animateCounter('stat-creators', creatorsCount);
  } catch (error) {
    console.error('Failed to load statistics:', error);
    // Set default values
    document.getElementById('stat-tools').textContent = '0';
    document.getElementById('stat-downloads').textContent = '0';
    document.getElementById('stat-creators').textContent = '0';
  }
}

// ============================================================================
// UI Creation Functions
// ============================================================================

/**
 * Create a tool card element
 * @param {object} tool - Tool data object
 * @returns {HTMLElement} - Tool card element
 */
function createToolCard(tool) {
  const card = document.createElement('div');
  card.className = 'tool-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('data-tool-id', tool.id);

  const thumbnail = tool.thumbnail || '🛠️';
  const rating = tool.rating || 0;
  const category = tool.category || 'General';
  const downloads = formatCount(tool.download_count || 0);

  card.innerHTML = `
    <div class="gel-card">
      <div class="tool-thumbnail">${thumbnail}</div>

      <h3 class="tool-name">${escapeHTML(tool.name)}</h3>
      <p class="tool-desc">${escapeHTML(tool.short_description || tool.description || 'No description available')}</p>

      <div class="tool-meta">
        <div class="tool-rating">
          <div class="stars">${renderStars(rating)}</div>
          <span class="rating-value">(${rating.toFixed(1)})</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <span class="tool-category">${escapeHTML(category)}</span>
        <span class="tool-stats" style="color: #7B8794;">${downloads} downloads</span>
      </div>
    </div>
  `;

  // Add event listeners
  card.addEventListener('click', () => handleToolClick(tool.id));
  card.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleToolClick(tool.id);
    }
  });

  return card;
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Setup event listeners for page interactions
 */
function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
}

/**
 * Handle search action
 */
function handleSearch() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput.value.trim();

  if (query.length === 0) {
    showToast('Please enter a search query', 'info');
    return;
  }

  navigateTo(`/browse?search=${encodeURIComponent(query)}`);
}

/**
 * Handle category pill click
 * @param {string} slug - Category slug
 */
function handleCategoryClick(slug) {
  navigateTo(`/browse?category=${encodeURIComponent(slug)}`);
}

/**
 * Handle tool card click
 * @param {string} id - Tool ID
 */
function handleToolClick(id) {
  navigateTo(`/tool/${id}`);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Animate counter from 0 to target value
 * @param {string} elementId - ID of element to update
 * @param {number} targetValue - Target value to animate to
 * @param {number} duration - Animation duration in milliseconds
 */
function animateCounter(elementId, targetValue, duration = 1500) {
  const element = document.getElementById(elementId);
  if (!element) return;

  let currentValue = 0;
  const increment = targetValue / (duration / 16); // 60fps
  const startTime = performance.now();

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    currentValue = Math.floor(targetValue * progress);

    // Format the number
    if (currentValue >= 1000000) {
      element.textContent = (currentValue / 1000000).toFixed(1) + 'M';
    } else if (currentValue >= 1000) {
      element.textContent = (currentValue / 1000).toFixed(1) + 'K';
    } else {
      element.textContent = currentValue.toString();
    }

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    }
  }

  requestAnimationFrame(updateCounter);
}

/**
 * Format stars HTML string
 * @param {number} rating - Rating value (0-5)
 * @returns {string} - HTML string of stars
 */
function renderStarString(rating) {
  return renderStars(rating);
}
