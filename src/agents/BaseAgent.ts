import { Agent, AgentContext, AgentResult, Artifact, ArtifactType } from '../types/index.js';
import { IOllamaService, IGroqService } from '../types/index.js';
import { errorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler.js';
import { AIServiceFactory } from '../services/AIServiceFactory.js';

/**
 * Abstract base class for all AI agents in the system.
 * Provides common functionality for agent execution, error handling, and artifact creation.
 */
export abstract class BaseAgent implements Agent {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly stage: number;
  public readonly prompt: string;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  protected ollamaService: IOllamaService;

  constructor(
    agentData: Agent,
    ollamaService: IOllamaService
  ) {
    this.id = agentData.id;
    this.name = agentData.name;
    this.description = agentData.description;
    this.stage = agentData.stage;
    this.prompt = agentData.prompt;
    this.isActive = agentData.isActive;
    this.createdAt = agentData.createdAt;
    this.updatedAt = agentData.updatedAt;
    this.ollamaService = ollamaService;
  }

  /**
   * Abstract method that must be implemented by concrete agent classes.
   * Defines the specific execution logic for each agent type.
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Calls the appropriate AI service to generate content based on a prompt.
   * Automatically selects Ollama or Groq based on project configuration.
   * Includes error handling and retry logic.
   */
  protected async callAIService(prompt: string, context?: AgentContext, groqApiKey?: string): Promise<string> {
    try {
      const enhancedPrompt = this.enhancePrompt(prompt, context);
      const enhancedContext = {
        ...context,
        agentId: this.id,
        agentName: this.name,
        stage: this.stage
      };

      // Determine which service to use based on project configuration
      if (context?.project) {
        const aiService = await AIServiceFactory.getServiceWithFallback(context.project, groqApiKey);
        const serviceType = AIServiceFactory.isGroqProject(context.project) && groqApiKey ? 'Groq' : 'Ollama';
        
        console.log(`[Agent ${this.name}] Using ${serviceType} service for content generation`);
        
        return await aiService.generateContent(enhancedPrompt, enhancedContext);
      } else {
        // Fallback to Ollama service if no project context
        console.log(`[Agent ${this.name}] No project context, falling back to Ollama service`);
        return await this.ollamaService.generateContent(enhancedPrompt, enhancedContext);
      }
    } catch (error) {
      const serviceType = context?.project && AIServiceFactory.isGroqProject(context.project) && groqApiKey ? 'Groq' : 'Ollama';
      const errorType = serviceType === 'Groq' ? ErrorType.GROQ_ERROR : ErrorType.OLLAMA_ERROR;
      
      const appError = errorHandler.createError(
        `${serviceType} service call failed for agent ${this.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorType,
        ErrorSeverity.HIGH,
        502,
        {
          agentId: this.id,
          agentName: this.name,
          stage: this.stage,
          projectId: context?.projectId,
          taskId: context?.taskId,
          serviceType
        },
        error as Error
      );

      await errorHandler.handleError(appError);
      throw appError;
    }
  }

  /**
   * Calls the Ollama service to generate content based on a prompt.
   * Includes error handling and retry logic.
   * @deprecated Use callAIService instead for automatic service selection
   */
  protected async callOllama(prompt: string, context?: any): Promise<string> {
    try {
      const enhancedPrompt = this.enhancePrompt(prompt, context);
      return await this.ollamaService.generateContent(enhancedPrompt, {
        ...context,
        agentId: this.id,
        agentName: this.name,
        stage: this.stage
      });
    } catch (error) {
      const appError = errorHandler.createError(
        `Ollama service call failed for agent ${this.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorType.OLLAMA_ERROR,
        ErrorSeverity.HIGH,
        502,
        {
          agentId: this.id,
          agentName: this.name,
          stage: this.stage,
          projectId: context?.projectId,
          taskId: context?.taskId
        },
        error as Error
      );

      await errorHandler.handleError(appError);
      throw appError;
    }
  }

  /**
   * Creates an artifact object with the specified properties.
   * Used by agents to generate output artifacts.
   */
  protected createArtifact(
    name: string,
    content: string,
    type: ArtifactType,
    projectId: string
  ): Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name,
      content,
      type,
      projectId
    };
  }

  /**
   * Enhances the base prompt with context information and agent-specific instructions.
   */
  protected enhancePrompt(basePrompt: string, context?: AgentContext): string {
    if (!context) {
      return basePrompt;
    }

    const contextInfo = [
      `Project ID: ${context.projectId}`,
      `Project Name: ${context.project.name}`,
      `Project Idea: ${context.project.idea}`,
      `Current Stage: ${context.stageNumber}`,
      `Previous Artifacts: ${context.previousArtifacts.length} artifacts available`
    ];

    if (context.previousArtifacts.length > 0) {
      contextInfo.push('Previous Artifacts Summary:');
      context.previousArtifacts.forEach((artifact, index) => {
        contextInfo.push(`${index + 1}. ${artifact.name} (${artifact.type})`);
      });
    }

    return `${basePrompt}\n\nContext Information:\n${contextInfo.join('\n')}\n\nPlease provide a comprehensive response based on this context.`;
  }

  /**
   * Handles errors that occur during agent execution.
   * Provides standardized error formatting and logging.
   */
  protected async handleExecutionError(error: unknown, context: AgentContext): Promise<AgentResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const fullError = `Agent ${this.name} failed during execution: ${errorMessage}`;
    
    // Create and handle the error through centralized error handler
    const appError = errorHandler.createError(
      fullError,
      ErrorType.AGENT_ERROR,
      this.determineErrorSeverity(error),
      500,
      {
        agentId: this.id,
        agentName: this.name,
        projectId: context.projectId,
        taskId: context.taskId,
        stage: context.stageNumber,
        stackTrace: error instanceof Error ? error.stack : undefined
      },
      error as Error
    );

    await errorHandler.handleError(appError);

    return {
      success: false,
      artifacts: [],
      error: fullError,
      metadata: {
        agentId: this.id,
        agentName: this.name,
        executionTime: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        severity: appError.severity,
        retryable: appError.retryable
      }
    };
  }

  /**
   * Determines error severity based on error characteristics
   */
  private determineErrorSeverity(error: unknown): ErrorSeverity {
    if (!(error instanceof Error)) return ErrorSeverity.MEDIUM;
    
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (message.includes('ollama') || message.includes('service')) {
      return ErrorSeverity.HIGH;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorSeverity.LOW;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Validates the agent context before execution.
   * Ensures all required context properties are present.
   */
  protected validateContext(context: AgentContext): void {
    if (!context.projectId) {
      throw new Error('Agent context missing required projectId');
    }
    if (!context.project) {
      throw new Error('Agent context missing required project data');
    }
    if (!context.taskId) {
      throw new Error('Agent context missing required taskId');
    }
    if (typeof context.stageNumber !== 'number' || context.stageNumber < 1) {
      throw new Error('Agent context missing valid stageNumber');
    }
    if (!Array.isArray(context.previousArtifacts)) {
      throw new Error('Agent context missing previousArtifacts array');
    }
  }

  /**
   * Creates a successful result with the provided artifacts.
   */
  protected createSuccessResult(
    artifacts: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>[],
    metadata?: Record<string, any>
  ): AgentResult {
    return {
      success: true,
      artifacts,
      metadata: {
        agentId: this.id,
        agentName: this.name,
        executionTime: new Date().toISOString(),
        artifactCount: artifacts.length,
        ...metadata
      }
    };
  }

  /**
   * Extracts relevant artifacts from previous stages that might be useful for this agent.
   */
  protected getRelevantArtifacts(context: AgentContext, types: ArtifactType[]): Artifact[] {
    return context.previousArtifacts.filter(artifact => types.includes(artifact.type));
  }

  /**
   * Formats artifact content for inclusion in prompts.
   */
  protected formatArtifactForPrompt(artifact: Artifact): string {
    return `--- ${artifact.name} (${artifact.type}) ---\n${artifact.content}\n--- End of ${artifact.name} ---`;
  }

  /**
   * Gets a summary of the project context for prompt enhancement.
   */
  protected getProjectSummary(context: AgentContext): string {
    const { project, previousArtifacts } = context;
    
    const summary = [
      `Project: ${project.name}`,
      `Original Idea: ${project.idea}`,
      `Current Stage: ${context.stageNumber}/6`,
      `Status: ${project.status}`,
      `Artifacts Generated: ${previousArtifacts.length}`
    ];

    return summary.join('\n');
  }
}