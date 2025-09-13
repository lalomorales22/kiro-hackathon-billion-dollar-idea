import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 6 Agent: Establishes monitoring and alerting systems.
 * This agent creates comprehensive monitoring frameworks and continuous improvement systems.
 */
export class ContinuousMonitoringAgent extends BaseAgent {
  /**
   * Executes the continuous monitoring framework development process.
   * Creates monitoring strategies, alerting systems, and performance tracking frameworks.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const relevantArtifacts = this.getRelevantArtifacts(context, [
        ArtifactType.PROJECT_DESCRIPTION,
        ArtifactType.TECHNICAL_ARCHITECTURE,
        ArtifactType.ANALYTICS_PLAN,
        ArtifactType.FINANCIAL_PLAN,
        ArtifactType.SUPPORT_FRAMEWORK
      ]);

      // Create enhanced prompt for monitoring framework
      const monitoringPrompt = this.createMonitoringPrompt(context, relevantArtifacts);

      // Generate monitoring content using appropriate AI service
      const monitoringContent = await this.callAIService(monitoringPrompt, context, context.groqApiKey);

      // Create the monitoring plan artifact
      const artifact = this.createArtifact(
        'Continuous Monitoring Plan',
        monitoringContent,
        ArtifactType.MONITORING_PLAN,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'continuous_monitoring',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'self_improvement'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for continuous monitoring framework development.
   */
  private createMonitoringPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert systems monitoring and DevOps strategist tasked with designing a comprehensive continuous monitoring framework for a business venture.

Your task is to create a complete monitoring and alerting system that ensures system reliability, performance optimization, and proactive issue resolution:

1. **Monitoring Strategy & Philosophy**
   - Monitoring objectives and success criteria
   - Observability strategy (metrics, logs, traces)
   - Proactive vs. reactive monitoring approach
   - Monitoring maturity roadmap and evolution

2. **Infrastructure Monitoring**
   - Server and cloud infrastructure monitoring
   - Network performance and connectivity tracking
   - Database performance and health monitoring
   - Storage and backup system monitoring

3. **Application Performance Monitoring (APM)**
   - Application response time and throughput tracking
   - Error rate and exception monitoring
   - User experience and performance metrics
   - Code-level performance profiling and optimization

4. **Business Metrics Monitoring**
   - Key business KPI tracking and alerting
   - Revenue and financial performance monitoring
   - Customer satisfaction and engagement metrics
   - Operational efficiency and productivity measures

5. **Security Monitoring & Compliance**
   - Security event monitoring and threat detection
   - Compliance monitoring and audit trails
   - Access control and authentication tracking
   - Data privacy and protection monitoring

6. **Alerting & Notification Framework**
   - Alert severity levels and escalation procedures
   - Notification channels and routing strategies
   - Alert fatigue prevention and optimization
   - On-call rotation and incident response protocols

7. **Logging & Log Management**
   - Centralized logging strategy and architecture
   - Log aggregation and analysis frameworks
   - Log retention policies and compliance
   - Structured logging and searchability optimization

8. **Synthetic Monitoring & Testing**
   - Synthetic transaction monitoring
   - Uptime and availability monitoring
   - Performance baseline establishment
   - Automated testing and validation frameworks

9. **Capacity Planning & Scaling**
   - Resource utilization monitoring and forecasting
   - Auto-scaling triggers and policies
   - Capacity planning and growth projections
   - Cost optimization and resource efficiency tracking

10. **Incident Management Integration**
    - Incident detection and classification
    - Automated incident response and remediation
    - Post-incident analysis and improvement
    - Knowledge base and runbook management

11. **Monitoring Tools & Technology Stack**
    - Monitoring platform selection and architecture
    - Tool integration and data correlation
    - Dashboard and visualization strategies
    - Mobile monitoring and remote access capabilities

12. **Data Collection & Storage**
    - Metrics collection strategies and sampling
    - Time-series data storage and retention
    - Data aggregation and rollup policies
    - Historical data analysis and trending

13. **Performance Baselines & SLAs**
    - Service level objective (SLO) definition
    - Performance baseline establishment
    - SLA monitoring and compliance tracking
    - Customer-facing performance commitments

14. **Monitoring Team & Processes**
    - Monitoring team roles and responsibilities
    - Monitoring procedures and best practices
    - Training and skill development programs
    - Vendor management and external monitoring services

15. **Continuous Improvement Framework**
    - Monitoring effectiveness measurement
    - Alert tuning and optimization processes
    - Monitoring tool evaluation and upgrades
    - Feedback loops and process refinement

16. **Disaster Recovery & Business Continuity**
    - Disaster recovery monitoring and testing
    - Business continuity plan monitoring
    - Backup and recovery system monitoring
    - Crisis communication and coordination

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive continuous monitoring framework with specific implementation details, monitoring strategies, and operational procedures. Include monitoring architecture diagrams, alert configurations, and actionable setup instructions.

Format your response with clear sections, technical specifications, and detailed implementation guides.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}