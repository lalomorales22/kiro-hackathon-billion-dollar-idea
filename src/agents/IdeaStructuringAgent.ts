import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 1 Agent: Converts raw business ideas into structured project descriptions.
 * This agent takes unstructured input and creates a formal project description artifact.
 */
export class IdeaStructuringAgent extends BaseAgent {
  /**
   * Executes the idea structuring process.
   * Takes the raw project idea and converts it into a structured description.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Create enhanced prompt for idea structuring
      const structuringPrompt = this.createStructuringPrompt(context);

      // Generate structured content using appropriate AI service
      const structuredContent = await this.callAIService(structuringPrompt, context, context.groqApiKey);

      // Create the project description artifact
      const artifact = this.createArtifact(
        'Structured Project Description',
        structuredContent,
        ArtifactType.PROJECT_DESCRIPTION,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        originalIdeaLength: context.project.idea.length,
        structuredContentLength: structuredContent.length,
        processingStage: 'idea_structuring'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for idea structuring.
   */
  private createStructuringPrompt(context: AgentContext): string {
    const basePrompt = `
You are an expert business analyst tasked with converting a raw business idea into a structured project description.

Your task is to analyze the following business idea and create a comprehensive, structured project description that includes:

1. **Executive Summary**: A clear, concise overview of the business concept
2. **Problem Statement**: What problem does this business solve?
3. **Solution Overview**: How does the proposed solution address the problem?
4. **Target Market**: Who are the intended customers/users?
5. **Value Proposition**: What unique value does this business provide?
6. **Key Features**: What are the main features or services offered?
7. **Business Model**: How will this business generate revenue?
8. **Success Metrics**: How will success be measured?

Original Business Idea: "${context.project.idea}"

Please provide a well-structured, professional project description that expands on the original idea while maintaining its core essence. The output should be detailed enough to guide further development stages but concise enough to be easily understood.

Format your response in clear sections with headers and bullet points where appropriate.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}