# Billion Dollar Idea Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

An AI-powered platform that transforms raw business ideas into comprehensive venture plans through autonomous agent orchestration. The system uses specialized AI agents to execute a 6-stage pipeline covering everything from idea validation to deployment and optimization.

## 🚀 Features

- **6-Stage AI Pipeline**: Comprehensive business development from idea to implementation
- **15 Specialized Agents**: Each agent focuses on specific aspects of business development
- **Real-time Progress Tracking**: WebSocket-based live updates
- **Comprehensive API**: RESTful endpoints for all operations
- **Production Ready**: Docker containerization, monitoring, and logging
- **Scalable Architecture**: Microservices-inspired modular design
- **Advanced Error Handling**: Circuit breakers, retries, and graceful degradation
- **Performance Monitoring**: Built-in metrics and health checks

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🏃‍♂️ Quick Start

### Prerequisites

- **Docker & Docker Compose**: For containerized deployment
- **Node.js 20+**: For local development
- **Git**: For version control

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd billion-dollar-idea-platform
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Verify installation**
   ```bash
   curl http://localhost:3000/health
   ```

5. **Access the application**
   - **API**: http://localhost:3000/api
   - **WebSocket**: ws://localhost:3000/ws
   - **Frontend**: http://localhost:3000
   - **Health Check**: http://localhost:3000/health

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```

3. **Initialize database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Start Ollama service**
   ```bash
   # In a separate terminal
   ollama serve
   ollama pull gpt-oss:20b
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

The platform follows a microservices-inspired modular architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   API Clients   │    │ WebSocket Client│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Nginx Proxy     │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Express Server  │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │   WebSocket     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Agent Orchestra │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  15 AI Agents   │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Ollama Service  │    │   Database      │    │   Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 6-Stage Pipeline

1. **Stage 1: Input Processing**
   - Idea Structuring Agent

2. **Stage 2: Validation & Strategy**
   - Market Research Agent
   - Technical Architecture Agent

3. **Stage 3: Development**
   - UI/UX Design Agent
   - Frontend Development Agent
   - Backend Development Agent
   - Database Design Agent
   - QA Agent

4. **Stage 4: Go-to-Market**
   - Business Formation Agent
   - Marketing Content Agent
   - Sales Funnel Agent

5. **Stage 5: Operations**
   - Customer Support Agent
   - Analytics Agent
   - Financial Management Agent

6. **Stage 6: Self-Improvement**
   - Continuous Monitoring Agent
   - Optimization Agent

## 📚 API Documentation

### Core Endpoints

#### Projects
- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/restart` - Restart project pipeline

#### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `GET /api/agents/stage/:stage` - Get agents by stage
- `GET /api/agents/stats` - Get agent statistics

#### Monitoring
- `GET /health` - Health check
- `GET /api/health` - Detailed health information
- `GET /api/metrics/errors` - Error metrics
- `GET /api/metrics/database` - Database metrics

### WebSocket Events

- `project:start` - Project pipeline initiated
- `task:update` - Task status changed
- `artifact:create` - New artifact generated
- `project:complete` - Pipeline completed
- `error` - Error occurred

### Example Usage

```javascript
// Create a new project
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idea: 'A mobile app that connects dog owners with local dog walkers',
    userId: 'user123'
  })
});

const project = await response.json();

// Connect to WebSocket for real-time updates
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Project update:', update);
};
```

For complete API documentation, see [docs/API.md](docs/API.md).

## 🛠️ Development

### Project Structure

```
billion-dollar-idea-platform/
├── src/
│   ├── agents/           # AI agent implementations
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic services
│   ├── middleware/       # Express middleware
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── __tests__/       # Test files
├── prisma/              # Database schema and migrations
├── public/              # Static frontend files
├── docs/                # Documentation
├── docker-compose.yml   # Docker services configuration
├── Dockerfile          # Application container
└── package.json        # Node.js dependencies
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with agents

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:integration # Run integration tests
npm run test:e2e        # Run end-to-end tests
npm run test:all        # Run all tests

# Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript compiler
```

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=file:./prisma/dev.db

# AI Service
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b

# Logging
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_STRUCTURED=false

# Performance
CACHE_MAX_SIZE=1000
CACHE_DEFAULT_TTL=300000
REQUEST_TIMEOUT=30000
RATE_LIMIT_MAX_REQUESTS=100
```

### Adding New Agents

1. **Create agent class**
   ```typescript
   // src/agents/MyNewAgent.ts
   import { BaseAgent } from './BaseAgent.js';
   
   export class MyNewAgent extends BaseAgent {
     async execute(context: AgentContext): Promise<AgentResult> {
       const prompt = `Your custom prompt here: ${context.projectIdea}`;
       const content = await this.callOllama(prompt);
       
       const artifact = this.createArtifact(
         'My Artifact',
         content,
         'DOCUMENT'
       );
       
       return {
         success: true,
         artifacts: [artifact],
         message: 'Agent executed successfully'
       };
     }
   }
   ```

2. **Add to agent registry**
   ```sql
   INSERT INTO agents (id, name, description, stage, prompt, isActive)
   VALUES (
     'my_new_agent',
     'My New Agent',
     'Description of what this agent does',
     1,
     'Your agent prompt template',
     true
   );
   ```

3. **Update seed script**
   ```typescript
   // src/scripts/seed.ts
   await prisma.agent.create({
     data: {
       id: 'my_new_agent',
       name: 'My New Agent',
       description: 'Description of what this agent does',
       stage: 1,
       prompt: 'Your agent prompt template',
       isActive: true
     }
   });
   ```

## 🚀 Deployment

### Docker Deployment

```bash
# Production deployment
docker-compose --profile production up -d

# With monitoring
docker-compose --profile production --profile monitoring up -d
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n billion-dollar-idea
```

### Cloud Deployments

#### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t billion-dollar-idea-platform .
docker tag billion-dollar-idea-platform:latest <account>.dkr.ecr.us-east-1.amazonaws.com/billion-dollar-idea-platform:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/billion-dollar-idea-platform:latest
```

#### Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/billion-dollar-idea-platform
gcloud run deploy --image gcr.io/PROJECT-ID/billion-dollar-idea-platform --platform managed
```

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 📊 Monitoring

### Built-in Monitoring

The platform includes comprehensive monitoring capabilities:

- **Health Checks**: `/health` endpoint with detailed service status
- **Metrics**: Error rates, response times, resource usage
- **Logging**: Structured logging with multiple levels
- **Performance**: Request tracing and performance metrics

### External Monitoring

#### Prometheus + Grafana
```bash
# Start monitoring stack
docker-compose --profile monitoring up -d

# Access Grafana
open http://localhost:3001
# Default credentials: admin/admin
```

#### Custom Metrics
```typescript
import { monitoring } from './src/utils/Monitoring.js';

// Record custom metrics
monitoring.recordMetric('custom_metric', 100);
monitoring.recordPerformance('operation_name', 1500, true);
```

### Log Analysis

```bash
# View application logs
docker-compose logs -f app

# Filter error logs
docker-compose logs app | grep -i error

# Monitor real-time metrics
curl http://localhost:3000/api/metrics/errors
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Verify environment
docker-compose exec app env | grep -E "(NODE_ENV|DATABASE_URL|OLLAMA_BASE_URL)"

# Test database connection
npm run db:generate
```

#### Ollama Service Issues
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Pull required model
docker-compose exec ollama ollama pull gpt-oss:20b

# Test model directly
docker-compose exec ollama ollama run gpt-oss:20b "Hello, world!"
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Monitor application metrics
curl http://localhost:3000/api/metrics/database

# Check system resources
htop
```

For comprehensive troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# All tests
npm run test:all
```

### Test Coverage

The project maintains high test coverage across all components:

- **Controllers**: Request/response handling
- **Services**: Business logic
- **Agents**: AI agent execution
- **Database**: Data operations
- **WebSocket**: Real-time communication
- **Integration**: End-to-end workflows

### Writing Tests

```typescript
// Example test
import { describe, it, expect } from 'vitest';
import { MyService } from '../services/MyService.js';

describe('MyService', () => {
  it('should process data correctly', async () => {
    const service = new MyService();
    const result = await service.processData('test input');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Process

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run the test suite**
   ```bash
   npm run test:all
   ```
6. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
7. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Code Standards

- **TypeScript**: Use strict typing
- **ESLint**: Follow the configured rules
- **Testing**: Maintain test coverage above 80%
- **Documentation**: Update docs for new features
- **Commits**: Use conventional commit messages

### Pull Request Guidelines

- Provide clear description of changes
- Include tests for new functionality
- Update documentation as needed
- Ensure all CI checks pass
- Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama**: For providing the AI model serving infrastructure
- **Prisma**: For the excellent database toolkit
- **Express.js**: For the robust web framework
- **TypeScript**: For type safety and developer experience
- **Docker**: For containerization and deployment simplicity

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@yourdomain.com

## 🗺️ Roadmap

### Version 2.0
- [ ] Multi-user authentication and authorization
- [ ] Project collaboration features
- [ ] Advanced AI model selection
- [ ] Custom agent creation interface
- [ ] Integration with external services (GitHub, Slack, etc.)

### Version 3.0
- [ ] Microservices architecture migration
- [ ] Multi-language support
- [ ] Advanced analytics and reporting
- [ ] Mobile application
- [ ] Enterprise features

---

**Built with ❤️ by the Billion Dollar Idea Platform Team**