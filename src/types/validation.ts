import { 
  Project, 
  Task, 
  Artifact, 
  Agent, 
  ProjectStatus, 
  TaskStatus, 
  ArtifactType,
  CreateProjectRequest,
  CreateProject,
  UpdateProject,
  CreateTask,
  CreateArtifact,
  CreateAgent
} from './index.js';

// ============================================================================
// VALIDATION RESULT TYPE
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.trim() === id;
}

export function isValidString(value: string, minLength = 1, maxLength = 10000): boolean {
  return typeof value === 'string' && 
         value.length >= minLength && 
         value.length <= maxLength &&
         value.trim().length > 0;
}

export function isValidStage(stage: number): boolean {
  return Number.isInteger(stage) && stage >= 1 && stage <= 6;
}

export function isValidProgress(progress: number): boolean {
  return typeof progress === 'number' && progress >= 0 && progress <= 100;
}

// ============================================================================
// PROJECT VALIDATION
// ============================================================================

export function validateCreateProjectRequest(request: any): ValidationResult {
  const errors: string[] = [];

  if (!request) {
    errors.push('Request body is required');
    return { isValid: false, errors };
  }

  if (!isValidString(request.idea, 10, 5000)) {
    errors.push('Idea must be a string between 10 and 5000 characters');
  }

  // Name is optional, but if provided must be valid
  if (request.name !== undefined && !isValidString(request.name, 1, 200)) {
    errors.push('Project name must be between 1 and 200 characters');
  }

  // UserId is now optional
  if (request.userId !== undefined && !isValidId(request.userId)) {
    errors.push('Valid userId is required when provided');
  }

  // OllamaModel is optional, but if provided must be valid
  if (request.ollamaModel !== undefined && !isValidString(request.ollamaModel, 1, 100)) {
    errors.push('Ollama model must be between 1 and 100 characters');
  }

  // ModelType is optional, but if provided must be valid
  if (request.modelType !== undefined && !['ollama', 'groq'].includes(request.modelType)) {
    errors.push('Model type must be either "ollama" or "groq"');
  }

  // ModelName is optional, but if provided must be valid
  if (request.modelName !== undefined && !isValidString(request.modelName, 1, 100)) {
    errors.push('Model name must be between 1 and 100 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateProject(project: CreateProject): ValidationResult {
  const errors: string[] = [];

  if (!isValidString(project.name, 1, 200)) {
    errors.push('Project name must be between 1 and 200 characters');
  }

  if (!isValidString(project.idea, 10, 5000)) {
    errors.push('Project idea must be between 10 and 5000 characters');
  }

  // UserId is now optional
  if (project.userId !== undefined && !isValidId(project.userId)) {
    errors.push('Valid userId is required when provided');
  }

  // OllamaModel is optional, but if provided must be valid
  if (project.ollamaModel !== undefined && !isValidString(project.ollamaModel, 1, 100)) {
    errors.push('Ollama model must be between 1 and 100 characters');
  }

  // ModelType is optional, but if provided must be valid
  if (project.modelType !== undefined && !['ollama', 'groq'].includes(project.modelType)) {
    errors.push('Model type must be either "ollama" or "groq"');
  }

  // ModelName is optional, but if provided must be valid
  if (project.modelName !== undefined && !isValidString(project.modelName, 1, 100)) {
    errors.push('Model name must be between 1 and 100 characters');
  }

  if (!Object.values(ProjectStatus).includes(project.status)) {
    errors.push('Invalid project status');
  }

  if (!isValidStage(project.currentStage)) {
    errors.push('Current stage must be between 1 and 6');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateProjectUpdate(updates: any): ValidationResult {
  const errors: string[] = [];

  if (!updates || typeof updates !== 'object') {
    errors.push('Updates object is required');
    return { isValid: false, errors };
  }

  if (updates.name !== undefined && !isValidString(updates.name, 1, 200)) {
    errors.push('Project name must be between 1 and 200 characters');
  }

  if (updates.status !== undefined && !Object.values(ProjectStatus).includes(updates.status)) {
    errors.push('Invalid project status');
  }

  if (updates.currentStage !== undefined && !isValidStage(updates.currentStage)) {
    errors.push('Current stage must be between 1 and 6');
  }

  if (updates.ollamaModel !== undefined && !isValidString(updates.ollamaModel, 1, 100)) {
    errors.push('Ollama model must be between 1 and 100 characters');
  }

  if (updates.modelType !== undefined && !['ollama', 'groq'].includes(updates.modelType)) {
    errors.push('Model type must be either "ollama" or "groq"');
  }

  if (updates.modelName !== undefined && !isValidString(updates.modelName, 1, 100)) {
    errors.push('Model name must be between 1 and 100 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// TASK VALIDATION
// ============================================================================

export function validateTask(task: CreateTask): ValidationResult {
  const errors: string[] = [];

  if (!isValidString(task.name, 1, 200)) {
    errors.push('Task name must be between 1 and 200 characters');
  }

  if (!Object.values(TaskStatus).includes(task.status)) {
    errors.push('Invalid task status');
  }

  if (!isValidStage(task.stage)) {
    errors.push('Task stage must be between 1 and 6');
  }

  if (!isValidString(task.agent, 1, 100)) {
    errors.push('Agent name must be between 1 and 100 characters');
  }

  if (!isValidId(task.projectId)) {
    errors.push('Valid projectId is required');
  }

  if (task.result !== undefined && !isValidString(task.result, 0, 50000)) {
    errors.push('Task result must be less than 50000 characters');
  }

  if (task.error !== undefined && !isValidString(task.error, 0, 1000)) {
    errors.push('Task error must be less than 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// ARTIFACT VALIDATION
// ============================================================================

export function validateArtifact(artifact: CreateArtifact): ValidationResult {
  const errors: string[] = [];

  if (!isValidString(artifact.name, 1, 200)) {
    errors.push('Artifact name must be between 1 and 200 characters');
  }

  if (!isValidString(artifact.content, 1, 100000)) {
    errors.push('Artifact content must be between 1 and 100000 characters');
  }

  if (!Object.values(ArtifactType).includes(artifact.type)) {
    errors.push('Invalid artifact type');
  }

  if (!isValidId(artifact.projectId)) {
    errors.push('Valid projectId is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// AGENT VALIDATION
// ============================================================================

export function validateAgent(agent: CreateAgent): ValidationResult {
  const errors: string[] = [];

  if (!isValidString(agent.name, 1, 100)) {
    errors.push('Agent name must be between 1 and 100 characters');
  }

  if (!isValidString(agent.description, 1, 500)) {
    errors.push('Agent description must be between 1 and 500 characters');
  }

  if (!isValidStage(agent.stage)) {
    errors.push('Agent stage must be between 1 and 6');
  }

  if (!isValidString(agent.prompt, 10, 10000)) {
    errors.push('Agent prompt must be between 10 and 10000 characters');
  }

  if (typeof agent.isActive !== 'boolean') {
    errors.push('Agent isActive must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// BUSINESS LOGIC VALIDATION
// ============================================================================

export function validateStageProgression(currentStage: number, nextStage: number): ValidationResult {
  const errors: string[] = [];

  if (!isValidStage(currentStage) || !isValidStage(nextStage)) {
    errors.push('Both current and next stage must be valid (1-6)');
  }

  if (nextStage !== currentStage + 1 && nextStage !== currentStage) {
    errors.push('Can only progress to the next stage or stay on current stage');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateTaskForStage(task: CreateTask, expectedStage: number): ValidationResult {
  const errors: string[] = [];

  if (task.stage !== expectedStage) {
    errors.push(`Task stage ${task.stage} does not match expected stage ${expectedStage}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateArtifactForStage(artifactType: ArtifactType, stage: number): ValidationResult {
  const errors: string[] = [];

  const stageArtifactMap: Record<number, ArtifactType[]> = {
    1: [ArtifactType.PROJECT_DESCRIPTION],
    2: [ArtifactType.MARKET_RESEARCH, ArtifactType.TECHNICAL_ARCHITECTURE],
    3: [
      ArtifactType.UI_DESIGN,
      ArtifactType.FRONTEND_CODE,
      ArtifactType.BACKEND_CODE,
      ArtifactType.DATABASE_SCHEMA,
      ArtifactType.QA_PLAN
    ],
    4: [
      ArtifactType.BUSINESS_PLAN,
      ArtifactType.MARKETING_CONTENT,
      ArtifactType.SALES_FUNNEL
    ],
    5: [
      ArtifactType.SUPPORT_FRAMEWORK,
      ArtifactType.ANALYTICS_PLAN,
      ArtifactType.FINANCIAL_PLAN
    ],
    6: [
      ArtifactType.MONITORING_PLAN,
      ArtifactType.OPTIMIZATION_PLAN
    ]
  };

  const validArtifacts = stageArtifactMap[stage] || [];
  if (!validArtifacts.includes(artifactType)) {
    errors.push(`Artifact type ${artifactType} is not valid for stage ${stage}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// COMPOSITE VALIDATION FUNCTIONS
// ============================================================================

export function validateCompleteProject(project: Project): ValidationResult {
  const errors: string[] = [];

  // Basic project validation
  const projectValidation = validateProject(project);
  errors.push(...projectValidation.errors);

  // Validate tasks if present
  if (project.tasks) {
    project.tasks.forEach((task, index) => {
      const taskValidation = validateTask(task);
      taskValidation.errors.forEach(error => {
        errors.push(`Task ${index}: ${error}`);
      });
    });
  }

  // Validate artifacts if present
  if (project.artifacts) {
    project.artifacts.forEach((artifact, index) => {
      const artifactValidation = validateArtifact(artifact);
      artifactValidation.errors.forEach(error => {
        errors.push(`Artifact ${index}: ${error}`);
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function sanitizeProjectIdea(idea: string): string {
  // Remove potentially harmful content while preserving the idea
  return sanitizeString(idea)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .substring(0, 5000); // Limit length
}

export function sanitizeArtifactContent(content: string): string {
  // More lenient sanitization for artifacts as they may contain code
  return content.trim().substring(0, 100000); // Just limit length
}