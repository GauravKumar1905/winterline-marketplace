/**
 * Upload Tool Page Logic
 * Handles multi-step form navigation, file uploads, and tool submission
 */

class UploadManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.formData = {
      toolName: '',
      description: '',
      category: '',
      tags: [],
      fullDescription: '',
      downloadUrl: '',
      thumbnailFile: null,
      screenshotFiles: []
    };
    this.tagsList = [];
    this.currentUser = null;

    this.initElements();
    this.bindEvents();
    this.checkAuth();
    this.loadCategories();
  }

  initElements() {
    this.form = document.getElementById('upload-form');
    this.btnBack = document.getElementById('btn-back');
    this.btnNext = document.getElementById('btn-next');
    this.btnSubmit = document.getElementById('btn-submit');
    this.uploadFormContainer = document.getElementById('upload-form-container');
    this.loginPrompt = document.getElementById('login-prompt');
    this.tagsInputContainer = document.getElementById('tags-input');
    this.tagInput = document.getElementById('tag-input');
    this.thumbnailUpload = document.getElementById('thumbnail-upload');
    this.thumbnailInput = document.getElementById('thumbnail-input');
    this.thumbnailPreview = document.getElementById('thumbnail-preview');
    this.screenshotsUpload = document.getElementById('screenshots-upload');
    this.screenshotsInput = document.getElementById('screenshots-input');
    this.screenshotsPreview = document.getElementById('screenshots-preview');
  }

  bindEvents() {
    // Navigation
    this.btnBack.addEventListener('click', () => this.prevStep());
    this.btnNext.addEventListener('click', (e) => {
      e.preventDefault();
      this.nextStep();
    });
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Form inputs
    document.getElementById('tool-name')?.addEventListener('input', (e) => {
      this.formData.toolName = e.target.value;
    });

    document.getElementById('tool-description')?.addEventListener('input', (e) => {
      this.formData.description = e.target.value;
      document.getElementById('char-count').textContent = e.target.value.length;
    });

    document.getElementById('category')?.addEventListener('change', (e) => {
      this.formData.category = e.target.value;
    });

    document.getElementById('full-description')?.addEventListener('input', (e) => {
      this.formData.fullDescription = e.target.value;
    });

    document.getElementById('download-url')?.addEventListener('input', (e) => {
      this.formData.downloadUrl = e.target.value;
    });

    // Tag input
    this.tagInput.addEventListener('keydown', (e) => this.handleTagInput(e));

    // File uploads
    this.thumbnailUpload.addEventListener('click', () => this.thumbnailInput.click());
    this.thumbnailUpload.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.thumbnailUpload.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.thumbnailUpload.addEventListener('drop', (e) => this.handleDropThumbnail(e));
    this.thumbnailInput.addEventListener('change', (e) => this.handleThumbnailSelect(e));

    this.screenshotsUpload.addEventListener('click', () => this.screenshotsInput.click());
    this.screenshotsUpload.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.screenshotsUpload.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.screenshotsUpload.addEventListener('drop', (e) => this.handleDropScreenshots(e));
    this.screenshotsInput.addEventListener('change', (e) => this.handleScreenshotsSelect(e));
  }

  /**
   * Check authentication status
   */
  async checkAuth() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();

      if (data.authenticated && data.user) {
        this.currentUser = data.user;
        this.uploadFormContainer.style.display = 'block';
        this.loginPrompt.style.display = 'none';
      } else {
        this.uploadFormContainer.style.display = 'none';
        this.loginPrompt.style.display = 'block';
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.uploadFormContainer.style.display = 'none';
      this.loginPrompt.style.display = 'block';
    }
  }

  /**
   * Load categories from API
   */
  async loadCategories() {
    try {
      const response = await fetch('/api/categories');
      const categories = await response.json();

      const categorySelect = document.getElementById('category');
      if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          categorySelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  /**
   * Handle tag input
   */
  handleTagInput(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = this.tagInput.value.trim().replace(/,/g, '');
      if (value) {
        this.addTag(value);
        this.tagInput.value = '';
      }
    }
  }

  /**
   * Add a tag
   */
  addTag(tag) {
    if (!this.tagsList.includes(tag)) {
      this.tagsList.push(tag);
      this.formData.tags = this.tagsList;
      this.renderTags();
    }
  }

  /**
   * Remove a tag
   */
  removeTag(tag) {
    this.tagsList = this.tagsList.filter(t => t !== tag);
    this.formData.tags = this.tagsList;
    this.renderTags();
  }

  /**
   * Render tags
   */
  renderTags() {
    // Clear existing tags but keep input
    const tags = this.tagsInputContainer.querySelectorAll('.tag');
    tags.forEach(tag => tag.remove());

    // Add tags before input
    this.tagsList.forEach(tag => {
      const tagEl = document.createElement('div');
      tagEl.className = 'tag';
      tagEl.innerHTML = `
        ${tag}
        <span class="tag-remove" data-tag="${tag}">×</span>
      `;
      this.tagsInputContainer.insertBefore(tagEl, this.tagInput);

      tagEl.querySelector('.tag-remove').addEventListener('click', () => {
        this.removeTag(tag);
      });
    });
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
  }

  /**
   * Handle drag leave
   */
  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
  }

  /**
   * Handle thumbnail drop
   */
  handleDropThumbnail(e) {
    e.preventDefault();
    e.stopPropagation();
    this.thumbnailUpload.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.thumbnailInput.files = files;
      this.handleThumbnailSelect({ target: this.thumbnailInput });
    }
  }

  /**
   * Handle screenshots drop
   */
  handleDropScreenshots(e) {
    e.preventDefault();
    e.stopPropagation();
    this.screenshotsUpload.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.screenshotsInput.files = files;
      this.handleScreenshotsSelect({ target: this.screenshotsInput });
    }
  }

  /**
   * Handle thumbnail file selection
   */
  handleThumbnailSelect(e) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.formData.thumbnailFile = file;
        this.thumbnailPreview.innerHTML = `
          <div class="preview-item">
            <img src="${event.target.result}" alt="Thumbnail preview">
            <button type="button" class="remove-btn" onclick="uploadManager.removeThumbnail()">×</button>
          </div>
        `;
        // Update preview card
        document.getElementById('preview-thumbnail').innerHTML = `
          <img src="${event.target.result}" alt="Tool thumbnail">
        `;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove thumbnail
   */
  removeThumbnail() {
    this.formData.thumbnailFile = null;
    this.thumbnailInput.value = '';
    this.thumbnailPreview.innerHTML = '';
    document.getElementById('preview-thumbnail').innerHTML = '<div style="font-size: 3rem; opacity: 0.2;">📦</div>';
  }

  /**
   * Handle screenshots file selection
   */
  handleScreenshotsSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      alert('Maximum 5 screenshots allowed');
      return;
    }

    this.formData.screenshotFiles = files.filter(f => f.type.startsWith('image/'));
    this.renderScreenshotPreviews();
  }

  /**
   * Render screenshot previews
   */
  renderScreenshotPreviews() {
    this.screenshotsPreview.innerHTML = '';

    this.formData.screenshotFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.innerHTML = `
          <img src="${event.target.result}" alt="Screenshot ${index + 1}">
          <button type="button" class="remove-btn" onclick="uploadManager.removeScreenshot(${index})">×</button>
        `;
        this.screenshotsPreview.appendChild(item);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Remove screenshot
   */
  removeScreenshot(index) {
    this.formData.screenshotFiles.splice(index, 1);
    this.renderScreenshotPreviews();
  }

  /**
   * Validate current step
   */
  validateStep(step) {
    if (step === 1) {
      if (!document.getElementById('tool-name').value.trim()) {
        alert('Please enter a tool name');
        return false;
      }
      if (!document.getElementById('tool-description').value.trim()) {
        alert('Please enter a short description');
        return false;
      }
      if (!document.getElementById('category').value) {
        alert('Please select a category');
        return false;
      }
      if (this.tagsList.length === 0) {
        alert('Please add at least one tag');
        return false;
      }
      return true;
    } else if (step === 2) {
      if (!document.getElementById('full-description').value.trim()) {
        alert('Please enter a full description');
        return false;
      }
      if (!document.getElementById('download-url').value.trim()) {
        alert('Please enter a download URL or GitHub link');
        return false;
      }
      if (!this.formData.thumbnailFile) {
        alert('Please upload a thumbnail image');
        return false;
      }
      return true;
    }
    return true;
  }

  /**
   * Move to next step
   */
  nextStep() {
    if (!this.validateStep(this.currentStep)) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
      this.updatePreview();
    }
  }

  /**
   * Move to previous step
   */
  prevStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  /**
   * Go to specific step
   */
  goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.upload-step-content').forEach(el => {
      el.classList.remove('active');
    });

    // Show target step
    document.querySelector(`[data-step="${step}"]`).classList.add('active');

    // Update progress
    document.querySelectorAll('.upload-progress-item').forEach(el => {
      el.classList.remove('active');
    });
    document.querySelector(`.upload-progress-item[data-step="${step}"]`).classList.add('active');

    // Update buttons
    this.btnBack.style.display = step > 1 ? 'inline-flex' : 'none';
    this.btnNext.style.display = step < this.totalSteps ? 'inline-flex' : 'none';
    this.btnSubmit.style.display = step === this.totalSteps ? 'inline-flex' : 'none';

    this.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Update preview card
   */
  updatePreview() {
    document.getElementById('preview-title').textContent = this.formData.toolName || 'Tool Name';
    document.getElementById('preview-desc').textContent = this.formData.description || 'Tool description goes here';

    const categorySelect = document.getElementById('category');
    const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
    document.getElementById('preview-category').textContent = categoryName;

    const tagsContainer = document.getElementById('preview-tags-container');
    tagsContainer.innerHTML = '';
    this.tagsList.forEach(tag => {
      const badgeEl = document.createElement('div');
      badgeEl.className = 'gel-badge gel-badge-yellow';
      badgeEl.textContent = tag;
      tagsContainer.appendChild(badgeEl);
    });
  }

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    if (!this.validateStep(this.currentStep)) {
      return;
    }

    // Show loading state
    this.btnSubmit.disabled = true;
    this.btnSubmit.textContent = 'Submitting...';

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('toolName', this.formData.toolName);
      formData.append('description', this.formData.description);
      formData.append('fullDescription', this.formData.fullDescription);
      formData.append('category', this.formData.category);
      formData.append('downloadUrl', this.formData.downloadUrl);
      formData.append('tags', JSON.stringify(this.formData.tags));

      if (this.formData.thumbnailFile) {
        formData.append('thumbnail', this.formData.thumbnailFile);
      }

      this.formData.screenshotFiles.forEach((file, index) => {
        formData.append(`screenshot_${index}`, file);
      });

      // Submit to API
      const response = await fetch('/api/tools', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload tool');
      }

      const result = await response.json();

      // Show success message
      this.showToast('Tool uploaded successfully!', 'success');

      // Redirect to tool page
      setTimeout(() => {
        window.location.href = `/tool/${result.id}`;
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error);
      this.showToast(error.message || 'Failed to upload tool', 'error');
      this.btnSubmit.disabled = false;
      this.btnSubmit.textContent = 'Submit Tool ✓';
    }
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
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      padding: 16px 24px;
      border-radius: 30px;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize on page load
let uploadManager;
document.addEventListener('DOMContentLoaded', () => {
  // Load navbar and footer
  loadNavbar();
  loadFooter();

  // Initialize upload manager
  uploadManager = new UploadManager();
});

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
