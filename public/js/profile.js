/**
 * User Profile Page Logic
 * Handles profile display, editing, and tool management
 */

class ProfileManager {
  constructor() {
    this.userId = null;
    this.userData = null;
    this.userTools = [];
    this.currentUser = null;
    this.isOwnProfile = false;

    this.initElements();
    this.extractUserIdFromPath();
    this.fetchUserData();
    this.checkAuth();
  }

  initElements() {
    this.profileHeaderContainer = document.getElementById('profile-header-container');
    this.toolsContainer = document.getElementById('tools-container');
    this.toolsSectionTitle = document.getElementById('tools-section-title');
    this.editModal = document.getElementById('edit-profile-modal');
    this.editForm = document.getElementById('edit-profile-form');
  }

  /**
   * Extract user ID from URL path
   * Expected format: /profile/123 or /profile?id=123
   */
  extractUserIdFromPath() {
    // Try to get from URL path
    const pathMatch = window.location.pathname.match(/\/profile\/(\d+)/);
    if (pathMatch) {
      this.userId = pathMatch[1];
    } else {
      // Try to get from query params
      const params = new URLSearchParams(window.location.search);
      this.userId = params.get('id');
    }

    if (!this.userId) {
      this.showError('User ID not found');
    }
  }

  /**
   * Check current user authentication
   */
  async checkAuth() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();

      if (data.authenticated && data.user) {
        this.currentUser = data.user;
        this.isOwnProfile = parseInt(this.userId) === data.user.id;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  /**
   * Fetch user data and tools from API
   */
  async fetchUserData() {
    try {
      // Fetch user profile
      const userResponse = await fetch(`/api/users/${this.userId}`);
      if (!userResponse.ok) {
        throw new Error('User not found');
      }

      this.userData = await userResponse.json();

      // Fetch user tools
      const toolsResponse = await fetch(`/api/users/${this.userId}/tools`);
      if (toolsResponse.ok) {
        this.userTools = await toolsResponse.json();
      }

      // Render profile
      this.renderProfile();
      this.renderTools();
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render user profile header
   */
  renderProfile() {
    const user = this.userData;

    // Generate avatar initials
    const initials = (user.username || '').substring(0, 2).toUpperCase();

    // Build profile HTML
    const profileHTML = `
      <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 40px; align-items: center; position: relative; z-index: 1;">
        <!-- Avatar -->
        <div class="profile-avatar gel-highlight">
          ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : initials}
        </div>

        <!-- Info -->
        <div class="profile-info">
          <h1 class="profile-name">${user.username}</h1>
          <p class="profile-handle">@${user.username}</p>
          <p class="profile-bio">${user.bio || 'No bio yet'}</p>
          <p style="font-size: 0.9rem; color: #999; margin-top: 15px;">
            Member since ${new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
        </div>

        <!-- Actions -->
        <div class="profile-actions">
          ${this.isOwnProfile ? `
            <button type="button" class="gel-btn gel-orange" onclick="profileManager.openEditModal()">
              ✎ Edit Profile
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Stats -->
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-value">${user.tools_count || 0}</div>
          <div class="profile-stat-label">Tools Created</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${user.total_downloads || 0}</div>
          <div class="profile-stat-label">Total Downloads</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${user.avg_rating ? parseFloat(user.avg_rating).toFixed(1) : 'N/A'}</div>
          <div class="profile-stat-label">Average Rating</div>
        </div>
      </div>
    `;

    this.profileHeaderContainer.innerHTML = profileHTML;
    document.title = `${user.username} - WinterLine`;
  }

  /**
   * Render user tools
   */
  renderTools() {
    // Update section title
    this.toolsSectionTitle.textContent = `Tools by ${this.userData.username}`;

    // Clear container
    this.toolsContainer.innerHTML = '';

    if (this.userTools.length === 0) {
      // Show empty state
      const emptyHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3 class="empty-state-title">No tools yet</h3>
          <p class="empty-state-text">${this.isOwnProfile ? 'Start by sharing your first AI tool with the community!' : 'This user hasn\'t shared any tools yet.'}</p>
          ${this.isOwnProfile ? `<a href="/upload" class="gel-btn gel-orange">Upload Tool</a>` : ''}
        </div>
      `;
      this.toolsContainer.innerHTML = emptyHTML;
      return;
    }

    // Render tool cards
    this.userTools.forEach(tool => {
      const toolCard = this.createToolCard(tool);
      this.toolsContainer.appendChild(toolCard);
    });
  }

  /**
   * Create a tool card element
   */
  createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'tool-card';

    // Calculate average rating
    const avgRating = tool.avg_rating ? parseFloat(tool.avg_rating).toFixed(1) : 0;
    const ratingCount = tool.reviews_count || 0;

    // Generate stars
    const stars = Array(5).fill(0).map((_, i) => {
      return i < Math.floor(avgRating) ? '★' : '☆';
    }).join('');

    card.innerHTML = `
      <div class="tool-thumbnail">
        ${tool.thumbnail_url ? `<img src="${tool.thumbnail_url}" alt="${tool.name}">` : '<div class="placeholder">📦</div>'}
      </div>
      <div class="tool-meta">
        <h3 class="tool-title">${tool.name}</h3>
        <p class="tool-description">${tool.description}</p>

        <div class="tool-rating">
          <div class="tool-stars">
            ${stars}
          </div>
          <span>${avgRating}</span>
          <span style="color: #999;">(${ratingCount} ${ratingCount === 1 ? 'review' : 'reviews'})</span>
        </div>

        <div class="tool-stats">
          <div class="tool-stat">
            <span style="font-size: 0.75rem; color: #999;">Downloads</span>
            <span class="tool-stat-value">${tool.downloads_count || 0}</span>
          </div>
          <div class="tool-stat">
            <span style="font-size: 0.75rem; color: #999;">Category</span>
            <span class="tool-stat-value">${tool.category_name || 'Other'}</span>
          </div>
          <div class="tool-stat">
            <span style="font-size: 0.75rem; color: #999;">By</span>
            <span class="tool-stat-value">${this.truncate(this.userData.username, 10)}</span>
          </div>
        </div>

        <div class="tool-footer">
          <a href="/tool/${tool.id}" class="gel-btn gel-btn-secondary" style="flex: 1; text-align: center;">
            View Tool
          </a>
        </div>
      </div>
    `;

    return card;
  }

  /**
   * Truncate string
   */
  truncate(str, length) {
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  /**
   * Open edit profile modal
   */
  openEditModal() {
    if (!this.isOwnProfile) return;

    document.getElementById('edit-username').value = this.userData.username;
    document.getElementById('edit-bio').value = this.userData.bio || '';
    document.getElementById('edit-avatar-url').value = this.userData.avatar_url || '';

    this.editModal.classList.add('active');
  }

  /**
   * Close edit profile modal
   */
  closeEditModal() {
    this.editModal.classList.remove('active');
  }

  /**
   * Save profile changes
   */
  async saveProfile() {
    if (!this.isOwnProfile) return;

    const bio = document.getElementById('edit-bio').value.trim();
    const avatarUrl = document.getElementById('edit-avatar-url').value.trim();

    try {
      const response = await fetch(`/api/users/${this.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bio,
          avatar_url: avatarUrl
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      this.userData = updatedUser;

      // Re-render profile
      this.renderProfile();

      // Close modal
      this.closeEditModal();

      // Show success message
      this.showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      this.showToast(error.message || 'Failed to update profile', 'error');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorHTML = `
      <div style="text-align: center; padding: 80px 40px; position: relative; z-index: 1;">
        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;">⚠️</div>
        <h2 style="font-size: 1.8rem; color: #1a1a1a; margin-bottom: 15px;">Error</h2>
        <p style="color: #666; margin-bottom: 30px;">${message}</p>
        <a href="/browse" class="gel-btn gel-orange">Back to Browse</a>
      </div>
    `;
    this.profileHeaderContainer.innerHTML = errorHTML;
    this.toolsContainer.innerHTML = '';
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 16px 24px;
      border-radius: 30px;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      font-family: 'Quicksand', sans-serif;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize on page load
let profileManager;
document.addEventListener('DOMContentLoaded', () => {
  // Load navbar and footer
  loadNavbar();
  loadFooter();

  // Initialize profile manager
  profileManager = new ProfileManager();
});
