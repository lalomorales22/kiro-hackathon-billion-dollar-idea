import { ProjectStatus, TaskStatus, ArtifactType } from '../../types/index.js';

export interface TestUser {
  id: string;
  email: string;
}

export interface TestProject {
  id: string;
  name: string;
  idea: string;
  userId: string;
  status: ProjectStatus;
  currentStage: number;
}

export interface TestTask {
  id: string;
  name: string;
  status: TaskStatus;
  stage: number;
  agent: string;
  projectId: string;
  result?: string;
  error?: string;
}

export interface TestArtifact {
  id: string;
  name: string;
  content: string;
  type: ArtifactType;
  projectId: string;
}

export interface TestAgent {
  id: string;
  name: string;
  description: string;
  stage: number;
  prompt: string;
  isActive: boolean;
}

export const testUsers: TestUser[] = [
  {
    id: 'user-1',
    email: 'user1@example.com'
  },
  {
    id: 'user-2',
    email: 'user2@example.com'
  },
  {
    id: 'user-3',
    email: 'user3@example.com'
  }
];

export const testProjects: TestProject[] = [
  {
    id: 'project-1',
    name: 'AI Task Manager',
    idea: 'An AI-powered task management application that helps users prioritize and organize their work',
    userId: 'user-1',
    status: ProjectStatus.CREATED,
    currentStage: 1
  },
  {
    id: 'project-2',
    name: 'Smart Fitness Tracker',
    idea: 'A fitness tracking app that uses machine learning to provide personalized workout recommendations',
    userId: 'user-1',
    status: ProjectStatus.IN_PROGRESS,
    currentStage: 3
  },
  {
    id: 'project-3',
    name: 'Eco Shopping Platform',
    idea: 'An e-commerce platform focused on sustainable and eco-friendly products',
    userId: 'user-2',
    status: ProjectStatus.COMPLETED,
    currentStage: 6
  },
  {
    id: 'project-4',
    name: 'Language Learning Game',
    idea: 'A gamified language learning platform that makes learning new languages fun and engaging',
    userId: 'user-2',
    status: ProjectStatus.IN_PROGRESS,
    currentStage: 2
  },
  {
    id: 'project-5',
    name: 'Remote Work Hub',
    idea: 'A comprehensive platform for remote teams to collaborate, communicate, and manage projects',
    userId: 'user-3',
    status: ProjectStatus.FAILED,
    currentStage: 1
  }
];

export const testAgents: TestAgent[] = [
  {
    id: 'idea-structuring-agent',
    name: 'IdeaStructuringAgent',
    description: 'Converts raw business ideas into structured project descriptions',
    stage: 1,
    prompt: 'Structure this business idea into a comprehensive project description: {idea}',
    isActive: true
  },
  {
    id: 'market-research-agent',
    name: 'MarketResearchAgent',
    description: 'Conducts market research and competitive analysis',
    stage: 2,
    prompt: 'Conduct market research for this business idea: {idea}',
    isActive: true
  },
  {
    id: 'technical-architecture-agent',
    name: 'TechnicalArchitectureAgent',
    description: 'Designs technical architecture and system requirements',
    stage: 2,
    prompt: 'Design the technical architecture for: {idea}',
    isActive: true
  },
  {
    id: 'uiux-design-agent',
    name: 'UIUXDesignAgent',
    description: 'Creates user interface and user experience designs',
    stage: 3,
    prompt: 'Design the UI/UX for this application: {idea}',
    isActive: true
  },
  {
    id: 'frontend-development-agent',
    name: 'FrontendDevelopmentAgent',
    description: 'Generates frontend code and component specifications',
    stage: 3,
    prompt: 'Create frontend development specifications for: {idea}',
    isActive: true
  },
  {
    id: 'backend-development-agent',
    name: 'BackendDevelopmentAgent',
    description: 'Designs backend APIs and server architecture',
    stage: 3,
    prompt: 'Design the backend architecture and APIs for: {idea}',
    isActive: true
  },
  {
    id: 'database-design-agent',
    name: 'DatabaseDesignAgent',
    description: 'Creates database schemas and data models',
    stage: 3,
    prompt: 'Design the database schema for: {idea}',
    isActive: true
  },
  {
    id: 'qa-agent',
    name: 'QAAgent',
    description: 'Develops testing strategies and quality assurance plans',
    stage: 3,
    prompt: 'Create a comprehensive testing strategy for: {idea}',
    isActive: true
  },
  {
    id: 'business-formation-agent',
    name: 'BusinessFormationAgent',
    description: 'Provides business formation and legal structure guidance',
    stage: 4,
    prompt: 'Outline business formation requirements for: {idea}',
    isActive: true
  },
  {
    id: 'marketing-content-agent',
    name: 'MarketingContentAgent',
    description: 'Creates marketing content and strategies',
    stage: 4,
    prompt: 'Develop marketing content and strategy for: {idea}',
    isActive: true
  },
  {
    id: 'sales-funnel-agent',
    name: 'SalesFunnelAgent',
    description: 'Designs customer acquisition and sales funnels',
    stage: 4,
    prompt: 'Design a sales funnel for: {idea}',
    isActive: true
  },
  {
    id: 'customer-support-agent',
    name: 'CustomerSupportAgent',
    description: 'Develops customer support frameworks and processes',
    stage: 5,
    prompt: 'Create a customer support framework for: {idea}',
    isActive: true
  },
  {
    id: 'analytics-agent',
    name: 'AnalyticsAgent',
    description: 'Defines analytics and KPI tracking systems',
    stage: 5,
    prompt: 'Define analytics and KPIs for: {idea}',
    isActive: true
  },
  {
    id: 'financial-management-agent',
    name: 'FinancialManagementAgent',
    description: 'Creates financial projections and management plans',
    stage: 5,
    prompt: 'Create financial projections and management plan for: {idea}',
    isActive: true
  },
  {
    id: 'continuous-monitoring-agent',
    name: 'ContinuousMonitoringAgent',
    description: 'Establishes monitoring and alerting systems',
    stage: 6,
    prompt: 'Design monitoring and alerting systems for: {idea}',
    isActive: true
  },
  {
    id: 'optimization-agent',
    name: 'OptimizationAgent',
    description: 'Identifies optimization opportunities and improvements',
    stage: 6,
    prompt: 'Identify optimization opportunities for: {idea}',
    isActive: true
  }
];

export const testTasks: TestTask[] = [
  {
    id: 'task-1',
    name: 'Structure AI Task Manager Idea',
    status: TaskStatus.COMPLETED,
    stage: 1,
    agent: 'IdeaStructuringAgent',
    projectId: 'project-1',
    result: 'Successfully structured the AI task manager idea into a comprehensive project description'
  },
  {
    id: 'task-2',
    name: 'Market Research for Smart Fitness Tracker',
    status: TaskStatus.COMPLETED,
    stage: 2,
    agent: 'MarketResearchAgent',
    projectId: 'project-2',
    result: 'Completed market research showing strong demand for AI-powered fitness solutions'
  },
  {
    id: 'task-3',
    name: 'Technical Architecture for Smart Fitness Tracker',
    status: TaskStatus.COMPLETED,
    stage: 2,
    agent: 'TechnicalArchitectureAgent',
    projectId: 'project-2',
    result: 'Designed scalable microservices architecture with ML pipeline integration'
  },
  {
    id: 'task-4',
    name: 'UI/UX Design for Smart Fitness Tracker',
    status: TaskStatus.IN_PROGRESS,
    stage: 3,
    agent: 'UIUXDesignAgent',
    projectId: 'project-2'
  },
  {
    id: 'task-5',
    name: 'Structure Language Learning Game Idea',
    status: TaskStatus.COMPLETED,
    stage: 1,
    agent: 'IdeaStructuringAgent',
    projectId: 'project-4',
    result: 'Structured the gamified language learning concept with clear objectives'
  },
  {
    id: 'task-6',
    name: 'Market Research for Language Learning Game',
    status: TaskStatus.IN_PROGRESS,
    stage: 2,
    agent: 'MarketResearchAgent',
    projectId: 'project-4'
  },
  {
    id: 'task-7',
    name: 'Structure Remote Work Hub Idea',
    status: TaskStatus.FAILED,
    stage: 1,
    agent: 'IdeaStructuringAgent',
    projectId: 'project-5',
    error: 'Failed to generate structured description due to AI service timeout'
  }
];

export const testArtifacts: TestArtifact[] = [
  {
    id: 'artifact-1',
    name: 'AI Task Manager Project Description',
    content: 'A comprehensive AI-powered task management application that leverages machine learning to help users prioritize tasks, predict completion times, and optimize their workflow. The system will include intelligent scheduling, automated categorization, and personalized productivity insights.',
    type: ArtifactType.PROJECT_DESCRIPTION,
    projectId: 'project-1'
  },
  {
    id: 'artifact-2',
    name: 'Smart Fitness Tracker Market Analysis',
    content: 'Market research indicates a $15.6B fitness app market with 27% annual growth. Key competitors include MyFitnessPal, Strava, and Fitbit. Opportunity exists for AI-powered personalization with 73% of users wanting more customized workout recommendations.',
    type: ArtifactType.MARKET_RESEARCH,
    projectId: 'project-2'
  },
  {
    id: 'artifact-3',
    name: 'Smart Fitness Tracker Technical Architecture',
    content: 'Microservices architecture with: 1) User Management Service, 2) Workout Tracking Service, 3) ML Recommendation Engine, 4) Data Analytics Service, 5) Notification Service. Tech stack: Node.js, Python (ML), PostgreSQL, Redis, Docker, Kubernetes.',
    type: ArtifactType.TECHNICAL_SPECIFICATION,
    projectId: 'project-2'
  },
  {
    id: 'artifact-4',
    name: 'Smart Fitness Tracker UI Mockups',
    content: 'Mobile-first design with clean, motivational interface. Key screens: Dashboard with progress visualization, Workout planner with AI suggestions, Progress tracking with charts, Social features for community engagement, Settings with personalization options.',
    type: ArtifactType.DESIGN_MOCKUP,
    projectId: 'project-2'
  },
  {
    id: 'artifact-5',
    name: 'Language Learning Game Project Description',
    content: 'An engaging gamified language learning platform that combines proven language acquisition techniques with game mechanics. Features include story-driven lessons, multiplayer challenges, progress tracking, and adaptive difficulty based on user performance.',
    type: ArtifactType.PROJECT_DESCRIPTION,
    projectId: 'project-4'
  },
  {
    id: 'artifact-6',
    name: 'Eco Shopping Platform Business Plan',
    content: 'Complete business plan for sustainable e-commerce platform targeting environmentally conscious consumers. Revenue model includes marketplace fees, premium seller subscriptions, and carbon offset services. Projected $2M revenue in year 1.',
    type: ArtifactType.BUSINESS_PLAN,
    projectId: 'project-3'
  }
];

// Utility functions for test data generation
export function generateRandomUser(id?: string): TestUser {
  const userId = id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: userId,
    email: `${userId}@example.com`
  };
}

export function generateRandomProject(userId: string, id?: string): TestProject {
  const projectId = id || `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const ideas = [
    'A revolutionary AI-powered productivity app',
    'An innovative social media platform for professionals',
    'A sustainable food delivery service',
    'A virtual reality fitness training platform',
    'An automated personal finance management tool',
    'A blockchain-based supply chain tracking system',
    'An AI-driven mental health support application',
    'A smart home automation platform',
    'A peer-to-peer learning marketplace',
    'A carbon footprint tracking and reduction app'
  ];
  
  const names = [
    'ProductivityPro',
    'ConnectWork',
    'GreenEats',
    'VRFit',
    'MoneyMind',
    'ChainTrack',
    'MindCare',
    'SmartHome Hub',
    'LearnTogether',
    'EcoTracker'
  ];

  const randomIndex = Math.floor(Math.random() * ideas.length);
  const statuses = Object.values(ProjectStatus);
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  return {
    id: projectId,
    name: names[randomIndex],
    idea: ideas[randomIndex],
    userId,
    status: randomStatus,
    currentStage: Math.floor(Math.random() * 6) + 1
  };
}

export function generateRandomTask(projectId: string, stage: number, agent: string, id?: string): TestTask {
  const taskId = id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const statuses = Object.values(TaskStatus);
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  const taskNames = [
    `${agent} - Stage ${stage} Analysis`,
    `${agent} - Implementation Planning`,
    `${agent} - Research and Development`,
    `${agent} - Design and Architecture`,
    `${agent} - Strategy Development`
  ];

  const randomName = taskNames[Math.floor(Math.random() * taskNames.length)];
  
  const task: TestTask = {
    id: taskId,
    name: randomName,
    status: randomStatus,
    stage,
    agent,
    projectId
  };

  if (randomStatus === TaskStatus.COMPLETED) {
    task.result = `Successfully completed ${randomName.toLowerCase()}`;
  } else if (randomStatus === TaskStatus.FAILED) {
    task.error = `Failed to complete ${randomName.toLowerCase()} due to service unavailability`;
  }

  return task;
}

export function generateRandomArtifact(projectId: string, id?: string): TestArtifact {
  const artifactId = id || `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const types = Object.values(ArtifactType);
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  const artifacts = {
    [ArtifactType.PROJECT_DESCRIPTION]: {
      name: 'Project Description',
      content: 'A comprehensive description of the project objectives, scope, and expected outcomes.'
    },
    [ArtifactType.MARKET_RESEARCH]: {
      name: 'Market Research Report',
      content: 'Detailed market analysis including competitor research, target audience, and market opportunities.'
    },
    [ArtifactType.TECHNICAL_SPECIFICATION]: {
      name: 'Technical Specification',
      content: 'Complete technical architecture and implementation specifications for the project.'
    },
    [ArtifactType.DESIGN_MOCKUP]: {
      name: 'Design Mockups',
      content: 'User interface designs and user experience flow diagrams for the application.'
    },
    [ArtifactType.BUSINESS_PLAN]: {
      name: 'Business Plan',
      content: 'Comprehensive business plan including revenue model, financial projections, and go-to-market strategy.'
    },
    [ArtifactType.CODE_SPECIFICATION]: {
      name: 'Code Specification',
      content: 'Detailed code structure, API specifications, and development guidelines.'
    },
    [ArtifactType.TESTING_PLAN]: {
      name: 'Testing Plan',
      content: 'Comprehensive testing strategy including unit tests, integration tests, and quality assurance procedures.'
    },
    [ArtifactType.MARKETING_CONTENT]: {
      name: 'Marketing Content',
      content: 'Marketing materials including copy, content strategy, and promotional campaign plans.'
    },
    [ArtifactType.FINANCIAL_PROJECTION]: {
      name: 'Financial Projections',
      content: 'Detailed financial forecasts including revenue projections, cost analysis, and profitability timeline.'
    },
    [ArtifactType.OPERATIONAL_PLAN]: {
      name: 'Operational Plan',
      content: 'Operational procedures, workflows, and management processes for running the business.'
    }
  };

  const artifactTemplate = artifacts[randomType];
  
  return {
    id: artifactId,
    name: artifactTemplate.name,
    content: artifactTemplate.content,
    type: randomType,
    projectId
  };
}

// Batch generation functions
export function generateTestDataSet(numUsers: number = 3, projectsPerUser: number = 2): {
  users: TestUser[];
  projects: TestProject[];
  tasks: TestTask[];
  artifacts: TestArtifact[];
} {
  const users: TestUser[] = [];
  const projects: TestProject[] = [];
  const tasks: TestTask[] = [];
  const artifacts: TestArtifact[] = [];

  // Generate users
  for (let i = 0; i < numUsers; i++) {
    users.push(generateRandomUser());
  }

  // Generate projects for each user
  users.forEach(user => {
    for (let i = 0; i < projectsPerUser; i++) {
      const project = generateRandomProject(user.id);
      projects.push(project);

      // Generate tasks for each project (1-3 tasks per stage up to current stage)
      for (let stage = 1; stage <= project.currentStage; stage++) {
        const stageAgents = testAgents.filter(agent => agent.stage === stage);
        const numTasks = Math.floor(Math.random() * 3) + 1;
        
        for (let j = 0; j < Math.min(numTasks, stageAgents.length); j++) {
          const agent = stageAgents[j];
          tasks.push(generateRandomTask(project.id, stage, agent.name));
        }
      }

      // Generate artifacts for each project (1-2 artifacts per completed stage)
      const completedStages = project.status === ProjectStatus.COMPLETED ? project.currentStage : project.currentStage - 1;
      for (let stage = 1; stage <= completedStages; stage++) {
        const numArtifacts = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numArtifacts; j++) {
          artifacts.push(generateRandomArtifact(project.id));
        }
      }
    }
  });

  return { users, projects, tasks, artifacts };
}