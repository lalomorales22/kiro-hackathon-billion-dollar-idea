import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 5 Agent: Creates financial projections and management plans.
 * This agent develops comprehensive financial planning, budgeting, and management frameworks.
 */
export class FinancialManagementAgent extends BaseAgent {
  /**
   * Executes the financial management framework development process.
   * Creates financial projections, budgeting strategies, and financial management systems.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const relevantArtifacts = this.getRelevantArtifacts(context, [
        ArtifactType.PROJECT_DESCRIPTION,
        ArtifactType.MARKET_RESEARCH,
        ArtifactType.BUSINESS_PLAN,
        ArtifactType.SALES_FUNNEL,
        ArtifactType.ANALYTICS_PLAN
      ]);

      // Create enhanced prompt for financial management framework
      const financialPrompt = this.createFinancialManagementPrompt(context, relevantArtifacts);

      // Generate financial management content using appropriate AI service
      const financialContent = await this.callAIService(financialPrompt, context, context.groqApiKey);

      // Create the financial plan artifact
      const artifact = this.createArtifact(
        'Financial Management Plan',
        financialContent,
        ArtifactType.FINANCIAL_PLAN,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'financial_management',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'operations'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for financial management framework development.
   */
  private createFinancialManagementPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert financial strategist and CFO consultant tasked with creating a comprehensive financial management framework for a new business venture.

Your task is to develop a complete financial planning and management system that ensures financial health, growth, and sustainability:

1. **Financial Strategy & Objectives**
   - Financial goals and success metrics
   - Growth strategy and funding requirements
   - Profitability targets and timelines
   - Risk tolerance and financial policies

2. **Financial Projections & Modeling**
   - 3-year financial projections (P&L, Balance Sheet, Cash Flow)
   - Revenue forecasting models and assumptions
   - Cost structure analysis and optimization
   - Break-even analysis and unit economics

3. **Budgeting & Planning Framework**
   - Annual budgeting process and methodology
   - Departmental budget allocation and controls
   - Capital expenditure planning and approval
   - Variance analysis and budget monitoring

4. **Cash Flow Management**
   - Cash flow forecasting and monitoring
   - Working capital management strategies
   - Accounts receivable and payable optimization
   - Cash reserve and liquidity management

5. **Funding & Capital Structure**
   - Funding requirements and timeline
   - Capital structure optimization
   - Investor relations and fundraising strategy
   - Debt vs. equity financing decisions

6. **Financial Controls & Governance**
   - Internal controls and approval processes
   - Segregation of duties and authorization limits
   - Financial reporting and compliance requirements
   - Audit and risk management procedures

7. **Pricing Strategy & Revenue Management**
   - Pricing models and optimization strategies
   - Revenue recognition policies and procedures
   - Subscription and recurring revenue management
   - Discount and promotion impact analysis

8. **Cost Management & Optimization**
   - Cost center identification and management
   - Variable vs. fixed cost analysis
   - Cost reduction and efficiency initiatives
   - Vendor management and procurement strategies

9. **Financial Reporting & Analytics**
   - Management reporting requirements and KPIs
   - Financial dashboard design and metrics
   - Investor and stakeholder reporting
   - Regulatory and compliance reporting

10. **Tax Planning & Compliance**
    - Tax strategy and optimization opportunities
    - Compliance requirements and deadlines
    - International tax considerations (if applicable)
    - Tax-efficient business structure recommendations

11. **Financial Systems & Technology**
    - Accounting software and ERP system selection
    - Financial planning and analysis tools
    - Payment processing and billing systems
    - Integration requirements and data flows

12. **Risk Management & Insurance**
    - Financial risk identification and mitigation
    - Insurance coverage requirements and optimization
    - Credit risk and customer payment policies
    - Foreign exchange and interest rate risk management

13. **Performance Measurement**
    - Financial KPIs and performance metrics
    - Profitability analysis by product/service/customer
    - Return on investment (ROI) measurement
    - Benchmarking against industry standards

14. **Financial Team & Organization**
    - Finance team structure and roles
    - Required skills and competencies
    - External advisor and service provider needs
    - Training and development requirements

15. **Scenario Planning & Stress Testing**
    - Best case, worst case, and most likely scenarios
    - Sensitivity analysis for key variables
    - Stress testing and contingency planning
    - Crisis management and financial recovery plans

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive financial management framework with specific projections, budgeting templates, and implementation guidelines. Include financial models, process flows, and actionable financial strategies.

Format your response with clear sections, numerical examples, and detailed implementation roadmaps.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}