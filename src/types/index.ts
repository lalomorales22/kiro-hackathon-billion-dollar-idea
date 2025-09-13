// ============================================================================
// ENUMS
// ============================================================================

export enum ProjectStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export enum ArtifactType {
  PROJECT_DESCRIPTION = 'PROJECT_DESCRIPTION',
  MARKET_RESEARCH = 'MARKET_RESEARCH',
  TECHNICAL_ARCHITECTURE = 'TECHNICAL_ARCHITECTURE',
  UI_DESIGN = 'UI_DESIGN',
  FRONTEND_CODE = 'FRONTEND_CODE',
  BACKEND_CODE = 'BACKEND_CODE',
  DATABASE_SCHEMA = 'DATABASE_SCHEMA',
  QA_PLAN = 'QA_PLAN',
  BUSINESS_PLAN = 'BUSINESS_PLAN',
  MARKETING_CONTENT = 'MARKETING_CONTENT',
  SALES_FUNNEL = 'SALES_FUNNEL',
  SUPPORT_FRAMEWORK = 'SUPPORT_FRAMEWORK',
  ANALYTICS_PLAN = 'ANALYTICS_PLAN',
  FINANCIAL_PLAN = 'FINANCIAL_PLAN',
  MONITORING_PLAN = 'MONITORING_PLAN',
  OPTIMIZATION_PLAN = 'OPTIMIZATION_PLAN'
}

// ============================================================================
// CORE DOMAIN INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  idea: string;
  userId?: string;
  ollamaModel?: string;
  modelType?: string; // 'ollama' or 'groq'
  modelName?: string; // The actual model name
  status: ProjectStatus;
  currentStage: number;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
  artifacts?: Artifact[];
}

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  stage: number;
  agent: string;
  projectId: string;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Artifact {
  id: string;
  name: string;
  content: string;
  type: ArtifactType;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  stage: number;
  prompt: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AGENT SYSTEM INTERFACES
// ============================================================================

export interface AgentContext {
  projectId: string;
  project: Project;
  previousArtifacts: Artifact[];
  stageNumber: number;
  taskId: string;
  groqApiKey?: string; // Optional Groq API key for projects using Groq models
}

export interface AgentResult {
  success: boolean;
  artifacts: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProjectProgress {
  projectId: string;
  currentStage: number;
  totalStages: number;
  completedTasks: number;
  totalTasks: number;
  stageProgress: StageProgress[];
}

export interface StageProgress {
  stage: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tasks: TaskProgress[];
}

export interface TaskProgress {
  taskId: string;
  agentName: string;
  status: TaskStatus;
  progress: number; // 0-100
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateProjectRequest {
  idea: string;
  name?: string;
  userId?: string;
  ollamaModel?: string;
  modelType?: string; // 'ollama' or 'groq'
  modelName?: string; // The actual model name
  groqApiKey?: string; // Groq API key for Groq projects
}

export interface CreateProjectResponse {
  project: Project;
  message: string;
}

export interface GetProjectResponse {
  project: Project;
}

export interface GetProjectsResponse {
  projects: Project[];
  total: number;
}

export interface GetAgentsResponse {
  agents: Agent[];
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export interface WebSocketEvent {
  type: WebSocketEventType;
  payload: any;
  timestamp: Date;
}

export enum WebSocketEventType {
  PROJECT_START = 'project:start',
  TASK_UPDATE = 'task:update',
  ARTIFACT_CREATE = 'artifact:create',
  PROJECT_COMPLETE = 'project:complete',
  ERROR = 'error',
  STAGE_COMPLETE = 'stage:complete'
}

export interface ProjectStartEvent {
  projectId: string;
  project: Project;
}

export interface TaskUpdateEvent {
  taskId: string;
  projectId: string;
  status: TaskStatus;
  progress: number;
  agent: string;
  stage: number;
}

export interface ArtifactCreateEvent {
  artifactId: string;
  projectId: string;
  artifact: Artifact;
}

export interface ProjectCompleteEvent {
  projectId: string;
  project: Project;
  totalArtifacts: number;
}

export interface ErrorEvent {
  projectId?: string;
  taskId?: string;
  error: string;
  details?: Record<string, any>;
}

export interface StageCompleteEvent {
  projectId: string;
  stage: number;
  completedTasks: number;
  artifacts: Artifact[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CreateProject = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'artifacts'>;
export type UpdateProject = Partial<Pick<Project, 'name' | 'status' | 'currentStage' | 'ollamaModel' | 'modelType' | 'modelName'>>;
export type CreateTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTask = Partial<Pick<Task, 'status' | 'result' | 'error'>>;
export type CreateArtifact = Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateAgent = Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>;

// Database query options
export interface QueryOptions {
  include?: {
    tasks?: boolean;
    artifacts?: boolean;
    user?: boolean;
  };
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IOllamaService {
  generateContent(prompt: string, context?: any): Promise<string>;
  isHealthy(): Promise<boolean>;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaError {
  error: string;
  code?: string;
}

// ============================================================================
// GROQ SERVICE INTERFACES
// ============================================================================

export interface IGroqService {
  generateContent(prompt: string, context?: any): Promise<string>;
  isHealthy(): Promise<boolean>;
  validateApiKey(apiKey: string): Promise<boolean>;
  getServiceInfo(): Promise<GroqServiceInfo>;
  getMetrics(): GroqMetrics;
}

export interface GroqRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GroqError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export interface GroqServiceInfo {
  model: string;
  apiKeyConfigured: boolean;
  isHealthy: boolean;
  maxRetries: number;
  timeout: number;
  circuitBreakerState: string;
  metrics: GroqMetrics;
}

export interface GroqMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: Date;
  circuitBreakerTrips: number;
  errorRate: number;
  successRate: number;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export validation functions
export * from './validation.js';