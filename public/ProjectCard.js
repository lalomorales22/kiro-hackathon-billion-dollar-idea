/**
 * Enhanced ProjectCard component with edit/delete functionality
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3
 */
class ProjectCard {
    constructor(project, options = {}) {
        this.project = project;
        this.options = {
            onUpdate: options.onUpdate || (() => {}),
            onDelete: options.onDelete || (() => {}),
            onSelect: options.onSelect || (() => {}),
            onError: options.onError || (() => {}),
            ...options
        };
        
        this.isEditing = false;
        this.isDeleting = false;
        this.element = null;
        
        this.createElement();
    }

    /**
     * Create the project card DOM element
     */
    createElement() {
        const cardElement = document.createElement('div');
        cardElement.className = 'project-card card hover:shadow-md transition-all duration-200 cursor-pointer';
        cardElement.dataset.projectId = this.project.id;
        
        cardElement.innerHTML = this.renderCardContent();
        
        this.element = cardElement;
        this.attachEventListeners();
        
        return cardElement;
    }

    /**
     * Render the card content HTML
     */
    renderCardContent() {
        const statusClass = this.getStatusClass(this.project.status);
        const progressPercentage = this.calculateProgress();
        
        return `
            <div class="card-content">
                <div class="project-card-header flex justify-between items-start mb-4">
                    <div class="project-card-info flex-1">
                        ${this.renderProjectName()}
                        <div class="project-card-meta flex items-center gap-3 mt-2">
                            <span class="badge-base badge-secondary text-xs">
                                Stage ${this.project.currentStage}/6
                            </span>
                            <span class="badge-base ${statusClass} text-xs">
                                ${this.formatStatus(this.project.status)}
                            </span>
                        </div>
                    </div>
                    <div class="project-card-actions flex gap-2">
                        ${this.renderActionButtons()}
                    </div>
                </div>
                
                <div class="project-card-details mb-4">
                    <div class="project-card-stats flex items-center gap-4 text-sm text-muted-foreground">
                        <span>${this.project.tasks?.length || 0} tasks</span>
                        <span>•</span>
                        <span>${this.project.artifacts?.length || 0} artifacts</span>
                        <span>•</span>
                        <span>Created ${this.formatDate(this.project.createdAt)}</span>
                    </div>
                    
                    ${this.project.ollamaModel ? `
                        <div class="project-card-model mt-2 text-sm text-muted-foreground">
                            Model: <code class="text-xs bg-muted px-1 py-0.5 rounded">${this.escapeHtml(this.project.ollamaModel)}</code>
                        </div>
                    ` : ''}
                </div>
                
                <div class="project-card-progress">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium">Progress</span>
                        <span class="text-sm text-muted-foreground">${Math.round(progressPercentage)}%</span>
                    </div>
                    <div class="progress-bar bg-muted rounded-full h-2">
                        <div class="progress-fill bg-primary rounded-full h-2 transition-all duration-300" 
                             style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
            </div>
            
            ${this.renderDeleteModal()}
        `;
    }

    /**
     * Render project name (editable or display mode)
     */
    renderProjectName() {
        if (this.isEditing) {
            return `
                <div class="project-name-edit flex items-center gap-2">
                    <input type="text" 
                           class="input-base flex-1" 
                           value="${this.escapeHtml(this.project.name)}"
                           data-original-name="${this.escapeHtml(this.project.name)}"
                           maxlength="100"
                           minlength="3"
                           required>
                    <button class="btn-base btn-sm btn-primary save-name-btn">
                        Save
                    </button>
                    <button class="btn-base btn-sm btn-outline cancel-edit-btn">
                        Cancel
                    </button>
                </div>
                <div class="name-validation-message form-validation-message"></div>
            `;
        } else {
            return `
                <h3 class="project-card-name text-lg font-semibold text-foreground mb-1">
                    ${this.escapeHtml(this.project.name)}
                </h3>
            `;
        }
    }

    /**
     * Render action buttons
     */
    renderActionButtons() {
        if (this.isEditing) {
            return ''; // Hide action buttons during editing
        }
        
        const isCompleted = this.project.status === 'COMPLETED';
        const hasArtifacts = this.project.artifacts && this.project.artifacts.length > 0;
        
        return `
            ${isCompleted && hasArtifacts ? `
                <button class="btn-base btn-sm btn-outline download-btn" 
                        title="Download all project artifacts"
                        aria-label="Download all artifacts for ${this.escapeHtml(this.project.name)}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </button>
            ` : ''}
            <button class="btn-base btn-sm btn-outline edit-btn" 
                    title="Edit project name"
                    aria-label="Edit project ${this.escapeHtml(this.project.name)}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
            </button>
            <button class="btn-base btn-sm btn-destructive delete-btn" 
                    title="Delete project"
                    aria-label="Delete project ${this.escapeHtml(this.project.name)}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
    }

    /**
     * Render delete confirmation modal
     */
    renderDeleteModal() {
        return `
            <div class="delete-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="delete-modal-content bg-background border border-border rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div class="p-6">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-destructive bg-opacity-10 rounded-full flex items-center justify-center">
                                <svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-foreground">Delete Project</h3>
                                <p class="text-sm text-muted-foreground">This action cannot be undone</p>
                            </div>
                        </div>
                        
                        <div class="mb-6">
                            <p class="text-sm text-foreground mb-2">
                                Are you sure you want to delete the project 
                                <strong>"${this.escapeHtml(this.project.name)}"</strong>?
                            </p>
                            <p class="text-sm text-muted-foreground">
                                This will permanently delete:
                            </p>
                            <ul class="text-sm text-muted-foreground mt-2 ml-4 list-disc">
                                <li>${this.project.tasks?.length || 0} tasks</li>
                                <li>${this.project.artifacts?.length || 0} artifacts</li>
                                <li>All project progress and history</li>
                            </ul>
                        </div>
                        
                        <div class="flex gap-3 justify-end">
                            <button class="btn-base btn-md btn-outline cancel-delete-btn">
                                Cancel
                            </button>
                            <button class="btn-base btn-md btn-destructive confirm-delete-btn">
                                <span class="btn-text">Delete Project</span>
                                <div class="btn-spinner hidden">
                                    <div class="spinner"></div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to the card
     */
    attachEventListeners() {
        // Card click for selection (but not when clicking buttons)
        this.element.addEventListener('click', (e) => {
            if (!e.target.closest('.project-card-actions') && 
                !e.target.closest('.project-name-edit') &&
                !e.target.closest('.delete-modal')) {
                this.handleCardClick();
            }
        });

        // Edit button
        const editBtn = this.element.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startEditing();
            });
        }

        // Download button
        const downloadBtn = this.element.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadProject();
            });
        }

        // Delete button
        const deleteBtn = this.element.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDeleteModal();
            });
        }

        // Save name button
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('save-name-btn')) {
                e.stopPropagation();
                this.saveName();
            }
        });

        // Cancel edit button
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('cancel-edit-btn')) {
                e.stopPropagation();
                this.cancelEditing();
            }
        });

        // Name input validation
        this.element.addEventListener('input', (e) => {
            if (e.target.matches('.project-name-edit input')) {
                this.validateNameInput(e.target);
            }
        });

        // Name input enter key
        this.element.addEventListener('keydown', (e) => {
            if (e.target.matches('.project-name-edit input')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveName();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelEditing();
                }
            }
        });

        // Delete modal buttons
        const cancelDeleteBtn = this.element.querySelector('.cancel-delete-btn');
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                this.hideDeleteModal();
            });
        }

        const confirmDeleteBtn = this.element.querySelector('.confirm-delete-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.confirmDelete();
            });
        }

        // Close modal on backdrop click
        const deleteModal = this.element.querySelector('.delete-modal');
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    this.hideDeleteModal();
                }
            });
        }

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.element.querySelector('.delete-modal').classList.contains('hidden')) {
                this.hideDeleteModal();
            }
        });
    }

    /**
     * Handle card click for project selection
     */
    handleCardClick() {
        if (!this.isEditing && !this.isDeleting) {
            this.options.onSelect(this.project);
        }
    }

    /**
     * Start editing mode
     */
    startEditing() {
        this.isEditing = true;
        this.updateCardContent();
        
        // Focus the input field
        const input = this.element.querySelector('.project-name-edit input');
        if (input) {
            input.focus();
            input.select();
        }
    }

    /**
     * Cancel editing mode
     */
    cancelEditing() {
        this.isEditing = false;
        this.updateCardContent();
    }

    /**
     * Validate name input
     */
    validateNameInput(input) {
        const name = input.value.trim();
        const validationElement = this.element.querySelector('.name-validation-message');
        const saveBtn = this.element.querySelector('.save-name-btn');
        
        // Clear previous validation
        input.classList.remove('error', 'success');
        validationElement.textContent = '';
        validationElement.className = 'name-validation-message form-validation-message';
        
        let isValid = true;
        
        if (!name) {
            input.classList.add('error');
            validationElement.textContent = 'Project name is required';
            isValid = false;
        } else if (name.length < 3) {
            input.classList.add('error');
            validationElement.textContent = 'Project name must be at least 3 characters long';
            isValid = false;
        } else if (name.length > 100) {
            input.classList.add('error');
            validationElement.textContent = 'Project name must be less than 100 characters';
            isValid = false;
        } else {
            // Check for valid characters
            const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/;
            if (!validNamePattern.test(name)) {
                input.classList.add('error');
                validationElement.textContent = 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
                isValid = false;
            } else {
                input.classList.add('success');
                validationElement.textContent = 'Valid project name';
                validationElement.classList.add('success');
            }
        }
        
        saveBtn.disabled = !isValid;
        return isValid;
    }

    /**
     * Save the edited name
     */
    async saveName() {
        const input = this.element.querySelector('.project-name-edit input');
        const newName = input.value.trim();
        const originalName = input.dataset.originalName;
        
        // Validate input
        if (!this.validateNameInput(input)) {
            return;
        }
        
        // Check if name actually changed
        if (newName === originalName) {
            this.cancelEditing();
            return;
        }
        
        try {
            // Show loading state
            const saveBtn = this.element.querySelector('.save-name-btn');
            this.setButtonLoading(saveBtn, true);
            
            // Make API call to update project
            const response = await fetch(`/api/projects/${this.project.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newName
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to update project name');
            }
            
            // Update project data
            this.project.name = newName;
            this.project.updatedAt = result.data.project.updatedAt;
            
            // Exit editing mode
            this.isEditing = false;
            this.updateCardContent();
            
            // Show success message
            if (typeof errorHandler !== 'undefined') {
                errorHandler.showSuccess('Project name updated successfully');
            }
            
            // Notify parent component
            this.options.onUpdate(this.project, 'name');
            
        } catch (error) {
            console.error('Error updating project name:', error);
            
            // Show error message in validation element
            const validationElement = this.element.querySelector('.name-validation-message');
            validationElement.textContent = error.message;
            validationElement.className = 'name-validation-message form-validation-message';
            input.classList.add('error');
            
            // Also show global error notification
            if (typeof errorHandler !== 'undefined') {
                errorHandler.showError(`Failed to update project name: ${error.message}`);
            }
            
            this.options.onError(error, 'update');
        } finally {
            // Clear loading state
            const saveBtn = this.element.querySelector('.save-name-btn');
            this.setButtonLoading(saveBtn, false);
        }
    }

    /**
     * Show delete confirmation modal
     */
    showDeleteModal() {
        const modal = this.element.querySelector('.delete-modal');
        modal.classList.remove('hidden');
        
        // Focus the cancel button for accessibility
        const cancelBtn = modal.querySelector('.cancel-delete-btn');
        if (cancelBtn) {
            cancelBtn.focus();
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide delete confirmation modal
     */
    hideDeleteModal() {
        const modal = this.element.querySelector('.delete-modal');
        modal.classList.add('hidden');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Confirm project deletion
     */
    async confirmDelete() {
        if (this.isDeleting) return;
        
        try {
            this.isDeleting = true;
            
            // Show loading state
            const confirmBtn = this.element.querySelector('.confirm-delete-btn');
            this.setButtonLoading(confirmBtn, true);
            
            // Make API call to delete project
            const response = await fetch(`/api/projects/${this.project.id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to delete project');
            }
            
            // Hide modal
            this.hideDeleteModal();
            
            // Notify parent component
            this.options.onDelete(this.project);
            
            // Remove card from DOM with animation
            this.element.style.transition = 'all 0.3s ease-out';
            this.element.style.transform = 'scale(0.95)';
            this.element.style.opacity = '0';
            
            setTimeout(() => {
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            }, 300);
            
        } catch (error) {
            console.error('Error deleting project:', error);
            
            // Hide modal and show error
            this.hideDeleteModal();
            
            // Show global error notification
            if (typeof errorHandler !== 'undefined') {
                errorHandler.showError(`Failed to delete project: ${error.message}`);
            }
            
            this.options.onError(error, 'delete');
        } finally {
            this.isDeleting = false;
            
            // Clear loading state
            const confirmBtn = this.element.querySelector('.confirm-delete-btn');
            this.setButtonLoading(confirmBtn, false);
        }
    }

    /**
     * Download all project artifacts as a ZIP file
     */
    async downloadProject() {
        try {
            // Show loading state on download button
            const downloadBtn = this.element.querySelector('.download-btn');
            if (downloadBtn) {
                this.setButtonLoading(downloadBtn, true);
            }

            // Fetch project with all artifacts
            const response = await fetch(`/api/projects/${this.project.id}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch project data');
            }

            const project = result.data.project;
            const artifacts = project.artifacts || [];

            if (artifacts.length === 0) {
                throw new Error('No artifacts available for download');
            }

            // Create ZIP file using JSZip (we'll need to include this library)
            if (typeof JSZip === 'undefined') {
                // Fallback: download artifacts individually
                this.downloadArtifactsIndividually(artifacts, project.name);
                return;
            }
            
            const zip = new JSZip();
            
            // Add project info file
            const projectInfo = {
                name: project.name,
                idea: project.idea,
                status: project.status,
                currentStage: project.currentStage,
                modelType: project.modelType,
                modelName: project.modelName,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                totalArtifacts: artifacts.length
            };
            
            zip.file('project-info.json', JSON.stringify(projectInfo, null, 2));
            
            // Add each artifact to the ZIP
            artifacts.forEach((artifact, index) => {
                const fileName = this.sanitizeFileName(artifact.name) || `artifact-${index + 1}`;
                const fileExtension = this.getFileExtension(artifact.type);
                const fullFileName = `${fileName}${fileExtension}`;
                
                zip.file(fullFileName, artifact.content);
            });

            // Generate and download the ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const downloadUrl = URL.createObjectURL(zipBlob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${this.sanitizeFileName(project.name)}-artifacts.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            URL.revokeObjectURL(downloadUrl);

            // Show success message
            if (typeof errorHandler !== 'undefined') {
                errorHandler.showSuccess(`Downloaded ${artifacts.length} artifacts for "${project.name}"`);
            }

        } catch (error) {
            console.error('Error downloading project:', error);
            
            // Show error message
            if (typeof errorHandler !== 'undefined') {
                errorHandler.showError(`Failed to download project: ${error.message}`);
            }
            
            this.options.onError(error, 'download');
        } finally {
            // Remove loading state
            const downloadBtn = this.element.querySelector('.download-btn');
            if (downloadBtn) {
                this.setButtonLoading(downloadBtn, false);
            }
        }
    }

    /**
     * Download artifacts individually if JSZip is not available
     */
    downloadArtifactsIndividually(artifacts, projectName) {
        artifacts.forEach((artifact, index) => {
            const fileName = this.sanitizeFileName(artifact.name) || `artifact-${index + 1}`;
            const fileExtension = this.getFileExtension(artifact.type);
            const fullFileName = `${this.sanitizeFileName(projectName)}-${fileName}${fileExtension}`;
            
            const blob = new Blob([artifact.content], { type: 'text/plain' });
            const downloadUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fullFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(downloadUrl);
        });

        // Show success message
        if (typeof errorHandler !== 'undefined') {
            errorHandler.showSuccess(`Downloaded ${artifacts.length} artifacts individually for "${projectName}"`);
        }
    }

    /**
     * Sanitize filename for safe file system usage
     */
    sanitizeFileName(fileName) {
        if (!fileName) return 'untitled';
        return fileName
            .replace(/[^a-z0-9\-_\s]/gi, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .toLowerCase()
            .substring(0, 50); // Limit length
    }

    /**
     * Get appropriate file extension based on artifact type
     */
    getFileExtension(artifactType) {
        const extensions = {
            'DOCUMENT': '.md',
            'CODE': '.txt',
            'CONFIGURATION': '.json',
            'BUSINESS_PLAN': '.md',
            'TECHNICAL_SPEC': '.md',
            'MARKETING_PLAN': '.md',
            'FINANCIAL_PROJECTION': '.md',
            'PROJECT_DESCRIPTION': '.md'
        };
        return extensions[artifactType] || '.txt';
    }

    /**
     * Update the card content
     */
    updateCardContent() {
        const cardContent = this.element.querySelector('.card-content');
        cardContent.innerHTML = this.renderCardContent().replace(/<div class="card-content">|<\/div>$/g, '');
        
        // Re-attach event listeners for new content
        this.attachEventListeners();
    }

    /**
     * Set button loading state
     */
    setButtonLoading(button, loading) {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const btnSpinner = button.querySelector('.btn-spinner');
        
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            if (btnText) btnText.style.opacity = '0';
            if (btnSpinner) btnSpinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (btnText) btnText.style.opacity = '1';
            if (btnSpinner) btnSpinner.classList.add('hidden');
        }
    }

    /**
     * Calculate project progress percentage
     */
    calculateProgress() {
        if (!this.project.tasks || this.project.tasks.length === 0) {
            return (this.project.currentStage - 1) / 6 * 100;
        }
        
        const completedTasks = this.project.tasks.filter(task => task.status === 'COMPLETED').length;
        return (completedTasks / this.project.tasks.length) * 100;
    }

    /**
     * Get CSS class for project status
     */
    getStatusClass(status) {
        const statusMap = {
            'PENDING': 'badge-secondary',
            'IN_PROGRESS': 'badge-info',
            'COMPLETED': 'badge-success',
            'FAILED': 'badge-destructive',
            'PAUSED': 'badge-warning'
        };
        return statusMap[status] || 'badge-secondary';
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'today';
        } else if (diffDays === 1) {
            return 'yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
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
     * Update project data
     */
    updateProject(updatedProject) {
        this.project = { ...this.project, ...updatedProject };
        this.updateCardContent();
    }

    /**
     * Get the DOM element
     */
    getElement() {
        return this.element;
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}