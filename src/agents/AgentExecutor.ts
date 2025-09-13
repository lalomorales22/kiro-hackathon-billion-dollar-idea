import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult, TaskStatus } from '../types/index.js';

/**
 * Utility class for executing agents, including parallel execution capabilities.
 * Provides methods for running single agents or multiple agents concurrently.
 */
export class AgentExecutor {
  /**
   * Executes a single agent with the provided context.
   */
  static async executeAgent(agent: BaseAgent, context: AgentContext): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Starting execution of agent: ${agent.name} (Stage ${agent.stage})`);
      
      const result = await agent.execute(context);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Agent ${agent.name} completed successfully in ${executionTime}ms`);
      
      return {
        agentId: agent.id,
        agentName: agent.name,
        stage: agent.stage,
        result,
        executionTime,
        status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Agent ${agent.name} failed after ${executionTime}ms:`, errorMessage);
      
      return {
        agentId: agent.id,
        agentName: agent.name,
        stage: agent.stage,
        result: {
          success: false,
          artifacts: [],
          error: errorMessage,
          metadata: {
            agentId: agent.id,
            agentName: agent.name,
            executionTime: new Date().toISOString(),
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
          }
        },
        executionTime,
        status: TaskStatus.FAILED,
        error: errorMessage
      };
    }
  }

  /**
   * Executes multiple agents in parallel for the same stage.
   * Returns results for all agents, including both successful and failed executions.
   */
  static async executeAgentsInParallel(
    agents: BaseAgent[], 
    context: AgentContext
  ): Promise<ParallelExecutionResult> {
    if (agents.length === 0) {
      return {
        stage: context.stageNumber,
        totalAgents: 0,
        successfulAgents: 0,
        failedAgents: 0,
        results: [],
        totalExecutionTime: 0
      };
    }

    const startTime = Date.now();
    
    console.log(`🔄 Starting parallel execution of ${agents.length} agents for Stage ${context.stageNumber}`);
    
    // Validate all agents are for the same stage
    const expectedStage = context.stageNumber;
    const invalidAgents = agents.filter(agent => agent.stage !== expectedStage);
    if (invalidAgents.length > 0) {
      throw new Error(`All agents must be for stage ${expectedStage}. Found agents for stages: ${invalidAgents.map(a => a.stage).join(', ')}`);
    }

    try {
      // Execute all agents in parallel using Promise.allSettled
      const executionPromises = agents.map(agent => 
        this.executeAgent(agent, {
          ...context,
          // Create a unique task ID for each agent if needed
          taskId: `${context.taskId}-${agent.id}`
        })
      );

      const settledResults = await Promise.allSettled(executionPromises);
      const totalExecutionTime = Date.now() - startTime;

      // Process results
      const results: AgentExecutionResult[] = [];
      let successfulAgents = 0;
      let failedAgents = 0;

      settledResults.forEach((settledResult, index) => {
        if (settledResult.status === 'fulfilled') {
          const result = settledResult.value;
          results.push(result);
          
          if (result.status === TaskStatus.COMPLETED) {
            successfulAgents++;
          } else {
            failedAgents++;
          }
        } else {
          // Handle Promise rejection (shouldn't happen with our error handling, but just in case)
          const agent = agents[index];
          const errorResult: AgentExecutionResult = {
            agentId: agent.id,
            agentName: agent.name,
            stage: agent.stage,
            result: {
              success: false,
              artifacts: [],
              error: `Promise rejection: ${settledResult.reason}`,
              metadata: {
                agentId: agent.id,
                agentName: agent.name,
                executionTime: new Date().toISOString(),
                errorType: 'PromiseRejection'
              }
            },
            executionTime: 0,
            status: TaskStatus.FAILED,
            error: `Promise rejection: ${settledResult.reason}`
          };
          results.push(errorResult);
          failedAgents++;
        }
      });

      const parallelResult: ParallelExecutionResult = {
        stage: expectedStage,
        totalAgents: agents.length,
        successfulAgents,
        failedAgents,
        results,
        totalExecutionTime
      };

      console.log(`🏁 Parallel execution completed for Stage ${expectedStage}:`);
      console.log(`   ✅ Successful: ${successfulAgents}/${agents.length}`);
      console.log(`   ❌ Failed: ${failedAgents}/${agents.length}`);
      console.log(`   ⏱️  Total time: ${totalExecutionTime}ms`);

      return parallelResult;

    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;
      console.error(`💥 Parallel execution failed for Stage ${expectedStage}:`, error);
      
      throw new Error(`Parallel execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes agents in sequence (one after another) for cases where parallel execution is not desired.
   */
  static async executeAgentsInSequence(
    agents: BaseAgent[], 
    context: AgentContext
  ): Promise<ParallelExecutionResult> {
    if (agents.length === 0) {
      return {
        stage: context.stageNumber,
        totalAgents: 0,
        successfulAgents: 0,
        failedAgents: 0,
        results: [],
        totalExecutionTime: 0
      };
    }

    const startTime = Date.now();
    const results: AgentExecutionResult[] = [];
    let successfulAgents = 0;
    let failedAgents = 0;

    console.log(`🔄 Starting sequential execution of ${agents.length} agents for Stage ${context.stageNumber}`);

    for (const agent of agents) {
      const result = await this.executeAgent(agent, {
        ...context,
        taskId: `${context.taskId}-${agent.id}`
      });

      results.push(result);

      if (result.status === TaskStatus.COMPLETED) {
        successfulAgents++;
      } else {
        failedAgents++;
      }
    }

    const totalExecutionTime = Date.now() - startTime;

    const sequentialResult: ParallelExecutionResult = {
      stage: context.stageNumber,
      totalAgents: agents.length,
      successfulAgents,
      failedAgents,
      results,
      totalExecutionTime
    };

    console.log(`🏁 Sequential execution completed for Stage ${context.stageNumber}:`);
    console.log(`   ✅ Successful: ${successfulAgents}/${agents.length}`);
    console.log(`   ❌ Failed: ${failedAgents}/${agents.length}`);
    console.log(`   ⏱️  Total time: ${totalExecutionTime}ms`);

    return sequentialResult;
  }

  /**
   * Gets a summary of artifacts generated by a parallel execution result.
   */
  static getArtifactsSummary(parallelResult: ParallelExecutionResult): ArtifactsSummary {
    const allArtifacts = parallelResult.results
      .filter(result => result.result.success)
      .flatMap(result => result.result.artifacts);

    const artifactsByType = new Map<string, number>();
    allArtifacts.forEach(artifact => {
      const count = artifactsByType.get(artifact.type) || 0;
      artifactsByType.set(artifact.type, count + 1);
    });

    return {
      totalArtifacts: allArtifacts.length,
      artifactsByType: Object.fromEntries(artifactsByType),
      artifacts: allArtifacts
    };
  }
}

/**
 * Result of executing a single agent.
 */
export interface AgentExecutionResult {
  agentId: string;
  agentName: string;
  stage: number;
  result: AgentResult;
  executionTime: number;
  status: TaskStatus;
  error?: string;
}

/**
 * Result of executing multiple agents in parallel or sequence.
 */
export interface ParallelExecutionResult {
  stage: number;
  totalAgents: number;
  successfulAgents: number;
  failedAgents: number;
  results: AgentExecutionResult[];
  totalExecutionTime: number;
}

/**
 * Summary of artifacts generated during execution.
 */
export interface ArtifactsSummary {
  totalArtifacts: number;
  artifactsByType: Record<string, number>;
  artifacts: any[];
}