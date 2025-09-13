import { DatabaseService } from '../../services/database.js';
import { 
  testUsers, 
  testProjects, 
  testAgents, 
  testTasks, 
  testArtifacts,
  generateTestDataSet,
  TestUser,
  TestProject,
  TestAgent,
  TestTask,
  TestArtifact
} from './test-data.js';

export class DatabaseSeeder {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Clears all test data from the database
   */
  async clearAll(): Promise<void> {
    const client = this.databaseService.getClient();
    
    // Delete in correct order to respect foreign key constraints
    await client.artifact.deleteMany();
    await client.task.deleteMany();
    await client.project.deleteMany();
    await client.user.deleteMany();
    await client.agent.deleteMany();
  }

  /**
   * Seeds the database with predefined test data
   */
  async seedTestData(): Promise<void> {
    const client = this.databaseService.getClient();

    // Seed users
    await client.user.createMany({
      data: testUsers,
      skipDuplicates: true
    });

    // Seed agents
    await client.agent.createMany({
      data: testAgents,
      skipDuplicates: true
    });

    // Seed projects
    await client.project.createMany({
      data: testProjects,
      skipDuplicates: true
    });

    // Seed tasks
    await client.task.createMany({
      data: testTasks,
      skipDuplicates: true
    });

    // Seed artifacts
    await client.artifact.createMany({
      data: testArtifacts,
      skipDuplicates: true
    });
  }

  /**
   * Seeds the database with random test data
   */
  async seedRandomData(numUsers: number = 5, projectsPerUser: number = 3): Promise<{
    users: TestUser[];
    projects: TestProject[];
    tasks: TestTask[];
    artifacts: TestArtifact[];
  }> {
    const client = this.databaseService.getClient();
    const testData = generateTestDataSet(numUsers, projectsPerUser);

    // Seed agents first (required for tasks)
    await client.agent.createMany({
      data: testAgents,
      skipDuplicates: true
    });

    // Seed users
    await client.user.createMany({
      data: testData.users,
      skipDuplicates: true
    });

    // Seed projects
    await client.project.createMany({
      data: testData.projects,
      skipDuplicates: true
    });

    // Seed tasks
    await client.task.createMany({
      data: testData.tasks,
      skipDuplicates: true
    });

    // Seed artifacts
    await client.artifact.createMany({
      data: testData.artifacts,
      skipDuplicates: true
    });

    return testData;
  }

  /**
   * Seeds only agents (useful for agent-specific tests)
   */
  async seedAgents(): Promise<void> {
    const client = this.databaseService.getClient();
    
    await client.agent.createMany({
      data: testAgents,
      skipDuplicates: true
    });
  }

  /**
   * Seeds a minimal dataset for basic testing
   */
  async seedMinimalData(): Promise<{
    user: TestUser;
    project: TestProject;
    agent: TestAgent;
  }> {
    const client = this.databaseService.getClient();

    const user = testUsers[0];
    const project = testProjects[0];
    const agent = testAgents[0];

    await client.user.create({
      data: user
    });

    await client.agent.create({
      data: agent
    });

    await client.project.create({
      data: project
    });

    return { user, project, agent };
  }

  /**
   * Seeds data for a specific project scenario
   */
  async seedProjectScenario(scenario: 'new' | 'in-progress' | 'completed' | 'failed'): Promise<{
    user: TestUser;
    project: TestProject;
    tasks: TestTask[];
    artifacts: TestArtifact[];
  }> {
    const client = this.databaseService.getClient();

    // Create user
    const user = testUsers[0];
    await client.user.create({ data: user });

    // Seed agents
    await this.seedAgents();

    let project: TestProject;
    let tasks: TestTask[] = [];
    let artifacts: TestArtifact[] = [];

    switch (scenario) {
      case 'new':
        project = {
          ...testProjects[0],
          status: 'CREATED' as any,
          currentStage: 1
        };
        break;

      case 'in-progress':
        project = {
          ...testProjects[1],
          status: 'IN_PROGRESS' as any,
          currentStage: 3
        };
        tasks = testTasks.filter(t => t.projectId === project.id && t.stage <= 2);
        artifacts = testArtifacts.filter(a => a.projectId === project.id);
        break;

      case 'completed':
        project = {
          ...testProjects[2],
          status: 'COMPLETED' as any,
          currentStage: 6
        };
        tasks = testTasks.filter(t => t.projectId === project.id);
        artifacts = testArtifacts.filter(a => a.projectId === project.id);
        break;

      case 'failed':
        project = {
          ...testProjects[4],
          status: 'FAILED' as any,
          currentStage: 1
        };
        tasks = [testTasks.find(t => t.status === 'FAILED')!];
        break;

      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }

    // Create project
    await client.project.create({ data: project });

    // Create tasks if any
    if (tasks.length > 0) {
      await client.task.createMany({
        data: tasks.map(task => ({ ...task, projectId: project.id })),
        skipDuplicates: true
      });
    }

    // Create artifacts if any
    if (artifacts.length > 0) {
      await client.artifact.createMany({
        data: artifacts.map(artifact => ({ ...artifact, projectId: project.id })),
        skipDuplicates: true
      });
    }

    return { user, project, tasks, artifacts };
  }

  /**
   * Seeds data for performance testing
   */
  async seedPerformanceData(scale: 'small' | 'medium' | 'large' = 'medium'): Promise<void> {
    const scales = {
      small: { users: 10, projectsPerUser: 2 },
      medium: { users: 50, projectsPerUser: 5 },
      large: { users: 100, projectsPerUser: 10 }
    };

    const config = scales[scale];
    await this.seedRandomData(config.users, config.projectsPerUser);
  }

  /**
   * Seeds data for concurrent testing
   */
  async seedConcurrentTestData(): Promise<{
    users: TestUser[];
    projects: TestProject[];
  }> {
    const client = this.databaseService.getClient();
    const numUsers = 20;
    const projectsPerUser = 1;

    // Generate users for concurrent testing
    const users: TestUser[] = [];
    for (let i = 0; i < numUsers; i++) {
      users.push({
        id: `concurrent-user-${i}`,
        email: `concurrent-user-${i}@example.com`
      });
    }

    // Generate projects
    const projects: TestProject[] = [];
    users.forEach((user, index) => {
      projects.push({
        id: `concurrent-project-${index}`,
        name: `Concurrent Test Project ${index}`,
        idea: `Test idea for concurrent processing ${index}`,
        userId: user.id,
        status: 'CREATED' as any,
        currentStage: 1
      });
    });

    // Seed agents
    await this.seedAgents();

    // Seed users and projects
    await client.user.createMany({
      data: users,
      skipDuplicates: true
    });

    await client.project.createMany({
      data: projects,
      skipDuplicates: true
    });

    return { users, projects };
  }

  /**
   * Gets seeded data counts for verification
   */
  async getDataCounts(): Promise<{
    users: number;
    projects: number;
    agents: number;
    tasks: number;
    artifacts: number;
  }> {
    const client = this.databaseService.getClient();

    const [users, projects, agents, tasks, artifacts] = await Promise.all([
      client.user.count(),
      client.project.count(),
      client.agent.count(),
      client.task.count(),
      client.artifact.count()
    ]);

    return { users, projects, agents, tasks, artifacts };
  }

  /**
   * Verifies data integrity after seeding
   */
  async verifyDataIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const client = this.databaseService.getClient();
    const issues: string[] = [];

    try {
      // Check for orphaned projects (projects without users)
      const orphanedProjects = await client.project.findMany({
        where: {
          user: null
        }
      });

      if (orphanedProjects.length > 0) {
        issues.push(`Found ${orphanedProjects.length} orphaned projects`);
      }

      // Check for orphaned tasks (tasks without projects)
      const orphanedTasks = await client.task.findMany({
        where: {
          project: null
        }
      });

      if (orphanedTasks.length > 0) {
        issues.push(`Found ${orphanedTasks.length} orphaned tasks`);
      }

      // Check for orphaned artifacts (artifacts without projects)
      const orphanedArtifacts = await client.artifact.findMany({
        where: {
          project: null
        }
      });

      if (orphanedArtifacts.length > 0) {
        issues.push(`Found ${orphanedArtifacts.length} orphaned artifacts`);
      }

      // Check for tasks referencing non-existent agents
      const tasks = await client.task.findMany();
      const agents = await client.agent.findMany();
      const agentNames = new Set(agents.map(a => a.name));

      const invalidTasks = tasks.filter(task => !agentNames.has(task.agent));
      if (invalidTasks.length > 0) {
        issues.push(`Found ${invalidTasks.length} tasks with invalid agent references`);
      }

      // Check for projects with invalid stage numbers
      const invalidStageProjects = await client.project.findMany({
        where: {
          OR: [
            { currentStage: { lt: 1 } },
            { currentStage: { gt: 6 } }
          ]
        }
      });

      if (invalidStageProjects.length > 0) {
        issues.push(`Found ${invalidStageProjects.length} projects with invalid stage numbers`);
      }

    } catch (error) {
      issues.push(`Error during integrity check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Creates a transaction-safe seeding operation
   */
  async seedWithTransaction<T>(
    seedOperation: (client: any) => Promise<T>
  ): Promise<T> {
    return this.databaseService.transaction(async (tx) => {
      return seedOperation(tx);
    });
  }

  /**
   * Seeds data for error scenario testing
   */
  async seedErrorScenarios(): Promise<{
    validProject: TestProject;
    invalidUserProject: Partial<TestProject>;
    duplicateProject: TestProject;
  }> {
    const client = this.databaseService.getClient();

    // Create valid user and project
    const user = testUsers[0];
    await client.user.create({ data: user });

    const validProject = testProjects[0];
    await client.project.create({ data: validProject });

    // Define invalid scenarios (these won't be created, just returned for testing)
    const invalidUserProject = {
      id: 'invalid-user-project',
      name: 'Invalid User Project',
      idea: 'This project references a non-existent user',
      userId: 'non-existent-user',
      status: 'CREATED' as any,
      currentStage: 1
    };

    const duplicateProject = {
      ...validProject,
      id: validProject.id // Same ID as existing project
    };

    return {
      validProject,
      invalidUserProject,
      duplicateProject
    };
  }
}

// Utility function to create seeder instance
export function createDatabaseSeeder(databaseService?: DatabaseService): DatabaseSeeder {
  const dbService = databaseService || DatabaseService.getInstance();
  return new DatabaseSeeder(dbService);
}