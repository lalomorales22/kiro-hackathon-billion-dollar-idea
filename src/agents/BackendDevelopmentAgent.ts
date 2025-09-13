import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 3 Agent: Creates backend development specifications and API architecture.
 * This agent analyzes system requirements and creates comprehensive backend implementation plans.
 */
export class BackendDevelopmentAgent extends BaseAgent {
  /**
   * Executes the backend development planning process.
   * Creates backend code specifications, API architecture, and implementation guidelines.
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

      // Create enhanced prompt for backend development
      const backendPrompt = this.createBackendDevelopmentPrompt(context, projectDescriptions, marketResearch, technicalArchitecture, uiDesign, frontendCode);

      // Generate backend development content using appropriate AI service
      const backendContent = await this.callAIService(backendPrompt, context, context.groqApiKey);

      // Create the backend development artifact
      const artifact = this.createArtifact(
        'Backend Development Specifications',
        backendContent,
        ArtifactType.BACKEND_CODE,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        developmentType: 'backend_development',
        previousArtifactsUsed: projectDescriptions.length + marketResearch.length + technicalArchitecture.length + uiDesign.length + frontendCode.length,
        processingStage: 'development'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for backend development specifications.
   */
  private createBackendDevelopmentPrompt(context: AgentContext, projectDescriptions: any[], marketResearch: any[], technicalArchitecture: any[], uiDesign: any[], frontendCode: any[]): string {
    let previousContext = '';
    const allArtifacts = [...projectDescriptions, ...marketResearch, ...technicalArchitecture, ...uiDesign, ...frontendCode];
    if (allArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        allArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are a senior backend developer tasked with creating comprehensive backend development specifications for a digital product.

Your task is to analyze the project requirements and create detailed backend development plans that include:

1. **Backend Architecture & Technology Stack**
   - Server framework selection (Express.js, FastAPI, Spring Boot, etc.) with justification
   - Programming language and runtime environment
   - Database selection and ORM/ODM choice
   - Caching layer and session management
   - Message queue and background job processing

2. **API Design & Documentation**
   - RESTful API endpoint specifications
   - GraphQL schema design (if applicable)
   - API versioning strategy
   - Request/response data models
   - OpenAPI/Swagger documentation structure

3. **Database Architecture & Data Models**
   - Database schema design and relationships
   - Data migration and seeding strategies
   - Indexing and query optimization
   - Data validation and constraints
   - Backup and disaster recovery plans

4. **Authentication & Authorization**
   - User authentication flow (JWT, OAuth, etc.)
   - Role-based access control (RBAC) implementation
   - API key management and rate limiting
   - Session management and security
   - Multi-factor authentication setup

5. **Security Implementation**
   - Input validation and sanitization
   - SQL injection and NoSQL injection prevention
   - Cross-site scripting (XSS) protection
   - CORS configuration and security headers
   - Encryption for sensitive data

6. **Business Logic & Services**
   - Service layer architecture and patterns
   - Domain-driven design implementation
   - Business rule validation and processing
   - Event-driven architecture patterns
   - Microservices communication (if applicable)

7. **Data Processing & Integration**
   - External API integrations and webhooks
   - File upload and processing systems
   - Data transformation and ETL processes
   - Real-time data processing and streaming
   - Third-party service integrations

8. **Performance & Scalability**
   - Caching strategies (Redis, Memcached)
   - Database connection pooling
   - Load balancing and horizontal scaling
   - Background job processing and queues
   - Performance monitoring and optimization

9. **Error Handling & Logging**
   - Centralized error handling middleware
   - Structured logging and monitoring
   - Error tracking and alerting systems
   - Health checks and system monitoring
   - Debugging and troubleshooting tools

10. **Testing Strategy**
    - Unit testing for business logic
    - Integration testing for APIs and databases
    - End-to-end testing scenarios
    - Load testing and performance benchmarks
    - Security testing and vulnerability scanning

11. **DevOps & Deployment**
    - Containerization with Docker
    - CI/CD pipeline configuration
    - Environment management and configuration
    - Database migration and deployment strategies
    - Monitoring and alerting setup

12. **Code Structure & Patterns**
    - Project folder structure and organization
    - Design patterns and architectural principles
    - Dependency injection and inversion of control
    - Code quality and style guidelines
    - Documentation and API reference generation

13. **Scalability & Maintenance**
    - Horizontal and vertical scaling strategies
    - Database sharding and replication
    - Microservices decomposition plans
    - Legacy system integration approaches
    - Technical debt management

14. **Code Examples & Implementation**
    - Core API endpoint implementations
    - Database model definitions
    - Authentication middleware examples
    - Business logic service examples
    - Error handling and validation patterns

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide comprehensive backend development specifications that include specific technology recommendations, code examples, and implementation guidelines. Focus on creating a secure, scalable, and maintainable backend architecture.

Format your response with clear sections, code snippets where appropriate, and detailed implementation instructions.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}