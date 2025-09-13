import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, ArtifactType } from '../types/index.js';

/**
 * Stage 4 Agent: Creates marketing copy and content strategies.
 * This agent develops comprehensive marketing content and messaging frameworks.
 */
export class MarketingContentAgent extends BaseAgent {
  /**
   * Executes the marketing content creation process.
   * Develops marketing strategies, messaging, and content frameworks.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Validate context
      this.validateContext(context);

      // Get relevant artifacts from previous stages
      const relevantArtifacts = this.getRelevantArtifacts(context, [
        ArtifactType.PROJECT_DESCRIPTION,
        ArtifactType.MARKET_RESEARCH,
        ArtifactType.UI_DESIGN,
        ArtifactType.BUSINESS_PLAN
      ]);

      // Create enhanced prompt for marketing content
      const marketingPrompt = this.createMarketingContentPrompt(context, relevantArtifacts);

      // Generate marketing content using appropriate AI service
      const marketingContent = await this.callAIService(marketingPrompt, context, context.groqApiKey);

      // Create the marketing content artifact
      const artifact = this.createArtifact(
        'Marketing Content Strategy',
        marketingContent,
        ArtifactType.MARKETING_CONTENT,
        context.projectId
      );

      return this.createSuccessResult([artifact], {
        analysisType: 'marketing_content',
        previousArtifactsUsed: relevantArtifacts.length,
        processingStage: 'go_to_market'
      });

    } catch (error) {
      return this.handleExecutionError(error, context);
    }
  }

  /**
   * Creates a specialized prompt for marketing content development.
   */
  private createMarketingContentPrompt(context: AgentContext, relevantArtifacts: any[]): string {
    let previousContext = '';
    if (relevantArtifacts.length > 0) {
      previousContext = '\n\nPrevious Analysis:\n' + 
        relevantArtifacts.map(artifact => this.formatArtifactForPrompt(artifact)).join('\n\n');
    }

    const basePrompt = `
You are an expert marketing strategist and content creator tasked with developing a comprehensive marketing content strategy for a new business venture.

Your task is to create a complete marketing content framework that includes messaging, content strategies, and marketing materials:

1. **Brand Messaging & Positioning**
   - Unique value proposition (UVP)
   - Brand personality and voice guidelines
   - Key messaging pillars and themes
   - Competitive differentiation messaging

2. **Target Audience Personas**
   - Detailed customer personas with demographics
   - Pain points and motivations for each persona
   - Preferred communication channels and content types
   - Customer journey mapping and touchpoints

3. **Content Strategy Framework**
   - Content marketing objectives and KPIs
   - Content types and formats strategy
   - Content calendar and publishing schedule
   - SEO and keyword strategy

4. **Marketing Copy & Materials**
   - Website copy (homepage, about, product pages)
   - Email marketing templates and sequences
   - Social media content templates
   - Advertisement copy for different platforms

5. **Campaign Strategies**
   - Launch campaign strategy and timeline
   - Ongoing marketing campaign ideas
   - Seasonal and promotional campaign concepts
   - Influencer and partnership marketing approaches

6. **Channel-Specific Content**
   - Social media platform strategies (LinkedIn, Twitter, Instagram, etc.)
   - Blog content topics and editorial calendar
   - Video content concepts and scripts
   - Podcast and webinar content ideas

7. **Marketing Automation**
   - Lead nurturing email sequences
   - Customer onboarding content flows
   - Retention and upselling content strategies
   - Automated response templates

8. **Performance Measurement**
   - Content performance metrics and KPIs
   - A/B testing strategies for messaging
   - Conversion tracking and optimization
   - ROI measurement frameworks

9. **Brand Guidelines**
   - Visual identity guidelines for content
   - Tone of voice and writing style guide
   - Brand consistency standards
   - Content approval and review processes

Project Information:
- Project Name: ${context.project.name}
- Original Idea: ${context.project.idea}${previousContext}

Please provide a comprehensive marketing content strategy with specific examples, templates, and actionable implementation guidelines. Include sample copy, content ideas, and detailed execution plans.

Format your response with clear sections, practical examples, and ready-to-use templates.
    `;

    return this.enhancePrompt(basePrompt, context);
  }
}