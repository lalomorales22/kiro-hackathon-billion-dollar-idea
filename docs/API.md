# Billion Dollar Idea Platform API Documentation

## Overview

The Billion Dollar Idea Platform provides a comprehensive REST API for managing AI-powered business venture development. The API enables users to submit business ideas and track their transformation through a 6-stage agent orchestration pipeline.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the API does not require authentication. In production deployments, consider implementing API key authentication or OAuth 2.0.

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP address
- **Development**: 1000 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "unique-request-id"
  }
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Endpoints

### Health Check

#### GET /health

Check the health status of the API and its dependencies.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "memory": {
    "rss": 52428800,
    "heapTotal": 29360128,
    "heapUsed": 20971520,
    "external": 1048576
  },
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 5
    },
    "agents": {
      "loaded": true,
      "totalAgents": 15,
      "activeAgents": 15,
      "stageDistribution": {
        "1": 1,
        "2": 2,
        "3": 5,
        "4": 3,
        "5": 3,
        "6": 2
      },
      "missingStages": []
    }
  },
  "metrics": {
    "errors": {
      "total": 0,
      "rate": 0,
      "recent": 0
    },
    "database": {
      "totalQueries": 150,
      "errorRate": 0,
      "averageQueryTime": 12.5,
      "uptime": 3600
    }
  }
}
```

### API Information

#### GET /api

Get general information about the API.

**Response:**
```json
{
  "name": "Billion Dollar Idea Platform API",
  "version": "1.0.0",
  "description": "AI-powered platform that transforms business ideas into complete venture plans",
  "endpoints": {
    "projects": "/api/projects",
    "agents": "/api/agents",
    "websocket": "/ws",
    "health": "/api/health",
    "metrics": {
      "errors": "/api/metrics/errors",
      "database": "/api/metrics/database"
    }
  },
  "documentation": "/api/docs",
  "features": [
    "Enhanced error handling and resilience",
    "Circuit breaker pattern for external services",
    "Comprehensive monitoring and metrics",
    "Rate limiting and security headers",
    "Graceful degradation and recovery"
  ]
}
```

### Projects

#### POST /api/projects

Create a new project from a business idea.

**Request Body:**
```json
{
  "idea": "A mobile app that connects dog owners with local dog walkers",
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj_abc123",
    "name": "Dog Walker Connection App",
    "idea": "A mobile app that connects dog owners with local dog walkers",
    "status": "CREATED",
    "currentStage": 1,
    "userId": "user123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/projects

Get all projects for the current user.

**Query Parameters:**
- `userId` (required): User identifier
- `status` (optional): Filter by project status
- `limit` (optional): Maximum number of results (default: 50)
- `offset` (optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_abc123",
      "name": "Dog Walker Connection App",
      "idea": "A mobile app that connects dog owners with local dog walkers",
      "status": "IN_PROGRESS",
      "currentStage": 3,
      "userId": "user123",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### GET /api/projects/:id

Get detailed information about a specific project.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj_abc123",
    "name": "Dog Walker Connection App",
    "idea": "A mobile app that connects dog owners with local dog walkers",
    "status": "IN_PROGRESS",
    "currentStage": 3,
    "userId": "user123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:30:00.000Z",
    "tasks": [
      {
        "id": "task_xyz789",
        "name": "Idea Structuring",
        "status": "COMPLETED",
        "stage": 1,
        "agent": "IdeaStructuringAgent",
        "result": "Structured project description...",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:05:00.000Z"
      }
    ],
    "artifacts": [
      {
        "id": "art_def456",
        "name": "Project Description",
        "content": "Detailed project description...",
        "type": "DOCUMENT",
        "createdAt": "2024-01-01T00:05:00.000Z"
      }
    ]
  }
}
```

#### PUT /api/projects/:id

Update a project's information.

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "status": "PAUSED"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj_abc123",
    "name": "Updated Project Name",
    "status": "PAUSED",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

#### DELETE /api/projects/:id

Delete a project and all associated data.

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

#### POST /api/projects/:id/restart

Restart a failed or completed project.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj_abc123",
    "status": "IN_PROGRESS",
    "currentStage": 1,
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

#### GET /api/projects/stats/:userId

Get project statistics for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "byStatus": {
      "CREATED": 1,
      "IN_PROGRESS": 3,
      "COMPLETED": 5,
      "FAILED": 1
    },
    "byStage": {
      "1": 1,
      "2": 1,
      "3": 1,
      "4": 0,
      "5": 0,
      "6": 0
    },
    "averageCompletionTime": 1800000,
    "successRate": 83.3
  }
}
```

### Agents

#### GET /api/agents

Get all available agents.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "agent_idea_structuring",
      "name": "Idea Structuring Agent",
      "description": "Converts raw business ideas into structured project descriptions",
      "stage": 1,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/agents/:id

Get detailed information about a specific agent.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agent_idea_structuring",
    "name": "Idea Structuring Agent",
    "description": "Converts raw business ideas into structured project descriptions",
    "stage": 1,
    "prompt": "You are an expert business analyst...",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/agents/stage/:stage

Get all agents for a specific stage.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "agent_market_research",
      "name": "Market Research Agent",
      "description": "Analyzes market viability and competition",
      "stage": 2,
      "isActive": true
    },
    {
      "id": "agent_technical_architecture",
      "name": "Technical Architecture Agent",
      "description": "Proposes technical implementation approach",
      "stage": 2,
      "isActive": true
    }
  ]
}
```

#### GET /api/agents/stats

Get agent execution statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAgents": 15,
    "activeAgents": 15,
    "stageDistribution": {
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 3,
      "5": 3,
      "6": 2
    },
    "executionStats": {
      "totalExecutions": 150,
      "successfulExecutions": 142,
      "failedExecutions": 8,
      "averageExecutionTime": 15000,
      "successRate": 94.7
    }
  }
}
```

#### GET /api/agents/search

Search agents by name or description.

**Query Parameters:**
- `q` (required): Search query
- `stage` (optional): Filter by stage

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "agent_market_research",
      "name": "Market Research Agent",
      "description": "Analyzes market viability and competition",
      "stage": 2,
      "relevanceScore": 0.95
    }
  ]
}
```

### Metrics

#### GET /api/metrics/errors

Get error metrics and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalErrors": 5,
    "errorRate": 0.033,
    "recentErrors": [
      {
        "timestamp": "2024-01-01T00:30:00.000Z",
        "type": "ValidationError",
        "message": "Invalid project ID format",
        "count": 1
      }
    ],
    "errorsByType": {
      "ValidationError": 3,
      "DatabaseError": 1,
      "ExternalServiceError": 1
    }
  },
  "timestamp": "2024-01-01T01:00:00.000Z"
}
```

#### GET /api/metrics/database

Get database performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalQueries": 1500,
    "successfulQueries": 1485,
    "failedQueries": 15,
    "errorRate": 0.01,
    "averageQueryTime": 12.5,
    "uptime": 7200,
    "connectionPoolSize": 10,
    "activeConnections": 3
  },
  "timestamp": "2024-01-01T01:00:00.000Z"
}
```

## WebSocket API

### Connection

Connect to the WebSocket server for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### Events

#### project:start
Emitted when a new project starts processing.

```json
{
  "type": "project:start",
  "data": {
    "projectId": "proj_abc123",
    "name": "Dog Walker Connection App",
    "stage": 1,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### task:update
Emitted when a task status changes.

```json
{
  "type": "task:update",
  "data": {
    "taskId": "task_xyz789",
    "projectId": "proj_abc123",
    "status": "COMPLETED",
    "agent": "IdeaStructuringAgent",
    "stage": 1,
    "result": "Task completed successfully",
    "timestamp": "2024-01-01T00:05:00.000Z"
  }
}
```

#### artifact:create
Emitted when a new artifact is created.

```json
{
  "type": "artifact:create",
  "data": {
    "artifactId": "art_def456",
    "projectId": "proj_abc123",
    "name": "Project Description",
    "type": "DOCUMENT",
    "timestamp": "2024-01-01T00:05:00.000Z"
  }
}
```

#### project:complete
Emitted when a project completes all stages.

```json
{
  "type": "project:complete",
  "data": {
    "projectId": "proj_abc123",
    "name": "Dog Walker Connection App",
    "completedStages": 6,
    "totalArtifacts": 25,
    "duration": 1800000,
    "timestamp": "2024-01-01T00:30:00.000Z"
  }
}
```

#### error
Emitted when an error occurs during processing.

```json
{
  "type": "error",
  "data": {
    "projectId": "proj_abc123",
    "taskId": "task_xyz789",
    "error": "Agent execution failed",
    "details": "Connection timeout to Ollama service",
    "timestamp": "2024-01-01T00:15:00.000Z"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000
});

// Create a new project
async function createProject(idea, userId) {
  try {
    const response = await client.post('/projects', { idea, userId });
    return response.data.data;
  } catch (error) {
    console.error('Error creating project:', error.response?.data || error.message);
    throw error;
  }
}

// Get project with real-time updates
function watchProject(projectId) {
  const ws = new WebSocket('ws://localhost:3000/ws');
  
  ws.on('message', (data) => {
    const event = JSON.parse(data);
    if (event.data.projectId === projectId) {
      console.log('Project update:', event);
    }
  });
  
  return ws;
}
```

### Python

```python
import requests
import websocket
import json

class BillionDollarIdeaClient:
    def __init__(self, base_url='http://localhost:3000/api'):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 30
    
    def create_project(self, idea, user_id):
        response = self.session.post(
            f'{self.base_url}/projects',
            json={'idea': idea, 'userId': user_id}
        )
        response.raise_for_status()
        return response.json()['data']
    
    def get_project(self, project_id):
        response = self.session.get(f'{self.base_url}/projects/{project_id}')
        response.raise_for_status()
        return response.json()['data']
    
    def watch_project(self, project_id, callback):
        def on_message(ws, message):
            event = json.loads(message)
            if event['data'].get('projectId') == project_id:
                callback(event)
        
        ws = websocket.WebSocketApp(
            'ws://localhost:3000/ws',
            on_message=on_message
        )
        ws.run_forever()
```

## Best Practices

1. **Error Handling**: Always handle API errors gracefully and check the `success` field in responses.

2. **Rate Limiting**: Implement exponential backoff when receiving 429 responses.

3. **WebSocket Reconnection**: Implement automatic reconnection logic for WebSocket connections.

4. **Timeouts**: Set appropriate timeouts for API requests, especially for project creation which may take longer.

5. **Monitoring**: Use the health check and metrics endpoints to monitor API health.

6. **Pagination**: Use pagination parameters for list endpoints to avoid large responses.

7. **Caching**: Cache agent and project data where appropriate to reduce API calls.

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure the server is running and accessible on the specified port.

2. **Rate Limited**: Reduce request frequency or implement backoff strategies.

3. **WebSocket Disconnections**: Implement reconnection logic with exponential backoff.

4. **Slow Responses**: Check system resources and Ollama service availability.

5. **Agent Failures**: Monitor error metrics and check Ollama service health.

### Debug Information

Enable debug logging by setting the `LOG_LEVEL` environment variable to `debug`:

```bash
LOG_LEVEL=debug npm start
```

This will provide detailed information about API requests, database queries, and agent executions.