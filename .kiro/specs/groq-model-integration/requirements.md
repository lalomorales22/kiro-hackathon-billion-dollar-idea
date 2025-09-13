# Requirements Document

## Introduction

This feature adds Groq model support to the existing project creation interface, allowing users to choose between Ollama models (local) and Groq models (cloud-based) when creating new projects. Users will be able to configure their Groq API key and select from available Groq models alongside the existing Ollama model dropdown.

## Requirements

### Requirement 1

**User Story:** As a user, I want to see separate sections for Ollama and Groq models in the project creation form, so that I can clearly distinguish between local and cloud-based AI options.

#### Acceptance Criteria

1. WHEN the user opens the project creation form THEN the system SHALL display "Ollama Models" as a section header above the existing model dropdown
2. WHEN the user views the AI Model section THEN the system SHALL display a separate "Groq Models" section below the Ollama section
3. WHEN the user views both sections THEN the system SHALL clearly differentiate between local (Ollama) and cloud-based (Groq) model options

### Requirement 2

**User Story:** As a user, I want to configure my Groq API key, so that I can authenticate and access Groq models for my projects.

#### Acceptance Criteria

1. WHEN the user views the Groq Models section THEN the system SHALL display an API key input field
2. WHEN the user enters a Groq API key THEN the system SHALL validate the key format
3. WHEN the user saves a valid API key THEN the system SHALL store it securely for future use
4. WHEN the user has not entered an API key THEN the system SHALL disable the Groq model dropdown
5. IF the API key is invalid THEN the system SHALL display an appropriate error message

### Requirement 3

**User Story:** As a user, I want to select from available Groq models, so that I can choose the most appropriate model for my project needs.

#### Acceptance Criteria

1. WHEN the user has entered a valid Groq API key THEN the system SHALL display the "openai/gpt-oss-120b" model in a dropdown
2. WHEN the system displays Groq models THEN the system SHALL show only the "openai/gpt-oss-120b" model option
3. WHEN the user selects a Groq model THEN the system SHALL store the selection for project creation
4. IF the Groq API is unavailable THEN the system SHALL display an error message and fallback gracefully

### Requirement 4

**User Story:** As a user, I want to create projects using either Ollama or Groq models, so that I have flexibility in choosing my AI backend.

#### Acceptance Criteria

1. WHEN the user selects an Ollama model THEN the system SHALL create the project using the local Ollama service
2. WHEN the user selects a Groq model THEN the system SHALL create the project using the Groq API with the configured key
3. WHEN the user creates a project THEN the system SHALL store the selected model type (Ollama or Groq) and model name
4. WHEN the user has selected both Ollama and Groq models THEN the system SHALL use the most recently selected option

### Requirement 5

**User Story:** As a user, I want my Groq API key to persist across sessions, so that I don't have to re-enter it every time I use the application.

#### Acceptance Criteria

1. WHEN the user enters and saves a Groq API key THEN the system SHALL store it in local storage or secure storage
2. WHEN the user returns to the application THEN the system SHALL automatically load the saved API key
3. WHEN the user wants to change their API key THEN the system SHALL allow updating the stored key
4. WHEN the user clears their browser data THEN the system SHALL handle the missing API key gracefully

### Requirement 6

**User Story:** As a developer, I want the Groq integration to follow the existing code patterns, so that the codebase remains maintainable and consistent.

#### Acceptance Criteria

1. WHEN implementing Groq support THEN the system SHALL follow the existing controller and service patterns
2. WHEN adding Groq API calls THEN the system SHALL implement proper error handling similar to Ollama integration
3. WHEN extending the frontend THEN the system SHALL maintain consistency with existing UI components and styling
4. WHEN adding new API endpoints THEN the system SHALL follow the existing REST API conventions