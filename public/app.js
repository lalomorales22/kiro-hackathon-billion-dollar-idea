class BillionDollarIdeaClient {
    constructor() {
        this.ws = null;
        this.currentProjectId = null;
        this.projects = [];
        this.projectCards = [];
        this.artifacts = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.modelSelector = null;
        this.isCreatingProject = false;
        this.terminal = null;
        this.artifactViewer = null;
        this.lastSubmissionTime = 0;
        this.submissionDebounceDelay = 1000; // 1 second debounce
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.initializeModelSelector();
        this.initializeTerminal();
        this.initializeArtifactViewer();
        this.setupResponsiveLayout();
        this.connectWebSocket();
        this.loadProjects();
        this.finalizeIntegration();
    }

    setupEventListeners() {
        // Project form submission with enhanced validation
        document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Prevent submission if already creating project
            if (this.isCreatingProject) {
                console.log('Form submission blocked: project creation in progress');
                return false;
            }
            
            // Perform comprehensive client-side validation
            if (!this.performPreSubmissionValidation()) {
                console.log('Form submission blocked: validation failed');
                return false;
            }
            
            this.createProject();
            return false;
        });

        // Refresh projects button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadProjects();
        });

        // Form validation on input changes
        document.getElementById('projectName').addEventListener('input', () => {
            this.validateProjectName();
            this.validateProjectForm();
        });
        
        document.getElementById('ideaText').addEventListener('input', () => {
            this.validateIdeaText();
            this.validateProjectForm();
        });

        // Additional form protection - prevent multiple rapid clicks on submit button
        document.getElementById('createBtn').addEventListener('click', (e) => {
            if (this.isCreatingProject) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button click blocked: project creation in progress');
                return false;
            }
        });

        // Handle page visibility changes for WebSocket reconnection
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
                this.connectWebSocket();
            }
        });
    }

    /**
     * Initialize the ModelSelector component
     */
    async initializeModelSelector() {
        try {
            // Check if ModelSelector class is available
            if (typeof ModelSelector === 'undefined') {
                console.warn('ModelSelector class not available, skipping model selector initialization');
                this.modelSelector = null;
                return;
            }

            // Check if ApiKeyManager is available
            if (typeof ApiKeyManager === 'undefined') {
                console.warn('ApiKeyManager class not available, ModelSelector may not work properly');
            }

            this.modelSelector = new ModelSelector('modelSelector', {
                placeholder: 'Select an AI model...',
                emptyMessage: 'No Ollama models available',
                autoLoad: true,
                showRefresh: true,
                onModelSelect: (modelName, modelDetails) => {
                    console.log('Model selected:', modelName, modelDetails);
                    this.onModelSelected(modelName, modelDetails);
                },
                onError: (error) => {
                    console.error('ModelSelector error:', error);
                    this.handleModelSelectorError(error);
                },
                onLoad: (models) => {
                    console.log('Models loaded:', models);
                    this.onModelsLoaded(models);
                }
            });

            // Wait for ModelSelector to initialize (including loading stored API key)
            await this.modelSelector.init();
        } catch (error) {
            console.error('Failed to initialize ModelSelector component:', error);
            this.modelSelector = null;
        }
    }

    /**
     * Handle model selection
     */
    onModelSelected(modelName, modelDetails) {
        // Store selected model for project creation
        // The ModelSelector now returns an object with type and name, or null
        this.selectedModel = modelName;
        
        // Update form validation
        this.validateProjectForm();
    }

    /**
     * Handle ModelSelector errors
     */
    handleModelSelectorError(error) {
        // Show user-friendly error message
        if (error.message.includes('Failed to connect') || error.message.includes('ECONNREFUSED')) {
            this.showMessage('Ollama service is not running. Please start Ollama to select a model.', 'warning');
        } else {
            this.showMessage('Unable to load AI models. You can still create projects, but model selection will be unavailable.', 'warning');
        }
    }

    /**
     * Handle successful model loading
     */
    onModelsLoaded(models) {
        if (models.length === 0) {
            this.showMessage('No Ollama models found. Install a model with "ollama pull llama2" to get started.', 'info');
        } else {
            console.log(`Loaded ${models.length} Ollama models`);
        }
    }

    /**
     * Initialize the Terminal component
     */
    initializeTerminal() {
        try {
            // Check if Terminal class is available
            if (typeof Terminal === 'undefined') {
                console.warn('Terminal class not available, skipping terminal initialization');
                this.terminal = null;
                return;
            }

            this.terminal = new Terminal('progressTerminal', {
                maxLogs: 1000,
                autoScroll: true,
                showTimestamps: true,
                showControls: true,
                theme: 'dark'
            });
            
            console.log('Terminal component initialized');
        } catch (error) {
            console.error('Failed to initialize Terminal component:', error);
            // Fallback to console logging if terminal fails
            this.terminal = null;
        }
    }

    /**
     * Initialize the ArtifactViewer component
     */
    initializeArtifactViewer() {
        try {
            // Check if ArtifactViewer class is available
            if (typeof ArtifactViewer === 'undefined') {
                console.warn('ArtifactViewer class not available, skipping artifact viewer initialization');
                this.artifactViewer = null;
                return;
            }

            this.artifactViewer = new ArtifactViewer('artifactsGrid', {
                showSearch: true,
                showTypeFilter: true,
                showSortOptions: true,
                enableModal: true,
                maxPreviewLength: 150,
                emptyStateMessage: 'Artifacts will appear here as they are generated...',
                onArtifactClick: (artifact) => {
                    console.log('Artifact clicked:', artifact.name);
                },
                onArtifactUpdate: (artifact, action) => {
                    console.log(`Artifact ${action}:`, artifact.name);
                },
                onError: (error, action) => {
                    console.error(`ArtifactViewer error during ${action}:`, error);
                    this.showMessage(`Failed to ${action} artifact: ${error.message}`, 'error');
                }
            });
            
            console.log('ArtifactViewer component initialized');
        } catch (error) {
            console.error('Failed to initialize ArtifactViewer component:', error);
            // Fallback to the old artifact rendering if ArtifactViewer fails
            this.artifactViewer = null;
        }
    }

    /**
     * Validate project name field
     */
    validateProjectName() {
        const projectName = document.getElementById('projectName').value.trim();
        const validationElement = document.getElementById('projectNameValidation');
        const inputElement = document.getElementById('projectName');
        
        // Clear previous validation state
        inputElement.classList.remove('error', 'success');
        validationElement.textContent = '';
        validationElement.className = 'form-validation-message';
        
        if (!projectName) {
            inputElement.classList.add('error');
            validationElement.textContent = 'Project name is required';
            return false;
        }
        
        if (projectName.length < 3) {
            inputElement.classList.add('error');
            validationElement.textContent = 'Project name must be at least 3 characters long';
            return false;
        }
        
        if (projectName.length > 100) {
            inputElement.classList.add('error');
            validationElement.textContent = 'Project name must be less than 100 characters';
            return false;
        }
        
        // Check for invalid characters (only allow letters, numbers, spaces, hyphens, underscores)
        const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/;
        if (!validNamePattern.test(projectName)) {
            inputElement.classList.add('error');
            validationElement.textContent = 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
            return false;
        }
        
        // Success state
        inputElement.classList.add('success');
        validationElement.textContent = 'Valid project name';
        validationElement.classList.add('success');
        return true;
    }

    /**
     * Validate idea text field
     */
    validateIdeaText() {
        const ideaText = document.getElementById('ideaText').value.trim();
        const validationElement = document.getElementById('ideaValidation');
        const inputElement = document.getElementById('ideaText');
        
        // Clear previous validation state
        inputElement.classList.remove('error', 'success');
        validationElement.textContent = '';
        validationElement.className = 'form-validation-message';
        
        if (!ideaText) {
            inputElement.classList.add('error');
            validationElement.textContent = 'Business idea is required';
            return false;
        }
        
        if (ideaText.length < 10) {
            inputElement.classList.add('error');
            validationElement.textContent = `Business idea must be at least 10 characters (${ideaText.length}/10)`;
            return false;
        }
        
        if (ideaText.length > 5000) {
            inputElement.classList.add('error');
            validationElement.textContent = `Business idea must be less than 5000 characters (${ideaText.length}/5000)`;
            return false;
        }
        
        // Success state
        inputElement.classList.add('success');
        const charCount = ideaText.length;
        validationElement.textContent = `Valid business idea (${charCount}/5000 characters)`;
        validationElement.classList.add('success');
        return true;
    }

    /**
     * Validate the project creation form
     */
    validateProjectForm() {
        const projectNameValid = this.validateProjectName();
        const ideaTextValid = this.validateIdeaText();
        const createBtn = document.getElementById('createBtn');
        
        const isValid = projectNameValid && ideaTextValid && !this.isCreatingProject;
        
        // Note: Model selection is optional - projects can be created without selecting a model
        // The backend will use a default model if none is specified
        
        createBtn.disabled = !isValid;
        
        return isValid;
    }

    /**
     * Perform comprehensive pre-submission validation
     */
    performPreSubmissionValidation() {
        // Check if already creating project
        if (this.isCreatingProject) {
            this.showMessage('Project creation is already in progress. Please wait.', 'warning');
            return false;
        }
        
        // Validate form fields
        const projectNameValid = this.validateProjectName();
        const ideaTextValid = this.validateIdeaText();
        
        if (!projectNameValid || !ideaTextValid) {
            this.showMessage('Please fix all validation errors before submitting.', 'error');
            return false;
        }
        
        // Check for empty values after trimming
        const projectName = document.getElementById('projectName').value.trim();
        const idea = document.getElementById('ideaText').value.trim();
        
        if (!projectName || !idea) {
            this.showMessage('Project name and business idea are required.', 'error');
            return false;
        }
        
        // Check for duplicate project names (optional - helps prevent accidental duplicates)
        const existingProject = this.projects.find(p => 
            p.name.toLowerCase() === projectName.toLowerCase()
        );
        
        if (existingProject) {
            const confirmDuplicate = confirm(
                `A project named "${projectName}" already exists. Do you want to create another project with the same name?`
            );
            if (!confirmDuplicate) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Setup responsive layout handling
     */
    setupResponsiveLayout() {
        // Handle window resize events for responsive behavior
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResponsiveLayout();
            }, 150);
        });

        // Initial layout setup
        this.handleResponsiveLayout();
    }

    /**
     * Handle responsive layout adjustments
     */
    handleResponsiveLayout() {
        const width = window.innerWidth;
        const appMain = document.querySelector('.app-main');
        
        // Update layout classes based on screen size
        if (width <= 575) {
            // Mobile layout
            appMain.classList.add('mobile-layout');
            appMain.classList.remove('tablet-layout', 'desktop-layout');
            this.adjustMobileLayout();
        } else if (width <= 991) {
            // Tablet layout
            appMain.classList.add('tablet-layout');
            appMain.classList.remove('mobile-layout', 'desktop-layout');
            this.adjustTabletLayout();
        } else {
            // Desktop layout
            appMain.classList.add('desktop-layout');
            appMain.classList.remove('mobile-layout', 'tablet-layout');
            this.adjustDesktopLayout();
        }

        // Notify components of layout changes
        this.notifyComponentsOfLayoutChange(width);
    }

    /**
     * Adjust layout for mobile screens
     */
    adjustMobileLayout() {
        // Ensure terminal has minimum height on mobile
        const terminalSection = document.querySelector('.terminal-section');
        if (terminalSection) {
            terminalSection.style.minHeight = '250px';
        }

        // Adjust artifact grid for mobile
        const artifactsGrid = document.getElementById('artifactsGrid');
        if (artifactsGrid) {
            artifactsGrid.classList.add('mobile-grid');
        }
    }

    /**
     * Adjust layout for tablet screens
     */
    adjustTabletLayout() {
        // Ensure proper spacing for tablet
        const terminalSection = document.querySelector('.terminal-section');
        if (terminalSection) {
            terminalSection.style.minHeight = '300px';
        }

        // Adjust artifact grid for tablet
        const artifactsGrid = document.getElementById('artifactsGrid');
        if (artifactsGrid) {
            artifactsGrid.classList.remove('mobile-grid');
            artifactsGrid.classList.add('tablet-grid');
        }
    }

    /**
     * Adjust layout for desktop screens
     */
    adjustDesktopLayout() {
        // Reset to default desktop layout
        const terminalSection = document.querySelector('.terminal-section');
        if (terminalSection) {
            terminalSection.style.minHeight = '400px';
        }

        // Reset artifact grid for desktop
        const artifactsGrid = document.getElementById('artifactsGrid');
        if (artifactsGrid) {
            artifactsGrid.classList.remove('mobile-grid', 'tablet-grid');
        }
    }

    /**
     * Notify components of layout changes
     */
    notifyComponentsOfLayoutChange(width) {
        // Notify Terminal component
        if (this.terminal && typeof this.terminal.handleLayoutChange === 'function') {
            this.terminal.handleLayoutChange(width);
        }

        // Notify ArtifactViewer component
        if (this.artifactViewer && typeof this.artifactViewer.handleLayoutChange === 'function') {
            this.artifactViewer.handleLayoutChange(width);
        }

        // Notify ModelSelector component
        if (this.modelSelector && typeof this.modelSelector.handleLayoutChange === 'function') {
            this.modelSelector.handleLayoutChange(width);
        }

        // Notify ProjectCard components
        this.projectCards.forEach(card => {
            if (card && typeof card.handleLayoutChange === 'function') {
                card.handleLayoutChange(width);
            }
        });
    }

    /**
     * Finalize component integration and ensure everything is working together
     */
    finalizeIntegration() {
        // Ensure all components are properly initialized
        this.validateComponentIntegration();
        
        // Setup cross-component communication
        this.setupComponentCommunication();
        
        // Apply final styling adjustments
        this.applyFinalStyling();
        
        // Setup accessibility features
        this.setupAccessibility();
        
        console.log('Component integration finalized');
    }

    /**
     * Validate that all components are properly integrated
     */
    validateComponentIntegration() {
        const components = {
            modelSelector: this.modelSelector,
            terminal: this.terminal,
            artifactViewer: this.artifactViewer
        };

        Object.entries(components).forEach(([name, component]) => {
            if (!component) {
                console.warn(`Component ${name} is not properly initialized`);
            } else {
                console.log(`Component ${name} is properly integrated`);
            }
        });

        // Validate DOM elements
        const requiredElements = [
            'projectForm',
            'projectsList',
            'artifactsGrid',
            'progressTerminal',
            'modelSelector'
        ];

        requiredElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.error(`Required element ${elementId} not found`);
            }
        });
    }

    /**
     * Setup communication between components
     */
    setupComponentCommunication() {
        // Setup ModelSelector communication
        if (this.modelSelector) {
            this.modelSelector.onModelSelect = (modelSelection, modelDetails) => {
                this.selectedModel = modelSelection;
                this.validateProjectForm();
                
                // Log model selection in terminal
                if (this.terminal) {
                    if (modelSelection && modelSelection.type && modelSelection.name) {
                        this.terminal.log(`Model selected: ${modelSelection.name} (${modelSelection.type})`, 'info');
                    } else if (modelSelection) {
                        this.terminal.log(`Model selected: ${modelSelection}`, 'info');
                    } else {
                        this.terminal.log('Model selection cleared', 'info');
                    }
                }
            };

            this.modelSelector.onError = (error) => {
                this.handleModelSelectorError(error);
                
                // Log error in terminal
                if (this.terminal) {
                    this.terminal.log(`Model selector error: ${error.message}`, 'error');
                }
            };
        }

        // Setup ArtifactViewer communication
        if (this.artifactViewer) {
            this.artifactViewer.onArtifactClick = (artifact) => {
                // Log artifact interaction in terminal
                if (this.terminal) {
                    this.terminal.log(`Artifact viewed: ${artifact.name}`, 'info');
                }
            };

            this.artifactViewer.onError = (error, action) => {
                this.showMessage(`Artifact ${action} failed: ${error.message}`, 'error');
                
                // Log error in terminal
                if (this.terminal) {
                    this.terminal.log(`Artifact error during ${action}: ${error.message}`, 'error');
                }
            };
        }

        // Setup Terminal communication
        if (this.terminal) {
            // Terminal is primarily a display component, but we can setup any needed callbacks
            this.terminal.onError = (error) => {
                console.error('Terminal error:', error);
            };
        }
    }

    /**
     * Apply final styling adjustments and polish
     */
    applyFinalStyling() {
        // Ensure proper visual hierarchy
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.classList.add('integrated-layout');
        }

        // Add production-ready classes
        document.body.classList.add('app-ready');
        
        // Ensure smooth transitions are enabled
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.add('transitions-enabled');
        }

        // Apply component-specific styling adjustments
        this.applyComponentStyling();
    }

    /**
     * Apply component-specific styling adjustments
     */
    applyComponentStyling() {
        // Style the artifacts section for better visual hierarchy
        const artifactsSection = document.querySelector('.artifacts-section');
        if (artifactsSection) {
            artifactsSection.classList.add('priority-section');
        }

        // Style the terminal section for IDE-like appearance
        const terminalSection = document.querySelector('.terminal-section');
        if (terminalSection) {
            terminalSection.classList.add('terminal-ide-style');
        }

        // Ensure project cards have consistent styling
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            projectsList.classList.add('integrated-project-list');
        }
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Add ARIA labels and roles
        const appMain = document.querySelector('.app-main');
        if (appMain) {
            appMain.setAttribute('role', 'main');
            appMain.setAttribute('aria-label', 'Main application interface');
        }

        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup focus management
        this.setupFocusManagement();
        
        // Setup screen reader support
        this.setupScreenReaderSupport();
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Ctrl/Cmd + Enter to submit form
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const activeForm = document.querySelector('form:focus-within');
                if (activeForm) {
                    activeForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Ensure proper focus indicators
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(element => {
            element.addEventListener('focus', () => {
                element.classList.add('focused');
            });
            
            element.addEventListener('blur', () => {
                element.classList.remove('focused');
            });
        });
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Add live regions for dynamic content
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'liveRegion';
        document.body.appendChild(liveRegion);

        // Announce important state changes
        this.announceToScreenReader = (message) => {
            const liveRegion = document.getElementById('liveRegion');
            if (liveRegion) {
                liveRegion.textContent = message;
                setTimeout(() => {
                    liveRegion.textContent = '';
                }, 1000);
            }
        };
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        // Close ArtifactViewer modal if open
        if (this.artifactViewer && typeof this.artifactViewer.closeModal === 'function') {
            this.artifactViewer.closeModal();
        }
        
        // Close any other modals
        const modals = document.querySelectorAll('.modal.show, .modal-overlay.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // ============================================================================
    // WEBSOCKET CONNECTION MANAGEMENT
    // ============================================================================

    connectWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            
            this.updateConnectionStatus('connecting', 'Connecting...');
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus('connected', 'Connected');
                this.reconnectAttempts = 0;
                
                // Subscribe to current project if exists
                if (this.currentProjectId) {
                    this.subscribeToProject(this.currentProjectId);
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    this.logEvent('error', 'Failed to parse WebSocket message');
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.updateConnectionStatus('disconnected', 'Disconnected');
                
                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('disconnected', 'Connection Error');
                this.logEvent('error', 'WebSocket connection error');
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.updateConnectionStatus('disconnected', 'Failed to Connect');
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.updateConnectionStatus('disconnected', 'Connection Failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        this.updateConnectionStatus('connecting', `Reconnecting in ${delay/1000}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    updateConnectionStatus(status, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = `status-indicator status-${status}`;
        statusText.textContent = text;
        
        // Update terminal with connection status
        if (this.terminal) {
            this.terminal.handleConnectionStatus(status, text);
        }
    }

    subscribeToProject(projectId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe:project',
                projectId: projectId,
                userId: 'user_' + Date.now() // Generate a temporary userId for WebSocket subscription
            }));
        }
    }

    // ============================================================================
    // WEBSOCKET MESSAGE HANDLING
    // ============================================================================

    handleWebSocketMessage(data) {
        console.log('WebSocket message received:', data);
        
        switch (data.type) {
            case 'connection:established':
                this.logEvent('info', `Connection established: ${data.payload.connectionId}`);
                break;
                
            case 'subscription:confirmed':
                this.logEvent('info', `Subscribed to project: ${data.payload.projectId}`);
                break;
                
            case 'project:start':
                this.handleProjectStart(data.payload);
                break;
                
            case 'task:update':
                this.handleTaskUpdate(data.payload);
                break;
                
            case 'artifact:create':
                this.handleArtifactCreate(data.payload);
                break;
                
            case 'stage:complete':
                this.handleStageComplete(data.payload);
                break;
                
            case 'project:complete':
                this.handleProjectComplete(data.payload);
                break;
                
            case 'error':
                this.handleError(data.payload);
                break;
                
            case 'pong':
                this.logEvent('debug', 'Pong received');
                break;
                
            default:
                console.warn('Unknown WebSocket message type:', data.type);
        }
    }

    handleProjectStart(payload) {
        this.logEvent('project:start', `Project started: ${payload.project.name}`);
        this.currentProjectId = payload.projectId;
        this.updateCurrentProject(payload.project);
        this.loadProjects(); // Refresh projects list
        
        // Update terminal
        if (this.terminal) {
            this.terminal.handleProjectStart(payload);
        }
    }

    handleTaskUpdate(payload) {
        this.logEvent('task:update', `Task ${payload.agent} - ${payload.status} (${payload.progress}%)`);
        this.updateProgress(payload);
        
        // Update terminal
        if (this.terminal) {
            this.terminal.handleTaskUpdate(payload);
        }
    }

    handleArtifactCreate(payload) {
        this.logEvent('artifact:create', `New artifact: ${payload.artifact.name}`);
        this.addArtifact(payload.artifact);
        
        // Update terminal
        if (this.terminal) {
            this.terminal.handleArtifactCreate(payload);
        }
        
        // Update ArtifactViewer
        if (this.artifactViewer) {
            this.artifactViewer.handleArtifactCreate(payload);
        }
    }

    handleStageComplete(payload) {
        this.logEvent('stage:complete', `Stage ${payload.stage} completed with ${payload.completedTasks} tasks`);
        this.updateStageProgress(payload);
        
        // Update terminal
        if (this.terminal) {
            this.terminal.handleStageComplete(payload);
        }
    }

    handleProjectComplete(payload) {
        this.logEvent('project:complete', `Project completed: ${payload.project.name} (${payload.totalArtifacts} artifacts)`);
        this.updateCurrentProject(payload.project);
        this.loadProjects(); // Refresh projects list
        
        // Update terminal
        if (this.terminal) {
            this.terminal.handleProjectComplete(payload);
        }
    }

    handleError(payload) {
        this.logEvent('error', `Error: ${payload.error}`);
        this.showMessage(payload.error, 'error');
        
        // Update terminal
        if (this.terminal) {
            this.terminal.handleError(payload);
        }
    }

    // ============================================================================
    // API CALLS
    // ============================================================================

    async createProject() {
        const currentTime = Date.now();
        
        // Prevent double submission with debouncing
        if (this.isCreatingProject) {
            console.log('Project creation already in progress, ignoring duplicate submission');
            return;
        }
        
        // Debounce rapid submissions
        if (currentTime - this.lastSubmissionTime < this.submissionDebounceDelay) {
            console.log('Submission too soon after last attempt, debouncing');
            return;
        }
        
        this.lastSubmissionTime = currentTime;

        const projectName = document.getElementById('projectName').value.trim();
        const idea = document.getElementById('ideaText').value.trim();
        const selectedModel = this.modelSelector ? this.modelSelector.getSelectedModel() : null;
        const createBtn = document.getElementById('createBtn');
        const form = document.getElementById('projectForm');
        
        // Validate form before submission
        if (!this.validateProjectForm()) {
            this.showMessage('Please fix the validation errors before submitting', 'error');
            return;
        }

        try {
            // Set loading state immediately to prevent further submissions
            this.isCreatingProject = true;
            this.setFormLoadingState(true);
            
            // Prepare request body with all supported fields
            const requestBody = { 
                name: projectName,
                idea: idea
                // Note: Omitting userId to avoid foreign key constraint issues
                // In a real app, you'd have proper user authentication
            };
            
            // Include selected model if available
            if (selectedModel) {
                // Handle both old format (string) and new format (object with type and name)
                if (typeof selectedModel === 'string') {
                    // Legacy format - assume it's an Ollama model
                    requestBody.ollamaModel = selectedModel;
                    requestBody.modelType = 'ollama';
                    requestBody.modelName = selectedModel;
                } else if (selectedModel && selectedModel.type && selectedModel.name) {
                    // New format with type and name
                    requestBody.modelType = selectedModel.type;
                    requestBody.modelName = selectedModel.name;
                    
                    // For backward compatibility, also set ollamaModel if it's an Ollama model
                    if (selectedModel.type === 'ollama') {
                        requestBody.ollamaModel = selectedModel.name;
                    }
                    
                    // For Groq models, include the API key
                    if (selectedModel.type === 'groq' && this.modelSelector) {
                        const groqApiKey = this.modelSelector.getGroqApiKey();
                        if (groqApiKey) {
                            requestBody.groqApiKey = groqApiKey;
                        } else {
                            throw new Error('Groq API key is required for Groq models. Please enter and save your API key first.');
                        }
                    }
                }
            }
            
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (!response.ok) {
                // Provide more detailed error information
                const errorMessage = result.message || result.error || 'Failed to create project';
                console.error('Project creation failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: result
                });
                throw new Error(errorMessage);
            }

            // Show success message
            if (typeof errorHandler !== 'undefined') {
                errorHandler.showSuccess('Project created successfully!');
            } else {
                this.showMessage('Project created successfully!', 'success');
            }
            this.currentProjectId = result.data.project.id;
            this.updateCurrentProject(result.data.project);
            
            // Subscribe to the new project
            this.subscribeToProject(this.currentProjectId);
            
            // Clear form
            this.resetProjectForm();
            
            // Refresh projects list
            this.loadProjects();

        } catch (error) {
            console.error('Error creating project:', error);
            
            // Use ErrorHandler for better error display
            if (typeof errorHandler !== 'undefined') {
                if (error.message.includes('validation')) {
                    errorHandler.handleValidationErrors({ project: error.message });
                } else {
                    errorHandler.showError(`Failed to create project: ${error.message}`);
                }
            } else {
                this.showMessage(error.message, 'error');
            }
        } finally {
            // Clear loading state with a small delay to prevent rapid re-submissions
            setTimeout(() => {
                this.isCreatingProject = false;
                this.setFormLoadingState(false);
            }, 500);
        }
    }

    /**
     * Set form loading state with visual feedback
     */
    setFormLoadingState(loading) {
        const createBtn = document.getElementById('createBtn');
        const form = document.getElementById('projectForm');
        const btnText = createBtn.querySelector('.btn-text');
        const btnSpinner = createBtn.querySelector('.btn-spinner');
        
        if (loading) {
            // Disable form and show loading state
            createBtn.disabled = true;
            createBtn.classList.add('loading');
            form.classList.add('form-submitting');
            
            // Update button text to show loading state
            if (btnText) {
                btnText.textContent = 'Creating Project...';
                btnText.style.opacity = '1';
            }
            if (btnSpinner) btnSpinner.classList.remove('hidden');
            
            // Disable all form inputs to prevent any interaction
            const inputs = form.querySelectorAll('input, textarea, select, button');
            inputs.forEach(input => {
                input.disabled = true;
                input.setAttribute('data-was-disabled', input.disabled);
            });
            
            // Prevent form submission events
            form.style.pointerEvents = 'none';
            
        } else {
            // Re-enable form and hide loading state
            createBtn.classList.remove('loading');
            form.classList.remove('form-submitting');
            
            // Restore button text
            if (btnText) {
                btnText.textContent = 'Create Project';
                btnText.style.opacity = '1';
            }
            if (btnSpinner) btnSpinner.classList.add('hidden');
            
            // Re-enable form interactions
            form.style.pointerEvents = 'auto';
            
            // Re-enable all form inputs
            const inputs = form.querySelectorAll('input, textarea, select, button');
            inputs.forEach(input => {
                const wasDisabled = input.getAttribute('data-was-disabled') === 'true';
                input.disabled = wasDisabled;
                input.removeAttribute('data-was-disabled');
            });
            
            // Re-validate form to update button state properly
            setTimeout(() => {
                this.validateProjectForm();
            }, 100);
        }
    }

    /**
     * Reset the project creation form
     */
    resetProjectForm() {
        // Clear form fields
        document.getElementById('projectName').value = '';
        document.getElementById('ideaText').value = '';
        
        // Clear validation messages and states
        const projectNameInput = document.getElementById('projectName');
        const ideaTextInput = document.getElementById('ideaText');
        const projectNameValidation = document.getElementById('projectNameValidation');
        const ideaValidation = document.getElementById('ideaValidation');
        
        projectNameInput.classList.remove('error', 'success');
        ideaTextInput.classList.remove('error', 'success');
        projectNameValidation.textContent = '';
        ideaValidation.textContent = '';
        
        // Reset model selector
        if (this.modelSelector) {
            this.modelSelector.setSelectedModel('');
        }
        
        // Re-validate form to update button state
        this.validateProjectForm();
    }

    async loadProjects() {
        try {
            // Load all projects since we no longer filter by userId in the UI
            const response = await fetch('/api/projects?includeTasks=true&includeArtifacts=true');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to load projects');
            }

            this.projects = result.data.projects || [];
            this.renderProjects();

        } catch (error) {
            console.error('Error loading projects:', error);
            
            // Use ErrorHandler for network errors
            if (typeof errorHandler !== 'undefined') {
                errorHandler.handleNetworkError(error, () => this.loadProjects());
            } else {
                this.showMessage('Failed to load projects', 'error');
            }
        }
    }

    async loadProjectDetails(projectId) {
        try {
            const response = await fetch(`/api/projects/${projectId}?includeTasks=true&includeArtifacts=true`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to load project details');
            }

            return result.data.project;

        } catch (error) {
            console.error('Error loading project details:', error);
            this.showMessage('Failed to load project details', 'error');
            return null;
        }
    }

    // ============================================================================
    // UI UPDATES
    // ============================================================================

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        const messageDiv = document.createElement('div');
        
        // Use design system alert classes
        const alertTypeMap = {
            'info': 'alert-info',
            'success': 'alert-success',
            'warning': 'alert-warning',
            'error': 'alert-destructive'
        };
        
        messageDiv.className = `alert-base ${alertTypeMap[type] || 'alert-default'} mb-4`;
        messageDiv.textContent = message;
        
        container.innerHTML = '';
        container.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    renderProjects() {
        const container = document.getElementById('projectsList');
        
        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="projects-empty-state">
                    No projects found. Create your first project!
                </div>
            `;
            return;
        }

        // Clear existing content
        container.innerHTML = '';
        
        // Create ProjectCard instances for each project
        this.projectCards = this.projects.map(project => {
            const projectCard = new ProjectCard(project, {
                onSelect: (selectedProject) => {
                    this.selectProject(selectedProject.id);
                },
                onUpdate: (updatedProject, field) => {
                    this.handleProjectUpdate(updatedProject, field);
                },
                onDelete: (deletedProject) => {
                    this.handleProjectDelete(deletedProject);
                },
                onError: (error, action) => {
                    this.handleProjectCardError(error, action);
                }
            });
            
            container.appendChild(projectCard.getElement());
            return projectCard;
        });
    }

    async selectProject(projectId) {
        try {
            const project = await this.loadProjectDetails(projectId);
            if (project) {
                this.currentProjectId = projectId;
                this.updateCurrentProject(project);
                this.subscribeToProject(projectId);
                
                // Load artifacts for this project
                this.artifacts = project.artifacts || [];
                this.updateArtifactViewer();
            }
        } catch (error) {
            console.error('Error selecting project:', error);
            this.showMessage('Failed to select project', 'error');
        }
    }

    updateCurrentProject(project) {
        const currentProjectDiv = document.getElementById('currentProject');
        const projectNameDiv = document.getElementById('currentProjectName');
        const progressText = document.getElementById('progressText');
        
        if (project) {
            currentProjectDiv.classList.remove('current-project-hidden');
            projectNameDiv.textContent = project.name;
            
            const progress = this.calculateProgress(project);
            this.updateProgressBar(progress);
            progressText.textContent = `Stage ${project.currentStage}/6 - ${Math.round(progress)}% complete`;
        } else {
            currentProjectDiv.classList.add('current-project-hidden');
        }
    }

    calculateProgress(project) {
        if (!project.tasks || project.tasks.length === 0) return 0;
        
        const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length;
        return (completedTasks / project.tasks.length) * 100;
    }

    updateProgress(taskUpdate) {
        // Update progress based on task updates
        const stageProgress = (taskUpdate.stage - 1) / 6 * 100 + (taskUpdate.progress / 6);
        this.updateProgressBar(stageProgress);
        
        const progressText = document.getElementById('progressText');
        progressText.textContent = `Stage ${taskUpdate.stage}/6 - ${taskUpdate.agent} (${taskUpdate.progress}%)`;
    }

    updateProgressBar(percentage) {
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }

    updateStageProgress(stageData) {
        // Add stage completion artifacts
        if (stageData.artifacts) {
            stageData.artifacts.forEach(artifact => {
                this.addArtifact(artifact);
            });
        }
    }

    addArtifact(artifact) {
        // Check if artifact already exists
        const existingIndex = this.artifacts.findIndex(a => a.id === artifact.id);
        if (existingIndex >= 0) {
            this.artifacts[existingIndex] = artifact;
        } else {
            this.artifacts.push(artifact);
        }
        this.updateArtifactViewer();
        
        // Also update the ArtifactViewer component directly for real-time updates
        if (this.artifactViewer) {
            this.artifactViewer.addArtifact(artifact);
        }
    }

    /**
     * Update the ArtifactViewer component with current artifacts
     */
    updateArtifactViewer() {
        if (this.artifactViewer) {
            this.artifactViewer.setArtifacts(this.artifacts);
        } else {
            // Fallback to old rendering if ArtifactViewer is not available
            this.renderArtifactsFallback();
        }
    }

    /**
     * Fallback artifact rendering method (for backward compatibility)
     */
    renderArtifactsFallback() {
        const container = document.getElementById('artifactsGrid');
        
        if (this.artifacts.length === 0) {
            container.innerHTML = `
                <div class="artifacts-empty-state">
                    Artifacts will appear here as they are generated...
                </div>
            `;
            return;
        }

        container.innerHTML = this.artifacts.map(artifact => `
            <div class="artifact-card">
                <div class="artifact-name">${this.escapeHtml(artifact.name)}</div>
                <div class="artifact-type">${artifact.type.replace(/_/g, ' ')}</div>
                <div class="artifact-preview">${this.escapeHtml(this.truncateText(artifact.content, 150))}</div>
            </div>
        `).join('');
    }

    logEvent(type, message) {
        // Use Terminal component for logging if available
        if (this.terminal && typeof this.terminal.log === 'function') {
            this.terminal.log(message, type);
            return;
        }
        
        // Fallback to console logging if terminal is not available
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Try to find legacy eventsLog element as last resort
        const eventsLog = document.getElementById('eventsLog');
        if (eventsLog) {
            const timestamp = new Date().toLocaleTimeString();
            
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event-item';
            eventDiv.innerHTML = `
                <span class="event-timestamp">[${timestamp}]</span>
                <span class="event-type">${type.toUpperCase()}</span>
                <span>${this.escapeHtml(message)}</span>
            `;
            
            eventsLog.appendChild(eventDiv);
            eventsLog.scrollTop = eventsLog.scrollHeight;
            
            // Keep only last 100 events
            while (eventsLog.children.length > 100) {
                eventsLog.removeChild(eventsLog.firstChild);
            }
        }
    }

    // ============================================================================
    // PROJECT CARD EVENT HANDLERS
    // ============================================================================

    /**
     * Handle project update from ProjectCard
     */
    handleProjectUpdate(updatedProject, field) {
        // Update the project in our local array
        const projectIndex = this.projects.findIndex(p => p.id === updatedProject.id);
        if (projectIndex >= 0) {
            this.projects[projectIndex] = updatedProject;
        }
        
        // Update current project if it's the one being edited
        if (this.currentProjectId === updatedProject.id) {
            this.updateCurrentProject(updatedProject);
        }
        
        // Show success message
        this.showMessage(`Project ${field} updated successfully!`, 'success');
    }

    /**
     * Handle project deletion from ProjectCard
     */
    handleProjectDelete(deletedProject) {
        // Remove project from local array
        this.projects = this.projects.filter(p => p.id !== deletedProject.id);
        
        // Clear current project if it was the deleted one
        if (this.currentProjectId === deletedProject.id) {
            this.currentProjectId = null;
            this.updateCurrentProject(null);
            this.artifacts = [];
            this.updateArtifactViewer();
        }
        
        // Show success message
        this.showMessage('Project deleted successfully!', 'success');
        
        // Re-render projects list if empty
        if (this.projects.length === 0) {
            this.renderProjects();
        }
    }

    /**
     * Handle errors from ProjectCard
     */
    handleProjectCardError(error, action) {
        let message = 'An error occurred';
        
        switch (action) {
            case 'update':
                message = `Failed to update project: ${error.message}`;
                break;
            case 'delete':
                message = `Failed to delete project: ${error.message}`;
                break;
            default:
                message = error.message;
        }
        
        this.showMessage(message, 'error');
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Send ping to keep connection alive
    sendPing() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
        }
    }
}

// Initialize the client when the page loads
let client;
document.addEventListener('DOMContentLoaded', () => {
    client = new BillionDollarIdeaClient();
    
    // Send ping every 30 seconds to keep connection alive
    setInterval(() => {
        client.sendPing();
    }, 30000);
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (client && client.ws) {
        client.ws.close(1000, 'Page unload');
    }
});