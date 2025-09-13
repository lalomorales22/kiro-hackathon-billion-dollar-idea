import { Agent } from '../types/index.js';
import { BaseAgent } from './BaseAgent.js';
import { IOllamaService } from '../types/index.js';

/**
 * Registry for managing available AI agents in the system.
 * Provides functionality to register, retrieve, and manage agent instances.
 */
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private agentsByStage: Map<number, BaseAgent[]> = new Map();
  private ollamaService: IOllamaService;

  constructor(ollamaService: IOllamaService) {
    this.ollamaService = ollamaService;
  }

  /**
   * Registers an agent in the registry.
   * Creates an instance of the agent and stores it for later retrieval.
   */
  registerAgent(agentData: Agent, AgentClass: new (agentData: Agent, ollamaService: IOllamaService) => BaseAgent): void {
    if (!agentData.isActive) {
      console.log(`Skipping inactive agent: ${agentData.name}`);
      return;
    }

    try {
      const agentInstance = new AgentClass(agentData, this.ollamaService);
      
      // Store by ID
      this.agents.set(agentData.id, agentInstance);
      
      // Store by stage for efficient stage-based retrieval
      if (!this.agentsByStage.has(agentData.stage)) {
        this.agentsByStage.set(agentData.stage, []);
      }
      this.agentsByStage.get(agentData.stage)!.push(agentInstance);

      console.log(`Registered agent: ${agentData.name} (Stage ${agentData.stage})`);
    } catch (error) {
      console.error(`Failed to register agent ${agentData.name}:`, error);
      throw new Error(`Agent registration failed for ${agentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves an agent by its ID.
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Retrieves all agents for a specific stage.
   */
  getAgentsForStage(stage: number): BaseAgent[] {
    return this.agentsByStage.get(stage) || [];
  }

  /**
   * Retrieves all registered agents.
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Retrieves all active agents.
   */
  getActiveAgents(): BaseAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.isActive);
  }

  /**
   * Gets the count of agents for each stage.
   */
  getStageAgentCounts(): Map<number, number> {
    const counts = new Map<number, number>();
    for (const [stage, agents] of this.agentsByStage) {
      counts.set(stage, agents.length);
    }
    return counts;
  }

  /**
   * Validates that all required stages have at least one agent.
   */
  validateStagesCoverage(requiredStages: number[] = [1, 2, 3, 4, 5, 6]): { isValid: boolean; missingStages: number[] } {
    const missingStages: number[] = [];
    
    for (const stage of requiredStages) {
      const stageAgents = this.getAgentsForStage(stage);
      if (stageAgents.length === 0) {
        missingStages.push(stage);
      }
    }

    return {
      isValid: missingStages.length === 0,
      missingStages
    };
  }

  /**
   * Removes an agent from the registry.
   */
  unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Remove from main registry
    this.agents.delete(agentId);

    // Remove from stage registry
    const stageAgents = this.agentsByStage.get(agent.stage);
    if (stageAgents) {
      const index = stageAgents.findIndex(a => a.id === agentId);
      if (index !== -1) {
        stageAgents.splice(index, 1);
      }
    }

    console.log(`Unregistered agent: ${agent.name}`);
    return true;
  }

  /**
   * Clears all registered agents.
   */
  clear(): void {
    this.agents.clear();
    this.agentsByStage.clear();
    console.log('Agent registry cleared');
  }

  /**
   * Gets registry statistics.
   */
  getStats(): {
    totalAgents: number;
    activeAgents: number;
    stageDistribution: Record<number, number>;
    agentNames: string[];
  } {
    const allAgents = this.getAllAgents();
    const activeAgents = this.getActiveAgents();
    const stageDistribution: Record<number, number> = {};
    
    for (const [stage, count] of this.getStageAgentCounts()) {
      stageDistribution[stage] = count;
    }

    return {
      totalAgents: allAgents.length,
      activeAgents: activeAgents.length,
      stageDistribution,
      agentNames: allAgents.map(agent => agent.name)
    };
  }

  /**
   * Checks if the registry is properly initialized with agents.
   */
  isInitialized(): boolean {
    return this.agents.size > 0;
  }

  /**
   * Gets agents by name pattern (useful for debugging and management).
   */
  findAgentsByName(namePattern: string): BaseAgent[] {
    const pattern = new RegExp(namePattern, 'i');
    return Array.from(this.agents.values()).filter(agent => 
      pattern.test(agent.name) || pattern.test(agent.description)
    );
  }

  /**
   * Bulk register multiple agents from agent data array.
   */
  registerAgents(
    agentsData: Agent[], 
    agentClassMap: Map<string, new (agentData: Agent, ollamaService: IOllamaService) => BaseAgent>
  ): { successful: number; failed: number; errors: string[] } {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const agentData of agentsData) {
      try {
        const AgentClass = agentClassMap.get(agentData.name);
        if (!AgentClass) {
          throw new Error(`No agent class found for agent: ${agentData.name}`);
        }

        this.registerAgent(agentData, AgentClass);
        successful++;
      } catch (error) {
        failed++;
        const errorMessage = `Failed to register ${agentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    return { successful, failed, errors };
  }
}