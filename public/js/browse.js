class BrowsePage {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 9;
        this.filters = {
            search: '',
            categories: [],
            minRating: 0,
            sort: 'popular',
            page: 1
        };

        this.init();
    }

    init() {
        this.parseUrlParams();
        this.setupEventListeners();
        this.loadCategories();
        this.loadTools();
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);

        this.filters.search = params.get('search') || '';
        this.filters.sort = params.get('sort') || 'popular';
        this.filters.page = parseInt(params.get('page')) || 1;

        if (params.get('category')) {
            this.filters.categories = params.get('category').split(',').filter(Boolean);
        }

        if (params.get('minRating')) {
            this.filters.minRating = parseInt(params.get('minRating')) || 0;
        }

        this.currentPage = this.filters.page;

        if (this.filters.search) {
            document.getElementById('searchInput').value = this.filters.search;
        }
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.filters.page = 1;
            this.currentPage = 1;
            this.updateUrl();
            this.loadTools();
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.filters.page = 1;
            this.currentPage = 1;
            this.updateUrl();
            this.loadTools();
        });

        document.addEventListener('categoryFilterChange', (e) => {
            const category = e.detail.category;
            const isChecked = e.detail.isChecked;

            if (isChecked) {
                if (!this.filters.categories.includes(category)) {
                    this.filters.categories.push(category);
                }
            } else {
                this.filters.categories = this.filters.categories.filter(c => c !== category);
            }

            this.filters.page = 1;
            this.currentPage = 1;
            this.updateUrl();
            this.loadTools();
        });

        document.addEventListener('ratingFilterChange', (e) => {
            this.filters.minRating = e.detail.minRating;
            this.filters.page = 1;
            this.currentPage = 1;
            this.updateUrl();
            this.loadTools();
        });
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();

            const container = document.getElementById('categoryFilters');
            container.innerHTML = '';

            categories.forEach(cat => {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = cat.id;
                checkbox.checked = this.filters.categories.includes(cat.id);

                checkbox.addEventListener('change', () => {
                    const event = new CustomEvent('categoryFilterChange', {
                        detail: { category: cat.id, isChecked: checkbox.checked }
                    });
                    document.dispatchEvent(event);
                });

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(cat.name));
                container.appendChild(label);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadTools() {
        try {
            const params = new URLSearchParams();

            if (this.filters.search) params.append('search', this.filters.search);
            if (this.filters.categories.length > 0) {
                params.append('categories', this.filters.categories.join(','));
            }
            if (this.filters.minRating > 0) params.append('minRating', this.filters.minRating);
            params.append('sort', this.filters.sort);
            params.append('page', this.currentPage);
            params.append('limit', this.pageSize);

            const response = await fetch(`/api/tools?${params.toString()}`);
            const data = await response.json();

            this.renderTools(data.tools);
            this.renderPagination(data.totalPages, data.currentPage);
            this.updateResultCount(data.total);
        } catch (error) {
            console.error('Error loading tools:', error);
            document.getElementById('toolsGrid').innerHTML = '<div class="no-results"><h2>Error loading tools</h2></div>';
        }
    }

    renderTools(tools) {
        const grid = document.getElementById('toolsGrid');

        if (!tools || tools.length === 0) {
            grid.innerHTML = '<div class="no-results" style="grid-column: 1 / -1;"><h2>No tools found</h2><p>Try adjusting your filters or search terms.</p></div>';
            return;
        }

        grid.innerHTML = tools.map(tool => `
            <div class="tool-card" onclick="window.location.href='/tool/${tool.id}'">
                <div class="tool-thumbnail ${this.getCategoryClass(tool.category)}">
                    <div class="tool-thumbnail-placeholder">${tool.icon || '🔧'}</div>
                </div>
                <div class="tool-content">
                    <h3 class="tool-name">${this.escapeHtml(tool.name)}</h3>
                    <p class="tool-description">${this.escapeHtml(tool.description)}</p>
                    <div class="tool-meta">
                        <span class="category-badge">${this.escapeHtml(tool.category)}</span>
                    </div>
                    <div class="tool-stats">
                        <div class="tool-rating">
                            <span class="stars">★</span>
                            <span>${tool.averageRating ? tool.averageRating.toFixed(1) : 'N/A'}</span>
                            <span style="color: #7B8794;">(${tool.reviewCount || 0})</span>
                        </div>
                        <span>📥 ${this.formatNumber(tool.downloadCount || 0)}</span>
                    </div>
                    <div class="tool-creator">by ${this.escapeHtml(tool.creator)}</div>
                </div>
            </div>
        `).join('');
    }

    renderPagination(totalPages, currentPage) {
        const paginationDiv = document.getElementById('pagination');

        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }

        let html = '';

        if (currentPage > 1) {
            html += `<button onclick="browsePage.goToPage(${currentPage - 1})">← Previous</button>`;
        }

        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            html += `<button onclick="browsePage.goToPage(1)">1</button>`;
            if (startPage > 2) html += `<span style="padding: 10px 5px;">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            html += `<button onclick="browsePage.goToPage(${i})" class="${activeClass}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span style="padding: 10px 5px;">...</span>`;
            html += `<button onclick="browsePage.goToPage(${totalPages})">${totalPages}</button>`;
        }

        if (currentPage < totalPages) {
            html += `<button onclick="browsePage.goToPage(${currentPage + 1})">Next →</button>`;
        }

        paginationDiv.innerHTML = html;
    }

    updateResultCount(total) {
        document.getElementById('resultCount').textContent = total;
    }

    goToPage(page) {
        this.currentPage = page;
        this.filters.page = page;
        this.updateUrl();
        this.loadTools();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateUrl() {
        const params = new URLSearchParams();

        if (this.filters.search) params.append('search', this.filters.search);
        if (this.filters.categories.length > 0) {
            params.append('category', this.filters.categories.join(','));
        }
        if (this.filters.minRating > 0) params.append('minRating', this.filters.minRating);
        if (this.filters.sort !== 'popular') params.append('sort', this.filters.sort);
        if (this.filters.page > 1) params.append('page', this.filters.page);

        const newUrl = params.toString()
            ? `/browse?${params.toString()}`
            : '/browse';

        window.history.pushState({}, '', newUrl);
    }

    getCategoryClass(category) {
        const categoryMap = {
            'NLP': 'cat-nlp',
            'Computer Vision': 'cat-cv',
            'Machine Learning': 'cat-ml',
            'Data Analysis': 'cat-data',
            'Audio': 'cat-audio'
        };
        return categoryMap[category] || 'cat-nlp';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
}

let browsePage;

document.addEventListener('DOMContentLoaded', () => {
    browsePage = new BrowsePage();
});
