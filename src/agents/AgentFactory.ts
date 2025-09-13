import { Agent } from '../types/index.js';
import { BaseAgent } from './BaseAgent.js';
import { IdeaStructuringAgent } from './IdeaStructuringAgent.js';
import { MarketResearchAgent } from './MarketResearchAgent.js';
import { TechnicalArchitectureAgent } from './TechnicalArchitectureAgent.js';
import { UIUXDesignAgent } from './UIUXDesignAgent.js';
import { FrontendDevelopmentAgent } from './FrontendDevelopmentAgent.js';
import { BackendDevelopmentAgent } from './BackendDevelopmentAgent.js';
import { DatabaseDesignAgent } from './DatabaseDesignAgent.js';
import { QAAgent } from './QAAgent.js';
import { BusinessFormationAgent } from './BusinessFormationAgent.js';
import { MarketingContentAgent } from './MarketingContentAgent.js';
import { SalesFunnelAgent } from './SalesFunnelAgent.js';
import { CustomerSupportAgent } from './CustomerSupportAgent.js';
import { AnalyticsAgent } from './AnalyticsAgent.js';
import { FinancialManagementAgent } from './FinancialManagementAgent.js';
import { ContinuousMonitoringAgent } from './ContinuousMonitoringAgent.js';
import { OptimizationAgent } from './OptimizationAgent.js';
import { IOllamaService } from '../types/index.js';

/**
 * Factory class for creating agent instances based on agent data.
 * Provides a centralized way to instantiate different types of agents.
 */
export class AgentFactory {
  private static agentClassMap = new Map<string, new (agentData: Agent, ollamaService: IOllamaService) => BaseAgent>([
    // Stage 1: Input Processing
    ['IdeaStructuringAgent', IdeaStructuringAgent],
    
    // Stage 2: Validation & Strategy
    ['MarketResearchAgent', MarketResearchAgent],
    ['TechnicalArchitectureAgent', TechnicalArchitectureAgent],
    
    // Stage 3: Development
    ['UIUXDesignAgent', UIUXDesignAgent],
    ['FrontendDevelopmentAgent', FrontendDevelopmentAgent],
    ['BackendDevelopmentAgent', BackendDevelopmentAgent],
    ['DatabaseDesignAgent', DatabaseDesignAgent],
    ['QAAgent', QAAgent],
    
    // Stage 4: Go-to-Market
    ['BusinessFormationAgent', BusinessFormationAgent],
    ['MarketingContentAgent', MarketingContentAgent],
    ['SalesFunnelAgent', SalesFunnelAgent],
    
    // Stage 5: Operations
    ['CustomerSupportAgent', CustomerSupportAgent],
    ['AnalyticsAgent', AnalyticsAgent],
    ['FinancialManagementAgent', FinancialManagementAgent],
    
    // Stage 6: Self-Improvement
    ['ContinuousMonitoringAgent', ContinuousMonitoringAgent],
    ['OptimizationAgent', OptimizationAgent],
  ]);

  /**
   * Creates an agent instance based on the agent data.
   */
  static createAgent(agentData: Agent, ollamaService: IOllamaService): BaseAgent {
    const AgentClass = this.agentClassMap.get(agentData.name);
    
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${agentData.name}. Available agents: ${Array.from(this.agentClassMap.keys()).join(', ')}`);
    }

    return new AgentClass(agentData, ollamaService);
  }

  /**
   * Gets all available agent class names.
   */
  static getAvailableAgentTypes(): string[] {
    return Array.from(this.agentClassMap.keys());
  }

  /**
   * Registers a new agent class in the factory.
   */
  static registerAgentClass(
    name: string, 
    agentClass: new (agentData: Agent, ollamaService: IOllamaService) => BaseAgent
  ): void {
    this.agentClassMap.set(name, agentClass);
  }

  /**
   * Gets the agent class map for bulk operations.
   */
  static getAgentClassMap(): Map<string, new (agentData: Agent, ollamaService: IOllamaService) => BaseAgent> {
    return new Map(this.agentClassMap);
  }

  /**
   * Checks if an agent type is supported.
   */
  static isAgentTypeSupported(agentName: string): boolean {
    return this.agentClassMap.has(agentName);
  }
}