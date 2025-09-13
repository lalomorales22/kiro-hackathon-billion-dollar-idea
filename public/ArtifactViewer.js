/**
 * ArtifactViewer Component
 * 
 * Enhanced artifact display component with card-based layout, modal views,
 * and proper integration with WebSocket events for real-time updates.
 * 
 * Features:
 * - Card-based artifact display with shadcn-inspired styling
 * - Clickable artifacts with modal/expanded view
 * - Empty states and loading indicators
 * - Real-time updates via WebSocket integration
 * - Responsive design with mobile support
 * - Accessibility features
 */

class ArtifactViewer {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.artifacts = [];
        this.isLoading = false;
        this.selectedArtifact = null;
        
        // Configuration options
        this.options = {
            showSearch: options.showSearch !== false,
            showTypeFilter: options.showTypeFilter !== false,
            showSortOptions: options.showSortOptions !== false,
            enableModal: options.enableModal !== false,
            maxPreviewLength: options.maxPreviewLength || 150,
            emptyStateMessage: options.emptyStateMessage || 'Artifacts will appear here as they are generated...',
            loadingMessage: options.loadingMessage || 'Loading artifacts...',
            ...options
        };
        
        // Event callbacks
        this.onArtifactClick = options.onArtifactClick || null;
        this.onArtifactUpdate = options.onArtifactUpdate || null;
        this.onError = options.onError || null;
        
        // Filter and sort state
        this.searchQuery = '';
        this.typeFilter = 'all';
        this.sortBy = 'created'; // 'created', 'name', 'type'
        this.sortOrder = 'desc'; // 'asc', 'desc'
        
        this.init();
    }
    
    /**
     * Initialize the component
     */
    init() {
        if (!this.container) {
            console.error(`ArtifactViewer: Container with id "${this.containerId}" not found`);
            return;
        }
        
        this.render();
        this.setupEventListeners();
        
        console.log('ArtifactViewer initialized');
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Handle clicks outside modal to close it (with proper event delegation)
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('artifactModal');
            if (modal && !modal.classList.contains('hidden')) {
                // Check if click is on backdrop or outside modal content
                if (e.target.classList.contains('artifact-modal-backdrop') || 
                    (e.target === modal && !modal.querySelector('.artifact-modal-content').contains(e.target))) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal();
                }
            }
        });
        
        // Prevent modal positioning issues
        document.addEventListener('mouseenter', (e) => {
            const modal = document.getElementById('artifactModal');
            if (modal && !modal.classList.contains('hidden')) {
                // Ensure modal stays properly positioned
                modal.style.position = 'fixed';
                modal.style.zIndex = '9999';
            }
        });
        
        // Handle escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectedArtifact) {
                e.preventDefault();
                this.closeModal();
            }
        });
        
        // Handle search input
        if (this.options.showSearch) {
            const searchInput = this.container.querySelector('.artifact-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchQuery = e.target.value.toLowerCase();
                    this.renderArtifacts();
                });
            }
        }
        
        // Handle type filter
        if (this.options.showTypeFilter) {
            const typeFilter = this.container.querySelector('.artifact-type-filter');
            if (typeFilter) {
                typeFilter.addEventListener('change', (e) => {
                    this.typeFilter = e.target.value;
                    this.renderArtifacts();
                });
            }
        }
        
        // Handle sort options
        if (this.options.showSortOptions) {
            const sortSelect = this.container.querySelector('.artifact-sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    this.sortBy = sortBy;
                    this.sortOrder = sortOrder;
                    this.renderArtifacts();
                });
            }
        }
    }
    
    /**
     * Render the complete component
     */
    render() {
        this.container.innerHTML = `
            <div class="artifact-viewer">
                ${this.renderHeader()}
                ${this.renderContent()}
                ${this.renderModal()}
            </div>
        `;
        
        // Store reference to this instance on the container
        this.container.querySelector('.artifact-viewer').artifactViewerInstance = this;
        
        // Re-setup event listeners after render
        this.setupEventListeners();
    }
    
    /**
     * Render the header with controls
     */
    renderHeader() {
        if (!this.options.showSearch && !this.options.showTypeFilter && !this.options.showSortOptions) {
            return '';
        }
        
        return `
            <div class="artifact-viewer-header">
                <div class="artifact-viewer-controls">
                    ${this.options.showSearch ? this.renderSearchInput() : ''}
                    <div class="artifact-viewer-filters flex gap-3 items-center">
                        ${this.options.showTypeFilter ? this.renderTypeFilter() : ''}
                        ${this.options.showSortOptions ? this.renderSortOptions() : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render search input
     */
    renderSearchInput() {
        return `
            <div class="artifact-search">
                <input 
                    type="text" 
                    class="artifact-search-input input-base" 
                    placeholder="Search artifacts..."
                    value="${this.escapeHtml(this.searchQuery)}"
                >
            </div>
        `;
    }
    
    /**
     * Render type filter dropdown
     */
    renderTypeFilter() {
        const artifactTypes = [
            'PROJECT_DESCRIPTION',
            'MARKET_RESEARCH',
            'TECHNICAL_ARCHITECTURE',
            'UI_DESIGN',
            'FRONTEND_CODE',
            'BACKEND_CODE',
            'DATABASE_SCHEMA',
            'QA_PLAN',
            'BUSINESS_PLAN',
            'MARKETING_CONTENT',
            'SALES_FUNNEL',
            'SUPPORT_FRAMEWORK',
            'ANALYTICS_PLAN',
            'FINANCIAL_PLAN',
            'MONITORING_PLAN',
            'OPTIMIZATION_PLAN'
        ];
        
        return `
            <select class="artifact-type-filter select-base">
                <option value="all">All Types</option>
                ${artifactTypes.map(type => `
                    <option value="${type}" ${this.typeFilter === type ? 'selected' : ''}>
                        ${this.formatArtifactType(type)}
                    </option>
                `).join('')}
            </select>
        `;
    }
    
    /**
     * Render sort options dropdown
     */
    renderSortOptions() {
        const currentSort = `${this.sortBy}-${this.sortOrder}`;
        
        return `
            <select class="artifact-sort-select select-base">
                <option value="created-desc" ${currentSort === 'created-desc' ? 'selected' : ''}>Newest First</option>
                <option value="created-asc" ${currentSort === 'created-asc' ? 'selected' : ''}>Oldest First</option>
                <option value="name-asc" ${currentSort === 'name-asc' ? 'selected' : ''}>Name A-Z</option>
                <option value="name-desc" ${currentSort === 'name-desc' ? 'selected' : ''}>Name Z-A</option>
                <option value="type-asc" ${currentSort === 'type-asc' ? 'selected' : ''}>Type A-Z</option>
                <option value="type-desc" ${currentSort === 'type-desc' ? 'selected' : ''}>Type Z-A</option>
            </select>
        `;
    }
    
    /**
     * Render the main content area
     */
    renderContent() {
        return `
            <div class="artifact-viewer-content">
                ${this.renderArtifacts()}
            </div>
        `;
    }
    
    /**
     * Render artifacts grid
     */
    renderArtifacts() {
        if (this.isLoading) {
            return this.renderLoadingState();
        }
        
        const filteredArtifacts = this.getFilteredAndSortedArtifacts();
        
        if (filteredArtifacts.length === 0) {
            return this.renderEmptyState();
        }
        
        return `
            <div class="artifacts-grid">
                ${filteredArtifacts.map(artifact => this.renderArtifactCard(artifact)).join('')}
            </div>
        `;
    }
    
    /**
     * Render loading state
     */
    renderLoadingState() {
        return `
            <div class="artifact-viewer-loading">
                <div class="artifact-loading-content">
                    <div class="spinner"></div>
                    <span class="artifact-loading-message">${this.options.loadingMessage}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        const hasFilters = this.searchQuery || this.typeFilter !== 'all';
        const message = hasFilters 
            ? 'No artifacts match your current filters.'
            : this.options.emptyStateMessage;
        
        return `
            <div class="artifact-viewer-empty">
                <div class="artifact-empty-content">
                    <div class="artifact-empty-icon">📄</div>
                    <div class="artifact-empty-message">${message}</div>
                    ${hasFilters ? `
                        <button class="btn-base btn-outline btn-sm mt-4" onclick="this.closest('.artifact-viewer').artifactViewerInstance.clearFilters()">
                            Clear Filters
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render individual artifact card
     */
    renderArtifactCard(artifact) {
        const preview = this.truncateText(artifact.content, this.options.maxPreviewLength);
        const createdDate = new Date(artifact.createdAt).toLocaleDateString();
        const createdTime = new Date(artifact.createdAt).toLocaleTimeString();
        
        return `
            <div class="artifact-card card" data-artifact-id="${artifact.id}" onclick="this.closest('.artifact-viewer').artifactViewerInstance.openArtifact('${artifact.id}')"
                <div class="artifact-card-header">
                    <div class="artifact-card-title">
                        <h3 class="artifact-name text-lg font-semibold">${this.escapeHtml(artifact.name)}</h3>
                        <span class="artifact-type badge-secondary">${this.formatArtifactType(artifact.type)}</span>
                    </div>
                </div>
                
                <div class="artifact-card-content">
                    <div class="artifact-preview text-sm text-muted-foreground">
                        ${this.escapeHtml(preview)}
                        ${artifact.content.length > this.options.maxPreviewLength ? '...' : ''}
                    </div>
                </div>
                
                <div class="artifact-card-footer">
                    <div class="artifact-meta">
                        <span class="artifact-date text-xs text-muted-foreground" title="${createdDate} ${createdTime}">
                            ${createdDate}
                        </span>
                        <span class="artifact-size text-xs text-muted-foreground">
                            ${this.formatFileSize(artifact.content.length)}
                        </span>
                    </div>
                    <div class="artifact-actions">
                        <button class="btn-base btn-ghost btn-sm" onclick="event.stopPropagation(); this.closest('.artifact-viewer').artifactViewerInstance.copyArtifact('${artifact.id}')" title="Copy content">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="btn-base btn-ghost btn-sm" onclick="event.stopPropagation(); this.closest('.artifact-viewer').artifactViewerInstance.downloadArtifact('${artifact.id}')" title="Download">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7,10 12,15 17,10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render modal for expanded artifact view
     */
    renderModal() {
        if (!this.options.enableModal) {
            return '';
        }
        
        return `
            <div class="artifact-modal hidden fixed inset-0 z-50 flex items-center justify-center" id="artifactModal">
                <div class="artifact-modal-backdrop absolute inset-0 bg-black bg-opacity-50"></div>
                <div class="artifact-modal-content relative bg-background border border-border rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                    <div class="artifact-modal-header flex items-center justify-between p-6 border-b border-border">
                        <div class="artifact-modal-title flex items-center gap-3">
                            <h2 id="modalArtifactName" class="text-xl font-semibold text-foreground"></h2>
                            <span id="modalArtifactType" class="badge-base badge-secondary text-xs"></span>
                        </div>
                        <button class="btn-base btn-ghost btn-sm modal-close-btn" title="Close" aria-label="Close modal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="artifact-modal-body">
                        <div class="artifact-modal-meta">
                            <span id="modalArtifactDate" class="text-sm text-muted-foreground"></span>
                            <span id="modalArtifactSize" class="text-sm text-muted-foreground"></span>
                        </div>
                        
                        <div class="artifact-modal-content-wrapper">
                            <pre id="modalArtifactContent" class="artifact-content-display"></pre>
                        </div>
                    </div>
                    
                    <div class="artifact-modal-footer">
                        <div class="artifact-modal-actions">
                            <button class="btn-base btn-outline btn-sm" onclick="this.closest('.artifact-viewer').artifactViewerInstance.copyCurrentArtifact()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Copy Content
                            </button>
                            <button class="btn-base btn-outline btn-sm" onclick="this.closest('.artifact-viewer').artifactViewerInstance.downloadCurrentArtifact()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7,10 12,15 17,10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download
                            </button>
                            <button class="btn-base btn-primary btn-sm" onclick="this.closest('.artifact-viewer').artifactViewerInstance.closeModal()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================
    
    /**
     * Set artifacts data
     */
    setArtifacts(artifacts) {
        this.artifacts = Array.isArray(artifacts) ? artifacts : [];
        this.renderArtifacts();
        this.updateContentArea();
    }
    
    /**
     * Add a new artifact
     */
    addArtifact(artifact) {
        if (!artifact || !artifact.id) {
            console.warn('ArtifactViewer: Invalid artifact provided to addArtifact');
            return;
        }
        
        // Check if artifact already exists
        const existingIndex = this.artifacts.findIndex(a => a.id === artifact.id);
        if (existingIndex >= 0) {
            // Update existing artifact
            this.artifacts[existingIndex] = artifact;
        } else {
            // Add new artifact
            this.artifacts.push(artifact);
        }
        
        this.renderArtifacts();
        this.updateContentArea();
        
        // Trigger callback if provided
        if (this.onArtifactUpdate) {
            this.onArtifactUpdate(artifact, existingIndex >= 0 ? 'updated' : 'added');
        }
    }
    
    /**
     * Remove an artifact
     */
    removeArtifact(artifactId) {
        const index = this.artifacts.findIndex(a => a.id === artifactId);
        if (index >= 0) {
            const removedArtifact = this.artifacts.splice(index, 1)[0];
            this.renderArtifacts();
            this.updateContentArea();
            
            // Close modal if the removed artifact was selected
            if (this.selectedArtifact && this.selectedArtifact.id === artifactId) {
                this.closeModal();
            }
            
            // Trigger callback if provided
            if (this.onArtifactUpdate) {
                this.onArtifactUpdate(removedArtifact, 'removed');
            }
        }
    }
    
    /**
     * Clear all artifacts
     */
    clearArtifacts() {
        this.artifacts = [];
        this.closeModal();
        this.renderArtifacts();
        this.updateContentArea();
    }
    
    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = !!loading;
        this.renderArtifacts();
        this.updateContentArea();
    }
    
    /**
     * Open artifact in modal
     */
    openArtifact(artifactId) {
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact) {
            console.warn(`ArtifactViewer: Artifact with id "${artifactId}" not found`);
            return;
        }
        
        this.selectedArtifact = artifact;
        
        if (this.options.enableModal) {
            this.showModal(artifact);
        }
        
        // Trigger callback if provided
        if (this.onArtifactClick) {
            this.onArtifactClick(artifact);
        }
    }
    
    /**
     * Copy artifact content to clipboard
     */
    async copyArtifact(artifactId) {
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact) {
            console.warn(`ArtifactViewer: Artifact with id "${artifactId}" not found`);
            return;
        }
        
        try {
            await navigator.clipboard.writeText(artifact.content);
            this.showToast('Artifact content copied to clipboard', 'success');
        } catch (error) {
            console.error('Failed to copy artifact content:', error);
            this.showToast('Failed to copy content', 'error');
            
            if (this.onError) {
                this.onError(error, 'copy');
            }
        }
    }
    
    /**
     * Download artifact as file
     */
    downloadArtifact(artifactId) {
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact) {
            console.warn(`ArtifactViewer: Artifact with id "${artifactId}" not found`);
            return;
        }
        
        try {
            const blob = new Blob([artifact.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${artifact.name}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Artifact downloaded', 'success');
        } catch (error) {
            console.error('Failed to download artifact:', error);
            this.showToast('Failed to download artifact', 'error');
            
            if (this.onError) {
                this.onError(error, 'download');
            }
        }
    }
    
    /**
     * Clear all filters
     */
    clearFilters() {
        this.searchQuery = '';
        this.typeFilter = 'all';
        this.sortBy = 'created';
        this.sortOrder = 'desc';
        
        // Update UI controls
        const searchInput = this.container.querySelector('.artifact-search-input');
        if (searchInput) searchInput.value = '';
        
        const typeFilter = this.container.querySelector('.artifact-type-filter');
        if (typeFilter) typeFilter.value = 'all';
        
        const sortSelect = this.container.querySelector('.artifact-sort-select');
        if (sortSelect) sortSelect.value = 'created-desc';
        
        this.renderArtifacts();
        this.updateContentArea();
    }
    
    // ============================================================================
    // WEBSOCKET INTEGRATION METHODS
    // ============================================================================
    
    /**
     * Handle artifact creation from WebSocket
     */
    handleArtifactCreate(payload) {
        if (payload && payload.artifact) {
            this.addArtifact(payload.artifact);
        }
    }
    
    /**
     * Handle artifact update from WebSocket
     */
    handleArtifactUpdate(payload) {
        if (payload && payload.artifact) {
            this.addArtifact(payload.artifact); // addArtifact handles both add and update
        }
    }
    
    /**
     * Handle artifact deletion from WebSocket
     */
    handleArtifactDelete(payload) {
        if (payload && payload.artifactId) {
            this.removeArtifact(payload.artifactId);
        }
    }
    
    // ============================================================================
    // MODAL METHODS
    // ============================================================================
    
    /**
     * Show modal with artifact details - Fixed positioning
     */
    showModal(artifact) {
        const modal = document.getElementById('artifactModal');
        if (!modal) return;
        
        // Ensure modal has proper positioning before showing
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        
        // Update modal content
        document.getElementById('modalArtifactName').textContent = artifact.name;
        document.getElementById('modalArtifactType').textContent = this.formatArtifactType(artifact.type);
        document.getElementById('modalArtifactContent').textContent = artifact.content;
        
        const createdDate = new Date(artifact.createdAt).toLocaleDateString();
        const createdTime = new Date(artifact.createdAt).toLocaleTimeString();
        document.getElementById('modalArtifactDate').textContent = `Created: ${createdDate} ${createdTime}`;
        document.getElementById('modalArtifactSize').textContent = `Size: ${this.formatFileSize(artifact.content.length)}`;
        
        // Set up modal event listeners (remove any existing ones first)
        this.removeModalEventListeners();
        this.addModalEventListeners();
        
        // Show modal with proper class management
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Force a reflow to ensure positioning is applied
        modal.offsetHeight;
        
        // Focus management for accessibility
        const closeButton = modal.querySelector('.modal-close-btn');
        if (closeButton) {
            closeButton.focus();
        }
    }
    
    /**
     * Add modal-specific event listeners
     */
    addModalEventListeners() {
        const modal = document.getElementById('artifactModal');
        if (!modal) return;
        
        // Close button listeners
        const closeButtons = modal.querySelectorAll('.modal-close-btn, .modal-close-btn-footer');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        });
        
        // Copy button listener
        const copyBtn = modal.querySelector('.modal-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.copyCurrentArtifact();
            });
        }
        
        // Download button listener
        const downloadBtn = modal.querySelector('.modal-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.downloadCurrentArtifact();
            });
        }
    }
    
    /**
     * Remove modal-specific event listeners
     */
    removeModalEventListeners() {
        const modal = document.getElementById('artifactModal');
        if (!modal) return;
        
        // Clone and replace modal content to remove all event listeners
        const modalContent = modal.querySelector('.artifact-modal-content');
        if (modalContent) {
            const newModalContent = modalContent.cloneNode(true);
            modalContent.parentNode.replaceChild(newModalContent, modalContent);
        }
    }
    
    /**
     * Close modal - Anti-glitch implementation
     */
    closeModal() {
        const modal = document.getElementById('artifactModal');
        if (!modal) return;
        
        // Store selected artifact ID before clearing
        const selectedArtifactId = this.selectedArtifact?.id;
        
        // Remove modal-specific event listeners first
        this.removeModalEventListeners();
        
        // Add closing animation class
        modal.classList.add('closing');
        
        // Use requestAnimationFrame to ensure smooth animation
        requestAnimationFrame(() => {
            // Hide modal with smooth transition
            modal.classList.add('hidden');
            
            // Clean up after animation
            setTimeout(() => {
                modal.classList.remove('closing');
                document.body.style.overflow = '';
                
                // Return focus to the artifact that was clicked
                if (selectedArtifactId) {
                    const artifactCard = document.querySelector(`[data-artifact-id="${selectedArtifactId}"]`);
                    if (artifactCard) {
                        artifactCard.focus();
                    }
                }
            }, 200); // Match transition duration
        });
        
        // Clear selected artifact
        this.selectedArtifact = null;
    }
    
    /**
     * Copy current artifact content (from modal)
     */
    async copyCurrentArtifact() {
        if (this.selectedArtifact) {
            await this.copyArtifact(this.selectedArtifact.id);
        }
    }
    
    /**
     * Download current artifact (from modal)
     */
    downloadCurrentArtifact() {
        if (this.selectedArtifact) {
            this.downloadArtifact(this.selectedArtifact.id);
        }
    }
    
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    
    /**
     * Get filtered and sorted artifacts
     */
    getFilteredAndSortedArtifacts() {
        let filtered = [...this.artifacts];
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(artifact => 
                artifact.name.toLowerCase().includes(this.searchQuery) ||
                artifact.content.toLowerCase().includes(this.searchQuery) ||
                this.formatArtifactType(artifact.type).toLowerCase().includes(this.searchQuery)
            );
        }
        
        // Apply type filter
        if (this.typeFilter !== 'all') {
            filtered = filtered.filter(artifact => artifact.type === this.typeFilter);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'type':
                    aValue = this.formatArtifactType(a.type);
                    bValue = this.formatArtifactType(b.type);
                    break;
                case 'created':
                default:
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
            }
            
            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        return filtered;
    }
    
    /**
     * Update content area only (without full re-render)
     */
    updateContentArea() {
        const contentArea = this.container.querySelector('.artifact-viewer-content');
        if (contentArea) {
            contentArea.innerHTML = this.renderArtifacts();
        }
    }
    
    /**
     * Format artifact type for display
     */
    formatArtifactType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength);
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `artifact-toast artifact-toast-${type}`;
        toast.textContent = message;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Destroy the component and clean up
     */
    destroy() {
        this.closeModal();
        this.artifacts = [];
        this.selectedArtifact = null;
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('ArtifactViewer destroyed');
    }
}

// Make ArtifactViewer available globally
if (typeof window !== 'undefined') {
    window.ArtifactViewer = ArtifactViewer;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArtifactViewer;
}