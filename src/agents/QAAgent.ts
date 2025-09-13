import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 3 Agent: Creates quality assurance and testing specifications.
 * This agent analyzes project requirements and creates comprehensive QA and testing plans.
 */
export class QAAgent extends BaseAgent {
  /**
   * Executes the QA and testing planning process.
   * Creates testing strategies, QA plans, and quality assurance guidelines.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const projectDescriptions = this.getRelevantArtifacts(context, [ArtifactType.PROJECT_DESCRIPTION]);
      const marketResearch = this.getRelevantArtifacts(context, [ArtifactType.MARKET_RESEARCH]);
      const technicalArchitecture = this.getRelevantArtifacts(context, [ArtifactType.TECHNICAL_ARCHITECTURE]);
      const uiDesign = this.getRelevantArtifacts(context, [ArtifactType.UI_DESIGN]);
      const frontendCode = this.getRelevantArtifacts(context, [ArtifactType.FRONTEND_CODE]);
      const backendCode = this.getRelevantArtifacts(context, [ArtifactType.BACKEND_CODE]);
      const databaseSchema = this.getRelevantArtifacts(context, [ArtifactType.DATABASE_SCHEMA]);

      // Create enhanced prompt for QA planning
      const qaPrompt = this.createQAPrompt(context, projectDescriptions, marketResearch, technicalArchitecture, uiDesign, frontendCode, backendCode, databaseSchema);

      // Generate QA content using appropriate AI service
      const qaContent = await this.callAIService(qaPrompt, context, context.groqApiKey);

      // Create the QA plan artifact
      const artifact = this.createArtifact(
        'Quality Assurance and Testing Plan',
        qaContent,
        ArtifactType.QA_PLAN,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        planType: 'qa_testing_plan',
        previousArtifactsUsed: projectDescriptions.length + marketResearch.length + technicalArchitecture.length + uiDesign.length + frontendCode.length + backendCode.length + databaseSchema.length,
        processingStage: 'development'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for QA and testing plan specifications.
   */
  private createQAPrompt(context: AgentContext, projectDescriptions: any[], marketResearch: any[], technicalArchitecture: any[], uiDesign: any[], frontendCode: any[], backendCode: any[], databaseSchema: any[]): string {
    let previousContext = '';
    const allArtifacts = [...projectDescriptions, ...marketResearch, ...technicalArchitecture, ...uiDesign, ...frontendCode, ...backendCode, ...databaseSchema];
    if (allArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        allArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are a senior QA engineer and testing specialist tasked with creating comprehensive quality assurance and testing specifications for a digital product.

Your task is to analyze the project requirements and create detailed QA and testing plans that include:

1. **Testing Strategy & Framework**
   - Overall testing approach and methodology
   - Test pyramid strategy (unit, integration, e2e)
   - Testing framework and tool recommendations
   - Test environment setup and management
   - Continuous testing and CI/CD integration

2. **Test Planning & Documentation**
   - Test plan structure and documentation standards
   - Test case design and management approach
   - Traceability matrix linking requirements to tests
   - Test data management and generation strategies
   - Risk-based testing prioritization

3. **Unit Testing Specifications**
   - Unit test coverage requirements and targets
   - Testing framework setup (Jest, Vitest, pytest, etc.)
   - Mock and stub strategies for dependencies
   - Test-driven development (TDD) guidelines
   - Code coverage analysis and reporting

4. **Integration Testing Strategy**
   - API testing and contract testing approach
   - Database integration testing procedures
   - Third-party service integration testing
   - Microservices integration testing (if applicable)
   - Data flow and system integration validation

5. **End-to-End Testing Framework**
   - E2E testing tool selection (Cypress, Playwright, Selenium)
   - User journey and workflow testing scenarios
   - Cross-browser and cross-platform testing
   - Mobile and responsive design testing
   - Performance testing during E2E scenarios

6. **User Interface Testing**
   - UI component testing strategies
   - Visual regression testing setup
   - Accessibility testing and WCAG compliance
   - Usability testing procedures and metrics
   - Cross-browser compatibility testing matrix

7. **API & Backend Testing**
   - REST API testing specifications and tools
   - GraphQL testing strategies (if applicable)
   - Database testing and data integrity validation
   - Security testing for APIs and authentication
   - Load testing and performance benchmarking

8. **Security Testing Framework**
   - Security testing methodology and tools
   - Vulnerability scanning and penetration testing
   - Authentication and authorization testing
   - Input validation and injection attack testing
   - Data privacy and compliance testing

9. **Performance Testing Strategy**
   - Load testing scenarios and user simulation
   - Stress testing and capacity planning
   - Performance monitoring and profiling
   - Database performance and query optimization testing
   - Frontend performance and Core Web Vitals testing

10. **Mobile & Cross-Platform Testing**
    - Mobile app testing strategies (if applicable)
    - Responsive design testing across devices
    - Progressive Web App (PWA) testing
    - Cross-platform compatibility validation
    - Touch interface and gesture testing

11. **Automated Testing Implementation**
    - Test automation framework architecture
    - Continuous integration testing pipelines
    - Automated test execution and reporting
    - Test result analysis and failure investigation
    - Maintenance and updates of automated tests

12. **Manual Testing Procedures**
    - Exploratory testing guidelines and techniques
    - User acceptance testing (UAT) procedures
    - Bug reporting and tracking processes
    - Test execution and documentation standards
    - Regression testing and release validation

13. **Quality Metrics & Reporting**
    - Quality metrics and KPIs definition
    - Test coverage reporting and analysis
    - Defect tracking and trend analysis
    - Quality gates and release criteria
    - Testing dashboard and stakeholder reporting

14. **Test Environment Management**
    - Test environment setup and configuration
    - Test data provisioning and management
    - Environment isolation and cleanup procedures
    - Production-like testing environment setup
    - Environment monitoring and maintenance

15. **Risk Management & Mitigation**
    - Risk assessment and testing prioritization
    - Critical path and high-risk area identification
    - Contingency planning for testing delays
    - Quality assurance process improvement
    - Post-release monitoring and feedback loops

16. **Implementation Examples & Templates**
    - Sample test cases and test scripts
    - Test automation code examples
    - Test data setup and teardown scripts
    - Bug report templates and procedures
    - Quality checklist and review templates

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide comprehensive QA and testing specifications that include specific tool recommendations, test case examples, and implementation guidelines. Focus on creating a robust, scalable, and maintainable testing strategy that ensures high product quality.

Format your response with clear sections, test examples where appropriate, and detailed implementation instructions.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}