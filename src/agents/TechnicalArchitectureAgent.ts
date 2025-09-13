import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 2 Agent: Proposes technical architecture and implementation approach.
 * This agent analyzes technical requirements and designs system architecture.
 */
export class TechnicalArchitectureAgent extends BaseAgent {
  /**
   * Executes the technical architecture analysis process.
   * Analyzes technical requirements and proposes system architecture.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const projectDescriptions = this.getRelevantArtifacts(context, [ArtifactType.PROJECT_DESCRIPTION]);
      const marketResearch = this.getRelevantArtifacts(context, [ArtifactType.MARKET_RESEARCH]);

      // Create enhanced prompt for technical architecture
      const architecturePrompt = this.createTechnicalArchitecturePrompt(context, projectDescriptions, marketResearch);

      // Generate technical architecture content using appropriate AI service
      const architectureContent = await this.callAIService(architecturePrompt, context, context.groqApiKey);

      // Create the technical architecture artifact
      const artifact = this.createArtifact(
        'Technical Architecture Proposal',
        architectureContent,
        ArtifactType.TECHNICAL_ARCHITECTURE,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'technical_architecture',
        previousArtifactsUsed: projectDescriptions.length + marketResearch.length,
        processingStage: 'validation_strategy'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for technical architecture analysis.
   */
  private createTechnicalArchitecturePrompt(context: AgentContext, projectDescriptions: any[], marketResearch: any[]): string {
    let previousContext = '';
    const allArtifacts = [...projectDescriptions, ...marketResearch];
    if (allArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        allArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are a senior technical architect tasked with designing a comprehensive technical architecture for a business venture.

Your task is to analyze the business requirements and create a detailed technical architecture proposal that includes:

1. **System Architecture Overview**
   - High-level system architecture diagram (describe in text)
   - Core components and their relationships
   - Data flow and system interactions
   - Scalability and performance considerations

2. **Technology Stack Recommendations**
   - Frontend technologies and frameworks
   - Backend technologies and frameworks
   - Database solutions and data storage
   - Third-party services and APIs
   - Development tools and infrastructure

3. **Technical Requirements Analysis**
   - Functional requirements breakdown
   - Non-functional requirements (performance, security, scalability)
   - Integration requirements
   - Compliance and regulatory considerations

4. **Data Architecture**
   - Data models and relationships
   - Data storage strategy
   - Data security and privacy measures
   - Backup and disaster recovery plans

5. **Security Architecture**
   - Authentication and authorization strategy
   - Data encryption and protection
   - API security measures
   - Vulnerability assessment considerations

6. **Deployment & Infrastructure**
   - Cloud platform recommendations
   - Containerization strategy
   - CI/CD pipeline design
   - Monitoring and logging architecture

7. **Development Approach**
   - Development methodology recommendations
   - Team structure and skill requirements
   - Development timeline estimates
   - Risk mitigation strategies

8. **Scalability & Performance**
   - Performance optimization strategies
   - Horizontal and vertical scaling plans
   - Caching strategies
   - Load balancing considerations

9. **Integration Strategy**
   - External system integrations
   - API design principles
   - Microservices vs monolithic considerations
   - Event-driven architecture patterns

10. **Technical Roadmap**
    - MVP technical requirements
    - Phase-based development approach
    - Technology evolution strategy
    - Maintenance and support considerations

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive, technically sound architecture proposal that balances current needs with future scalability. Include specific technology recommendations with justifications, architectural patterns, and implementation considerations.

Format your response with clear sections, technical diagrams described in text, and actionable recommendations.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}