# Design Document

## Overview

The modern UI overhaul transforms the Billion Dollar Idea Platform into a sleek, professional application with a shadcn-inspired design system. The redesign emphasizes clean aesthetics with white backgrounds, black borders, minimal color usage, and improved functionality including project management, Ollama model selection, and an IDE-like layout with terminal-style progress monitoring.

## Architecture

### Design System Architecture

The new design system follows a component-based approach with:

- **Color Palette**: Minimal color scheme with white backgrounds, black borders, and subtle shadows
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent spacing system using CSS custom properties
- **Components**: Reusable UI components following shadcn principles
- **Layout**: Grid-based responsive layout with clear visual hierarchy

### Frontend Architecture

```
Frontend Structure:
├── styles/
│   ├── design-system.css (Core design tokens)
│   ├── components.css (Component styles)
│   └── layout.css (Layout and responsive styles)
├── components/
│   ├── ProjectCard.js (Enhanced project display)
│   ├── ModelSelector.js (Ollama model dropdown)
│   ├── ArtifactViewer.js (Artifact display component)
│   └── Terminal.js (Terminal-style progress window)
└── services/
    ├── OllamaModelService.js (Model management)
    └── ProjectService.js (Enhanced project operations)
```

### Backend Architecture

The backend requires minimal changes, primarily adding:

- **Ollama Model Endpoints**: New endpoints to fetch available models
- **Enhanced Project Endpoints**: Improved project update/delete operations
- **Model Configuration**: Per-project model selection storage

## Components and Interfaces

### 1. Design System Components

#### Color System
```css
:root {
  /* Primary Colors */
  --color-background: #ffffff;
  --color-foreground: #000000;
  --color-muted: #f8f9fa;
  --color-muted-foreground: #6c757d;
  
  /* Border Colors */
  --color-border: #000000;
  --color-border-light: #e9ecef;
  
  /* Shadow System */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Status Colors (minimal usage) */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

#### Button Component
```css
.btn {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
  padding: 8px 16px;
  border-radius: 6px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.btn:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--color-foreground);
  color: var(--color-background);
}
```

### 2. Layout Components

#### Main Layout Structure
```html
<div class="app-container">
  <header class="app-header">
    <!-- App title and navigation -->
  </header>
  
  <main class="app-main">
    <div class="sidebar">
      <!-- Project creation and model selection -->
    </div>
    
    <div class="content-area">
      <section class="artifacts-section">
        <!-- Generated artifacts display -->
      </section>
      
      <section class="terminal-section">
        <!-- Terminal-style progress window -->
      </section>
    </div>
    
    <div class="projects-panel">
      <!-- Projects list with edit/delete -->
    </div>
  </main>
</div>
```

### 3. Enhanced Project Management

#### Project Card Component
```javascript
class ProjectCard {
  constructor(project) {
    this.project = project;
    this.element = this.createElement();
  }
  
  createElement() {
    return `
      <div class="project-card" data-project-id="${this.project.id}">
        <div class="project-header">
          <h3 class="project-name">${this.project.name}</h3>
          <div class="project-actions">
            <button class="btn btn-sm" onclick="editProject('${this.project.id}')">
              Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteProject('${this.project.id}')">
              Delete
            </button>
          </div>
        </div>
        <div class="project-meta">
          <span class="project-status status-${this.project.status.toLowerCase()}">
            ${this.project.status}
          </span>
          <span class="project-progress">
            Stage ${this.project.currentStage}/6
          </span>
        </div>
        <div class="project-stats">
          ${this.project.artifacts?.length || 0} artifacts • 
          ${this.project.tasks?.length || 0} tasks
        </div>
      </div>
    `;
  }
}
```

### 4. Ollama Model Selection

#### Model Selector Component
```javascript
class ModelSelector {
  constructor() {
    this.models = [];
    this.selectedModel = null;
    this.init();
  }
  
  async init() {
    await this.loadAvailableModels();
    this.render();
  }
  
  async loadAvailableModels() {
    try {
      const response = await fetch('/api/ollama/models');
      const result = await response.json();
      this.models = result.data.models || [];
    } catch (error) {
      console.error('Failed to load Ollama models:', error);
      this.models = [];
    }
  }
  
  render() {
    const selector = document.getElementById('modelSelector');
    selector.innerHTML = `
      <label for="ollamaModel">AI Model</label>
      <select id="ollamaModel" class="form-select">
        ${this.models.length === 0 ? 
          '<option value="">No models available</option>' :
          this.models.map(model => 
            `<option value="${model.name}">${model.name}</option>`
          ).join('')
        }
      </select>
    `;
  }
}
```

### 5. Terminal-Style Progress Window

#### Terminal Component
```javascript
class Terminal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.logs = [];
    this.maxLogs = 1000;
    this.init();
  }
  
  init() {
    this.container.innerHTML = `
      <div class="terminal-header">
        <div class="terminal-title">Project Progress</div>
        <div class="terminal-controls">
          <button class="terminal-btn" onclick="terminal.clear()">Clear</button>
          <button class="terminal-btn" onclick="terminal.scrollToBottom()">Bottom</button>
        </div>
      </div>
      <div class="terminal-body" id="terminalBody">
        <div class="terminal-prompt">Ready...</div>
      </div>
    `;
  }
  
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      message,
      type,
      id: Date.now() + Math.random()
    };
    
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    this.renderLog(logEntry);
    this.scrollToBottom();
  }
  
  renderLog(logEntry) {
    const terminalBody = document.getElementById('terminalBody');
    const logElement = document.createElement('div');
    logElement.className = `terminal-line terminal-${logEntry.type}`;
    logElement.innerHTML = `
      <span class="terminal-timestamp">[${logEntry.timestamp}]</span>
      <span class="terminal-message">${logEntry.message}</span>
    `;
    terminalBody.appendChild(logElement);
  }
}
```

## Data Models

### Enhanced Project Model
```typescript
interface Project {
  id: string;
  name: string;           // New: User-defined project name
  idea: string;
  userId?: string;        // Optional: Removed from UI
  status: ProjectStatus;
  currentStage: number;
  ollamaModel?: string;   // New: Selected Ollama model
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
  artifacts?: Artifact[];
}

interface ProjectUpdateRequest {
  name?: string;
  idea?: string;
  status?: ProjectStatus;
  currentStage?: number;
  ollamaModel?: string;
}
```

### Ollama Model Interface
```typescript
interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaModelsResponse {
  models: OllamaModel[];
}
```

## Error Handling

### Enhanced Error Management

#### Client-Side Error Handling
```javascript
class ErrorHandler {
  static show(message, type = 'error') {
    const errorContainer = document.getElementById('errorContainer');
    const errorElement = document.createElement('div');
    errorElement.className = `alert alert-${type}`;
    errorElement.innerHTML = `
      <div class="alert-content">
        <span class="alert-message">${message}</span>
        <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;
    
    errorContainer.appendChild(errorElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorElement.parentElement) {
        errorElement.remove();
      }
    }, 5000);
  }
  
  static handleOllamaError(error) {
    if (error.message.includes('ECONNREFUSED')) {
      this.show('Ollama service is not running. Please start Ollama and try again.', 'warning');
    } else if (error.message.includes('No models available')) {
      this.show('No Ollama models found. Please install a model using "ollama pull <model-name>".', 'info');
    } else {
      this.show(`Ollama error: ${error.message}`, 'error');
    }
  }
}
```

#### Server-Side Error Handling
```typescript
// Enhanced Ollama model endpoint with error handling
app.get('/api/ollama/models', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      throw new Error(`Ollama service returned ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      data: {
        models: data.models || [],
        count: data.models?.length || 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    
    res.status(502).json({
      success: false,
      message: 'Failed to connect to Ollama service',
      error: error.message,
      troubleshooting: {
        steps: [
          'Ensure Ollama is installed and running',
          'Check if Ollama is accessible at http://localhost:11434',
          'Verify at least one model is installed (ollama list)',
          'Try restarting the Ollama service'
        ]
      }
    });
  }
});
```

## Testing Strategy

### Component Testing
```javascript
// Test for ModelSelector component
describe('ModelSelector', () => {
  let modelSelector;
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="modelSelector"></div>';
    modelSelector = new ModelSelector();
  });
  
  test('should load available models on init', async () => {
    const mockModels = [
      { name: 'llama2:7b', size: 3825819519 },
      { name: 'codellama:13b', size: 7365960935 }
    ];
    
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: { models: mockModels } })
    });
    
    await modelSelector.loadAvailableModels();
    
    expect(modelSelector.models).toEqual(mockModels);
    expect(fetch).toHaveBeenCalledWith('/api/ollama/models');
  });
  
  test('should handle Ollama service unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    
    await modelSelector.loadAvailableModels();
    
    expect(modelSelector.models).toEqual([]);
  });
});
```

### Integration Testing
```javascript
// Test for project management integration
describe('Project Management Integration', () => {
  test('should create project with selected model', async () => {
    const projectData = {
      name: 'Test Project',
      idea: 'A great idea',
      ollamaModel: 'llama2:7b'
    };
    
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    
    const result = await response.json();
    
    expect(response.ok).toBe(true);
    expect(result.data.project.name).toBe('Test Project');
    expect(result.data.project.ollamaModel).toBe('llama2:7b');
  });
  
  test('should update project successfully', async () => {
    const projectId = 'test-project-id';
    const updates = {
      name: 'Updated Project Name',
      ollamaModel: 'codellama:13b'
    };
    
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    const result = await response.json();
    
    expect(response.ok).toBe(true);
    expect(result.data.project.name).toBe('Updated Project Name');
  });
});
```

### Visual Testing
```javascript
// Visual regression tests for design system
describe('Design System Visual Tests', () => {
  test('button components match design', () => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = 'Test Button';
    document.body.appendChild(button);
    
    const styles = getComputedStyle(button);
    
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)'); // white
    expect(styles.borderColor).toBe('rgb(0, 0, 0)'); // black
    expect(styles.boxShadow).toContain('rgba(0, 0, 0, 0.05)'); // subtle shadow
  });
  
  test('project cards have proper spacing and shadows', () => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    document.body.appendChild(projectCard);
    
    const styles = getComputedStyle(projectCard);
    
    expect(styles.boxShadow).toContain('rgba(0, 0, 0, 0.1)');
    expect(styles.borderRadius).toBe('8px');
  });
});
```

## Implementation Considerations

### Performance Optimizations
- **Lazy Loading**: Load Ollama models only when dropdown is opened
- **Debounced Updates**: Debounce project name editing to prevent excessive API calls
- **Virtual Scrolling**: Implement virtual scrolling for large project lists
- **Caching**: Cache Ollama model list with periodic refresh

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Support for high contrast mode
- **Focus Management**: Clear focus indicators and logical tab order

### Responsive Design
- **Mobile First**: Design components mobile-first with progressive enhancement
- **Breakpoints**: Define clear breakpoints for tablet and desktop layouts
- **Touch Targets**: Ensure touch targets are at least 44px for mobile
- **Flexible Grids**: Use CSS Grid and Flexbox for responsive layouts

### Browser Compatibility
- **Modern Browsers**: Target modern browsers with CSS Grid and Flexbox support
- **Fallbacks**: Provide fallbacks for older browsers where necessary
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Polyfills**: Include necessary polyfills for missing features