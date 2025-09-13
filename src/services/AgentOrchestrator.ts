import { 
  Project, 
  Task, 
  TaskStatus, 
  ProjectStatus, 
  AgentContext, 
  AgentResult, 
  ProjectProgress, 
  StageProgress, 
  TaskProgress,
  CreateTask,
  UpdateTask,
  Artifact,
  WebSocketEventType,
  TaskUpdateEvent,
  StageCompleteEvent,
  ProjectCompleteEvent,
  ErrorEvent,
  ProjectStartEvent,
  ArtifactCreateEvent
} from '../types/index.js';
import { BaseAgent } from '../agents/BaseAgent.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { DatabaseService } from './database.js';
import { WebSocketService } from './WebSocketService.js';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler.js';
import { AIServiceFactory } from './AIServiceFactory.js';

/**
 * Core orchestrator for managing the 6-stage AI agent pipeline.
 * Handles project execution, task management, and stage progression.
 */
export class AgentOrchestrator {
  private databaseService: DatabaseService;
  private agentRegistry: AgentRegistry;
  private webSocketService?: WebSocketService;

  constructor(
    databaseService: DatabaseService,
    agentRegistry: AgentRegistry,
    webSocketService?: WebSocketService
  ) {
    this.databaseService = databaseService;
    this.agentRegistry = agentRegistry;
    this.webSocketService = webSocketService;
  }

  /**
   * Starts the complete pipeline for a project.
   * Creates tasks for all stages and begins execution with Stage 1.
   * @param projectId The ID of the project to start
   * @param groqApiKey Optional Groq API key for projects using Groq models
   */
  async startProject(projectId: string, groqApiKey?: string): Promise<void> {
    const prisma = this.databaseService.getClient();
    
    try {
      console.log(`[AgentOrchestrator] Starting project ${projectId} with ${groqApiKey ? 'Groq API key' : 'no Groq API key'}`);
      
      // Get project with existing tasks and artifacts
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { tasks: true, artifacts: true }
      });

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      console.log(`[AgentOrchestrator] Project ${projectId} details: modelType=${project.modelType}, modelName=${project.modelName}`);

      // Update project status to IN_PROGRESS
      await prisma.project.update({
        where: { id: projectId },
        data: { 
          status: ProjectStatus.IN_PROGRESS,
          currentStage: 1
        }
      });

      // Create tasks for all stages if they don't exist
      await this.createTasksForProject(projectId);

      // Emit project start event
      if (this.webSocketService) {
        this.webSocketService.broadcastProjectStart({
          projectId,
          project: { ...project, status: ProjectStatus.IN_PROGRESS, currentStage: 1 } as Project
        });
      }

      // Start with Stage 1
      await this.executeStage(projectId, 1, groqApiKey);

    } catch (error) {
      await this.handleProjectError(projectId, error);
      throw error;
    }
  }

  /**
   * Executes all agents for a specific stage in parallel.
   * @param projectId The ID of the project
   * @param stage The stage number to execute
   * @param groqApiKey Optional Groq API key for projects using Groq models
   */
  async executeStage(projectId: string, stage: number, groqApiKey?: string): Promise<void> {
    const prisma = this.databaseService.getClient();

    try {
      console.log(`[AgentOrchestrator] Starting stage ${stage} for project ${projectId} with ${groqApiKey ? 'Groq API key' : 'no Groq API key'}`);

      // Get project with current data
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { tasks: true, artifacts: true }
      });

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      console.log(`[AgentOrchestrator] Stage ${stage} - Project modelType: ${project.modelType}, modelName: ${project.modelName}`);

      // Get tasks for this stage
      const stageTasks = project.tasks.filter(task => 
        task.stage === stage && task.status === TaskStatus.PENDING
      );

      if (stageTasks.length === 0) {
        console.log(`No pending tasks found for stage ${stage}, moving to next stage`);
        await this.progressToNextStage(projectId, stage, groqApiKey);
        return;
      }

      // Get agents for this stage
      const stageAgents = this.agentRegistry.getAgentsForStage(stage);
      
      if (stageAgents.length === 0) {
        throw new Error(`No agents available for stage ${stage}`);
      }

      // Execute tasks in parallel
      const taskPromises = stageTasks.map(task => 
        this.executeTask(task as Task, project as Project & { tasks: Task[]; artifacts: Artifact[]; }, stageAgents, groqApiKey)
      );

      const results = await Promise.allSettled(taskPromises);

      // Process results and update stage status
      await this.processStageResults(projectId, stage, results, stageTasks as Task[], groqApiKey);

    } catch (error) {
      console.error(`Stage ${stage} execution failed for project ${projectId}:`, error);
      await this.handleStageError(projectId, stage, error, groqApiKey);
      throw error;
    }
  }

  /**
   * Executes a single task with the appropriate agent.
   * @param task The task to execute
   * @param project The project data
   * @param stageAgents Available agents for this stage
   * @param groqApiKey Optional Groq API key for projects using Groq models
   */
  private async executeTask(
    task: Task, 
    project: Project & { tasks: Task[]; artifacts: Artifact[] },
    stageAgents: BaseAgent[],
    groqApiKey?: string
  ): Promise<{ task: Task; result: AgentResult }> {
    const prisma = this.databaseService.getClient();

    try {
      // Find the agent for this task
      const agent = stageAgents.find(a => a.name === task.agent);
      if (!agent) {
        throw new Error(`Agent not found: ${task.agent}`);
      }

      // Update task status to IN_PROGRESS
      await this.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);

      // Prepare agent context
      const context: AgentContext = {
        projectId: project.id,
        project,
        previousArtifacts: project.artifacts,
        stageNumber: task.stage,
        taskId: task.id,
        groqApiKey
      };

      // Execute the agent with fallback mechanism
      console.log(`Executing agent ${agent.name} for task ${task.id}`);
      const result = await this.executeAgentWithFallback(agent, context);

      if (result.success) {
        // Save artifacts to database
        if (result.artifacts.length > 0) {
          await prisma.artifact.createMany({
            data: result.artifacts
          });

          // Emit artifact creation events
          if (this.webSocketService) {
            for (const artifact of result.artifacts) {
              this.webSocketService.broadcastArtifactCreate({
                artifactId: `temp-${Date.now()}`, // Will be replaced with actual ID
                projectId: project.id,
                artifact: artifact as Artifact
              });
            }
          }
        }

        // Update task as completed
        await this.updateTaskStatus(task.id, TaskStatus.COMPLETED, JSON.stringify(result.metadata));
      } else {
        // Update task as failed
        await this.updateTaskStatus(task.id, TaskStatus.FAILED, undefined, result.error);
      }

      return { task, result };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Task execution failed for task ${task.id}:`, errorMessage);
      
      await this.updateTaskStatus(task.id, TaskStatus.FAILED, undefined, errorMessage);
      
      if (this.webSocketService) {
        this.webSocketService.broadcastError({
          projectId: project.id,
          taskId: task.id,
          error: errorMessage
        });
      }

      return { 
        task, 
        result: { 
          success: false, 
          artifacts: [], 
          error: errorMessage 
        } 
      };
    }
  }

  /**
   * Creates tasks for all stages of a project.
   */
  private async createTasksForProject(projectId: string): Promise<void> {
    const prisma = this.databaseService.getClient();

    // Check if tasks already exist
    const existingTasks = await prisma.task.findMany({
      where: { projectId }
    });

    if (existingTasks.length > 0) {
      console.log(`Tasks already exist for project ${projectId}, skipping creation`);
      return;
    }

    const tasksToCreate: CreateTask[] = [];

    // Create tasks for each stage based on available agents
    for (let stage = 1; stage <= 6; stage++) {
      const stageAgents = this.agentRegistry.getAgentsForStage(stage);
      
      for (const agent of stageAgents) {
        tasksToCreate.push({
          name: `${agent.name} - Stage ${stage}`,
          status: TaskStatus.PENDING,
          stage,
          agent: agent.name,
          projectId
        });
      }
    }

    if (tasksToCreate.length > 0) {
      await prisma.task.createMany({
        data: tasksToCreate
      });
      console.log(`Created ${tasksToCreate.length} tasks for project ${projectId}`);
    }
  }

  /**
   * Updates task status and emits progress events.
   */
  private async updateTaskStatus(
    taskId: string, 
    status: TaskStatus, 
    result?: string, 
    error?: string
  ): Promise<void> {
    const prisma = this.databaseService.getClient();

    const updateData: UpdateTask = { status };
    if (result) updateData.result = result;
    if (error) updateData.error = error;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { project: true }
    });

    // Calculate progress percentage
    const progress = this.calculateTaskProgress(status);

    // Emit task update event
    if (this.webSocketService) {
      this.webSocketService.broadcastTaskUpdate({
        taskId,
        projectId: updatedTask.projectId,
        status,
        progress,
        agent: updatedTask.agent,
        stage: updatedTask.stage
      });
    }
  }

  /**
   * Processes the results of stage execution and determines next steps.
   */
  private async processStageResults(
    projectId: string,
    stage: number,
    results: PromiseSettledResult<{ task: Task; result: AgentResult }>[],
    tasks: Task[],
    groqApiKey?: string
  ): Promise<void> {
    const prisma = this.databaseService.getClient();

    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.result.success
    ).length;
    
    const failed = results.length - successful;

    console.log(`Stage ${stage} completed: ${successful} successful, ${failed} failed`);

    // Get updated artifacts for this stage
    const stageArtifacts = await prisma.artifact.findMany({
      where: { 
        projectId,
        createdAt: { gte: new Date(Date.now() - 60000) } // Last minute
      }
    });

    // Emit stage completion event
    if (this.webSocketService) {
      this.webSocketService.broadcastStageComplete({
        projectId,
        stage,
        completedTasks: successful,
        artifacts: stageArtifacts as Artifact[]
      });
    }

    // Progress to next stage or complete project
    await this.progressToNextStage(projectId, stage, groqApiKey);
  }

  /**
   * Progresses to the next stage or completes the project.
   */
  private async progressToNextStage(projectId: string, currentStage: number, groqApiKey?: string): Promise<void> {
    const prisma = this.databaseService.getClient();
    const nextStage = currentStage + 1;

    if (nextStage > 6) {
      // Project completed
      await prisma.project.update({
        where: { id: projectId },
        data: { 
          status: ProjectStatus.COMPLETED,
          currentStage: 6
        }
      });

      const completedProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: { artifacts: true }
      });

      if (this.webSocketService) {
        this.webSocketService.broadcastProjectComplete({
          projectId,
          project: completedProject! as Project,
          totalArtifacts: completedProject?.artifacts.length || 0
        });
      }

      console.log(`Project ${projectId} completed successfully`);
    } else {
      // Move to next stage
      await prisma.project.update({
        where: { id: projectId },
        data: { currentStage: nextStage }
      });

      console.log(`Project ${projectId} progressing to stage ${nextStage}`);
      
      // Execute next stage
      await this.executeStage(projectId, nextStage, groqApiKey);
    }
  }

  /**
   * Gets the current progress of a project.
   */
  async getProgress(projectId: string): Promise<ProjectProgress> {
    const prisma = this.databaseService.getClient();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: true }
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length;

    // Group tasks by stage
    const stageProgress: StageProgress[] = [];
    for (let stage = 1; stage <= 6; stage++) {
      const stageTasks = project.tasks.filter(t => t.stage === stage);
      const stageStatus = this.determineStageStatus(stageTasks as Task[], project.currentStage, stage);

      stageProgress.push({
        stage,
        name: this.getStageDisplayName(stage),
        status: stageStatus,
        tasks: stageTasks.map(task => ({
          taskId: task.id,
          agentName: task.agent,
          status: task.status as TaskStatus,
          progress: this.calculateTaskProgress(task.status as TaskStatus)
        }))
      });
    }

    return {
      projectId,
      currentStage: project.currentStage,
      totalStages: 6,
      completedTasks,
      totalTasks,
      stageProgress
    };
  }

  /**
   * Handles project-level errors with recovery mechanisms.
   */
  private async handleProjectError(projectId: string, error: unknown): Promise<void> {
    const prisma = this.databaseService.getClient();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      // Attempt to save project state before marking as failed
      await this.databaseService.executeWithRetry(async () => {
        await prisma.project.update({
          where: { id: projectId },
          data: { 
            status: ProjectStatus.FAILED,
            updatedAt: new Date()
          }
        });
      }, { context: { projectId, operation: 'mark_project_failed' } });

      // Log detailed error information
      console.error(`Project ${projectId} failed:`, {
        error: errorMessage,
        timestamp: new Date().toISOString(),
        projectId
      });

    } catch (updateError) {
      console.error('Failed to update project status to FAILED:', updateError);
      
      // If we can't even update the database, this is critical
      const criticalError = errorHandler.createError(
        `Critical failure: Cannot update project ${projectId} status after error: ${errorMessage}`,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.CRITICAL,
        500,
        { projectId, originalError: errorMessage }
      );
      
      await errorHandler.handleError(criticalError);
    }

    // Broadcast error via WebSocket
    if (this.webSocketService) {
      try {
        this.webSocketService.broadcastError({
          projectId,
          error: errorMessage,
          details: { 
            type: 'project_error',
            timestamp: new Date().toISOString(),
            recoverable: this.isRecoverableError(error)
          }
        });
      } catch (wsError) {
        console.error('Failed to broadcast project error via WebSocket:', wsError);
      }
    }

    // Handle error through centralized error handler
    const appError = errorHandler.createError(
      `Project execution failed: ${errorMessage}`,
      ErrorType.AGENT_ERROR,
      ErrorSeverity.HIGH,
      500,
      { projectId },
      error as Error
    );

    await errorHandler.handleError(appError);
  }

  /**
   * Handles stage-level errors with recovery mechanisms.
   */
  private async handleStageError(projectId: string, stage: number, error: unknown, groqApiKey?: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const prisma = this.databaseService.getClient();

    try {
      // Mark failed tasks in this stage
      await this.databaseService.executeWithRetry(async () => {
        await prisma.task.updateMany({
          where: {
            projectId,
            stage,
            status: TaskStatus.IN_PROGRESS
          },
          data: {
            status: TaskStatus.FAILED,
            error: errorMessage,
            updatedAt: new Date()
          }
        });
      }, { context: { projectId, stage, operation: 'mark_stage_tasks_failed' } });

      // Check if we should attempt recovery
      const shouldRecover = await this.shouldAttemptStageRecovery(projectId, stage, error);
      
      if (shouldRecover) {
        console.log(`Attempting recovery for stage ${stage} in project ${projectId}`);
        await this.attemptStageRecovery(projectId, stage, groqApiKey);
      } else {
        // Continue to next stage if possible
        const canContinue = await this.canContinueAfterStageFailure(projectId, stage);
        if (canContinue) {
          console.log(`Continuing to next stage after stage ${stage} failure in project ${projectId}`);
          await this.progressToNextStage(projectId, stage, groqApiKey);
        } else {
          // Mark entire project as failed
          await this.handleProjectError(projectId, error);
        }
      }

    } catch (recoveryError) {
      console.error(`Stage ${stage} error handling failed for project ${projectId}:`, recoveryError);
      await this.handleProjectError(projectId, recoveryError);
    }

    // Broadcast stage error
    if (this.webSocketService) {
      try {
        this.webSocketService.broadcastError({
          projectId,
          error: `Stage ${stage} failed: ${errorMessage}`,
          details: { 
            type: 'stage_error', 
            stage,
            timestamp: new Date().toISOString(),
            recoverable: this.isRecoverableError(error)
          }
        });
      } catch (wsError) {
        console.error('Failed to broadcast stage error via WebSocket:', wsError);
      }
    }

    // Handle error through centralized error handler
    const appError = errorHandler.createError(
      `Stage ${stage} execution failed: ${errorMessage}`,
      ErrorType.AGENT_ERROR,
      ErrorSeverity.MEDIUM,
      500,
      { projectId, stage },
      error as Error
    );

    await errorHandler.handleError(appError);
  }

  /**
   * Determines if an error is recoverable
   */
  private isRecoverableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const recoverableErrors = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      'service unavailable'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return recoverableErrors.some(recoverable => errorMessage.includes(recoverable));
  }

  /**
   * Determines if stage recovery should be attempted
   */
  private async shouldAttemptStageRecovery(projectId: string, stage: number, error: unknown): Promise<boolean> {
    const prisma = this.databaseService.getClient();
    
    try {
      // Check how many times this stage has failed
      const failedTasks = await prisma.task.findMany({
        where: {
          projectId,
          stage,
          status: TaskStatus.FAILED
        }
      });

      // Don't attempt recovery if too many failures
      if (failedTasks.length > 3) {
        return false;
      }

      // Only attempt recovery for recoverable errors
      return this.isRecoverableError(error);
      
    } catch (checkError) {
      console.error('Failed to check stage recovery conditions:', checkError);
      return false;
    }
  }

  /**
   * Attempts to recover a failed stage
   */
  private async attemptStageRecovery(projectId: string, stage: number, groqApiKey?: string): Promise<void> {
    const prisma = this.databaseService.getClient();
    
    try {
      // Reset failed tasks to pending for retry
      await prisma.task.updateMany({
        where: {
          projectId,
          stage,
          status: TaskStatus.FAILED
        },
        data: {
          status: TaskStatus.PENDING,
          error: null,
          updatedAt: new Date()
        }
      });

      // Wait a bit before retrying
      await this.sleep(5000);

      // Retry the stage
      await this.executeStage(projectId, stage, groqApiKey);
      
    } catch (recoveryError) {
      console.error(`Stage ${stage} recovery failed for project ${projectId}:`, recoveryError);
      throw recoveryError;
    }
  }

  /**
   * Determines if the pipeline can continue after a stage failure
   */
  private async canContinueAfterStageFailure(projectId: string, stage: number): Promise<boolean> {
    // Critical stages that must succeed
    const criticalStages = [1, 2]; // Input Processing and Validation are critical
    
    if (criticalStages.includes(stage)) {
      return false;
    }

    // For non-critical stages, we can continue
    return true;
  }

  /**
   * Enhanced task execution with better error handling
   */
  private async executeTaskWithRecovery(
    task: Task, 
    project: Project & { tasks: Task[]; artifacts: Artifact[] },
    stageAgents: BaseAgent[],
    groqApiKey?: string
  ): Promise<{ task: Task; result: AgentResult }> {
    const maxTaskRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxTaskRetries; attempt++) {
      try {
        return await this.executeTask(task, project, stageAgents, groqApiKey);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxTaskRetries && this.isRecoverableError(error)) {
          console.log(`Task ${task.id} failed (attempt ${attempt}/${maxTaskRetries}), retrying...`);
          await this.sleep(2000 * attempt); // Progressive delay
          continue;
        }
        
        break;
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Unknown error';
    console.error(`Task ${task.id} failed after ${maxTaskRetries} attempts:`, errorMessage);
    
    return { 
      task, 
      result: { 
        success: false, 
        artifacts: [], 
        error: errorMessage,
        metadata: {
          attempts: maxTaskRetries,
          finalError: errorMessage
        }
      } 
    };
  }

  /**
   * Execute agent with fallback mechanism for service failures
   */
  private async executeAgentWithFallback(agent: BaseAgent, context: AgentContext): Promise<AgentResult> {
    try {
      // First attempt with the configured service
      return await agent.execute(context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Agent ${agent.name} failed with primary service:`, errorMessage);
      
      // Check if this is a Groq-related error and we can fallback to Ollama
      if (this.isGroqServiceError(error) && context.groqApiKey) {
        console.log(`Attempting fallback to Ollama for agent ${agent.name}`);
        
        try {
          // Create fallback context without Groq API key to force Ollama usage
          const fallbackContext: AgentContext = {
            ...context,
            groqApiKey: undefined
          };
          
          const fallbackResult = await agent.execute(fallbackContext);
          
          // Add metadata about the fallback
          fallbackResult.metadata = {
            ...fallbackResult.metadata,
            usedFallback: true,
            originalError: errorMessage,
            fallbackService: 'ollama'
          };
          
          console.log(`Successfully executed agent ${agent.name} with Ollama fallback`);
          
          // Notify about the fallback via WebSocket
          if (this.webSocketService) {
            this.webSocketService.broadcastError({
              projectId: context.projectId,
              taskId: context.taskId,
              error: `Groq service unavailable, automatically switched to Ollama`,
              details: {
                type: 'service_fallback',
                originalService: 'groq',
                fallbackService: 'ollama',
                agent: agent.name
              }
            });
          }
          
          return fallbackResult;
        } catch (fallbackError) {
          console.error(`Fallback to Ollama also failed for agent ${agent.name}:`, fallbackError);
          
          // Both services failed, create comprehensive error
          const combinedError = errorHandler.createError(
            `Both Groq and Ollama services failed for agent ${agent.name}. Primary: ${errorMessage}. Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
            ErrorType.AGENT_ERROR,
            ErrorSeverity.HIGH,
            500,
            {
              projectId: context.projectId,
              taskId: context.taskId,
              agentId: agent.name
            }
          );
          
          await errorHandler.handleError(combinedError);
          throw combinedError;
        }
      }
      
      // For non-Groq errors or when no fallback is available, handle normally
      const appError = errorHandler.createError(
        `Agent ${agent.name} execution failed: ${errorMessage}`,
        this.determineAgentErrorType(error),
        ErrorSeverity.MEDIUM,
        500,
        {
          projectId: context.projectId,
          taskId: context.taskId,
          agentId: agent.name
        },
        error as Error
      );
      
      await errorHandler.handleError(appError);
      throw appError;
    }
  }

  /**
   * Determine if an error is related to Groq service
   */
  private isGroqServiceError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const errorMessage = error.message.toLowerCase();
    const groqErrorIndicators = [
      'groq',
      'api key',
      'authentication',
      'rate limit',
      'quota exceeded',
      'service unavailable'
    ];
    
    return groqErrorIndicators.some(indicator => errorMessage.includes(indicator));
  }

  /**
   * Determine the error type for agent execution errors
   */
  private determineAgentErrorType(error: unknown): ErrorType {
    if (!(error instanceof Error)) return ErrorType.AGENT_ERROR;
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('groq')) {
      if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
        return ErrorType.GROQ_API_KEY_INVALID;
      }
      if (errorMessage.includes('rate limit')) {
        return ErrorType.GROQ_RATE_LIMIT;
      }
      if (errorMessage.includes('quota')) {
        return ErrorType.GROQ_QUOTA_EXCEEDED;
      }
      if (errorMessage.includes('service unavailable')) {
        return ErrorType.GROQ_SERVICE_UNAVAILABLE;
      }
      return ErrorType.GROQ_ERROR;
    }
    
    if (errorMessage.includes('ollama')) {
      return ErrorType.OLLAMA_ERROR;
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    return ErrorType.AGENT_ERROR;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }



  /**
   * Calculates task progress percentage based on status.
   */
  private calculateTaskProgress(status: TaskStatus): number {
    switch (status) {
      case TaskStatus.PENDING: return 0;
      case TaskStatus.IN_PROGRESS: return 50;
      case TaskStatus.COMPLETED: return 100;
      case TaskStatus.FAILED: return 0;
      case TaskStatus.SKIPPED: return 100;
      default: return 0;
    }
  }

  /**
   * Determines the status of a stage based on its tasks.
   */
  private determineStageStatus(
    stageTasks: Task[], 
    currentStage: number, 
    stage: number
  ): 'pending' | 'in_progress' | 'completed' | 'failed' {
    if (stage > currentStage) return 'pending';
    if (stage < currentStage) return 'completed';
    
    // Current stage
    const hasInProgress = stageTasks.some(t => t.status === TaskStatus.IN_PROGRESS);
    const allCompleted = stageTasks.every(t => 
      t.status === TaskStatus.COMPLETED || t.status === TaskStatus.SKIPPED
    );
    const hasFailed = stageTasks.some(t => t.status === TaskStatus.FAILED);

    if (hasFailed) return 'failed';
    if (allCompleted) return 'completed';
    if (hasInProgress) return 'in_progress';
    return 'pending';
  }

  /**
   * Gets display name for a stage.
   */
  private getStageDisplayName(stage: number): string {
    const stageNames = {
      1: 'Input Processing',
      2: 'Validation & Strategy',
      3: 'Development',
      4: 'Go-to-Market',
      5: 'Operations',
      6: 'Self-Improvement'
    };
    return stageNames[stage as keyof typeof stageNames] || `Stage ${stage}`;
  }
}