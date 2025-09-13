import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 3 Agent: Creates frontend development specifications and code structure.
 * This agent analyzes design requirements and creates comprehensive frontend implementation plans.
 */
export class FrontendDevelopmentAgent extends BaseAgent {
  /**
   * Executes the frontend development planning process.
   * Creates frontend code specifications, component architecture, and implementation guidelines.
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

      // Create enhanced prompt for frontend development
      const frontendPrompt = this.createFrontendDevelopmentPrompt(context, projectDescriptions, marketResearch, technicalArchitecture, uiDesign);

      // Generate frontend development content using appropriate AI service
      const frontendContent = await this.callAIService(frontendPrompt, context, context.groqApiKey);

      // Create the frontend development artifact
      const artifact = this.createArtifact(
        'Frontend Development Specifications',
        frontendContent,
        ArtifactType.FRONTEND_CODE,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        developmentType: 'frontend_development',
        previousArtifactsUsed: projectDescriptions.length + marketResearch.length + technicalArchitecture.length + uiDesign.length,
        processingStage: 'development'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for frontend development specifications.
   */
  private createFrontendDevelopmentPrompt(context: AgentContext, projectDescriptions: any[], marketResearch: any[], technicalArchitecture: any[], uiDesign: any[]): string {
    let previousContext = '';
    const allArtifacts = [...projectDescriptions, ...marketResearch, ...technicalArchitecture, ...uiDesign];
    if (allArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        allArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are a senior frontend developer tasked with creating comprehensive frontend development specifications for a digital product.

Your task is to analyze the project requirements and create detailed frontend development plans that include:

1. **Frontend Architecture & Technology Stack**
   - Framework selection (React, Vue, Angular, etc.) with justification
   - State management solution (Redux, Zustand, Pinia, etc.)
   - Build tools and bundler configuration (Vite, Webpack, etc.)
   - CSS framework and styling approach (Tailwind, Styled Components, etc.)
   - Testing framework setup (Jest, Vitest, Cypress, etc.)

2. **Project Structure & Organization**
   - Folder structure and file organization
   - Component hierarchy and architecture patterns
   - Code splitting and lazy loading strategies
   - Asset organization and optimization
   - Environment configuration and build processes

3. **Component Library & Design System Implementation**
   - Reusable component specifications
   - Component props and API design
   - Styling system and theme implementation
   - Responsive design implementation
   - Accessibility features and ARIA compliance

4. **State Management & Data Flow**
   - Application state structure
   - Data fetching and caching strategies
   - Form handling and validation
   - Error boundary implementation
   - Loading states and user feedback

5. **Routing & Navigation**
   - Route structure and navigation patterns
   - Protected routes and authentication flows
   - Deep linking and URL management
   - Breadcrumb and navigation components
   - SEO considerations and meta tag management

6. **Performance Optimization**
   - Code splitting and bundle optimization
   - Image optimization and lazy loading
   - Caching strategies and service workers
   - Performance monitoring and metrics
   - Core Web Vitals optimization

7. **API Integration & Data Management**
   - API client setup and configuration
   - Data transformation and normalization
   - Real-time data handling (WebSockets, SSE)
   - Offline functionality and sync strategies
   - Error handling and retry mechanisms

8. **Security Implementation**
   - Authentication and authorization flows
   - Input sanitization and XSS prevention
   - CSRF protection and secure headers
   - Content Security Policy implementation
   - Secure storage of sensitive data

9. **Testing Strategy**
   - Unit testing for components and utilities
   - Integration testing for user flows
   - End-to-end testing scenarios
   - Visual regression testing
   - Performance and accessibility testing

10. **Development Workflow & Tools**
    - Development server configuration
    - Hot reloading and development experience
    - Linting and code formatting setup
    - Pre-commit hooks and quality gates
    - Documentation and style guide generation

11. **Deployment & CI/CD**
    - Build process and optimization
    - Environment-specific configurations
    - Static asset deployment strategies
    - Progressive deployment and rollback plans
    - Monitoring and error tracking setup

12. **Code Examples & Implementation Patterns**
    - Key component implementations
    - Custom hooks and utility functions
    - API integration examples
    - State management patterns
    - Error handling implementations

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide comprehensive frontend development specifications that include specific technology recommendations, code examples, and implementation guidelines. Focus on creating a scalable, maintainable, and performant frontend architecture.

Format your response with clear sections, code snippets where appropriate, and detailed implementation instructions.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}