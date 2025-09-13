import { Request, Response } from 'express';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { DatabaseService } from '../services/database.js';

/**
 * Controller for handling agent-related HTTP requests.
 * Provides endpoints for retrieving agent information and statistics.
 * Requirements: 6.2
 */
export class AgentController {
  private agentRegistry: AgentRegistry;
  private databaseService: DatabaseService;

  constructor(agentRegistry: AgentRegistry, databaseService: DatabaseService) {
    this.agentRegistry = agentRegistry;
    this.databaseService = databaseService;
  }

  /**
   * Retrieves all available agents with their descriptions and stages.
   * GET /api/agents
   * Requirements: 6.2
   */
  getAgents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        stage,
        active = 'true',
        includeInactive = 'false'
      } = req.query;

      // Validate stage parameter if provided
      if (stage !== undefined) {
        const stageNum = parseInt(stage as string, 10);
        if (isNaN(stageNum) || stageNum < 1 || stageNum > 6) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Stage must be an integer between 1 and 6',
            statusCode: 400
          });
          return;
        }
      }

      // Get agents from database to ensure we have the most up-to-date information
      const prisma = this.databaseService.getClient();
      
      const whereClause: any = {};
      
      // Filter by stage if provided
      if (stage !== undefined) {
        whereClause.stage = parseInt(stage as string, 10);
      }
      
      // Filter by active status
      if (includeInactive !== 'true') {
        whereClause.isActive = true;
      }

      const agents = await prisma.agent.findMany({
        where: whereClause,
        orderBy: [
          { stage: 'asc' },
          { name: 'asc' }
        ]
      });

      // Get registry statistics for additional context
      const registryStats = this.agentRegistry.getStats();

      res.status(200).json({
        success: true,
        data: {
          agents,
          stats: {
            total: agents.length,
            byStage: agents.reduce((acc, agent) => {
              acc[agent.stage] = (acc[agent.stage] || 0) + 1;
              return acc;
            }, {} as Record<number, number>),
            registryStats: {
              totalRegistered: registryStats.totalAgents,
              activeRegistered: registryStats.activeAgents,
              stageDistribution: registryStats.stageDistribution
            }
          }
        }
      });

    } catch (error) {
      console.error('Error retrieving agents:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve agents',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Retrieves a specific agent by ID.
   * GET /api/agents/:id
   * Requirements: 6.2
   */
  getAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || id.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Agent ID is required',
          statusCode: 400
        });
        return;
      }

      const prisma = this.databaseService.getClient();
      
      const agent = await prisma.agent.findUnique({
        where: { id: id.trim() }
      });

      if (!agent) {
        res.status(404).json({
          error: 'Not Found',
          message: `Agent not found: ${id}`,
          statusCode: 404
        });
        return;
      }

      // Check if agent is registered in the registry
      const registeredAgent = this.agentRegistry.getAgent(id.trim());
      const isRegistered = registeredAgent !== undefined;

      res.status(200).json({
        success: true,
        data: {
          agent,
          registryInfo: {
            isRegistered,
            registeredName: registeredAgent?.name
          }
        }
      });

    } catch (error) {
      console.error(`Error retrieving agent ${req.params.id}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve agent',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Retrieves agents for a specific stage.
   * GET /api/agents/stage/:stage
   * Requirements: 6.2
   */
  getAgentsByStage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { stage } = req.params;
      const { includeInactive = 'false' } = req.query;

      const stageNum = parseInt(stage, 10);
      if (isNaN(stageNum) || stageNum < 1 || stageNum > 6) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Stage must be an integer between 1 and 6',
          statusCode: 400
        });
        return;
      }

      const prisma = this.databaseService.getClient();
      
      const whereClause: any = { stage: stageNum };
      if (includeInactive !== 'true') {
        whereClause.isActive = true;
      }

      const agents = await prisma.agent.findMany({
        where: whereClause,
        orderBy: { name: 'asc' }
      });

      // Get registered agents for this stage
      const registeredAgents = this.agentRegistry.getAgentsForStage(stageNum);

      res.status(200).json({
        success: true,
        data: {
          stage: stageNum,
          agents,
          registryInfo: {
            registeredCount: registeredAgents.length,
            registeredAgents: registeredAgents.map(agent => ({
              id: agent.id,
              name: agent.name,
              description: agent.description
            }))
          }
        }
      });

    } catch (error) {
      console.error(`Error retrieving agents for stage ${req.params.stage}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve agents for stage',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Gets agent registry statistics and health information.
   * GET /api/agents/stats
   * Requirements: 6.2
   */
  getAgentStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const prisma = this.databaseService.getClient();
      
      // Get database statistics
      const [totalAgents, activeAgents, agentsByStage] = await Promise.all([
        prisma.agent.count(),
        prisma.agent.count({ where: { isActive: true } }),
        prisma.agent.groupBy({
          by: ['stage'],
          _count: { stage: true },
          orderBy: { stage: 'asc' }
        })
      ]);

      // Get registry statistics
      const registryStats = this.agentRegistry.getStats();
      
      // Validate stage coverage
      const stageCoverage = this.agentRegistry.validateStagesCoverage();

      const stageDistribution = agentsByStage.reduce((acc, item) => {
        acc[item.stage] = item._count.stage;
        return acc;
      }, {} as Record<number, number>);

      res.status(200).json({
        success: true,
        data: {
          database: {
            totalAgents,
            activeAgents,
            inactiveAgents: totalAgents - activeAgents,
            stageDistribution
          },
          registry: {
            totalRegistered: registryStats.totalAgents,
            activeRegistered: registryStats.activeAgents,
            stageDistribution: registryStats.stageDistribution,
            isInitialized: this.agentRegistry.isInitialized()
          },
          coverage: {
            isValid: stageCoverage.isValid,
            missingStages: stageCoverage.missingStages,
            requiredStages: [1, 2, 3, 4, 5, 6]
          }
        }
      });

    } catch (error) {
      console.error('Error retrieving agent statistics:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve agent statistics',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Searches agents by name or description.
   * GET /api/agents/search
   * Requirements: 6.2
   */
  searchAgents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, stage, includeInactive = 'false' } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Search query (q) is required and must be a non-empty string',
          statusCode: 400
        });
        return;
      }

      const searchTerm = q.trim();
      if (searchTerm.length < 2) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Search query must be at least 2 characters long',
          statusCode: 400
        });
        return;
      }

      // Validate stage parameter if provided
      if (stage !== undefined) {
        const stageNum = parseInt(stage as string, 10);
        if (isNaN(stageNum) || stageNum < 1 || stageNum > 6) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Stage must be an integer between 1 and 6',
            statusCode: 400
          });
          return;
        }
      }

      const prisma = this.databaseService.getClient();
      
      const whereClause: any = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      if (stage !== undefined) {
        whereClause.stage = parseInt(stage as string, 10);
      }

      if (includeInactive !== 'true') {
        whereClause.isActive = true;
      }

      const agents = await prisma.agent.findMany({
        where: whereClause,
        orderBy: [
          { stage: 'asc' },
          { name: 'asc' }
        ]
      });

      // Also search in registry for additional context
      const registryMatches = this.agentRegistry.findAgentsByName(searchTerm);

      res.status(200).json({
        success: true,
        data: {
          query: searchTerm,
          agents,
          registryMatches: registryMatches.map(agent => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            stage: agent.stage
          })),
          total: agents.length
        }
      });

    } catch (error) {
      console.error('Error searching agents:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search agents',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };
}