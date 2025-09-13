import { Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService.js';
import { 
  CreateProjectRequest, 
  ProjectStatus,
  QueryOptions,
  PaginationOptions 
} from '../types/index.js';

/**
 * Controller for handling project-related HTTP requests.
 * Implements CRUD operations for projects with proper error handling and validation.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class ProjectController {
  private projectService: ProjectService;

  constructor(projectService: ProjectService) {
    this.projectService = projectService;
  }

  /**
   * Creates a new project from a business idea.
   * POST /api/projects
   * Requirements: 1.1
   */
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      // Extract fields from request body
      const { idea, name, userId, ollamaModel, modelType, modelName, groqApiKey } = req.body;

      // Validate required fields
      if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Idea is required and must be a non-empty string',
          statusCode: 400
        });
        return;
      }

      // Validate idea length
      if (idea.trim().length < 10) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Idea must be at least 10 characters long',
          statusCode: 400
        });
        return;
      }

      if (idea.trim().length > 5000) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Idea must be less than 5000 characters',
          statusCode: 400
        });
        return;
      }

      // Validate optional name field
      if (name && (typeof name !== 'string' || name.trim().length === 0)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Name must be a non-empty string if provided',
          statusCode: 400
        });
        return;
      }

      // Validate optional userId field
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'User ID must be a non-empty string if provided',
          statusCode: 400
        });
        return;
      }

      // Validate optional ollamaModel field
      if (ollamaModel && (typeof ollamaModel !== 'string' || ollamaModel.trim().length === 0)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Ollama model must be a non-empty string if provided',
          statusCode: 400
        });
        return;
      }

      // Validate optional modelType field
      if (modelType && !['ollama', 'groq'].includes(modelType)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Model type must be either "ollama" or "groq" if provided',
          statusCode: 400
        });
        return;
      }

      // Validate optional modelName field
      if (modelName && (typeof modelName !== 'string' || modelName.trim().length === 0)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Model name must be a non-empty string if provided',
          statusCode: 400
        });
        return;
      }

      const createRequest: CreateProjectRequest = {
        idea: idea.trim(),
        ...(name && { name: name.trim() }),
        ...(userId && { userId: userId.trim() }),
        ...(ollamaModel && { ollamaModel: ollamaModel.trim() }),
        ...(modelType && { modelType: modelType.trim() }),
        ...(modelName && { modelName: modelName.trim() }),
        ...(groqApiKey && { groqApiKey: groqApiKey.trim() })
      };

      const result = await this.projectService.createProject(createRequest);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Project created successfully'
      });

    } catch (error) {
      console.error('Error creating project:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('Validation failed')) {
        res.status(400).json({
          error: 'Validation Error',
          message: errorMessage,
          statusCode: 400
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create project',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Retrieves all projects with optional filtering and pagination.
   * GET /api/projects
   * Requirements: 1.2
   */
  getProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        userId, 
        page = '1', 
        limit = '10',
        includeTasks = 'false',
        includeArtifacts = 'false',
        includeUser = 'false',
        orderBy = 'createdAt',
        orderDirection = 'desc'
      } = req.query;

      // Validate pagination parameters
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Page must be a positive integer',
          statusCode: 400
        });
        return;
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Limit must be between 1 and 100',
          statusCode: 400
        });
        return;
      }

      // Validate orderBy parameter
      const validOrderByFields = ['createdAt', 'updatedAt', 'name', 'status', 'currentStage'];
      if (!validOrderByFields.includes(orderBy as string)) {
        res.status(400).json({
          error: 'Validation Error',
          message: `OrderBy must be one of: ${validOrderByFields.join(', ')}`,
          statusCode: 400
        });
        return;
      }

      // Validate orderDirection parameter
      const validDirections = ['asc', 'desc'];
      if (!validDirections.includes(orderDirection as string)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'OrderDirection must be either "asc" or "desc"',
          statusCode: 400
        });
        return;
      }

      const pagination: PaginationOptions = {
        page: pageNum,
        limit: limitNum
      };

      const options: QueryOptions = {
        include: {
          tasks: includeTasks === 'true',
          artifacts: includeArtifacts === 'true',
          user: includeUser === 'true'
        },
        orderBy: {
          [orderBy as string]: orderDirection as 'asc' | 'desc'
        }
      };

      const result = await this.projectService.getProjects(
        userId as string || undefined,
        pagination,
        options
      );

      const totalPages = Math.ceil(result.total / limitNum);

      res.status(200).json({
        success: true,
        data: {
          projects: result.projects,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            totalPages
          }
        }
      });

    } catch (error) {
      console.error('Error retrieving projects:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve projects',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Retrieves a specific project by ID.
   * GET /api/projects/:id
   * Requirements: 1.2
   */
  getProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { 
        includeTasks = 'true',
        includeArtifacts = 'true',
        includeUser = 'false'
      } = req.query;

      if (!id || id.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Project ID is required',
          statusCode: 400
        });
        return;
      }

      const options: QueryOptions = {
        include: {
          tasks: includeTasks === 'true',
          artifacts: includeArtifacts === 'true',
          user: includeUser === 'true'
        }
      };

      const result = await this.projectService.getProject(id.trim(), options);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error(`Error retrieving project ${req.params.id}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: errorMessage,
          statusCode: 404
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve project',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Updates a project's properties.
   * PUT /api/projects/:id
   * Requirements: 2.1, 2.2, 2.4, 2.5, 5.2, 5.4
   */
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, status, currentStage, ollamaModel, modelType, modelName } = req.body;

      if (!id || id.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Project ID is required',
          statusCode: 400
        });
        return;
      }

      // Validate at least one field is provided
      if (name === undefined && status === undefined && currentStage === undefined && ollamaModel === undefined && modelType === undefined && modelName === undefined) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'At least one field (name, status, currentStage, ollamaModel, modelType, modelName) must be provided',
          statusCode: 400
        });
        return;
      }

      // Validate name if provided
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Project name must be a non-empty string',
            statusCode: 400
          });
          return;
        }

        // Enhanced name validation for character restrictions
        const trimmedName = name.trim();
        if (trimmedName.length < 3) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Project name must be at least 3 characters long',
            statusCode: 400
          });
          return;
        }

        if (trimmedName.length > 100) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Project name must be less than 100 characters',
            statusCode: 400
          });
          return;
        }

        // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
        const namePattern = /^[a-zA-Z0-9\s\-_]+$/;
        if (!namePattern.test(trimmedName)) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
            statusCode: 400
          });
          return;
        }
      }

      // Validate ollamaModel if provided
      if (ollamaModel !== undefined) {
        if (ollamaModel !== null && (typeof ollamaModel !== 'string' || ollamaModel.trim().length === 0)) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Ollama model must be a non-empty string or null',
            statusCode: 400
          });
          return;
        }

        // Basic validation for model name format (if not null)
        if (ollamaModel !== null) {
          const modelPattern = /^[a-zA-Z0-9\-_.:]+$/;
          if (!modelPattern.test(ollamaModel.trim())) {
            res.status(400).json({
              error: 'Validation Error',
              message: 'Ollama model name contains invalid characters',
              statusCode: 400
            });
            return;
          }
        }
      }

      // Validate modelType if provided
      if (modelType !== undefined && !['ollama', 'groq'].includes(modelType)) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Model type must be either "ollama" or "groq"',
          statusCode: 400
        });
        return;
      }

      // Validate modelName if provided
      if (modelName !== undefined) {
        if (modelName !== null && (typeof modelName !== 'string' || modelName.trim().length === 0)) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Model name must be a non-empty string or null',
            statusCode: 400
          });
          return;
        }

        // Basic validation for model name format (if not null)
        if (modelName !== null) {
          const modelPattern = /^[a-zA-Z0-9\-_.:\/]+$/;
          if (!modelPattern.test(modelName.trim())) {
            res.status(400).json({
              error: 'Validation Error',
              message: 'Model name contains invalid characters',
              statusCode: 400
            });
            return;
          }
        }
      }

      // Validate status if provided
      if (status !== undefined) {
        const validStatuses = Object.values(ProjectStatus);
        if (!validStatuses.includes(status)) {
          res.status(400).json({
            error: 'Validation Error',
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            statusCode: 400
          });
          return;
        }
      }

      // Validate currentStage if provided
      if (currentStage !== undefined) {
        if (!Number.isInteger(currentStage) || currentStage < 1 || currentStage > 6) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Current stage must be an integer between 1 and 6',
            statusCode: 400
          });
          return;
        }
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (status !== undefined) updates.status = status;
      if (currentStage !== undefined) updates.currentStage = currentStage;
      if (ollamaModel !== undefined) updates.ollamaModel = ollamaModel === null ? null : ollamaModel.trim();
      if (modelType !== undefined) updates.modelType = modelType === null ? null : modelType.trim();
      if (modelName !== undefined) updates.modelName = modelName === null ? null : modelName.trim();

      const updatedProject = await this.projectService.updateProject(id.trim(), updates);

      res.status(200).json({
        success: true,
        data: { project: updatedProject },
        message: 'Project updated successfully'
      });

    } catch (error) {
      console.error(`Error updating project ${req.params.id}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: errorMessage,
          statusCode: 404
        });
        return;
      }

      if (errorMessage.includes('Validation failed')) {
        res.status(400).json({
          error: 'Validation Error',
          message: errorMessage,
          statusCode: 400
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update project',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Deletes a project and all associated data.
   * DELETE /api/projects/:id
   * Requirements: 1.3
   */
  deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || id.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Project ID is required',
          statusCode: 400
        });
        return;
      }

      await this.projectService.deleteProject(id.trim());

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      });

    } catch (error) {
      console.error(`Error deleting project ${req.params.id}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: errorMessage,
          statusCode: 404
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete project',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Restarts a failed or paused project.
   * POST /api/projects/:id/restart
   * Requirements: 1.3
   */
  restartProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || id.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Project ID is required',
          statusCode: 400
        });
        return;
      }

      const restartedProject = await this.projectService.restartProject(id.trim());

      res.status(200).json({
        success: true,
        data: { project: restartedProject },
        message: 'Project restarted successfully'
      });

    } catch (error) {
      console.error(`Error restarting project ${req.params.id}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: errorMessage,
          statusCode: 404
        });
        return;
      }

      if (errorMessage.includes('Cannot restart')) {
        res.status(400).json({
          error: 'Bad Request',
          message: errorMessage,
          statusCode: 400
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to restart project',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  /**
   * Gets project statistics for a user.
   * GET /api/projects/stats/:userId
   * Requirements: 1.2
   */
  getProjectStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId || userId.trim().length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'User ID is required',
          statusCode: 400
        });
        return;
      }

      const stats = await this.projectService.getProjectStats(userId.trim());

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error(`Error getting project stats for user ${req.params.userId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve project statistics',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };
}