import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 5 Agent: Defines KPIs and analytics implementation.
 * This agent creates comprehensive analytics frameworks and data-driven decision-making systems.
 */
export class AnalyticsAgent extends BaseAgent {
  /**
   * Executes the analytics framework development process.
   * Creates KPI definitions, measurement strategies, and analytics implementation plans.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const relevantArtifacts = this.getRelevantArtifacts(context, [
        ArtifactType.PROJECT_DESCRIPTION,
        ArtifactType.MARKET_RESEARCH,
        ArtifactType.SALES_FUNNEL,
        ArtifactType.SUPPORT_FRAMEWORK,
        ArtifactType.BUSINESS_PLAN
      ]);

      // Create enhanced prompt for analytics framework
      const analyticsPrompt = this.createAnalyticsPrompt(context, relevantArtifacts);

      // Generate analytics content using appropriate AI service
      const analyticsContent = await this.callAIService(analyticsPrompt, context, context.groqApiKey);

      // Create the analytics plan artifact
      const artifact = this.createArtifact(
        'Analytics & KPI Framework',
        analyticsContent,
        ArtifactType.ANALYTICS_PLAN,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'analytics_framework',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'operations'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for analytics framework development.
   */
  private createAnalyticsPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert data analyst and business intelligence strategist tasked with designing a comprehensive analytics framework for a new business venture.

Your task is to create a complete analytics and measurement system that enables data-driven decision making and business optimization:

1. **Analytics Strategy & Objectives**
   - Business intelligence strategy and goals
   - Data-driven decision making framework
   - Analytics maturity roadmap and milestones
   - ROI measurement for analytics investments

2. **Key Performance Indicators (KPIs)**
   - Business-level KPIs and success metrics
   - Department-specific performance indicators
   - Leading and lagging indicator identification
   - KPI hierarchy and relationship mapping

3. **Data Collection Strategy**
   - Data source identification and mapping
   - Data collection methods and tools
   - Data quality standards and validation
   - Privacy and compliance considerations (GDPR, CCPA)

4. **Analytics Infrastructure**
   - Data warehouse and storage architecture
   - ETL processes and data pipeline design
   - Real-time vs. batch processing requirements
   - Cloud vs. on-premise infrastructure decisions

5. **Measurement Frameworks**
   - Customer acquisition and retention metrics
   - Product usage and engagement analytics
   - Financial performance and profitability tracking
   - Operational efficiency and productivity measures

6. **Reporting & Dashboards**
   - Executive dashboard design and KPIs
   - Operational reporting requirements
   - Self-service analytics capabilities
   - Mobile and real-time reporting needs

7. **Customer Analytics**
   - Customer journey and behavior tracking
   - Segmentation and persona analytics
   - Lifetime value and churn prediction
   - Customer satisfaction and NPS measurement

8. **Marketing & Sales Analytics**
   - Campaign performance and attribution modeling
   - Lead generation and conversion tracking
   - Sales funnel and pipeline analytics
   - ROI measurement for marketing channels

9. **Product & Usage Analytics**
   - Feature usage and adoption tracking
   - User engagement and retention metrics
   - Product performance and optimization insights
   - A/B testing and experimentation framework

10. **Financial Analytics**
    - Revenue recognition and forecasting
    - Cost analysis and profitability tracking
    - Budget vs. actual performance monitoring
    - Cash flow and financial health indicators

11. **Technology Stack & Tools**
    - Analytics platform selection (Google Analytics, Mixpanel, etc.)
    - Business intelligence tools (Tableau, Power BI, etc.)
    - Data processing and ETL tools
    - Statistical analysis and machine learning platforms

12. **Data Governance & Quality**
    - Data governance policies and procedures
    - Data quality monitoring and validation
    - Master data management strategies
    - Data security and access controls

13. **Analytics Team & Skills**
    - Analytics team structure and roles
    - Required skills and competencies
    - Training and development programs
    - External vendor and consultant needs

14. **Implementation Roadmap**
    - Phase-by-phase implementation plan
    - Quick wins and early value delivery
    - Resource requirements and timeline
    - Risk mitigation and contingency planning

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive analytics framework with specific KPI definitions, measurement strategies, and implementation guidelines. Include dashboard mockups, data flow diagrams, and actionable setup instructions.

Format your response with clear sections, specific metrics, and detailed implementation roadmaps.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}