/**
 * ErrorHandler - Comprehensive error handling and user feedback system
 * Provides error display, loading states, and success messages
 */
class ErrorHandler {
  constructor() {
    this.init();
  }

  init() {
    // Create error container if it doesn't exist
    if (!document.getElementById('errorContainer')) {
      const container = document.createElement('div');
      container.id = 'errorContainer';
      container.className = 'error-container';
      document.body.appendChild(container);
    }

    // Create loading overlay container
    if (!document.getElementById('loadingOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.className = 'loading-overlay hidden';
      overlay.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <div class="loading-text">Loading...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
  }

  /**
   * Show error message with specified type and auto-dismiss
   * @param {string} message - Error message to display
   * @param {string} type - Error type: 'error', 'warning', 'info', 'success'
   * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   */
  show(message, type = 'error', duration = 5000) {
    const errorContainer = document.getElementById('errorContainer');
    const errorId = 'error-' + Date.now() + Math.random().toString(36).substr(2, 9);
    
    const errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = `alert alert-${type} alert-dismissible`;
    errorElement.innerHTML = `
      <div class="alert-content">
        <div class="alert-icon">
          ${this.getIcon(type)}
        </div>
        <div class="alert-message">${message}</div>
        <button class="alert-close" onclick="errorHandler.dismiss('${errorId}')" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 7.293l2.146-2.147a.5.5 0 01.708.708L8.707 8l2.147 2.146a.5.5 0 01-.708.708L8 8.707l-2.146 2.147a.5.5 0 01-.708-.708L7.293 8 5.146 5.854a.5.5 0 01.708-.708L8 7.293z"/>
          </svg>
        </button>
      </div>
    `;
    
    errorContainer.appendChild(errorElement);
    
    // Animate in
    setTimeout(() => {
      errorElement.classList.add('alert-show');
    }, 10);
    
    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(errorId);
      }, duration);
    }
    
    return errorId;
  }

  /**
   * Dismiss specific error message
   * @param {string} errorId - ID of error to dismiss
   */
  dismiss(errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.classList.add('alert-hide');
      setTimeout(() => {
        if (errorElement.parentElement) {
          errorElement.remove();
        }
      }, 300);
    }
  }

  /**
   * Clear all error messages
   */
  clearAll() {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
      errorContainer.innerHTML = '';
    }
  }

  /**
   * Show success message
   * @param {string} message - Success message
   * @param {number} duration - Auto-dismiss duration
   */
  showSuccess(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show warning message
   * @param {string} message - Warning message
   * @param {number} duration - Auto-dismiss duration
   */
  showWarning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Show info message
   * @param {string} message - Info message
   * @param {number} duration - Auto-dismiss duration
   */
  showInfo(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {number} duration - Auto-dismiss duration
   */
  showError(message, duration = 0) {
    return this.show(message, 'error', duration);
  }

  /**
   * Handle Ollama-specific errors with troubleshooting guidance
   * @param {Error} error - The error object
   */
  handleOllamaError(error) {
    console.error('Ollama error:', error);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
      this.show(`
        <strong>Ollama Service Unavailable</strong><br>
        The Ollama service is not running or not accessible.<br>
        <details class="error-details">
          <summary>Troubleshooting Steps</summary>
          <ul>
            <li>Ensure Ollama is installed and running</li>
            <li>Check if Ollama is accessible at http://localhost:11434</li>
            <li>Try restarting the Ollama service</li>
            <li>Verify your firewall settings</li>
          </ul>
        </details>
      `, 'warning', 0);
    } else if (error.message.includes('No models available') || error.message.includes('models') && error.message.includes('empty')) {
      this.show(`
        <strong>No Ollama Models Found</strong><br>
        No AI models are currently installed.<br>
        <details class="error-details">
          <summary>How to Install Models</summary>
          <ul>
            <li>Run: <code>ollama pull llama2</code> to install Llama 2</li>
            <li>Run: <code>ollama pull codellama</code> for code generation</li>
            <li>Run: <code>ollama list</code> to see installed models</li>
            <li>Visit <a href="https://ollama.ai/library" target="_blank">Ollama Library</a> for more models</li>
          </ul>
        </details>
      `, 'info', 0);
    } else if (error.message.includes('timeout')) {
      this.show(`
        <strong>Ollama Request Timeout</strong><br>
        The request to Ollama service timed out. This might indicate the service is overloaded or the model is large.
      `, 'warning', 8000);
    } else {
      this.show(`
        <strong>Ollama Error</strong><br>
        ${error.message}<br>
        <small>Check the console for more details.</small>
      `, 'error', 0);
    }
  }

  /**
   * Handle Groq-specific errors with troubleshooting guidance
   * @param {Error} error - The error object
   * @param {Object} context - Additional context about the error
   */
  handleGroqError(error, context = {}) {
    console.error('Groq error:', error);
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.status || context.status;
    
    // API Key related errors
    if (errorStatus === 401 || errorStatus === 403 || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      this.show(`
        <strong>Groq API Key Invalid</strong><br>
        Your Groq API key is invalid or has expired.<br>
        <details class="error-details">
          <summary>How to Fix This</summary>
          <ul>
            <li>Check that your API key starts with "gsk_"</li>
            <li>Verify your API key in the <a href="https://console.groq.com/keys" target="_blank">Groq Console</a></li>
            <li>Generate a new API key if the current one has expired</li>
            <li>Make sure you copied the entire key without extra spaces</li>
          </ul>
        </details>
      `, 'error', 0);
    } 
    // Missing API key
    else if (errorMessage.includes('api key not configured') || errorMessage.includes('api key not provided')) {
      this.show(`
        <strong>Groq API Key Required</strong><br>
        You need to configure your Groq API key to use cloud models.<br>
        <details class="error-details">
          <summary>How to Get an API Key</summary>
          <ul>
            <li>Visit <a href="https://console.groq.com/keys" target="_blank">Groq Console</a></li>
            <li>Sign up or log in to your account</li>
            <li>Create a new API key</li>
            <li>Copy the key and paste it in the API key field above</li>
          </ul>
        </details>
      `, 'info', 0);
    }
    // Rate limiting
    else if (errorStatus === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      const retryAfter = context.retryAfter || '60 seconds';
      this.show(`
        <strong>Groq Rate Limit Reached</strong><br>
        You've exceeded the API rate limit. Please wait before trying again.<br>
        <details class="error-details">
          <summary>What You Can Do</summary>
          <ul>
            <li>Wait ${retryAfter} before making another request</li>
            <li>Consider upgrading your Groq plan for higher limits</li>
            <li>Use Ollama models as an alternative while waiting</li>
            <li>Check your <a href="https://console.groq.com/settings/limits" target="_blank">usage limits</a></li>
          </ul>
        </details>
      `, 'warning', 0);
    }
    // Quota exceeded
    else if (errorStatus === 402 || errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('payment')) {
      this.show(`
        <strong>Groq Quota Exceeded</strong><br>
        You've reached your API usage quota or billing limit.<br>
        <details class="error-details">
          <summary>How to Resolve</summary>
          <ul>
            <li>Check your <a href="https://console.groq.com/settings/billing" target="_blank">billing status</a></li>
            <li>Add payment method or increase your spending limit</li>
            <li>Upgrade to a higher tier plan</li>
            <li>Use Ollama models as a free alternative</li>
          </ul>
        </details>
      `, 'error', 0);
    }
    // Service unavailable
    else if (errorStatus === 503 || errorMessage.includes('service unavailable') || errorMessage.includes('circuit breaker')) {
      this.show(`
        <strong>Groq Service Temporarily Unavailable</strong><br>
        The Groq API service is currently experiencing issues.<br>
        <details class="error-details">
          <summary>What You Can Do</summary>
          <ul>
            <li>Try again in a few minutes</li>
            <li>Check <a href="https://status.groq.com" target="_blank">Groq Status Page</a> for updates</li>
            <li>Use Ollama models as an alternative</li>
            <li>The system will automatically retry failed requests</li>
          </ul>
        </details>
      `, 'warning', 0);
    }
    // Network/timeout errors
    else if (errorMessage.includes('timeout') || errorMessage.includes('etimedout') || errorMessage.includes('network')) {
      this.show(`
        <strong>Groq Connection Timeout</strong><br>
        The request to Groq API timed out. This might be due to network issues or high server load.<br>
        <details class="error-details">
          <summary>Troubleshooting Steps</summary>
          <ul>
            <li>Check your internet connection</li>
            <li>Try again in a moment</li>
            <li>Use Ollama models if the issue persists</li>
            <li>Contact support if timeouts continue</li>
          </ul>
        </details>
      `, 'warning', 8000);
    }
    // Invalid request format
    else if (errorStatus === 400 || errorMessage.includes('invalid') || errorMessage.includes('bad request')) {
      this.show(`
        <strong>Groq Request Error</strong><br>
        The request to Groq API was invalid or malformed.<br>
        <details class="error-details">
          <summary>Possible Causes</summary>
          <ul>
            <li>Invalid model parameters</li>
            <li>Request too large or malformed</li>
            <li>Unsupported content type</li>
            <li>This might be a bug - please report it</li>
          </ul>
        </details>
      `, 'error', 0);
    }
    // Model not found
    else if (errorStatus === 404 || errorMessage.includes('not found') || errorMessage.includes('model')) {
      this.show(`
        <strong>Groq Model Not Available</strong><br>
        The requested model is not available or has been deprecated.<br>
        <details class="error-details">
          <summary>What to Try</summary>
          <ul>
            <li>Refresh the page to load current models</li>
            <li>Select a different Groq model</li>
            <li>Use Ollama models as an alternative</li>
            <li>Check <a href="https://console.groq.com/docs/models" target="_blank">available models</a></li>
          </ul>
        </details>
      `, 'warning', 0);
    }
    // Generic Groq error
    else {
      this.show(`
        <strong>Groq API Error</strong><br>
        An unexpected error occurred with the Groq service.<br>
        <div class="error-message-details">
          <code>${error.message}</code>
        </div>
        <details class="error-details">
          <summary>What You Can Do</summary>
          <ul>
            <li>Try again in a moment</li>
            <li>Use Ollama models as an alternative</li>
            <li>Check the console for more technical details</li>
            <li>Report this issue if it persists</li>
          </ul>
        </details>
      `, 'error', 0);
    }
  }

  /**
   * Show loading state with optional message
   * @param {string} message - Loading message
   * @param {HTMLElement} target - Specific element to show loading on
   */
  showLoading(message = 'Loading...', target = null) {
    if (target) {
      // Show loading on specific element
      target.classList.add('loading');
      const loadingElement = document.createElement('div');
      loadingElement.className = 'element-loading';
      loadingElement.innerHTML = `
        <div class="loading-spinner-small">
          <div class="spinner-small"></div>
          <span class="loading-text-small">${message}</span>
        </div>
      `;
      target.appendChild(loadingElement);
    } else {
      // Show global loading overlay
      const overlay = document.getElementById('loadingOverlay');
      const loadingText = overlay.querySelector('.loading-text');
      if (loadingText) {
        loadingText.textContent = message;
      }
      overlay.classList.remove('hidden');
    }
  }

  /**
   * Hide loading state
   * @param {HTMLElement} target - Specific element to hide loading from
   */
  hideLoading(target = null) {
    if (target) {
      // Hide loading from specific element
      target.classList.remove('loading');
      const loadingElement = target.querySelector('.element-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
    } else {
      // Hide global loading overlay
      const overlay = document.getElementById('loadingOverlay');
      overlay.classList.add('hidden');
    }
  }

  /**
   * Show loading state for button during async operation
   * @param {HTMLButtonElement} button - Button element
   * @param {string} loadingText - Text to show while loading
   */
  setButtonLoading(button, loadingText = 'Loading...') {
    if (!button) return;
    
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = `
      <span class="button-spinner"></span>
      ${loadingText}
    `;
    button.classList.add('btn-loading');
  }

  /**
   * Reset button from loading state
   * @param {HTMLButtonElement} button - Button element
   */
  resetButton(button) {
    if (!button) return;
    
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Submit';
    button.classList.remove('btn-loading');
    delete button.dataset.originalText;
  }

  /**
   * Get icon for alert type
   * @param {string} type - Alert type
   * @returns {string} SVG icon
   */
  getIcon(type) {
    const icons = {
      error: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`,
      success: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`
    };
    return icons[type] || icons.info;
  }

  /**
   * Handle network errors with retry functionality
   * @param {Error} error - Network error
   * @param {Function} retryCallback - Function to call for retry
   */
  handleNetworkError(error, retryCallback = null) {
    console.error('Network error:', error);
    
    const retryButton = retryCallback ? `
      <button class="btn btn-sm btn-outline mt-2" onclick="(${retryCallback.toString()})()">
        Retry
      </button>
    ` : '';
    
    this.show(`
      <strong>Network Error</strong><br>
      Unable to connect to the server. Please check your internet connection and try again.<br>
      <small>Error: ${error.message}</small>
      ${retryButton}
    `, 'error', 0);
  }

  /**
   * Handle validation errors
   * @param {Object} validationErrors - Object containing field validation errors
   */
  handleValidationErrors(validationErrors) {
    const errorMessages = Object.entries(validationErrors)
      .map(([field, message]) => `<strong>${field}:</strong> ${message}`)
      .join('<br>');
    
    this.show(`
      <strong>Validation Errors</strong><br>
      ${errorMessages}
    `, 'warning', 8000);
  }

  /**
   * Handle service fallback scenarios
   * @param {string} primaryService - The primary service that failed
   * @param {string} fallbackService - The fallback service to suggest
   * @param {Error} error - The original error
   */
  handleServiceFallback(primaryService, fallbackService, error) {
    const serviceNames = {
      'groq': 'Groq (Cloud)',
      'ollama': 'Ollama (Local)'
    };
    
    const primaryName = serviceNames[primaryService] || primaryService;
    const fallbackName = serviceNames[fallbackService] || fallbackService;
    
    this.show(`
      <strong>${primaryName} Service Unavailable</strong><br>
      ${primaryName} is currently unavailable. You can continue using ${fallbackName} models.<br>
      <details class="error-details">
        <summary>Fallback Options</summary>
        <ul>
          <li>Switch to ${fallbackName} models in the model selector</li>
          <li>Your work will continue seamlessly with the alternative service</li>
          <li>Try ${primaryName} again later when the service recovers</li>
        </ul>
      </details>
      <div class="error-technical-details">
        <small>Technical details: ${error.message}</small>
      </div>
    `, 'warning', 0);
  }

  /**
   * Show API key validation error with specific guidance
   * @param {string} service - The service name (groq, ollama, etc.)
   * @param {string} keyFormat - Expected key format
   * @param {string} consoleUrl - URL to the service console
   */
  showApiKeyError(service, keyFormat, consoleUrl) {
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
    
    this.show(`
      <strong>${serviceName} API Key Invalid</strong><br>
      Please check your API key format and validity.<br>
      <details class="error-details">
        <summary>API Key Requirements</summary>
        <ul>
          <li>Key should start with "${keyFormat}"</li>
          <li>Verify your key in the <a href="${consoleUrl}" target="_blank">${serviceName} Console</a></li>
          <li>Make sure the key hasn't expired</li>
          <li>Check for extra spaces or characters</li>
        </ul>
      </details>
    `, 'error', 0);
  }

  /**
   * Show rate limiting error with retry guidance
   * @param {string} service - The service name
   * @param {number} retryAfter - Seconds to wait before retry
   * @param {Function} retryCallback - Optional retry function
   */
  showRateLimitError(service, retryAfter = 60, retryCallback = null) {
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
    const retryButton = retryCallback ? `
      <button class="btn btn-sm btn-outline mt-2" onclick="(${retryCallback.toString()})()">
        Retry Now
      </button>
    ` : '';
    
    this.show(`
      <strong>${serviceName} Rate Limit Reached</strong><br>
      Please wait ${retryAfter} seconds before making another request.<br>
      <div class="rate-limit-countdown" data-retry-after="${retryAfter}">
        <div class="countdown-timer">
          <span class="countdown-text">Retry available in: </span>
          <span class="countdown-value">${retryAfter}s</span>
        </div>
      </div>
      <details class="error-details">
        <summary>Rate Limit Information</summary>
        <ul>
          <li>This helps prevent service overload</li>
          <li>Consider upgrading your plan for higher limits</li>
          <li>Use alternative models while waiting</li>
        </ul>
      </details>
      ${retryButton}
    `, 'warning', 0);
    
    // Start countdown timer
    this.startRateLimitCountdown(retryAfter);
  }

  /**
   * Start a countdown timer for rate limit errors
   * @param {number} seconds - Seconds to count down
   */
  startRateLimitCountdown(seconds) {
    const countdownElement = document.querySelector('.countdown-value');
    if (!countdownElement) return;
    
    let remaining = seconds;
    const timer = setInterval(() => {
      remaining--;
      countdownElement.textContent = `${remaining}s`;
      
      if (remaining <= 0) {
        clearInterval(timer);
        countdownElement.textContent = 'Ready!';
        countdownElement.parentElement.innerHTML = '<span class="text-success">✓ You can try again now</span>';
      }
    }, 1000);
  }

  /**
   * Show service health status
   * @param {string} service - Service name
   * @param {boolean} isHealthy - Health status
   * @param {Object} details - Additional health details
   */
  showServiceHealth(service, isHealthy, details = {}) {
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
    const statusIcon = isHealthy ? '✅' : '❌';
    const statusText = isHealthy ? 'Healthy' : 'Unhealthy';
    const alertType = isHealthy ? 'success' : 'error';
    
    let healthDetails = '';
    if (details.responseTime) {
      healthDetails += `<li>Response time: ${details.responseTime}ms</li>`;
    }
    if (details.lastCheck) {
      healthDetails += `<li>Last checked: ${new Date(details.lastCheck).toLocaleString()}</li>`;
    }
    if (details.version) {
      healthDetails += `<li>Version: ${details.version}</li>`;
    }
    
    this.show(`
      <strong>${statusIcon} ${serviceName} Service Status: ${statusText}</strong><br>
      ${isHealthy ? 
        `${serviceName} is running normally and ready to process requests.` : 
        `${serviceName} is experiencing issues and may not respond to requests.`
      }
      ${healthDetails ? `
        <details class="error-details">
          <summary>Service Details</summary>
          <ul>${healthDetails}</ul>
        </details>
      ` : ''}
    `, alertType, isHealthy ? 3000 : 0);
  }

  /**
   * Handle API quota exceeded errors
   * @param {string} service - Service name
   * @param {Object} quotaInfo - Quota information
   */
  handleQuotaExceeded(service, quotaInfo = {}) {
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
    const resetTime = quotaInfo.resetTime ? new Date(quotaInfo.resetTime).toLocaleString() : 'unknown';
    const usagePercent = quotaInfo.usagePercent || 'unknown';
    
    this.show(`
      <strong>${serviceName} Quota Exceeded</strong><br>
      You've reached your API usage limit for this billing period.<br>
      <details class="error-details">
        <summary>Quota Information</summary>
        <ul>
          <li>Usage: ${usagePercent}% of limit</li>
          <li>Quota resets: ${resetTime}</li>
          <li>Consider upgrading your plan for higher limits</li>
          <li>Use alternative models while waiting for reset</li>
        </ul>
      </details>
    `, 'error', 0);
  }
}

// Create global instance
const errorHandler = new ErrorHandler();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}