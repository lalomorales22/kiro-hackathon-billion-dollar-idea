import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 3 Agent: Creates UI/UX design specifications and mockups.
 * This agent analyzes project requirements and creates comprehensive design guidelines.
 */
export class UIUXDesignAgent extends BaseAgent {
  /**
   * Executes the UI/UX design process.
   * Creates design mockups, user experience guidelines, and interface specifications.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const projectDescriptions = this.getRelevantArtifacts(context, [ArtifactType.PROJECT_DESCRIPTION]);
      const marketResearch = this.getRelevantArtifacts(context, [ArtifactType.MARKET_RESEARCH]);
      const technicalArchitecture = this.getRelevantArtifacts(context, [ArtifactType.TECHNICAL_ARCHITECTURE]);

      // Create enhanced prompt for UI/UX design
      const designPrompt = this.createUIUXDesignPrompt(context, projectDescriptions, marketResearch, technicalArchitecture);

      // Generate UI/UX design content using appropriate AI service
      const designContent = await this.callAIService(designPrompt, context, context.groqApiKey);

      // Create the UI/UX design artifact
      const artifact = this.createArtifact(
        'UI/UX Design Specifications',
        designContent,
        ArtifactType.UI_DESIGN,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        designType: 'ui_ux_design',
        previousArtifactsUsed: projectDescriptions.length + marketResearch.length + technicalArchitecture.length,
        processingStage: 'development'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for UI/UX design specifications.
   */
  private createUIUXDesignPrompt(context: AgentContext, projectDescriptions: any[], marketResearch: any[], technicalArchitecture: any[]): string {
    let previousContext = '';
    const allArtifacts = [...projectDescriptions, ...marketResearch, ...technicalArchitecture];
    if (allArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        allArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert UI/UX designer tasked with creating comprehensive design specifications for a digital product.

Your task is to analyze the project requirements and create detailed UI/UX design specifications that include:

1. **User Experience Strategy**
   - User personas and journey mapping
   - User flow diagrams and navigation structure
   - Information architecture and content hierarchy
   - Accessibility considerations and inclusive design principles

2. **Visual Design System**
   - Brand identity and visual language
   - Color palette and typography specifications
   - Icon library and imagery guidelines
   - Component library and design tokens

3. **Interface Design Specifications**
   - Wireframes for key screens and user flows
   - High-fidelity mockups with detailed annotations
   - Responsive design breakpoints and layouts
   - Interactive elements and micro-interactions

4. **Mobile and Desktop Considerations**
   - Cross-platform design consistency
   - Touch-friendly interface elements
   - Progressive web app considerations
   - Native app vs web app design decisions

5. **User Interface Components**
   - Navigation patterns and menu structures
   - Form design and input validation patterns
   - Data visualization and dashboard layouts
   - Loading states and error handling interfaces

6. **Usability and Testing Framework**
   - Usability testing methodology
   - A/B testing recommendations
   - User feedback collection mechanisms
   - Performance and accessibility metrics

7. **Design Implementation Guidelines**
   - Developer handoff specifications
   - Asset export requirements and formats
   - CSS/styling guidelines and naming conventions
   - Animation and transition specifications

8. **Content Strategy**
   - Content structure and organization
   - Copywriting tone and voice guidelines
   - Multimedia content requirements
   - Localization and internationalization considerations

9. **Conversion Optimization**
   - Call-to-action design and placement
   - User onboarding flow design
   - Checkout and conversion funnel optimization
   - Trust signals and social proof integration

10. **Design System Documentation**
    - Style guide and pattern library
    - Component usage guidelines
    - Design principles and best practices
    - Maintenance and evolution strategy

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide comprehensive UI/UX design specifications that balance user needs with business objectives. Include detailed descriptions of visual elements, user interactions, and implementation guidelines that developers can follow.

Format your response with clear sections, detailed specifications, and actionable design recommendations.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}