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
    }

    extractToolId() {
        const pathMatch = window.location.pathname.match(/\/tool\/(\d+)/);
        return pathMatch ? pathMatch[1] : null;
    }

    async loadTool() {
        try {
            const response = await fetch(`/api/tools/${this.toolId}`);
            if (!response.ok) throw new Error('Tool not found');

            const data = await response.json();
            this.tool = data.tool;
            this.reviews = this.tool.reviews || [];
            this.renderToolDetails();
            this.renderReviews();
            this.renderAddReviewForm();
            this.loadRelatedTools();
        } catch (error) {
            console.error('Error loading tool:', error);
            this.showError('Failed to load tool details');
        }
    }

    renderToolDetails() {
        document.getElementById('toolName').textContent = this.tool.name || '';
        document.getElementById('categoryBadge').textContent = this.tool.category || '';
        document.getElementById('toolDescription').textContent = this.tool.full_description || this.tool.description || '';

        const rating = parseFloat(this.tool.rating) || 0;
        const reviewCount = this.reviews.length;

        const ratingStars = this.generateStars(rating);
        document.getElementById('ratingStars').textContent = ratingStars;
        document.getElementById('ratingValue').textContent = rating.toFixed(1);
        document.getElementById('reviewCountDisplay').textContent = `(${reviewCount} reviews)`;

        document.getElementById('downloadCount').textContent = this.formatNumber(this.tool.download_count || 0);
        document.getElementById('ratingValueStat').textContent = `${rating.toFixed(1)}/5`;
        document.getElementById('reviewCountStat').textContent = reviewCount;

        const creatorName = this.tool.creator_name || 'Unknown';
        document.getElementById('creatorName').textContent = creatorName;
        document.getElementById('creatorAvatar').textContent = this.getInitials(creatorName);

        const creatorLink = document.getElementById('creatorLink');
        if (this.tool.creator_id) {
            creatorLink.href = `/profile/${this.tool.creator_id}`;
        } else {
            creatorLink.style.display = 'none';
        }

        document.getElementById('downloadButton').addEventListener('click', () => this.handleDownload());
        document.getElementById('reportLink').addEventListener('click', (e) => this.handleReport(e));

        this.renderTags();

        // Update page title
        document.title = `${this.tool.name} - WinterLine Marketplace`;
    }

    renderTags() {
        const tagsList = document.getElementById('tagsList');
        tagsList.innerHTML = '';

        let tags = this.tool.tags;
        if (typeof tags === 'string') {
            try { tags = JSON.parse(tags); } catch(e) { tags = tags.split(',').map(t => t.trim()).filter(Boolean); }
        }

        if (!tags || tags.length === 0) {
            tagsList.innerHTML = '<p style="color: #7B8794; margin: 0;">No tags</p>';
            return;
        }

        tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.textContent = tag;
            tagsList.appendChild(tagEl);
        });
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
                    <div class="review-avatar">${this.getInitials(review.username || 'Anonymous')}</div>
                    <div class="review-author-info">
                        <div class="review-author-name">${this.escapeHtml(review.username || 'Anonymous')}</div>
                        <div class="review-date">${this.formatDate(review.created_at)}</div>
                    </div>
                    <div class="review-rating" style="color: #CCC;">${this.generateStars(review.rating)}</div>
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
                <div class="login-prompt">
                    <p>Please <a href="/login">log in</a> to leave a review</p>
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
                        s.style.color = '#FFF';
                    } else {
                        s.style.color = '#4A5568';
                    }
                });
            });
        });

        document.getElementById('starPicker').addEventListener('mouseleave', () => {
            stars.forEach((s, index) => {
                if (index < this.userRating) {
                    s.style.color = '#FFF';
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: this.userRating,
                    comment: reviewText
                })
            });

            if (!response.ok) throw new Error('Failed to submit review');

            this.userRating = 0;
            document.getElementById('reviewText').value = '';

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
                limit: 4
            });

            const response = await fetch(`/api/tools?${params.toString()}`);
            const data = await response.json();

            // Filter out current tool
            const related = (data.tools || []).filter(t => t.id !== parseInt(this.toolId));
            this.renderRelatedTools(related.slice(0, 3));
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

        grid.innerHTML = tools.map(tool => `
            <div class="tool-card" onclick="window.location.href='/tool/${tool.id}'" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.2s;">
                <div style="height: 120px; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.04);">
                    <span style="font-size: 2rem; opacity: 0.4;">⚙</span>
                </div>
                <div style="padding: 16px;">
                    <h3 style="font-size: 1rem; font-weight: 600; color: #E8ECF0; margin: 0 0 6px;">${this.escapeHtml(tool.name)}</h3>
                    <p style="font-size: 0.85rem; color: #7B8794; margin: 0 0 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${this.escapeHtml(tool.short_desc || tool.description || '')}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #555;">
                        <span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase;">${this.escapeHtml(tool.category || '')}</span>
                        ${tool.rating ? `<span>★ ${parseFloat(tool.rating).toFixed(1)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    handleDownload() {
        const url = this.tool.github_url || this.tool.website_url;
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('No download link available');
        }
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
        const empty = 5 - stars.length;
        stars += '☆'.repeat(Math.max(0, empty));
        return stars;
    }

    getInitials(name) {
        if (!name) return '?';
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
        num = parseInt(num) || 0;
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatDate(dateString) {
        if (!dateString) return '';
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
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; background: #0A0A0A;">
                <div>
                    <h1 style="color: #E8ECF0;">${message}</h1>
                    <p><a href="/" style="color: #FFF; text-decoration: none;">Back to Home</a></p>
                </div>
            </div>
        `;
    }
}

let toolDetailPage;

document.addEventListener('DOMContentLoaded', () => {
    toolDetailPage = new ToolDetailPage();
});
