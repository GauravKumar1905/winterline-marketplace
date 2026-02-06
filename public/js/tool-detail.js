class ToolDetailPage {
    constructor() {
        this.toolId = this.extractToolId();
        this.tool = null;
        this.reviews = [];
        this.userRating = 0;

        this.init();
    }

    init() {
        if (!this.toolId) {
            this.showError('Invalid tool ID');
            return;
        }

        this.loadTool();
        this.loadReviews();
    }

    extractToolId() {
        const pathMatch = window.location.pathname.match(/\/tool\/(\d+)/);
        return pathMatch ? pathMatch[1] : null;
    }

    async loadTool() {
        try {
            const response = await fetch(`/api/tools/${this.toolId}`);
            if (!response.ok) throw new Error('Tool not found');

            this.tool = await response.json();
            this.renderToolDetails();
            this.loadRelatedTools();
        } catch (error) {
            console.error('Error loading tool:', error);
            this.showError('Failed to load tool details');
        }
    }

    renderToolDetails() {
        document.getElementById('toolName').textContent = this.escapeHtml(this.tool.name);
        document.getElementById('categoryBadge').textContent = this.escapeHtml(this.tool.category);
        document.getElementById('toolDescription').textContent = this.escapeHtml(this.tool.description);

        const ratingStars = this.generateStars(this.tool.averageRating || 0);
        document.getElementById('ratingStars').textContent = ratingStars;
        document.getElementById('ratingValue').textContent = `${(this.tool.averageRating || 0).toFixed(1)}`;
        document.getElementById('reviewCountDisplay').textContent = `(${this.tool.reviewCount || 0} reviews)`;

        document.getElementById('downloadCount').textContent = this.formatNumber(this.tool.downloadCount || 0);
        document.getElementById('ratingValueStat').textContent = `${(this.tool.averageRating || 0).toFixed(1)}/5`;
        document.getElementById('reviewCountStat').textContent = this.tool.reviewCount || 0;

        document.getElementById('creatorName').textContent = this.escapeHtml(this.tool.creator);
        document.getElementById('creatorAvatar').textContent = this.getInitials(this.tool.creator);
        document.getElementById('creatorLink').href = `/creator/${this.tool.creatorId || 'unknown'}`;

        document.getElementById('downloadButton').addEventListener('click', () => this.handleDownload());
        document.getElementById('reportLink').addEventListener('click', (e) => this.handleReport(e));

        this.renderTags();
    }

    renderTags() {
        const tagsList = document.getElementById('tagsList');
        tagsList.innerHTML = '';

        if (!this.tool.tags || this.tool.tags.length === 0) {
            tagsList.innerHTML = '<p style="color: #7B8794; margin: 0;">No tags</p>';
            return;
        }

        this.tool.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.textContent = this.escapeHtml(tag);
            tagsList.appendChild(tagEl);
        });
    }

    async loadReviews() {
        try {
            const response = await fetch(`/api/tools/${this.toolId}/reviews`);
            this.reviews = await response.json();
            this.renderReviews();
            this.renderAddReviewForm();
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    renderReviews() {
        const reviewsList = document.getElementById('reviewsList');
        const reviewCount = document.getElementById('reviewHeaderCount');

        reviewCount.textContent = `${this.reviews.length} ${this.reviews.length === 1 ? 'review' : 'reviews'}`;

        if (!this.reviews || this.reviews.length === 0) {
            reviewsList.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to review!</div>';
            return;
        }

        reviewsList.innerHTML = this.reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-avatar">${this.getInitials(review.authorName)}</div>
                    <div class="review-author-info">
                        <div class="review-author-name">${this.escapeHtml(review.authorName)}</div>
                        <div class="review-date">${this.formatDate(review.createdAt)}</div>
                    </div>
                    <div class="review-rating" style="color: #FFB300;">${this.generateStars(review.rating)}</div>
                </div>
                <p class="review-text">${this.escapeHtml(review.comment)}</p>
            </div>
        `).join('');
    }

    renderAddReviewForm() {
        const container = document.getElementById('addReviewContainer');

        const isLoggedIn = this.checkIfLoggedIn();

        if (!isLoggedIn) {
            container.innerHTML = `
                <div class="login-prompt" style="background: rgba(255, 107, 0, 0.1); color: #7B8794;">
                    <p>Please <a href="/login" style="color: #FF6B00;">log in</a> to leave a review</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="add-review-form">
                <div class="form-group">
                    <label class="form-label">Your Rating</label>
                    <div class="star-picker" id="starPicker">
                        <span class="star" data-rating="1">★</span>
                        <span class="star" data-rating="2">★</span>
                        <span class="star" data-rating="3">★</span>
                        <span class="star" data-rating="4">★</span>
                        <span class="star" data-rating="5">★</span>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Your Review</label>
                    <textarea class="review-textarea" id="reviewText" placeholder="Share your experience with this tool..."></textarea>
                </div>

                <button class="submit-review-button" id="submitReviewBtn">Submit Review</button>
            </div>
        `;

        this.setupStarPicker();
        this.setupReviewSubmission();
    }

    setupStarPicker() {
        const stars = document.querySelectorAll('#starPicker .star');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                this.userRating = parseInt(star.dataset.rating);
                stars.forEach((s, index) => {
                    if (index < this.userRating) {
                        s.classList.add('selected');
                    } else {
                        s.classList.remove('selected');
                    }
                });
            });

            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.dataset.rating);
                stars.forEach((s, index) => {
                    if (index < rating) {
                        s.style.color = '#FFB300';
                    } else {
                        s.style.color = '#4A5568';
                    }
                });
            });
        });

        document.getElementById('starPicker').addEventListener('mouseleave', () => {
            stars.forEach((s, index) => {
                if (index < this.userRating) {
                    s.style.color = '#FFB300';
                } else {
                    s.style.color = '#4A5568';
                }
            });
        });
    }

    setupReviewSubmission() {
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.addEventListener('click', () => this.submitReview());
    }

    async submitReview() {
        const reviewText = document.getElementById('reviewText').value;

        if (this.userRating === 0) {
            alert('Please select a rating');
            return;
        }

        if (reviewText.trim().length === 0) {
            alert('Please enter a review');
            return;
        }

        try {
            const response = await fetch(`/api/tools/${this.toolId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: this.userRating,
                    comment: reviewText
                })
            });

            if (!response.ok) throw new Error('Failed to submit review');

            this.userRating = 0;
            document.getElementById('reviewText').value = '';

            await this.loadReviews();
            await this.loadTool();

            alert('Review submitted successfully!');
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review');
        }
    }

    async loadRelatedTools() {
        try {
            const params = new URLSearchParams({
                category: this.tool.category,
                limit: 3,
                excludeId: this.toolId
            });

            const response = await fetch(`/api/tools?${params.toString()}`);
            const data = await response.json();

            this.renderRelatedTools(data.tools);
        } catch (error) {
            console.error('Error loading related tools:', error);
        }
    }

    renderRelatedTools(tools) {
        const grid = document.getElementById('relatedToolsGrid');

        if (!tools || tools.length === 0) {
            grid.innerHTML = '<p style="color: #999; grid-column: 1/-1;">No related tools found</p>';
            return;
        }

        grid.innerHTML = tools.slice(0, 3).map(tool => `
            <div class="tool-card" onclick="window.location.href='/tool/${tool.id}'">
                <div class="tool-thumbnail">
                    <div class="tool-thumbnail-placeholder">${tool.icon || '🔧'}</div>
                </div>
                <div class="tool-content">
                    <h3 class="tool-name">${this.escapeHtml(tool.name)}</h3>
                    <p class="tool-description">${this.escapeHtml(tool.description)}</p>
                    <div class="tool-stats">
                        <div class="tool-rating">
                            <span class="stars" style="color: #FFB300;">★</span>
                            <span style="color: #E8ECF0;">${tool.averageRating ? tool.averageRating.toFixed(1) : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    handleDownload() {
        alert(`Downloading ${this.tool.name}...`);
    }

    handleReport(e) {
        e.preventDefault();
        alert(`Report submitted for ${this.tool.name}`);
    }

    checkIfLoggedIn() {
        const token = localStorage.getItem('authToken');
        return !!token;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '★'.repeat(fullStars);
        if (hasHalfStar && fullStars < 5) stars += '★';
        return stars;
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }

    showError(message) {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; background: linear-gradient(135deg, #0B0F1A 0%, #0D1117 100%);">
                <div>
                    <h1 style="color: #E8ECF0;">${message}</h1>
                    <p><a href="/browse" style="color: #FF6B00; text-decoration: none;">Back to Browse</a></p>
                </div>
            </div>
        `;
    }
}

let toolDetailPage;

document.addEventListener('DOMContentLoaded', () => {
    toolDetailPage = new ToolDetailPage();
});
