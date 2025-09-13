import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 4 Agent: Outlines legal and business structure requirements.
 * This agent creates comprehensive business formation guidance and legal frameworks.
 */
export class BusinessFormationAgent extends BaseAgent {
  /**
   * Executes the business formation analysis process.
   * Creates legal structure recommendations and business formation guidance.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const relevantArtifacts = this.getRelevantArtifacts(context, [
        ArtifactType.PROJECT_DESCRIPTION,
        ArtifactType.MARKET_RESEARCH,
        ArtifactType.TECHNICAL_ARCHITECTURE
      ]);

      // Create enhanced prompt for business formation
      const formationPrompt = this.createBusinessFormationPrompt(context, relevantArtifacts);

      // Generate business formation content using appropriate AI service
      const businessPlanContent = await this.callAIService(formationPrompt, context, context.groqApiKey);

      // Create the business plan artifact
      const artifact = this.createArtifact(
        'Business Formation Plan',
        businessPlanContent,
        ArtifactType.BUSINESS_PLAN,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'business_formation',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'go_to_market'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for business formation analysis.
   */
  private createBusinessFormationPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert business formation consultant and legal advisor tasked with creating a comprehensive business formation plan for a new venture.

Your task is to analyze the business concept and provide detailed guidance on legal structure, compliance, and business formation requirements:

1. **Business Structure Recommendations**
   - Recommended legal entity type (LLC, Corporation, Partnership, etc.)
   - Justification for structure choice based on business model
   - State/jurisdiction recommendations for incorporation
   - Tax implications and considerations

2. **Legal Requirements & Compliance**
   - Required business licenses and permits
   - Industry-specific regulatory requirements
   - Intellectual property protection strategy
   - Employment law considerations

3. **Corporate Governance**
   - Board structure recommendations
   - Shareholder agreements and equity distribution
   - Operating agreements or bylaws framework
   - Decision-making processes and voting rights

4. **Financial Structure**
   - Initial capitalization requirements
   - Funding structure recommendations
   - Banking and financial account setup
   - Accounting and bookkeeping requirements

5. **Risk Management & Insurance**
   - Required insurance coverage types
   - Liability protection strategies
   - Professional indemnity considerations
   - Business continuity planning

6. **Contracts & Agreements**
   - Essential contract templates needed
   - Vendor and supplier agreement frameworks
   - Customer terms of service/privacy policies
   - Employment and contractor agreements

7. **Compliance Calendar**
   - Annual filing requirements
   - Tax deadlines and obligations
   - Regulatory reporting schedules
   - License renewal timelines

8. **Formation Timeline & Checklist**
   - Step-by-step formation process
   - Estimated timeframes for each step
   - Required documentation and forms
   - Professional services needed (lawyers, accountants)

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive, actionable business formation plan that addresses all legal and structural requirements. Include specific recommendations, timelines, and cost estimates where possible.

Format your response with clear sections, actionable checklists, and specific next steps.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}