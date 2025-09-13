import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 6 Agent: Identifies improvement opportunities and optimization strategies.
 * This agent creates comprehensive optimization frameworks and continuous improvement strategies.
 */
export class OptimizationAgent extends BaseAgent {
  /**
   * Executes the optimization framework development process.
   * Creates improvement strategies, optimization plans, and continuous enhancement frameworks.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from all previous stages
      const relevantArtifacts = this.getRelevantArtifacts(context, [
        ArtifactType.PROJECT_DESCRIPTION,
        ArtifactType.MARKET_RESEARCH,
        ArtifactType.TECHNICAL_ARCHITECTURE,
        ArtifactType.BUSINESS_PLAN,
        ArtifactType.MARKETING_CONTENT,
        ArtifactType.SALES_FUNNEL,
        ArtifactType.SUPPORT_FRAMEWORK,
        ArtifactType.ANALYTICS_PLAN,
        ArtifactType.FINANCIAL_PLAN,
        ArtifactType.MONITORING_PLAN
      ]);

      // Create enhanced prompt for optimization framework
      const optimizationPrompt = this.createOptimizationPrompt(context, relevantArtifacts);

      // Generate optimization content using appropriate AI service
      const optimizationContent = await this.callAIService(optimizationPrompt, context, context.groqApiKey);

      // Create the optimization plan artifact
      const artifact = this.createArtifact(
        'Optimization & Improvement Plan',
        optimizationContent,
        ArtifactType.OPTIMIZATION_PLAN,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'optimization_framework',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'self_improvement'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for optimization framework development.
   */
  private createOptimizationPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert business optimization and continuous improvement strategist tasked with creating a comprehensive optimization framework for a business venture.

Your task is to analyze all aspects of the business and create a systematic approach to continuous improvement, optimization, and growth acceleration:

1. **Optimization Strategy & Philosophy**
   - Continuous improvement culture and mindset
   - Optimization priorities and focus areas
   - Innovation framework and experimentation approach
   - Change management and adoption strategies

2. **Business Process Optimization**
   - Process mapping and efficiency analysis
   - Workflow automation opportunities
   - Bottleneck identification and resolution
   - Standard operating procedure optimization

3. **Technology & System Optimization**
   - System performance optimization strategies
   - Technology stack evaluation and upgrades
   - Integration optimization and API efficiency
   - Database and infrastructure optimization

4. **Customer Experience Optimization**
   - Customer journey optimization opportunities
   - User experience (UX) improvement strategies
   - Customer satisfaction enhancement initiatives
   - Personalization and customization optimization

5. **Marketing & Sales Optimization**
   - Conversion rate optimization (CRO) strategies
   - Marketing channel performance optimization
   - Sales process efficiency improvements
   - Customer acquisition cost (CAC) optimization

6. **Product & Service Optimization**
   - Feature usage analysis and optimization
   - Product-market fit enhancement strategies
   - Service delivery optimization
   - Innovation pipeline and development optimization

7. **Financial Performance Optimization**
   - Revenue optimization strategies
   - Cost reduction and efficiency initiatives
   - Pricing optimization and value capture
   - Profitability improvement opportunities

8. **Operational Efficiency Optimization**
   - Resource allocation and utilization optimization
   - Supply chain and vendor optimization
   - Quality improvement and defect reduction
   - Productivity enhancement strategies

9. **Data-Driven Optimization Framework**
   - A/B testing and experimentation methodology
   - Data analysis and insight generation
   - Predictive analytics and forecasting
   - Machine learning and AI optimization opportunities

10. **Team & Organizational Optimization**
    - Team structure and role optimization
    - Skill development and training optimization
    - Communication and collaboration improvement
    - Performance management and motivation strategies

11. **Competitive Advantage Optimization**
    - Differentiation strategy enhancement
    - Competitive positioning optimization
    - Market share growth strategies
    - Innovation and R&D optimization

12. **Scalability & Growth Optimization**
    - Scalability bottleneck identification
    - Growth strategy optimization
    - Market expansion opportunities
    - Partnership and alliance optimization

13. **Risk Management Optimization**
    - Risk assessment and mitigation optimization
    - Compliance and regulatory optimization
    - Security and data protection enhancement
    - Business continuity and resilience improvement

14. **Sustainability & ESG Optimization**
    - Environmental impact reduction strategies
    - Social responsibility optimization
    - Governance and ethics enhancement
    - Sustainable business practice implementation

15. **Innovation & Future-Proofing**
    - Emerging technology adoption strategies
    - Market trend anticipation and preparation
    - Disruptive innovation opportunities
    - Future business model evolution planning

16. **Optimization Implementation Framework**
    - Optimization roadmap and prioritization
    - Implementation methodology and best practices
    - Success measurement and KPI tracking
    - Continuous feedback and iteration cycles

17. **Change Management & Adoption**
    - Change management strategy and communication
    - Stakeholder engagement and buy-in
    - Training and support for optimization initiatives
    - Culture transformation and mindset shifts

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive optimization framework that synthesizes insights from all previous stages and creates a systematic approach to continuous improvement. Include specific optimization opportunities, implementation strategies, and measurement frameworks.

Format your response with clear sections, actionable recommendations, and detailed implementation roadmaps.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}