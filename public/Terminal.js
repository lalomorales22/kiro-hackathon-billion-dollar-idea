/**
 * Terminal Component for IDE-style progress display
 * 
 * Features:
 * - Dark theme with monospace font styling
 * - Scrollable log display with automatic scroll-to-bottom
 * - Terminal controls (clear, scroll to bottom)
 * - Integration with WebSocket progress updates
 * - Event handling and proper cleanup
 */
class Terminal {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`Terminal container with id "${containerId}" not found`);
        }
        
        // Configuration options
        this.options = {
            maxLogs: 1000,
            autoScroll: true,
            showTimestamps: true,
            showControls: true,
            theme: 'dark',
            ...options
        };
        
        // State
        this.logs = [];
        this.isAutoScrollEnabled = this.options.autoScroll;
        this.isScrolledToBottom = true;
        
        // Initialize the terminal
        this.init();
    }
    
    /**
     * Initialize the terminal component
     */
    init() {
        this.createTerminalStructure();
        this.setupEventListeners();
        this.log('Terminal initialized', 'system');
    }
    
    /**
     * Create the terminal HTML structure
     */
    createTerminalStructure() {
        this.container.innerHTML = `
            <div class="terminal-window">
                ${this.options.showControls ? this.createTerminalHeader() : ''}
                <div class="terminal-body" id="${this.containerId}Body">
                    <div class="terminal-content" id="${this.containerId}Content">
                        <div class="terminal-prompt">Ready...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Cache DOM elements
        this.bodyElement = document.getElementById(`${this.containerId}Body`);
        this.contentElement = document.getElementById(`${this.containerId}Content`);
        
        if (this.options.showControls) {
            this.clearBtn = document.getElementById(`${this.containerId}ClearBtn`);
            this.scrollBtn = document.getElementById(`${this.containerId}ScrollBtn`);
            this.autoScrollToggle = document.getElementById(`${this.containerId}AutoScrollToggle`);
        }
    }
    
    /**
     * Create terminal header with controls
     */
    createTerminalHeader() {
        return `
            <div class="terminal-header">
                <div class="terminal-title">
                    <div class="terminal-title-text">Terminal</div>
                    <div class="terminal-status" id="${this.containerId}Status">
                        <span class="terminal-status-indicator"></span>
                        <span class="terminal-status-text">Ready</span>
                    </div>
                </div>
                <div class="terminal-controls">
                    <button 
                        class="terminal-btn terminal-btn-ghost" 
                        id="${this.containerId}AutoScrollToggle"
                        title="Toggle auto-scroll"
                        aria-label="Toggle automatic scrolling"
                    >
                        <svg class="terminal-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 12l-4-4h8l-4 4z"/>
                        </svg>
                        Auto
                    </button>
                    <button 
                        class="terminal-btn terminal-btn-ghost" 
                        id="${this.containerId}ScrollBtn"
                        title="Scroll to bottom"
                        aria-label="Scroll to bottom"
                    >
                        <svg class="terminal-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 12l-4-4h8l-4 4z"/>
                        </svg>
                        Bottom
                    </button>
                    <button 
                        class="terminal-btn terminal-btn-ghost" 
                        id="${this.containerId}ClearBtn"
                        title="Clear terminal"
                        aria-label="Clear terminal output"
                    >
                        <svg class="terminal-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
                        </svg>
                        Clear
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.options.showControls) {
            // Clear button
            if (this.clearBtn) {
                this.clearBtn.addEventListener('click', () => this.clear());
            }
            
            // Scroll to bottom button
            if (this.scrollBtn) {
                this.scrollBtn.addEventListener('click', () => this.scrollToBottom());
            }
            
            // Auto-scroll toggle
            if (this.autoScrollToggle) {
                this.autoScrollToggle.addEventListener('click', () => this.toggleAutoScroll());
            }
        }
        
        // Monitor scroll position to update auto-scroll state
        if (this.bodyElement) {
            this.bodyElement.addEventListener('scroll', () => this.handleScroll());
        }
        
        // Handle window resize to maintain scroll position
        window.addEventListener('resize', () => {
            if (this.isAutoScrollEnabled && this.isScrolledToBottom) {
                this.scrollToBottom();
            }
        });
    }
    
    /**
     * Handle scroll events to track scroll position
     */
    handleScroll() {
        if (!this.bodyElement) return;
        
        const { scrollTop, scrollHeight, clientHeight } = this.bodyElement;
        const threshold = 50; // pixels from bottom
        
        this.isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - threshold;
        
        // Update auto-scroll button state
        this.updateAutoScrollButton();
    }
    
    /**
     * Update auto-scroll button visual state
     */
    updateAutoScrollButton() {
        if (!this.autoScrollToggle) return;
        
        if (this.isAutoScrollEnabled) {
            this.autoScrollToggle.classList.add('terminal-btn-active');
            this.autoScrollToggle.setAttribute('aria-pressed', 'true');
        } else {
            this.autoScrollToggle.classList.remove('terminal-btn-active');
            this.autoScrollToggle.setAttribute('aria-pressed', 'false');
        }
    }
    
    /**
     * Log a message to the terminal
     * @param {string} message - The message to log
     * @param {string} type - The type of message (info, error, warning, success, system, debug)
     * @param {Object} metadata - Additional metadata for the log entry
     */
    log(message, type = 'info', metadata = {}) {
        const timestamp = new Date();
        const logEntry = {
            id: `${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            message: String(message),
            type,
            metadata,
            formattedTime: this.formatTimestamp(timestamp)
        };
        
        // Add to logs array
        this.logs.push(logEntry);
        
        // Maintain max logs limit
        if (this.logs.length > this.options.maxLogs) {
            const removed = this.logs.splice(0, this.logs.length - this.options.maxLogs);
            // Remove corresponding DOM elements
            removed.forEach(entry => {
                const element = document.getElementById(entry.id);
                if (element) {
                    element.remove();
                }
            });
        }
        
        // Render the log entry
        this.renderLogEntry(logEntry);
        
        // Auto-scroll if enabled and user is at bottom
        if (this.isAutoScrollEnabled && this.isScrolledToBottom) {
            this.scrollToBottom();
        }
        
        // Update status
        this.updateStatus(type, message);
    }
    
    /**
     * Render a single log entry
     * @param {Object} logEntry - The log entry to render
     */
    renderLogEntry(logEntry) {
        const logElement = document.createElement('div');
        logElement.className = `terminal-line terminal-line-${logEntry.type}`;
        logElement.id = logEntry.id;
        logElement.setAttribute('data-timestamp', logEntry.timestamp.toISOString());
        
        const timestampSpan = this.options.showTimestamps ? 
            `<span class="terminal-timestamp">[${logEntry.formattedTime}]</span>` : '';
        
        const typeSpan = `<span class="terminal-type terminal-type-${logEntry.type}">${logEntry.type.toUpperCase()}</span>`;
        
        const messageSpan = `<span class="terminal-message">${this.escapeHtml(logEntry.message)}</span>`;
        
        logElement.innerHTML = `${timestampSpan}${typeSpan}${messageSpan}`;
        
        // Add to terminal content
        this.contentElement.appendChild(logElement);
        
        // Add animation class for smooth appearance
        requestAnimationFrame(() => {
            logElement.classList.add('terminal-line-appear');
        });
    }
    
    /**
     * Format timestamp for display
     * @param {Date} timestamp - The timestamp to format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        return timestamp.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    /**
     * Update terminal status
     * @param {string} type - Status type
     * @param {string} message - Status message
     */
    updateStatus(type, message) {
        const statusElement = document.getElementById(`${this.containerId}Status`);
        if (!statusElement) return;
        
        const indicator = statusElement.querySelector('.terminal-status-indicator');
        const text = statusElement.querySelector('.terminal-status-text');
        
        if (indicator) {
            indicator.className = `terminal-status-indicator terminal-status-${type}`;
        }
        
        if (text) {
            text.textContent = this.truncateText(message, 30);
        }
    }
    
    /**
     * Clear all terminal output
     */
    clear() {
        this.logs = [];
        this.contentElement.innerHTML = '<div class="terminal-prompt">Terminal cleared</div>';
        this.updateStatus('system', 'Terminal cleared');
        this.scrollToBottom();
    }
    
    /**
     * Scroll terminal to bottom
     */
    scrollToBottom() {
        if (!this.bodyElement) return;
        
        this.bodyElement.scrollTop = this.bodyElement.scrollHeight;
        this.isScrolledToBottom = true;
    }
    
    /**
     * Toggle auto-scroll functionality
     */
    toggleAutoScroll() {
        this.isAutoScrollEnabled = !this.isAutoScrollEnabled;
        this.updateAutoScrollButton();
        
        if (this.isAutoScrollEnabled) {
            this.scrollToBottom();
            this.log('Auto-scroll enabled', 'system');
        } else {
            this.log('Auto-scroll disabled', 'system');
        }
    }
    
    /**
     * Set auto-scroll state
     * @param {boolean} enabled - Whether auto-scroll should be enabled
     */
    setAutoScroll(enabled) {
        this.isAutoScrollEnabled = enabled;
        this.updateAutoScrollButton();
    }
    
    /**
     * Get current logs
     * @returns {Array} Array of log entries
     */
    getLogs() {
        return [...this.logs];
    }
    
    /**
     * Get logs by type
     * @param {string} type - Log type to filter by
     * @returns {Array} Filtered log entries
     */
    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }
    
    /**
     * Export logs as text
     * @returns {string} Formatted log text
     */
    exportLogs() {
        return this.logs.map(log => {
            const timestamp = this.options.showTimestamps ? `[${log.formattedTime}] ` : '';
            return `${timestamp}${log.type.toUpperCase()}: ${log.message}`;
        }).join('\n');
    }
    
    /**
     * Import logs from text
     * @param {string} logText - Text containing log entries
     */
    importLogs(logText) {
        const lines = logText.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            // Simple parsing - could be enhanced
            const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(\w+):\s*(.+)$/);
            if (match) {
                const [, time, type, message] = match;
                this.log(message, type.toLowerCase());
            } else {
                this.log(line, 'info');
            }
        });
    }
    
    /**
     * Destroy the terminal and cleanup
     */
    destroy() {
        // Remove event listeners
        if (this.clearBtn) {
            this.clearBtn.removeEventListener('click', () => this.clear());
        }
        if (this.scrollBtn) {
            this.scrollBtn.removeEventListener('click', () => this.scrollToBottom());
        }
        if (this.autoScrollToggle) {
            this.autoScrollToggle.removeEventListener('click', () => this.toggleAutoScroll());
        }
        if (this.bodyElement) {
            this.bodyElement.removeEventListener('scroll', () => this.handleScroll());
        }
        
        // Clear logs and DOM
        this.logs = [];
        this.container.innerHTML = '';
        
        console.log(`Terminal ${this.containerId} destroyed`);
    }
    
    // ============================================================================
    // WEBSOCKET INTEGRATION METHODS
    // ============================================================================
    
    /**
     * Handle WebSocket project start event
     * @param {Object} payload - Project start event payload
     */
    handleProjectStart(payload) {
        this.log(`🚀 Project started: ${payload.project.name}`, 'info', { 
            projectId: payload.projectId,
            event: 'project:start'
        });
    }
    
    /**
     * Handle WebSocket task update event
     * @param {Object} payload - Task update event payload
     */
    handleTaskUpdate(payload) {
        const progressBar = this.createProgressBar(payload.progress);
        this.log(`⚙️  ${payload.agent} - ${payload.status} ${progressBar} ${payload.progress}%`, 'info', {
            taskId: payload.taskId,
            agent: payload.agent,
            progress: payload.progress,
            event: 'task:update'
        });
    }
    
    /**
     * Handle WebSocket artifact create event
     * @param {Object} payload - Artifact create event payload
     */
    handleArtifactCreate(payload) {
        this.log(`📄 New artifact created: ${payload.artifact.name}`, 'success', {
            artifactId: payload.artifactId,
            artifactType: payload.artifact.type,
            event: 'artifact:create'
        });
    }
    
    /**
     * Handle WebSocket stage complete event
     * @param {Object} payload - Stage complete event payload
     */
    handleStageComplete(payload) {
        this.log(`✅ Stage ${payload.stage} completed (${payload.completedTasks} tasks)`, 'success', {
            stage: payload.stage,
            completedTasks: payload.completedTasks,
            event: 'stage:complete'
        });
    }
    
    /**
     * Handle WebSocket project complete event
     * @param {Object} payload - Project complete event payload
     */
    handleProjectComplete(payload) {
        this.log(`🎉 Project completed: ${payload.project.name} (${payload.totalArtifacts} artifacts)`, 'success', {
            projectId: payload.projectId,
            totalArtifacts: payload.totalArtifacts,
            event: 'project:complete'
        });
    }
    
    /**
     * Handle WebSocket error event
     * @param {Object} payload - Error event payload
     */
    handleError(payload) {
        this.log(`❌ Error: ${payload.error}`, 'error', {
            error: payload.error,
            event: 'error'
        });
    }
    
    /**
     * Handle WebSocket connection events
     * @param {string} status - Connection status (connected, disconnected, connecting)
     * @param {string} message - Status message
     */
    handleConnectionStatus(status, message) {
        const statusEmoji = {
            connected: '🟢',
            disconnected: '🔴',
            connecting: '🟡'
        };
        
        this.log(`${statusEmoji[status] || '⚪'} ${message}`, 'system', {
            connectionStatus: status,
            event: 'connection:status'
        });
    }
    
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    
    /**
     * Create a simple progress bar visualization
     * @param {number} progress - Progress percentage (0-100)
     * @returns {string} Progress bar string
     */
    createProgressBar(progress) {
        const width = 10;
        const filled = Math.round((progress / 100) * width);
        const empty = width - filled;
        return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
    }
    
    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Get terminal statistics
     * @returns {Object} Terminal statistics
     */
    getStats() {
        const logsByType = {};
        this.logs.forEach(log => {
            logsByType[log.type] = (logsByType[log.type] || 0) + 1;
        });
        
        return {
            totalLogs: this.logs.length,
            logsByType,
            isAutoScrollEnabled: this.isAutoScrollEnabled,
            isScrolledToBottom: this.isScrolledToBottom,
            maxLogs: this.options.maxLogs
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Terminal;
}