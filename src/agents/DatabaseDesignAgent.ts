import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 3 Agent: Creates database design specifications and schema architecture.
 * This agent analyzes data requirements and creates comprehensive database implementation plans.
 */
export class DatabaseDesignAgent extends BaseAgent {
  /**
   * Executes the database design process.
   * Creates database schema specifications, data models, and implementation guidelines.
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

      // Create enhanced prompt for database design
      const databasePrompt = this.createDatabaseDesignPrompt(context, projectDescriptions, marketResearch, technicalArchitecture, uiDesign, frontendCode, backendCode);

      // Generate database design content using appropriate AI service
      const databaseContent = await this.callAIService(databasePrompt, context, context.groqApiKey);

      // Create the database design artifact
      const artifact = this.createArtifact(
        'Database Design Specifications',
        databaseContent,
        ArtifactType.DATABASE_SCHEMA,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        designType: 'database_design',
        previousArtifactsUsed: projectDescriptions.length + marketResearch.length + technicalArchitecture.length + uiDesign.length + frontendCode.length + backendCode.length,
        processingStage: 'development'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for database design specifications.
   */
  private createDatabaseDesignPrompt(context: AgentContext, projectDescriptions: any[], marketResearch: any[], technicalArchitecture: any[], uiDesign: any[], frontendCode: any[], backendCode: any[]): string {
    let previousContext = '';
    const allArtifacts = [...projectDescriptions, ...marketResearch, ...technicalArchitecture, ...uiDesign, ...frontendCode, ...backendCode];
    if (allArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        allArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are a senior database architect tasked with creating comprehensive database design specifications for a digital product.

Your task is to analyze the project requirements and create detailed database design plans that include:

1. **Database Architecture & Technology Selection**
   - Database type selection (SQL vs NoSQL) with justification
   - Specific database engine recommendation (PostgreSQL, MySQL, MongoDB, etc.)
   - Database hosting and deployment strategy
   - Backup and disaster recovery architecture
   - High availability and replication setup

2. **Data Modeling & Schema Design**
   - Entity-relationship diagrams (ERD) described in detail
   - Table/collection structures with field specifications
   - Primary keys, foreign keys, and relationship definitions
   - Data types, constraints, and validation rules
   - Normalization strategy and denormalization considerations

3. **Core Data Entities**
   - User management and authentication data
   - Business domain entities and relationships
   - Audit trails and logging data structures
   - Configuration and settings data
   - File and media storage references

4. **Indexing & Performance Optimization**
   - Index strategy for query optimization
   - Composite indexes and covering indexes
   - Full-text search implementation
   - Query performance analysis and optimization
   - Database statistics and monitoring

5. **Data Security & Privacy**
   - Data encryption at rest and in transit
   - Personal data handling and GDPR compliance
   - Access control and row-level security
   - Data masking and anonymization strategies
   - Audit logging and compliance tracking

6. **Data Migration & Versioning**
   - Database migration strategy and scripts
   - Schema versioning and change management
   - Data seeding and initial setup procedures
   - Rollback strategies and data recovery
   - Environment synchronization processes

7. **Scalability & Growth Planning**
   - Horizontal scaling strategies (sharding, partitioning)
   - Vertical scaling considerations
   - Read replicas and load distribution
   - Archive and data retention policies
   - Performance monitoring and capacity planning

8. **Data Integration & APIs**
   - Data access layer design patterns
   - ORM/ODM configuration and best practices
   - Stored procedures and database functions
   - Data validation and business rule enforcement
   - Transaction management and ACID compliance

9. **Backup & Recovery Strategy**
   - Automated backup schedules and retention
   - Point-in-time recovery capabilities
   - Disaster recovery procedures and testing
   - Data export and import processes
   - Cross-region backup strategies

10. **Monitoring & Maintenance**
    - Database performance monitoring setup
    - Query analysis and slow query identification
    - Database health checks and alerting
    - Maintenance tasks and optimization schedules
    - Capacity planning and resource monitoring

11. **Development & Testing Support**
    - Development database setup and seeding
    - Test data generation and management
    - Database testing strategies and tools
    - Local development environment setup
    - CI/CD integration for database changes

12. **Data Governance & Quality**
    - Data quality validation rules
    - Data lineage and documentation
    - Master data management strategies
    - Data catalog and metadata management
    - Data lifecycle management policies

13. **Implementation Examples**
    - SQL/NoSQL schema creation scripts
    - Sample queries and stored procedures
    - Data access layer code examples
    - Migration script templates
    - Performance optimization examples

14. **Integration Considerations**
    - External system data synchronization
    - API data transformation requirements
    - Real-time data streaming setup
    - Data warehouse and analytics integration
    - Third-party service data mapping

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide comprehensive database design specifications that include specific technology recommendations, schema definitions, and implementation guidelines. Focus on creating a scalable, secure, and maintainable database architecture.

Format your response with clear sections, SQL/schema examples where appropriate, and detailed implementation instructions.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}