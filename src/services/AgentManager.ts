import { databaseService } from './database.js';
import { AgentLoader } from './AgentLoader.js';
import { Agent } from '../types/index.js';

/**
 * Service for managing agent configurations, updates, and administrative operations.
 * Provides utilities for agent CRUD operations and configuration management.
 * Requirements: 6.1, 6.4
 */
export class AgentManager {
  private agentLoader: AgentLoader;

  constructor(agentLoader: AgentLoader) {
    this.agentLoader = agentLoader;
  }

  /**
   * Creates a new agent in the database.
   */
  async createAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log(`➕ Creating new agent: ${agentData.name}`);

      // Validate required fields
      const validation = this.validateAgentData(agentData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const prisma = databaseService.getClient();

      // Check if agent with same name already exists
      const existingAgent = await prisma.agent.findUnique({
        where: { name: agentData.name }
      });

      if (existingAgent) {
        return { success: false, error: `Agent with name '${agentData.name}' already exists` };
      }

      // Create the agent
      const newAgent = await prisma.agent.create({
        data: agentData
      });

      // Load the agent if it's active
      if (newAgent.isActive) {
        const loadResult = await this.agentLoader.loadAgent(newAgent.name);
        if (!loadResult.success) {
          console.warn(`⚠️  Created agent but failed to load: ${loadResult.error}`);
        }
      }

      console.log(`✅ Successfully created agent: ${agentData.name}`);
      return { success: true, agent: newAgent };

    } catch (error) {
      const errorMessage = `Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Updates an existing agent in the database.
   */
  async updateAgent(agentId: string, updates: Partial<Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log(`🔧 Updating agent: ${agentId}`);

      const prisma = databaseService.getClient();

      // Check if agent exists
      const existingAgent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!existingAgent) {
        return { success: false, error: `Agent not found: ${agentId}` };
      }

      // Validate updates
      if (updates.name && updates.name !== existingAgent.name) {
        const nameExists = await prisma.agent.findUnique({
          where: { name: updates.name }
        });
        if (nameExists) {
          return { success: false, error: `Agent with name '${updates.name}' already exists` };
        }
      }

      // Update the agent
      const updatedAgent = await prisma.agent.update({
        where: { id: agentId },
        data: updates
      });

      // Reload the agent if name changed or if it's active
      const agentName = updatedAgent.name;
      if (updatedAgent.isActive) {
        const loadResult = await this.agentLoader.loadAgent(agentName);
        if (!loadResult.success) {
          console.warn(`⚠️  Updated agent but failed to reload: ${loadResult.error}`);
        }
      } else {
        // Unregister if made inactive
        this.agentLoader.getAgentRegistry().unregisterAgent(updatedAgent.id);
      }

      console.log(`✅ Successfully updated agent: ${agentName}`);
      return { success: true, agent: updatedAgent };

    } catch (error) {
      const errorMessage = `Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Deletes an agent from the database.
   */
  async deleteAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🗑️  Deleting agent: ${agentId}`);

      const prisma = databaseService.getClient();

      // Check if agent exists
      const existingAgent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!existingAgent) {
        return { success: false, error: `Agent not found: ${agentId}` };
      }

      // Check if agent is being used in any tasks
      const tasksUsingAgent = await prisma.task.findFirst({
        where: { agent: existingAgent.name }
      });

      if (tasksUsingAgent) {
        return { success: false, error: `Cannot delete agent '${existingAgent.name}' - it is referenced by existing tasks` };
      }

      // Unregister from registry first
      this.agentLoader.getAgentRegistry().unregisterAgent(agentId);

      // Delete the agent
      await prisma.agent.delete({
        where: { id: agentId }
      });

      console.log(`✅ Successfully deleted agent: ${existingAgent.name}`);
      return { success: true };

    } catch (error) {
      const errorMessage = `Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Gets an agent by ID.
   */
  async getAgent(agentId: string): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      const prisma = databaseService.getClient();
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        return { success: false, error: `Agent not found: ${agentId}` };
      }

      return { success: true, agent };

    } catch (error) {
      const errorMessage = `Failed to get agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Gets an agent by name.
   */
  async getAgentByName(agentName: string): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      const prisma = databaseService.getClient();
      const agent = await prisma.agent.findUnique({
        where: { name: agentName }
      });

      if (!agent) {
        return { success: false, error: `Agent not found: ${agentName}` };
      }

      return { success: true, agent };

    } catch (error) {
      const errorMessage = `Failed to get agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Lists all agents with optional filtering.
   */
  async listAgents(filters?: {
    stage?: number;
    isActive?: boolean;
    namePattern?: string;
  }): Promise<{ success: boolean; agents?: Agent[]; error?: string }> {
    try {
      const prisma = databaseService.getClient();
      
      const where: any = {};
      
      if (filters?.stage !== undefined) {
        where.stage = filters.stage;
      }
      
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      
      if (filters?.namePattern) {
        where.name = {
          contains: filters.namePattern,
          mode: 'insensitive'
        };
      }

      const agents = await prisma.agent.findMany({
        where,
        orderBy: [
          { stage: 'asc' },
          { name: 'asc' }
        ]
      });

      return { success: true, agents };

    } catch (error) {
      const errorMessage = `Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Activates an agent.
   */
  async activateAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    return await this.updateAgent(agentId, { isActive: true });
  }

  /**
   * Deactivates an agent.
   */
  async deactivateAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    return await this.updateAgent(agentId, { isActive: false });
  }

  /**
   * Updates an agent's prompt.
   */
  async updateAgentPrompt(agentId: string, prompt: string): Promise<{ success: boolean; error?: string }> {
    if (!prompt || prompt.trim().length === 0) {
      return { success: false, error: 'Prompt cannot be empty' };
    }

    const result = await this.updateAgent(agentId, { prompt: prompt.trim() });
    return { success: result.success, error: result.error };
  }

  /**
   * Bulk updates multiple agents.
   */
  async bulkUpdateAgents(updates: Array<{ id: string; data: Partial<Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>> }>): Promise<{
    success: boolean;
    results: Array<{ id: string; success: boolean; error?: string }>;
    error?: string;
  }> {
    try {
      console.log(`🔄 Bulk updating ${updates.length} agents...`);

      const results: Array<{ id: string; success: boolean; error?: string }> = [];

      for (const update of updates) {
        const result = await this.updateAgent(update.id, update.data);
        results.push({
          id: update.id,
          success: result.success,
          error: result.error
        });
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`✅ Bulk update completed: ${successCount} successful, ${failureCount} failed`);

      return {
        success: failureCount === 0,
        results
      };

    } catch (error) {
      const errorMessage = `Failed to bulk update agents: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMessage);
      return {
        success: false,
        results: [],
        error: errorMessage
      };
    }
  }

  /**
   * Exports agent configurations to JSON.
   */
  async exportAgents(filters?: { stage?: number; isActive?: boolean }): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const result = await this.listAgents(filters);
      if (!result.success || !result.agents) {
        return { success: false, error: result.error };
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalAgents: result.agents.length,
        filters,
        agents: result.agents
      };

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      };

    } catch (error) {
      const errorMessage = `Failed to export agents: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Gets agent usage statistics.
   */
  async getAgentUsageStats(): Promise<{
    success: boolean;
    stats?: {
      totalAgents: number;
      activeAgents: number;
      inactiveAgents: number;
      stageDistribution: Record<number, number>;
      recentlyUsedAgents: Array<{ name: string; lastUsed: Date; usageCount: number }>;
    };
    error?: string;
  }> {
    try {
      const prisma = databaseService.getClient();

      // Get basic agent counts
      const [totalAgents, activeAgents] = await Promise.all([
        prisma.agent.count(),
        prisma.agent.count({ where: { isActive: true } })
      ]);

      // Get stage distribution
      const stageGroups = await prisma.agent.groupBy({
        by: ['stage'],
        _count: { stage: true },
        where: { isActive: true }
      });

      const stageDistribution: Record<number, number> = {};
      stageGroups.forEach(group => {
        stageDistribution[group.stage] = group._count.stage;
      });

      // Get recently used agents
      const recentTasks = await prisma.task.groupBy({
        by: ['agent'],
        _count: { agent: true },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: 'desc' } },
        take: 10
      });

      const recentlyUsedAgents = recentTasks.map(task => ({
        name: task.agent,
        lastUsed: task._max.createdAt || new Date(),
        usageCount: task._count.agent
      }));

      return {
        success: true,
        stats: {
          totalAgents,
          activeAgents,
          inactiveAgents: totalAgents - activeAgents,
          stageDistribution,
          recentlyUsedAgents
        }
      };

    } catch (error) {
      const errorMessage = `Failed to get agent usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Validates agent data for creation/updates.
   */
  private validateAgentData(agentData: Partial<Agent>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!agentData.name || agentData.name.trim().length === 0) {
      errors.push('Agent name is required');
    }

    if (!agentData.description || agentData.description.trim().length === 0) {
      errors.push('Agent description is required');
    }

    if (agentData.stage === undefined || agentData.stage < 1 || agentData.stage > 6) {
      errors.push('Agent stage must be between 1 and 6');
    }

    if (!agentData.prompt || agentData.prompt.trim().length === 0) {
      errors.push('Agent prompt is required');
    }

    if (agentData.prompt && agentData.prompt.length > 10000) {
      errors.push('Agent prompt is too long (max 10000 characters)');
    }

    if (agentData.name && !/^[A-Za-z][A-Za-z0-9]*Agent$/.test(agentData.name)) {
      errors.push('Agent name must start with a letter, contain only alphanumeric characters, and end with "Agent"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reloads all agents from the database.
   */
  async reloadAllAgents(): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      console.log('🔄 Reloading all agents...');
      
      const result = await this.agentLoader.reloadAgents();
      const stats = this.agentLoader.getLoadingStats();

      return {
        success: result.failed === 0,
        stats,
        error: result.errors.length > 0 ? result.errors.join(', ') : undefined
      };

    } catch (error) {
      const errorMessage = `Failed to reload agents: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Gets comprehensive agent system status.
   */
  async getSystemStatus(): Promise<{
    success: boolean;
    status?: {
      isLoaded: boolean;
      loadingStats: any;
      validationResult: any;
      usageStats: any;
    };
    error?: string;
  }> {
    try {
      const [loadingStats, validationResult, usageStatsResult] = await Promise.all([
        this.agentLoader.getLoadingStats(),
        this.agentLoader.validateAgentSetup(),
        this.getAgentUsageStats()
      ]);

      return {
        success: true,
        status: {
          isLoaded: this.agentLoader.isAgentsLoaded(),
          loadingStats,
          validationResult,
          usageStats: usageStatsResult.success ? usageStatsResult.stats : null
        }
      };

    } catch (error) {
      const errorMessage = `Failed to get system status: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return { success: false, error: errorMessage };
    }
  }
}