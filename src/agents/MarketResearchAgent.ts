import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 2 Agent: Conducts market viability analysis for business ideas.
 * This agent analyzes market conditions, competition, and viability factors.
 */
export class MarketResearchAgent extends BaseAgent {
  /**
   * Executes the market research analysis process.
   * Analyzes market viability, competition, and provides strategic insights.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const projectDescriptions = this.getRelevantArtifacts(context, [ArtifactType.PROJECT_DESCRIPTION]);

      // Create enhanced prompt for market research
      const researchPrompt = this.createMarketResearchPrompt(context, projectDescriptions);

      // Generate market research content using appropriate AI service
      const marketResearchContent = await this.callAIService(researchPrompt, context, context.groqApiKey);

      // Create the market research artifact
      const artifact = this.createArtifact(
        'Market Research Analysis',
        marketResearchContent,
        ArtifactType.MARKET_RESEARCH,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'market_research',
        previousArtifactsUsed: projectDescriptions.length,
        processingStage: 'validation_strategy'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for market research analysis.
   */
  private createMarketResearchPrompt(context: AgentContext, projectDescriptions: any[]): string {
    let previousContext = '';
    if (projectDescriptions.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        projectDescriptions.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert market research analyst tasked with conducting a comprehensive market viability analysis for a business venture.

Your task is to analyze the business concept and provide a detailed market research report that includes:

1. **Market Size & Opportunity**
   - Total Addressable Market (TAM)
   - Serviceable Addressable Market (SAM)
   - Serviceable Obtainable Market (SOM)
   - Market growth trends and projections

2. **Target Market Analysis**
   - Primary target demographics
   - Customer personas and segments
   - Customer pain points and needs
   - Buying behavior and decision factors

3. **Competitive Landscape**
   - Direct competitors analysis
   - Indirect competitors and alternatives
   - Competitive advantages and differentiators
   - Market positioning opportunities

4. **Market Validation**
   - Evidence of market demand
   - Potential barriers to entry
   - Regulatory considerations
   - Market timing assessment

5. **Revenue Potential**
   - Pricing strategy recommendations
   - Revenue model viability
   - Customer acquisition cost estimates
   - Lifetime value projections

6. **Risk Assessment**
   - Market risks and challenges
   - Competitive threats
   - Economic factors impact
   - Mitigation strategies

7. **Strategic Recommendations**
   - Go-to-market strategy insights
   - Market entry recommendations
   - Success metrics and KPIs
   - Next steps for validation

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive, data-driven market research analysis that will inform strategic decision-making. Use specific examples, industry benchmarks, and actionable insights where possible.

Format your response with clear sections, bullet points, and specific recommendations.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}