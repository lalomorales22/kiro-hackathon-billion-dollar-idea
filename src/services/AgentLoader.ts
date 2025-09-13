import { databaseService } from './database.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { AgentFactory } from '../agents/AgentFactory.js';
import { IOllamaService } from '../types/index.js';
import { Agent } from '../types/index.js';

/**
 * Service responsible for loading agents from the database and registering them
 * with the agent registry on application startup.
 * Requirements: 6.1, 6.4
 */
export class AgentLoader {
  private agentRegistry: AgentRegistry;
  private ollamaService: IOllamaService;
  private isLoaded = false;

  constructor(agentRegistry: AgentRegistry, ollamaService: IOllamaService) {
    this.agentRegistry = agentRegistry;
    this.ollamaService = ollamaService;
  }

  /**
   * Loads all active agents from the database and registers them with the registry.
   * This should be called during application startup.
   */
  async loadAgents(): Promise<{ successful: number; failed: number; errors: string[] }> {
    try {
      console.log('🤖 Loading agents from database...');

      // Ensure database connection
      try {
        await databaseService.connect();
      } catch (error) {
        // Connection might already exist, continue
      }

      // Fetch all active agents from database
      const prisma = databaseService.getClient();
      const agentsData = await prisma.agent.findMany({
        where: { isActive: true },
        orderBy: [
          { stage: 'asc' },
          { name: 'asc' }
        ]
      });

      if (agentsData.length === 0) {
        console.warn('⚠️  No active agents found in database. Consider running the seed script.');
        return { successful: 0, failed: 0, errors: ['No active agents found in database'] };
      }

      console.log(`📋 Found ${agentsData.length} active agents in database`);

      // Clear existing registry
      this.agentRegistry.clear();

      // Register agents using the factory
      const agentClassMap = AgentFactory.getAgentClassMap();
      const result = this.agentRegistry.registerAgents(agentsData, agentClassMap);

      // Validate stage coverage
      const validation = this.agentRegistry.validateStagesCoverage();
      if (!validation.isValid) {
        const warning = `⚠️  Missing agents for stages: ${validation.missingStages.join(', ')}`;
        console.warn(warning);
        result.errors.push(warning);
      }

      // Log statistics
      const stats = this.agentRegistry.getStats();
      console.log(`✅ Agent loading completed:`);
      console.log(`   - Successfully loaded: ${result.successful} agents`);
      console.log(`   - Failed to load: ${result.failed} agents`);
      console.log(`   - Total active agents: ${stats.activeAgents}`);
      console.log(`   - Stage distribution:`, stats.stageDistribution);

      if (result.errors.length > 0) {
        console.log(`   - Errors encountered:`, result.errors);
      }

      this.isLoaded = true;
      return result;

    } catch (error) {
      const errorMessage = `Failed to load agents: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMessage);
      return { successful: 0, failed: 0, errors: [errorMessage] };
    }
  }

  /**
   * Reloads agents from the database.
   * Useful for updating agent configurations without restarting the application.
   */
  async reloadAgents(): Promise<{ successful: number; failed: number; errors: string[] }> {
    console.log('🔄 Reloading agents from database...');
    this.isLoaded = false;
    return await this.loadAgents();
  }

  /**
   * Loads a specific agent by name from the database and registers it.
   */
  async loadAgent(agentName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🤖 Loading specific agent: ${agentName}`);

      const prisma = databaseService.getClient();
      const agentData = await prisma.agent.findUnique({
        where: { name: agentName }
      });

      if (!agentData) {
        return { success: false, error: `Agent not found: ${agentName}` };
      }

      if (!agentData.isActive) {
        return { success: false, error: `Agent is inactive: ${agentName}` };
      }

      // Check if agent class exists
      if (!AgentFactory.isAgentTypeSupported(agentName)) {
        return { success: false, error: `Agent type not supported: ${agentName}` };
      }

      // Unregister existing agent if present
      this.agentRegistry.unregisterAgent(agentData.id);

      // Register the agent
      const AgentClass = AgentFactory.getAgentClassMap().get(agentName);
      if (!AgentClass) {
        return { success: false, error: `Agent class not found: ${agentName}` };
      }

      this.agentRegistry.registerAgent(agentData, AgentClass);

      console.log(`✅ Successfully loaded agent: ${agentName}`);
      return { success: true };

    } catch (error) {
      const errorMessage = `Failed to load agent ${agentName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Updates an agent's configuration in the database and reloads it.
   */
  async updateAgent(agentName: string, updates: Partial<Pick<Agent, 'description' | 'prompt' | 'isActive'>>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔧 Updating agent: ${agentName}`);

      const prisma = databaseService.getClient();
      
      // Update agent in database
      const updatedAgent = await prisma.agent.update({
        where: { name: agentName },
        data: updates
      });

      // Reload the agent if it's active
      if (updatedAgent.isActive) {
        const loadResult = await this.loadAgent(agentName);
        if (!loadResult.success) {
          return loadResult;
        }
      } else {
        // Unregister if made inactive
        this.agentRegistry.unregisterAgent(updatedAgent.id);
      }

      console.log(`✅ Successfully updated agent: ${agentName}`);
      return { success: true };

    } catch (error) {
      const errorMessage = `Failed to update agent ${agentName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Gets the current agent registry instance.
   */
  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  /**
   * Checks if agents have been loaded.
   */
  isAgentsLoaded(): boolean {
    return this.isLoaded && this.agentRegistry.isInitialized();
  }

  /**
   * Gets agent loading statistics.
   */
  getLoadingStats(): {
    isLoaded: boolean;
    totalAgents: number;
    activeAgents: number;
    stageDistribution: Record<number, number>;
    missingStages: number[];
  } {
    const stats = this.agentRegistry.getStats();
    const validation = this.agentRegistry.validateStagesCoverage();

    return {
      isLoaded: this.isLoaded,
      totalAgents: stats.totalAgents,
      activeAgents: stats.activeAgents,
      stageDistribution: stats.stageDistribution,
      missingStages: validation.missingStages
    };
  }

  /**
   * Validates that all required agents are loaded and available.
   */
  async validateAgentSetup(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check if agents are loaded
    if (!this.isLoaded) {
      issues.push('Agents have not been loaded from database');
    }

    // Check if registry is initialized
    if (!this.agentRegistry.isInitialized()) {
      issues.push('Agent registry is not initialized');
    }

    // Check stage coverage
    const validation = this.agentRegistry.validateStagesCoverage();
    if (!validation.isValid) {
      issues.push(`Missing agents for stages: ${validation.missingStages.join(', ')}`);
    }

    // Check database connectivity
    try {
      await databaseService.healthCheck();
    } catch (error) {
      issues.push('Database connection error');
    }

    // Check if all agent types are supported
    try {
      const prisma = databaseService.getClient();
      const agentNames = await prisma.agent.findMany({
        where: { isActive: true },
        select: { name: true }
      });

      for (const agent of agentNames) {
        if (!AgentFactory.isAgentTypeSupported(agent.name)) {
          issues.push(`Unsupported agent type: ${agent.name}`);
        }
      }
    } catch (error) {
      issues.push('Failed to validate agent types');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Gets detailed information about all loaded agents.
   */
  getAgentDetails(): Array<{
    id: string;
    name: string;
    description: string;
    stage: number;
    isActive: boolean;
    isLoaded: boolean;
  }> {
    const allAgents = this.agentRegistry.getAllAgents();
    
    return allAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      stage: agent.stage,
      isActive: agent.isActive,
      isLoaded: true
    }));
  }
}