import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 5 Agent: Develops customer service frameworks.
 * This agent creates comprehensive customer support systems and service delivery frameworks.
 */
export class CustomerSupportAgent extends BaseAgent {
  /**
   * Executes the customer support framework development process.
   * Creates customer service strategies, support systems, and service delivery frameworks.
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
        ArtifactType.BUSINESS_PLAN
      ]);

      // Create enhanced prompt for customer support framework
      const supportPrompt = this.createCustomerSupportPrompt(context, relevantArtifacts);

      // Generate customer support content using appropriate AI service
      const supportContent = await this.callAIService(supportPrompt, context, context.groqApiKey);

      // Create the customer support framework artifact
      const artifact = this.createArtifact(
        'Customer Support Framework',
        supportContent,
        ArtifactType.SUPPORT_FRAMEWORK,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'customer_support',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'operations'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for customer support framework development.
   */
  private createCustomerSupportPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert customer success and support strategist tasked with designing a comprehensive customer support framework for a new business venture.

Your task is to create a complete customer support system that ensures excellent customer experience and operational efficiency:

1. **Support Strategy & Philosophy**
   - Customer service mission and values
   - Support philosophy and approach
   - Service level agreements (SLAs) and standards
   - Customer experience objectives and KPIs

2. **Support Channel Strategy**
   - Multi-channel support approach (email, chat, phone, social)
   - Channel selection criteria and customer preferences
   - Channel integration and unified experience design
   - Self-service and automated support options

3. **Knowledge Management System**
   - Knowledge base structure and content strategy
   - FAQ development and organization
   - Documentation standards and maintenance processes
   - Search and content discovery optimization

4. **Support Process & Workflows**
   - Ticket management and routing processes
   - Escalation procedures and criteria
   - Issue categorization and prioritization
   - Resolution workflows and handoff procedures

5. **Team Structure & Roles**
   - Support team organizational structure
   - Role definitions and responsibilities
   - Skill requirements and competency frameworks
   - Training and development programs

6. **Technology Stack & Tools**
   - Help desk and ticketing system recommendations
   - CRM integration and customer data management
   - Communication tools and collaboration platforms
   - Analytics and reporting tools selection

7. **Customer Onboarding Support**
   - New customer welcome and setup assistance
   - Product training and education resources
   - Implementation support and guidance
   - Success milestone tracking and celebration

8. **Proactive Support Strategies**
   - Customer health monitoring and early warning systems
   - Proactive outreach and check-in programs
   - Usage analytics and intervention triggers
   - Preventive support and education initiatives

9. **Performance Metrics & KPIs**
   - Customer satisfaction (CSAT) measurement
   - Net Promoter Score (NPS) tracking
   - First response time and resolution metrics
   - Support team productivity and efficiency measures

10. **Continuous Improvement**
    - Customer feedback collection and analysis
    - Support process optimization strategies
    - Team performance review and development
    - Technology upgrade and enhancement planning

11. **Crisis Management & Escalation**
    - Crisis communication protocols
    - Executive escalation procedures
    - Service outage and incident response
    - Customer retention and recovery strategies

12. **Self-Service & Automation**
    - Chatbot and AI-powered support implementation
    - Automated response and routing systems
    - Customer portal and self-service capabilities
    - Community forum and peer support facilitation

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive customer support framework with specific implementation details, process flows, and operational guidelines. Include organizational charts, process diagrams, and actionable setup instructions.

Format your response with clear sections, practical templates, and step-by-step implementation guides.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}