# REST API Documentation

This document describes the REST API endpoints implemented by the Billion Dollar Idea Platform controllers.

## Base URL

All endpoints are prefixed with `/api`

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "statusCode": 400,
  "details": "Additional error details (development only)"
}
```

## Project Endpoints

### Create Project
**POST** `/api/projects`

Creates a new project from a business idea and automatically initiates the agent pipeline.

**Request Body:**
```json
{
  "idea": "string (10-5000 characters, required)",
  "userId": "string (required)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "string",
      "name": "string",
      "idea": "string",
      "userId": "string",
      "status": "CREATED",
      "currentStage": 1,
      "createdAt": "ISO date",
      "updatedAt": "ISO date",
      "tasks": [],
      "artifacts": []
    },
    "message": "Project created successfully and pipeline initiated"
  },
  "message": "Project created successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `500 Internal Server Error` - Server error

---

### Get All Projects
**GET** `/api/projects`

Retrieves all projects with optional filtering and pagination.

**Query Parameters:**
- `userId` (optional): Filter projects by user ID
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 10, max: 100): Number of projects per page
- `includeTasks` (optional, default: false): Include task data
- `includeArtifacts` (optional, default: false): Include artifact data
- `includeUser` (optional, default: false): Include user data
- `orderBy` (optional, default: createdAt): Field to order by (createdAt, updatedAt, name, status, currentStage)
- `orderDirection` (optional, default: desc): Order direction (asc, desc)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "string",
        "name": "string",
        "idea": "string",
        "userId": "string",
        "status": "string",
        "currentStage": 1,
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

### Get Project by ID
**GET** `/api/projects/:id`

Retrieves a specific project by its ID.

**Path Parameters:**
- `id` (required): Project ID

**Query Parameters:**
- `includeTasks` (optional, default: true): Include task data
- `includeArtifacts` (optional, default: true): Include artifact data
- `includeUser` (optional, default: false): Include user data

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "string",
      "name": "string",
      "idea": "string",
      "userId": "string",
      "status": "string",
      "currentStage": 1,
      "createdAt": "ISO date",
      "updatedAt": "ISO date",
      "tasks": [...],
      "artifacts": [...]
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid project ID
- `404 Not Found` - Project not found
- `500 Internal Server Error` - Server error

---

### Update Project
**PUT** `/api/projects/:id`

Updates a project's properties.

**Path Parameters:**
- `id` (required): Project ID

**Request Body:**
```json
{
  "name": "string (optional, max 100 characters)",
  "status": "CREATED|IN_PROGRESS|COMPLETED|FAILED|PAUSED (optional)",
  "currentStage": "integer 1-6 (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "project": { ... }
  },
  "message": "Project updated successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data or project ID
- `404 Not Found` - Project not found
- `500 Internal Server Error` - Server error

---

### Delete Project
**DELETE** `/api/projects/:id`

Deletes a project and all associated data (tasks, artifacts).

**Path Parameters:**
- `id` (required): Project ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid project ID
- `404 Not Found` - Project not found
- `500 Internal Server Error` - Server error

---

### Restart Project
**POST** `/api/projects/:id/restart`

Restarts a failed or paused project by resetting its status and reinitiating the pipeline.

**Path Parameters:**
- `id` (required): Project ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "project": { ... }
  },
  "message": "Project restarted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid project ID or cannot restart completed project
- `404 Not Found` - Project not found
- `500 Internal Server Error` - Server error

---

### Get Project Statistics
**GET** `/api/projects/stats/:userId`

Retrieves project statistics for a specific user.

**Path Parameters:**
- `userId` (required): User ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total": 10,
    "byStatus": {
      "CREATED": 2,
      "IN_PROGRESS": 3,
      "COMPLETED": 4,
      "FAILED": 1,
      "PAUSED": 0
    },
    "byStage": {
      "1": 2,
      "2": 1,
      "3": 2,
      "4": 1,
      "5": 1,
      "6": 3
    }
  }
}
```

---

## Agent Endpoints

### Get All Agents
**GET** `/api/agents`

Retrieves all available agents with their descriptions and stages.

**Query Parameters:**
- `stage` (optional): Filter agents by stage (1-6)
- `active` (optional, default: true): Filter by active status
- `includeInactive` (optional, default: false): Include inactive agents

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "stage": 1,
        "prompt": "string",
        "isActive": true,
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    ],
    "stats": {
      "total": 15,
      "byStage": {
        "1": 1,
        "2": 2,
        "3": 5,
        "4": 3,
        "5": 3,
        "6": 2
      },
      "registryStats": {
        "totalRegistered": 15,
        "activeRegistered": 15,
        "stageDistribution": { ... }
      }
    }
  }
}
```

---

### Get Agent by ID
**GET** `/api/agents/:id`

Retrieves a specific agent by its ID.

**Path Parameters:**
- `id` (required): Agent ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "string",
      "name": "string",
      "description": "string",
      "stage": 1,
      "prompt": "string",
      "isActive": true,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    },
    "registryInfo": {
      "isRegistered": true,
      "registeredName": "string"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid agent ID
- `404 Not Found` - Agent not found
- `500 Internal Server Error` - Server error

---

### Get Agents by Stage
**GET** `/api/agents/stage/:stage`

Retrieves all agents for a specific stage.

**Path Parameters:**
- `stage` (required): Stage number (1-6)

**Query Parameters:**
- `includeInactive` (optional, default: false): Include inactive agents

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stage": 1,
    "agents": [...],
    "registryInfo": {
      "registeredCount": 1,
      "registeredAgents": [
        {
          "id": "string",
          "name": "string",
          "description": "string"
        }
      ]
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid stage number
- `500 Internal Server Error` - Server error

---

### Get Agent Statistics
**GET** `/api/agents/stats`

Retrieves comprehensive agent statistics and registry health information.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "database": {
      "totalAgents": 15,
      "activeAgents": 15,
      "inactiveAgents": 0,
      "stageDistribution": {
        "1": 1,
        "2": 2,
        "3": 5,
        "4": 3,
        "5": 3,
        "6": 2
      }
    },
    "registry": {
      "totalRegistered": 15,
      "activeRegistered": 15,
      "stageDistribution": { ... },
      "isInitialized": true
    },
    "coverage": {
      "isValid": true,
      "missingStages": [],
      "requiredStages": [1, 2, 3, 4, 5, 6]
    }
  }
}
```

---

### Search Agents
**GET** `/api/agents/search`

Searches agents by name or description.

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- `stage` (optional): Filter by stage (1-6)
- `includeInactive` (optional, default: false): Include inactive agents

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "query": "market",
    "agents": [...],
    "registryMatches": [...],
    "total": 2
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid search query or parameters
- `500 Internal Server Error` - Server error

---

---

## Ollama Endpoints

### Get Available Models
**GET** `/api/ollama/models`

Retrieves all available Ollama models from the local Ollama service.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "llama2",
        "size": "3.8GB",
        "digest": "sha256:...",
        "modified_at": "ISO date"
      }
    ]
  }
}
```

**Error Responses:**
- `503 Service Unavailable` - Ollama service not available
- `500 Internal Server Error` - Server error

---

### Get Ollama Health Status
**GET** `/api/ollama/health`

Checks the health status of the Ollama service.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "ollama",
    "timestamp": "ISO date",
    "version": "string",
    "models_available": true
  }
}
```

**Error Responses:**
- `503 Service Unavailable` - Ollama service not available
- `500 Internal Server Error` - Server error

---

## Groq Endpoints

### Validate API Key
**POST** `/api/groq/validate-key`

Validates a Groq API key by testing it against the Groq service.

**Request Body:**
```json
{
  "apiKey": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "API key is valid"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing or invalid API key format
- `401 Unauthorized` - Invalid API key
- `503 Service Unavailable` - Groq service not available
- `500 Internal Server Error` - Server error

---

### Get Groq Health Status
**GET** `/api/groq/health`

Checks the health status of the Groq service.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "groq",
    "timestamp": "ISO date",
    "apiKeyConfigured": false,
    "model": "openai/gpt-oss-120b"
  }
}
```

**Error Responses:**
- `503 Service Unavailable` - Groq service not available
- `500 Internal Server Error` - Server error

---

### Get Groq Model Information
**GET** `/api/groq/model`

Retrieves information about the available Groq model.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "model": "openai/gpt-oss-120b",
    "type": "cloud",
    "provider": "groq",
    "description": "OpenAI GPT model hosted on Groq infrastructure",
    "capabilities": ["text-generation", "chat-completion"]
  }
}
```

**Error Responses:**
- `500 Internal Server Error` - Server error

---

## Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication failed
- `404 Not Found` - Resource not found
- `503 Service Unavailable` - External service unavailable
- `500 Internal Server Error` - Server error

## Project Status Values

- `CREATED` - Project created but not started
- `IN_PROGRESS` - Project pipeline is running
- `COMPLETED` - All stages completed successfully
- `FAILED` - Project failed during execution
- `PAUSED` - Project execution paused

## Stage Numbers

1. **Input Processing** - Idea structuring
2. **Validation & Strategy** - Market research and technical architecture
3. **Development** - UI/UX, frontend, backend, database, QA
4. **Go-to-Market** - Business formation, marketing, sales funnel
5. **Operations** - Customer support, analytics, financial management
6. **Self-Improvement** - Monitoring and optimization

## Error Handling

All endpoints implement comprehensive error handling with appropriate HTTP status codes and descriptive error messages. In development mode, additional error details are included in the response.