/**
 * ModelSelector Component
 * Handles both Ollama (local) and Groq (cloud) model selection with dual sections
 * Requirements: 1.1, 1.2, 3.1
 */
class ModelSelector {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    // Initialize secure API key manager
    this.apiKeyManager = new ApiKeyManager();
    
    // Ollama models state
    this.ollamaModels = [];
    this.selectedOllamaModel = null;
    this.isLoadingOllama = false;
    this.ollamaError = null;
    this.ollamaRetryCount = 0;
    
    // Groq models state
    this.groqApiKey = null;
    this.selectedGroqModel = null;
    this.isValidatingGroqKey = false;
    this.groqKeyValid = false;
    this.groqError = null;
    this.isLoadingApiKey = false;
    
    // General state
    this.maxRetries = 3;
    this.selectedModelType = null; // 'ollama' or 'groq'
    
    // Configuration options
    this.options = {
      placeholder: 'Select an AI model...',
      emptyMessage: 'No models available',
      errorMessage: 'Failed to load models',
      autoLoad: true,
      showRefresh: true,
      ...options
    };
    
    // Event callbacks
    this.onModelSelect = options.onModelSelect || (() => {});
    this.onError = options.onError || (() => {});
    this.onLoad = options.onLoad || (() => {});
    
    // Don't call init() in constructor since it's now async
    // init() will be called explicitly from the parent component
  }

  /**
   * Initialize the ModelSelector component
   */
  async init() {
    if (!this.container) {
      console.error(`ModelSelector: Container with id '${this.containerId}' not found`);
      return;
    }
    
    await this.loadStoredApiKey();
    this.render();
    
    if (this.options.autoLoad) {
      this.loadOllamaModels();
    }
  }

  /**
   * Render the ModelSelector UI with dual sections
   */
  render() {
    this.container.innerHTML = `
      <div class="model-selector">
        <div class="model-selector-header">
          <label class="label-base">AI Model</label>
        </div>
        
        <!-- Ollama Models Section -->
        <div class="model-section ollama-section">
          <div class="model-section-header">
            <h3 class="model-section-title">Ollama Models (Local)</h3>
            ${this.options.showRefresh ? `
              <button 
                type="button" 
                class="btn-base btn-ghost btn-sm model-selector-refresh" 
                id="${this.containerId}-ollama-refresh"
                title="Refresh Ollama models"
                ${this.isLoadingOllama ? 'disabled' : ''}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            ` : ''}
          </div>
          
          <select 
            id="${this.containerId}-ollama-select" 
            class="select-base model-selector-dropdown"
            ${this.isLoadingOllama ? 'disabled' : ''}
          >
            ${this.renderOllamaOptions()}
          </select>
          
          ${this.renderOllamaStatus()}
        </div>
        
        <!-- Groq Models Section -->
        <div class="model-section groq-section">
          <div class="model-section-header">
            <h3 class="model-section-title">Groq Models (Cloud)</h3>
          </div>
          
          <div class="groq-api-key-input">
            <div class="api-key-field">
              <input 
                type="password" 
                id="${this.containerId}-groq-key"
                class="input-base api-key-input"
                placeholder="Enter Groq API Key (gsk_...)"
                value="${this.groqApiKey || ''}"
                ${this.isValidatingGroqKey || this.isLoadingApiKey ? 'disabled' : ''}
              >
              <button 
                type="button" 
                class="btn-base btn-outline btn-sm api-key-save-btn"
                id="${this.containerId}-groq-save"
                ${this.isValidatingGroqKey || this.isLoadingApiKey ? 'disabled' : ''}
              >
                ${this.isValidatingGroqKey ? 'Validating...' : this.isLoadingApiKey ? 'Loading...' : 'Save Key'}
              </button>
              ${this.apiKeyManager.hasApiKey() ? `
                <button 
                  type="button" 
                  class="btn-base btn-ghost btn-sm api-key-clear-btn"
                  id="${this.containerId}-groq-clear"
                  title="Clear stored API key"
                  ${this.isValidatingGroqKey || this.isLoadingApiKey ? 'disabled' : ''}
                >
                  Clear
                </button>
              ` : ''}
            </div>
            ${this.renderGroqKeyStatus()}
          </div>
          
          <select 
            id="${this.containerId}-groq-select" 
            class="select-base model-selector-dropdown"
            ${!this.groqKeyValid ? 'disabled' : ''}
          >
            ${this.renderGroqOptions()}
          </select>
          
          ${this.renderGroqStatus()}
        </div>
      </div>
    `;
    
    // Store reference to this instance on the container
    this.container.querySelector('.model-selector').modelSelectorInstance = this;
    
    this.attachEventListeners();
  }

  /**
   * Render Ollama dropdown options
   */
  renderOllamaOptions() {
    if (this.isLoadingOllama) {
      return '<option value="">Loading Ollama models...</option>';
    }
    
    if (this.ollamaError) {
      return '<option value="">Error loading Ollama models</option>';
    }
    
    if (this.ollamaModels.length === 0) {
      return '<option value="">No Ollama models available</option>';
    }
    
    const defaultOption = '<option value="">Select Ollama model...</option>';
    const modelOptions = this.ollamaModels.map(model => 
      `<option value="ollama:${model.name}" ${this.selectedOllamaModel === model.name ? 'selected' : ''}>
        ${model.name} ${model.size ? `(${this.formatSize(model.size)})` : ''}
      </option>`
    ).join('');
    
    return defaultOption + modelOptions;
  }

  /**
   * Render Groq dropdown options
   */
  renderGroqOptions() {
    if (!this.groqKeyValid) {
      return '<option value="">Enter valid API key to enable Groq models</option>';
    }
    
    const defaultOption = '<option value="">Select Groq model...</option>';
    const groqModel = `<option value="groq:openai/gpt-oss-120b" ${this.selectedGroqModel === 'openai/gpt-oss-120b' ? 'selected' : ''}>
      openai/gpt-oss-120b
    </option>`;
    
    return defaultOption + groqModel;
  }

  /**
   * Render Ollama status indicators
   */
  renderOllamaStatus() {
    if (this.isLoadingOllama) {
      return `
        <div class="model-selector-status model-selector-loading">
          <div class="spinner"></div>
          <span class="text-sm text-muted-foreground">Loading Ollama models...</span>
        </div>
      `;
    }
    
    if (this.ollamaError) {
      return `
        <div class="model-selector-status model-selector-error">
          <div class="alert-base alert-destructive">
            <div class="model-selector-error-content">
              <div class="model-selector-error-message">
                <strong>Unable to load Ollama models</strong>
              </div>
              <div class="model-selector-error-details text-sm">
                ${this.getOllamaErrorMessage()}
              </div>
              <div class="model-selector-error-actions mt-3">
                <button 
                  type="button" 
                  class="btn-base btn-outline btn-sm" 
                  onclick="this.closest('.model-selector').modelSelectorInstance.retryOllama()"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    if (this.ollamaModels.length === 0 && !this.isLoadingOllama) {
      return `
        <div class="model-selector-status model-selector-empty">
          <div class="alert-base alert-warning">
            <div class="model-selector-empty-content">
              <div class="model-selector-empty-message">
                <strong>No Ollama models found</strong>
              </div>
              <div class="model-selector-empty-details text-sm">
                You need to install at least one Ollama model to continue.
              </div>
              <div class="model-selector-empty-actions mt-3">
                <div class="text-sm">
                  <p class="mb-2">To install a model, run:</p>
                  <code class="bg-muted px-2 py-1 rounded text-xs">ollama pull llama2</code>
                </div>
                <button 
                  type="button" 
                  class="btn-base btn-outline btn-sm mt-2" 
                  onclick="this.closest('.model-selector').modelSelectorInstance.loadOllamaModels()"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    return '';
  }

  /**
   * Render Groq API key validation status
   */
  renderGroqKeyStatus() {
    if (this.isLoadingApiKey) {
      return `
        <div class="api-key-status loading">
          <div class="spinner"></div>
          <span class="text-sm text-muted-foreground">Loading stored API key...</span>
        </div>
      `;
    }
    
    if (this.isValidatingGroqKey) {
      return `
        <div class="api-key-status validating">
          <div class="spinner"></div>
          <span class="text-sm text-muted-foreground">Validating API key...</span>
        </div>
      `;
    }
    
    if (this.groqError) {
      return `
        <div class="api-key-status error">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span class="text-sm text-error">${this.groqError.message}</span>
        </div>
      `;
    }
    
    if (this.groqApiKey && this.groqKeyValid) {
      const metadata = this.apiKeyManager.getKeyMetadata();
      return `
        <div class="api-key-status valid">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="text-sm text-success">API key is valid and ready to use</span>
          ${metadata ? `<span class="text-xs text-muted-foreground">(saved ${metadata.savedAt})</span>` : ''}
        </div>
      `;
    }
    
    if (this.groqApiKey && !this.groqKeyValid && !this.groqError) {
      return `
        <div class="api-key-status pending">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm text-muted-foreground">API key entered - click Save to validate</span>
        </div>
      `;
    }
    
    if (this.apiKeyManager.hasApiKey() && !this.groqApiKey) {
      return `
        <div class="api-key-status stored">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm text-info">Encrypted API key stored securely</span>
        </div>
      `;
    }
    
    if (!this.groqApiKey && !this.apiKeyManager.hasApiKey()) {
      return `
        <div class="api-key-status empty">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
          </svg>
          <span class="text-sm text-muted-foreground">Enter your Groq API key to enable cloud models</span>
        </div>
      `;
    }
    
    return '';
  }

  /**
   * Render Groq section status
   */
  renderGroqStatus() {
    if (this.groqError) {
      return `
        <div class="model-selector-status model-selector-error">
          <div class="alert-base alert-destructive">
            <div class="model-selector-error-content">
              <div class="model-selector-error-message">
                <strong>Groq service error</strong>
              </div>
              <div class="model-selector-error-details text-sm">
                ${this.groqError.message || 'Unable to connect to Groq service'}
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    return '';
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // Ollama model selection
    const ollamaSelect = document.getElementById(`${this.containerId}-ollama-select`);
    if (ollamaSelect) {
      ollamaSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value && value.startsWith('ollama:')) {
          this.selectedOllamaModel = value.replace('ollama:', '');
          this.selectedGroqModel = null; // Clear Groq selection
          this.selectedModelType = 'ollama';
          this.updateGroqSelection();
          this.onModelSelect(this.selectedOllamaModel, this.getSelectedModelDetails());
        } else {
          this.selectedOllamaModel = null;
          if (this.selectedModelType === 'ollama') {
            this.selectedModelType = null;
            this.onModelSelect(null, null);
          }
        }
      });
    }
    
    // Groq model selection
    const groqSelect = document.getElementById(`${this.containerId}-groq-select`);
    if (groqSelect) {
      groqSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value && value.startsWith('groq:')) {
          this.selectedGroqModel = value.replace('groq:', '');
          this.selectedOllamaModel = null; // Clear Ollama selection
          this.selectedModelType = 'groq';
          this.updateOllamaSelection();
          this.onModelSelect(this.selectedGroqModel, this.getSelectedModelDetails());
        } else {
          this.selectedGroqModel = null;
          if (this.selectedModelType === 'groq') {
            this.selectedModelType = null;
            this.onModelSelect(null, null);
          }
        }
      });
    }
    
    // Groq API key input with real-time validation
    const groqKeyInput = document.getElementById(`${this.containerId}-groq-key`);
    if (groqKeyInput) {
      // Debounce timer for real-time validation
      let validationTimer = null;
      
      groqKeyInput.addEventListener('input', (e) => {
        this.groqApiKey = e.target.value.trim();
        this.groqKeyValid = false;
        this.groqError = null;
        
        // Clear previous validation timer
        if (validationTimer) {
          clearTimeout(validationTimer);
        }
        
        // Update UI immediately to show invalid state
        this.updateGroqModelDropdown();
        this.updateGroqKeyStatus();
        
        // If key is empty, don't validate
        if (!this.groqApiKey) {
          return;
        }
        
        // Validate format first (immediate feedback)
        if (!this.apiKeyManager.validateKeyFormat(this.groqApiKey)) {
          this.groqError = { message: 'Invalid API key format. Groq keys should start with "gsk_"' };
          this.updateGroqKeyStatus();
          return;
        }
        
        // Set up debounced real-time validation (wait 1 second after user stops typing)
        validationTimer = setTimeout(() => {
          this.validateGroqKeyRealTime();
        }, 1000);
      });
      
      // Also validate on paste events
      groqKeyInput.addEventListener('paste', (e) => {
        // Small delay to let paste complete
        setTimeout(() => {
          const pastedValue = e.target.value.trim();
          if (pastedValue && this.apiKeyManager.validateKeyFormat(pastedValue)) {
            this.validateGroqKeyRealTime();
          }
        }, 100);
      });
    }
    
    // Groq API key save button
    const groqSaveBtn = document.getElementById(`${this.containerId}-groq-save`);
    if (groqSaveBtn) {
      groqSaveBtn.addEventListener('click', () => {
        this.validateAndSaveGroqKey();
      });
    }
    
    // Groq API key clear button
    const groqClearBtn = document.getElementById(`${this.containerId}-groq-clear`);
    if (groqClearBtn) {
      groqClearBtn.addEventListener('click', () => {
        this.clearApiKey();
      });
    }
    
    // Ollama refresh button
    const ollamaRefreshBtn = document.getElementById(`${this.containerId}-ollama-refresh`);
    if (ollamaRefreshBtn) {
      ollamaRefreshBtn.addEventListener('click', () => {
        this.loadOllamaModels();
      });
    }
  }

  /**
   * Load available Ollama models from the API
   */
  async loadOllamaModels() {
    this.setOllamaLoading(true);
    this.ollamaError = null;
    
    try {
      console.log('[ModelSelector] Loading Ollama models...');
      
      const response = await fetch('/api/ollama/models');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to load Ollama models', { cause: result });
      }
      
      this.ollamaModels = result.data?.models || [];
      this.ollamaRetryCount = 0;
      
      console.log(`[ModelSelector] Loaded ${this.ollamaModels.length} Ollama models`);
      
      // Show success message using ErrorHandler
      if (typeof errorHandler !== 'undefined' && this.ollamaModels.length > 0) {
        errorHandler.showSuccess(`Loaded ${this.ollamaModels.length} Ollama model${this.ollamaModels.length === 1 ? '' : 's'}`);
      }
      
      // Trigger onLoad callback
      this.onLoad(this.ollamaModels);
      
      // If we had a selected model, try to restore it
      if (this.selectedOllamaModel && !this.ollamaModels.find(m => m.name === this.selectedOllamaModel)) {
        this.selectedOllamaModel = null;
      }
      
    } catch (error) {
      console.error('[ModelSelector] Error loading Ollama models:', error);
      
      this.ollamaError = {
        message: error.message,
        details: error.cause || {},
        troubleshooting: error.cause?.troubleshooting || null
      };
      
      // Use ErrorHandler for Ollama-specific error handling
      if (typeof errorHandler !== 'undefined') {
        errorHandler.handleOllamaError(error);
      }
      
      // Trigger onError callback
      this.onError(this.ollamaError);
      
    } finally {
      this.setOllamaLoading(false);
      this.render();
    }
  }

  /**
   * Real-time API key validation (debounced)
   */
  async validateGroqKeyRealTime() {
    if (!this.groqApiKey || this.groqApiKey.length === 0) {
      return;
    }
    
    // Don't validate if already validating
    if (this.isValidatingGroqKey) {
      return;
    }
    
    // Validate API key format first
    if (!this.apiKeyManager.validateKeyFormat(this.groqApiKey)) {
      this.groqError = { message: 'Invalid API key format. Groq keys should start with "gsk_"' };
      this.updateGroqKeyStatus();
      return;
    }
    
    this.isValidatingGroqKey = true;
    this.groqError = null;
    this.updateGroqKeyStatus();
    this.updateSaveButtonState();
    
    try {
      console.log('[ModelSelector] Real-time validating Groq API key...');
      
      const response = await fetch('/api/groq/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: this.groqApiKey })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to validate Groq API key');
      }
      
      this.groqKeyValid = result.success && (result.data?.valid || false);
      
      if (this.groqKeyValid) {
        console.log('[ModelSelector] Real-time API key validation successful');
      } else {
        this.groqError = { message: 'Invalid Groq API key - authentication failed' };
      }
      
    } catch (error) {
      console.error('[ModelSelector] Error in real-time validation:', error);
      
      // Use enhanced error handling for better user feedback
      if (typeof errorHandler !== 'undefined') {
        errorHandler.handleGroqError(error, { context: 'api-key-validation' });
      }
      
      // Set local error state for UI updates
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        this.groqError = { message: 'Rate limit reached. Please wait before validating again.' };
      } else if (error.message.includes('network') || error.message.includes('fetch failed')) {
        this.groqError = { message: 'Network error. Please check your connection.' };
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        this.groqError = { message: 'Invalid API key - authentication failed' };
      } else {
        this.groqError = { message: 'Validation failed. Please try again.' };
      }
      
      this.groqKeyValid = false;
      
    } finally {
      this.isValidatingGroqKey = false;
      this.updateGroqKeyStatus();
      this.updateGroqModelDropdown();
      this.updateSaveButtonState();
    }
  }

  /**
   * Validate and save Groq API key
   */
  async validateAndSaveGroqKey() {
    if (!this.groqApiKey || this.groqApiKey.length === 0) {
      this.groqError = { message: 'Please enter a Groq API key' };
      this.render();
      return;
    }
    
    // Validate API key format first
    if (!this.apiKeyManager.validateKeyFormat(this.groqApiKey)) {
      this.groqError = { message: 'Invalid API key format. Groq keys should start with "gsk_"' };
      this.render();
      return;
    }
    
    // If key is already validated via real-time validation, just save it
    if (this.groqKeyValid) {
      try {
        await this.saveApiKey();
        console.log('[ModelSelector] Groq API key saved successfully');
        
        if (typeof errorHandler !== 'undefined') {
          errorHandler.showSuccess('Groq API key saved securely');
        }
        
        this.render();
        return;
      } catch (error) {
        console.error('[ModelSelector] Error saving API key:', error);
        this.groqError = { message: 'Failed to save API key securely' };
        this.render();
        return;
      }
    }
    
    // Otherwise, validate and save
    this.isValidatingGroqKey = true;
    this.groqError = null;
    this.render();
    
    try {
      console.log('[ModelSelector] Validating and saving Groq API key...');
      
      const response = await fetch('/api/groq/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: this.groqApiKey })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to validate Groq API key');
      }
      
      this.groqKeyValid = result.success && (result.data?.valid || false);
      
      if (this.groqKeyValid) {
        // Save the API key securely using ApiKeyManager
        await this.saveApiKey();
        console.log('[ModelSelector] Groq API key validated and saved successfully');
        
        if (typeof errorHandler !== 'undefined') {
          errorHandler.showSuccess('Groq API key validated and saved securely');
        }
      } else {
        this.groqError = { message: 'Invalid Groq API key - authentication failed' };
      }
      
    } catch (error) {
      console.error('[ModelSelector] Error validating Groq API key:', error);
      
      // Use enhanced error handling
      if (typeof errorHandler !== 'undefined') {
        errorHandler.handleGroqError(error, { 
          context: 'api-key-save',
          operation: 'validate-and-save'
        });
      }
      
      this.groqError = {
        message: error.message || 'Failed to validate API key'
      };
      
      this.groqKeyValid = false;
      
    } finally {
      this.isValidatingGroqKey = false;
      this.render();
    }
  }

  /**
   * Load stored API key from secure storage
   */
  async loadStoredApiKey() {
    this.isLoadingApiKey = true;
    
    try {
      console.log('[ModelSelector] Loading stored API key...');
      
      const storedKey = await this.apiKeyManager.loadApiKey();
      if (storedKey) {
        this.groqApiKey = storedKey;
        console.log('[ModelSelector] API key loaded from secure storage');
        
        // Note: We don't automatically validate on load to avoid unnecessary API calls
        // The user will need to click "Save Key" to validate, or we could add auto-validation
        // if they want that behavior
      } else {
        console.log('[ModelSelector] No stored API key found');
      }
    } catch (error) {
      console.warn('[ModelSelector] Failed to load stored API key:', error);
      this.groqError = { message: 'Failed to load stored API key. Please re-enter your key.' };
    } finally {
      this.isLoadingApiKey = false;
    }
  }

  /**
   * Save API key to secure storage
   */
  async saveApiKey() {
    try {
      if (this.groqApiKey) {
        await this.apiKeyManager.saveApiKey(this.groqApiKey);
        console.log('[ModelSelector] API key saved securely');
      }
    } catch (error) {
      console.error('[ModelSelector] Failed to save API key:', error);
      throw new Error(`Failed to save API key securely: ${error.message}`);
    }
  }

  /**
   * Clear stored API key
   */
  async clearApiKey() {
    try {
      const success = this.apiKeyManager.clearApiKey();
      if (success) {
        this.groqApiKey = null;
        this.groqKeyValid = false;
        this.selectedGroqModel = null;
        if (this.selectedModelType === 'groq') {
          this.selectedModelType = null;
          this.onModelSelect(null, null);
        }
        
        // Clear the input field
        const keyInput = document.getElementById(`${this.containerId}-groq-key`);
        if (keyInput) {
          keyInput.value = '';
        }
        
        this.render();
        
        if (typeof errorHandler !== 'undefined') {
          errorHandler.showSuccess('API key cleared successfully');
        }
        
        console.log('[ModelSelector] API key cleared successfully');
      }
    } catch (error) {
      console.error('[ModelSelector] Failed to clear API key:', error);
      
      if (typeof errorHandler !== 'undefined') {
        errorHandler.showError('Failed to clear API key: ' + error.message);
      }
    }
  }

  /**
   * Retry loading Ollama models with exponential backoff
   */
  async retryOllama() {
    if (this.ollamaRetryCount >= this.maxRetries) {
      console.warn('[ModelSelector] Max Ollama retries reached');
      return;
    }
    
    this.ollamaRetryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.ollamaRetryCount - 1), 10000);
    
    console.log(`[ModelSelector] Retrying Ollama in ${delay}ms (attempt ${this.ollamaRetryCount}/${this.maxRetries})`);
    
    setTimeout(() => {
      this.loadOllamaModels();
    }, delay);
  }

  /**
   * Update Ollama selection UI
   */
  updateOllamaSelection() {
    const ollamaSelect = document.getElementById(`${this.containerId}-ollama-select`);
    if (ollamaSelect) {
      ollamaSelect.value = this.selectedOllamaModel ? `ollama:${this.selectedOllamaModel}` : '';
    }
  }

  /**
   * Update Groq selection UI
   */
  updateGroqSelection() {
    const groqSelect = document.getElementById(`${this.containerId}-groq-select`);
    if (groqSelect) {
      groqSelect.value = this.selectedGroqModel ? `groq:${this.selectedGroqModel}` : '';
    }
  }

  /**
   * Update Groq model dropdown state
   */
  updateGroqModelDropdown() {
    const groqSelect = document.getElementById(`${this.containerId}-groq-select`);
    if (groqSelect) {
      groqSelect.disabled = !this.groqKeyValid;
      groqSelect.innerHTML = this.renderGroqOptions();
    }
  }

  /**
   * Update Groq API key status display without full re-render
   */
  updateGroqKeyStatus() {
    const statusContainer = document.querySelector(`#${this.containerId} .api-key-status`);
    if (statusContainer) {
      statusContainer.outerHTML = this.renderGroqKeyStatus();
    }
  }

  /**
   * Update save button state and text
   */
  updateSaveButtonState() {
    const saveBtn = document.getElementById(`${this.containerId}-groq-save`);
    if (saveBtn) {
      saveBtn.disabled = this.isValidatingGroqKey || this.isLoadingApiKey;
      
      if (this.isValidatingGroqKey) {
        saveBtn.innerHTML = `
          <div class="spinner inline"></div>
          Validating...
        `;
      } else if (this.groqKeyValid && this.groqApiKey) {
        saveBtn.innerHTML = 'Save Key';
        saveBtn.classList.remove('btn-outline');
        saveBtn.classList.add('btn-primary');
      } else {
        saveBtn.innerHTML = 'Save Key';
        saveBtn.classList.remove('btn-primary');
        saveBtn.classList.add('btn-outline');
      }
    }
  }

  /**
   * Set Ollama loading state and update UI
   */
  setOllamaLoading(loading) {
    this.isLoadingOllama = loading;
    
    const select = document.getElementById(`${this.containerId}-ollama-select`);
    const refreshBtn = document.getElementById(`${this.containerId}-ollama-refresh`);
    
    if (select) {
      select.disabled = loading;
    }
    
    if (refreshBtn) {
      refreshBtn.disabled = loading;
      if (loading) {
        refreshBtn.classList.add('opacity-50');
      } else {
        refreshBtn.classList.remove('opacity-50');
      }
    }
  }

  /**
   * Get user-friendly Ollama error message
   */
  getOllamaErrorMessage() {
    if (!this.ollamaError) return '';
    
    const { message, details } = this.ollamaError;
    
    if (message.includes('Failed to connect') || message.includes('ECONNREFUSED')) {
      return 'Ollama service is not running. Please start Ollama and try again.';
    }
    
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return 'Request timed out. The Ollama service may be overloaded.';
    }
    
    if (message.includes('404') || message.includes('not found')) {
      return 'Ollama service endpoint not found. Please check your Ollama installation.';
    }
    
    return message || 'An unexpected error occurred while loading Ollama models.';
  }

  /**
   * Get details of the currently selected model
   */
  getSelectedModelDetails() {
    if (this.selectedModelType === 'ollama' && this.selectedOllamaModel) {
      const model = this.ollamaModels.find(model => model.name === this.selectedOllamaModel);
      return model ? { ...model, type: 'ollama' } : null;
    }
    
    if (this.selectedModelType === 'groq' && this.selectedGroqModel) {
      return {
        name: this.selectedGroqModel,
        type: 'groq',
        provider: 'Groq'
      };
    }
    
    return null;
  }

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Set the selected model programmatically
   */
  setSelectedModel(modelName, modelType = 'ollama') {
    if (modelType === 'ollama') {
      this.selectedOllamaModel = modelName;
      this.selectedGroqModel = null;
      this.selectedModelType = modelName ? 'ollama' : null;
      this.updateOllamaSelection();
      this.updateGroqSelection();
    } else if (modelType === 'groq') {
      this.selectedGroqModel = modelName;
      this.selectedOllamaModel = null;
      this.selectedModelType = modelName ? 'groq' : null;
      this.updateOllamaSelection();
      this.updateGroqSelection();
    }
  }

  /**
   * Get the currently selected model name and type
   */
  getSelectedModel() {
    if (this.selectedModelType === 'ollama') {
      return { name: this.selectedOllamaModel, type: 'ollama' };
    }
    if (this.selectedModelType === 'groq') {
      return { name: this.selectedGroqModel, type: 'groq' };
    }
    return null;
  }

  /**
   * Check if models are currently loading
   */
  isLoadingModels() {
    return this.isLoadingOllama || this.isValidatingGroqKey || this.isLoadingApiKey;
  }

  /**
   * Check if there's an error state
   */
  hasError() {
    return !!(this.ollamaError || this.groqError);
  }

  /**
   * Get available Ollama models
   */
  getOllamaModels() {
    return [...this.ollamaModels];
  }

  /**
   * Get available Groq models (static list)
   */
  getGroqModels() {
    return this.groqKeyValid ? ['openai/gpt-oss-120b'] : [];
  }

  /**
   * Get all available models
   */
  getModels() {
    return {
      ollama: this.getOllamaModels(),
      groq: this.getGroqModels()
    };
  }

  /**
   * Refresh Ollama models
   */
  refresh() {
    return this.loadOllamaModels();
  }

  /**
   * Check if Groq is configured and ready
   */
  isGroqReady() {
    return this.groqKeyValid && this.groqApiKey;
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Get the current Groq API key (for project creation)
   * @returns {string|null} The current Groq API key or null if not available
   */
  getGroqApiKey() {
    return this.groqApiKey;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModelSelector;
}