import {
  Project,
  ProjectStatus,
  CreateProject,
  UpdateProject,
  QueryOptions,
  PaginatedResponse,
  PaginationOptions,
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectResponse,
  GetProjectsResponse
} from '../types/index.js';
import { DatabaseService } from './database.js';
import { AgentOrchestrator } from './AgentOrchestrator.js';
import { validateProject, validateProjectUpdate } from '../types/validation.js';

/**
 * Service for managing projects with CRUD operations and pipeline integration.
 * Handles project creation, retrieval, updates, and automatic pipeline initiation.
 */
export class ProjectService {
  private databaseService: DatabaseService;
  private agentOrchestrator?: AgentOrchestrator;

  constructor(
    databaseService: DatabaseService,
    agentOrchestrator?: AgentOrchestrator
  ) {
    this.databaseService = databaseService;
    this.agentOrchestrator = agentOrchestrator;
  }

  /**
   * Creates a new project and automatically initiates the pipeline.
   * Requirements: 1.1, 5.2, 5.3
   */
  async createProject(request: CreateProjectRequest): Promise<CreateProjectResponse> {
    const prisma = this.databaseService.getClient();

    try {
      // Validate input
      const validation = validateProject({
        name: request.name || this.generateProjectName(request.idea),
        idea: request.idea,
        userId: request.userId,
        ollamaModel: request.ollamaModel,
        modelType: request.modelType,
        modelName: request.modelName,
        status: ProjectStatus.CREATED,
        currentStage: 1
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create project in database transaction
      const project = await this.databaseService.transaction(async (tx) => {
        const newProject = await tx.project.create({
          data: {
            name: request.name || this.generateProjectName(request.idea),
            idea: request.idea,
            userId: request.userId,
            ollamaModel: request.ollamaModel,
            modelType: request.modelType,
            modelName: request.modelName,
            status: ProjectStatus.CREATED,
            currentStage: 1
          },
          include: {
            tasks: true,
            artifacts: true
          }
        });

        return newProject;
      });

      // Automatically initiate pipeline if orchestrator is available
      if (this.agentOrchestrator) {
        try {
          // Start pipeline asynchronously to avoid blocking the response
          setImmediate(() => {
            this.agentOrchestrator!.startProject(project.id, request.groqApiKey).catch(error => {
              console.error(`Failed to start pipeline for project ${project.id}:`, error);
            });
          });
        } catch (error) {
          console.warn(`Pipeline initiation failed for project ${project.id}:`, error);
          // Don't throw here - project creation succeeded, pipeline can be retried
        }
      }

      console.log(`✅ Project created successfully: ${project.id}`);

      return {
        project,
        message: 'Project created successfully and pipeline initiated'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Project creation failed:', errorMessage);
      throw new Error(`Failed to create project: ${errorMessage}`);
    }
  }

  /**
   * Retrieves a project by ID with optional inclusion of tasks and artifacts.
   * Requirements: 1.2, 5.3
   */
  async getProject(id: string, options: QueryOptions = {}): Promise<GetProjectResponse> {
    const prisma = this.databaseService.getClient();

    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          tasks: options.include?.tasks ?? true,
          artifacts: options.include?.artifacts ?? true,
          user: options.include?.user ?? false
        }
      });

      if (!project) {
        throw new Error(`Project not found: ${id}`);
      }

      return { project: project as Project };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to retrieve project ${id}:`, errorMessage);
      throw new Error(`Failed to retrieve project: ${errorMessage}`);
    }
  }

  /**
   * Retrieves all projects with optional pagination and filtering.
   * Requirements: 1.2
   */
  async getProjects(
    userId?: string,
    pagination?: PaginationOptions,
    options: QueryOptions = {}
  ): Promise<GetProjectsResponse> {
    const prisma = this.databaseService.getClient();

    try {
      const where = userId ? { userId } : {};

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            tasks: options.include?.tasks ?? false,
            artifacts: options.include?.artifacts ?? false,
            user: options.include?.user ?? false
          },
          orderBy: options.orderBy ?? { createdAt: 'desc' },
          ...(pagination && {
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit
          }),
          ...(options.limit && { take: options.limit }),
          ...(options.offset && { skip: options.offset })
        }),
        prisma.project.count({ where })
      ]);

      return {
        projects: projects as Project[],
        total
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to retrieve projects:', errorMessage);
      throw new Error(`Failed to retrieve projects: ${errorMessage}`);
    }
  }

  /**
   * Updates project status and other properties.
   * Requirements: 1.3, 5.3
   */
  async updateProject(id: string, updates: UpdateProject): Promise<Project> {
    const prisma = this.databaseService.getClient();

    try {
      // Validate updates
      const validation = validateProjectUpdate(updates);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if project exists
      const existingProject = await prisma.project.findUnique({
        where: { id }
      });

      if (!existingProject) {
        throw new Error(`Project not found: ${id}`);
      }

      // Update project
      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          tasks: true,
          artifacts: true
        }
      });

      console.log(`✅ Project updated successfully: ${id}`);
      return updatedProject as Project;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to update project ${id}:`, errorMessage);
      throw new Error(`Failed to update project: ${errorMessage}`);
    }
  }

  /**
   * Updates project status specifically.
   * Requirements: 1.3, 5.3
   */
  async updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
    return this.updateProject(id, { status });
  }

  /**
   * Updates project current stage.
   * Requirements: 1.3, 5.3
   */
  async updateProjectStage(id: string, currentStage: number): Promise<Project> {
    if (currentStage < 1 || currentStage > 6) {
      throw new Error('Stage must be between 1 and 6');
    }
    return this.updateProject(id, { currentStage });
  }

  /**
   * Deletes a project and all associated data.
   * Requirements: 1.3
   */
  async deleteProject(id: string): Promise<void> {
    const prisma = this.databaseService.getClient();

    try {
      // Check if project exists
      const existingProject = await prisma.project.findUnique({
        where: { id }
      });

      if (!existingProject) {
        throw new Error(`Project not found: ${id}`);
      }

      // Delete project and all related data (cascade delete)
      await this.databaseService.transaction(async (tx) => {
        // Delete artifacts first
        await tx.artifact.deleteMany({
          where: { projectId: id }
        });

        // Delete tasks
        await tx.task.deleteMany({
          where: { projectId: id }
        });

        // Delete project
        await tx.project.delete({
          where: { id }
        });
      });

      console.log(`✅ Project deleted successfully: ${id}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to delete project ${id}:`, errorMessage);
      throw new Error(`Failed to delete project: ${errorMessage}`);
    }
  }

  /**
   * Gets project statistics for a user.
   */
  async getProjectStats(userId: string): Promise<{
    total: number;
    byStatus: Record<ProjectStatus, number>;
    byStage: Record<number, number>;
  }> {
    const prisma = this.databaseService.getClient();

    try {
      const projects = await prisma.project.findMany({
        where: { userId },
        select: { status: true, currentStage: true }
      });

      const total = projects.length;

      const byStatus = projects.reduce((acc, project) => {
        acc[project.status as ProjectStatus] = (acc[project.status as ProjectStatus] || 0) + 1;
        return acc;
      }, {} as Record<ProjectStatus, number>);

      const byStage = projects.reduce((acc, project) => {
        acc[project.currentStage] = (acc[project.currentStage] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return { total, byStatus, byStage };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to get project stats for user ${userId}:`, errorMessage);
      throw new Error(`Failed to get project stats: ${errorMessage}`);
    }
  }

  /**
   * Restarts a failed or paused project.
   */
  async restartProject(id: string): Promise<Project> {
    const prisma = this.databaseService.getClient();

    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: { tasks: true }
      });

      if (!project) {
        throw new Error(`Project not found: ${id}`);
      }

      if (project.status === ProjectStatus.COMPLETED) {
        throw new Error('Cannot restart a completed project');
      }

      // Reset project status and restart pipeline
      const updatedProject = await this.updateProject(id, {
        status: ProjectStatus.IN_PROGRESS
      });

      // Restart pipeline if orchestrator is available
      if (this.agentOrchestrator) {
        setImmediate(() => {
          this.agentOrchestrator!.startProject(id).catch(error => {
            console.error(`Failed to restart pipeline for project ${id}:`, error);
          });
        });
      }

      return updatedProject;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to restart project ${id}:`, errorMessage);
      throw new Error(`Failed to restart project: ${errorMessage}`);
    }
  }

  /**
   * Generates a project name from the idea text.
   */
  private generateProjectName(idea: string): string {
    // Extract first meaningful words from the idea
    const words = idea
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 4);

    if (words.length === 0) {
      return `Project ${Date.now()}`;
    }

    // Capitalize first letter of each word and join
    const name = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return name.length > 50 ? name.substring(0, 47) + '...' : name;
  }

  /**
   * Sets the agent orchestrator for pipeline integration.
   */
  setAgentOrchestrator(orchestrator: AgentOrchestrator): void {
    this.agentOrchestrator = orchestrator;
  }
}