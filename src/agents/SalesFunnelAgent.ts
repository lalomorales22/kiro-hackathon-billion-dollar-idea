import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 4 Agent: Designs customer acquisition and conversion funnels.
 * This agent creates comprehensive sales funnel strategies and conversion optimization plans.
 */
export class SalesFunnelAgent extends BaseAgent {
  /**
   * Executes the sales funnel design process.
   * Creates customer acquisition strategies and conversion optimization frameworks.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const relevantArtifacts = this.getRelevantArtifacts(context, [
        ArtifactType.PROJECT_DESCRIPTION,
        ArtifactType.MARKET_RESEARCH,
        ArtifactType.MARKETING_CONTENT,
        ArtifactType.BUSINESS_PLAN
      ]);

      // Create enhanced prompt for sales funnel design
      const salesFunnelPrompt = this.createSalesFunnelPrompt(context, relevantArtifacts);

      // Generate sales funnel content using appropriate AI service
      const salesFunnelContent = await this.callAIService(salesFunnelPrompt, context, context.groqApiKey);

      // Create the sales funnel artifact
      const artifact = this.createArtifact(
        'Sales Funnel Strategy',
        salesFunnelContent,
        ArtifactType.SALES_FUNNEL,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'sales_funnel',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'go_to_market'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for sales funnel design.
   */
  private createSalesFunnelPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert sales funnel strategist and conversion optimization specialist tasked with designing a comprehensive customer acquisition and conversion system.

Your task is to create a complete sales funnel strategy that maximizes customer acquisition, conversion, and lifetime value:

1. **Funnel Architecture & Strategy**
   - Complete sales funnel mapping (awareness to advocacy)
   - Customer journey stages and touchpoints
   - Conversion goals and metrics for each stage
   - Funnel optimization opportunities

2. **Lead Generation Strategy**
   - Lead magnet concepts and content offers
   - Traffic generation strategies (organic and paid)
   - Lead capture mechanisms and forms
   - Landing page optimization strategies

3. **Lead Nurturing & Qualification**
   - Lead scoring and qualification criteria
   - Email nurturing sequences and automation
   - Content progression and education paths
   - Sales-ready lead identification process

4. **Conversion Optimization**
   - Sales page design and copywriting strategies
   - Pricing strategy and offer optimization
   - Objection handling and FAQ frameworks
   - Trust signals and social proof integration

5. **Sales Process & Methodology**
   - Sales methodology and approach
   - Sales script templates and talk tracks
   - Demo and presentation frameworks
   - Proposal and closing strategies

6. **Customer Onboarding**
   - New customer welcome sequences
   - Product adoption and success frameworks
   - Training and support integration
   - Early value delivery strategies

7. **Retention & Upselling**
   - Customer success and retention strategies
   - Upselling and cross-selling opportunities
   - Loyalty program and referral systems
   - Customer lifecycle management

8. **Technology Stack & Tools**
   - CRM system recommendations and setup
   - Marketing automation tool selection
   - Analytics and tracking implementation
   - Integration requirements and workflows

9. **Performance Metrics & KPIs**
   - Funnel conversion rate benchmarks
   - Customer acquisition cost (CAC) targets
   - Lifetime value (LTV) projections
   - ROI and performance measurement frameworks

10. **Testing & Optimization**
    - A/B testing strategies for each funnel stage
    - Conversion rate optimization tactics
    - Performance monitoring and reporting
    - Continuous improvement processes

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive sales funnel strategy with specific implementation details, conversion tactics, and measurable optimization approaches. Include funnel diagrams, process flows, and actionable implementation steps.

Format your response with clear sections, visual descriptions, and step-by-step implementation guides.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}