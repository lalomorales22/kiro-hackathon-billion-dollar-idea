# Implementation Plan

- [x] 1. Set up Groq SDK and create GroqService
  - Install groq-sdk package and configure TypeScript types
  - Create GroqService class following OllamaService patterns with circuit breaker and retry logic
  - Implement generateContent method using "openai/gpt-oss-120b" model
  - Add comprehensive error handling and logging
  - _Requirements: 6.1, 6.2_

- [x] 2. Implement API key validation and management in GroqService
  - Create validateApiKey method to test API key with Groq service
  - Implement isHealthy method to check service availability
  - Add getServiceInfo and getMetrics methods for monitoring
  - Create proper error types for Groq-specific failures
  - _Requirements: 2.1, 2.2, 2.3, 6.3_

- [x] 3. Create GroqController with REST endpoints
  - Implement POST /api/groq/validate-key endpoint for API key validation
  - Create GET /api/groq/health endpoint for service health checks
  - Add GET /api/groq/model endpoint for model information
  - Follow existing controller patterns and error handling
  - _Requirements: 2.2, 6.4_

- [x] 4. Enhance ModelSelector component for dual model support
  - Restructure ModelSelector to display separate Ollama and Groq sections
  - Add section headers "Ollama Models (Local)" and "Groq Models (Cloud)"
  - Implement API key input field with password type and save functionality
  - Create dropdown for Groq model with "openai/gpt-oss-120b" option
  - _Requirements: 1.1, 1.2, 3.1_

- [x] 5. Implement secure API key storage and management
  - Create client-side encryption using Web Crypto API for key storage
  - Implement saveApiKey, loadApiKey, and clearApiKey functions
  - Add automatic key loading on component initialization
  - Store encrypted keys in localStorage with proper error handling
  - _Requirements: 2.3, 5.1, 5.2, 5.3_

- [x] 6. Add API key validation UI and user feedback
  - Implement real-time API key validation when user enters key
  - Show loading states during validation process
  - Display success/error messages for key validation
  - Enable/disable Groq model dropdown based on key validity
  - _Requirements: 2.2, 2.4, 2.5_

- [x] 7. Update project creation logic for model type selection
  - Modify project creation to handle both Ollama and Groq model selections
  - Store modelType ('ollama' or 'groq') and modelName in project data
  - Implement logic to use most recently selected model when both are chosen
  - Update form validation to work with either model type
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Integrate GroqService into project execution workflow
  - Update AgentOrchestrator to use GroqService when project uses Groq model
  - Modify content generation calls to route to appropriate service
  - Ensure proper error handling and fallback mechanisms
  - Maintain existing Ollama functionality without disruption
  - _Requirements: 4.1, 4.2, 6.4_

- [x] 9. Add comprehensive error handling and user messaging
  - Implement Groq-specific error messages and troubleshooting steps
  - Add user-friendly error displays for API key issues, rate limits, and service errors
  - Create fallback mechanisms when Groq service is unavailable
  - Update ErrorHandler to support Groq error types
  - _Requirements: 2.5, 6.3_

- [x] 10. Create unit tests for GroqService and GroqController
  - Write comprehensive unit tests for GroqService methods
  - Test API key validation, error handling, and circuit breaker functionality
  - Create unit tests for GroqController endpoints
  - Mock Groq SDK calls and test various response scenarios
  - _Requirements: 6.4_

- [x] 11. Create integration tests for ModelSelector enhancements
  - Test dual model selection UI functionality
  - Verify API key storage and retrieval operations
  - Test model selection state management and form validation
  - Ensure proper integration between frontend and backend components
  - _Requirements: 1.1, 1.2, 3.1, 4.4_

- [x] 12. Update styling and visual design for model sections
  - Add CSS classes for Ollama and Groq model sections
  - Style API key input field and save button
  - Add visual indicators to distinguish local vs cloud models
  - Ensure responsive design works with new layout structure
  - _Requirements: 1.1, 1.3_

- [x] 13. Add API routes to Express application
  - Register GroqController routes in main Express app
  - Ensure proper middleware and error handling for new endpoints
  - Update API documentation to include Groq endpoints
  - Test all new routes with proper request/response handling
  - _Requirements: 6.4_

- [x] 14. Create end-to-end integration tests
  - Test complete project creation workflow with Groq models
  - Verify API key validation and project execution flow
  - Test error scenarios and recovery mechanisms
  - Ensure backward compatibility with existing Ollama projects
  - _Requirements: 4.1, 4.2, 4.3, 6.4_