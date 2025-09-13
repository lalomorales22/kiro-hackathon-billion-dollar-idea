# Implementation Plan

- [x] 1. Create new design system CSS foundation
  - Create design-system.css with shadcn-inspired color palette, typography, and spacing tokens
  - Implement CSS custom properties for consistent theming across components
  - Write utility classes for common patterns (shadows, borders, spacing)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement Ollama model selection backend endpoints
  - Create GET /api/ollama/models endpoint to fetch available models from Ollama service
  - Add error handling for Ollama service connection issues with helpful troubleshooting messages
  - Write unit tests for Ollama model endpoint with mock responses
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 9.4_

- [x] 3. Enhance project data model and database schema
  - Add ollamaModel field to Project model in Prisma schema
  - Add name field validation and make userId optional in project creation
  - Create database migration for new project fields
  - Update project validation logic to handle new fields
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.4_

- [x] 4. Update project controller with edit/delete functionality
  - Enhance PUT /api/projects/:id endpoint to handle name and ollamaModel updates
  - Add validation for project name length and character restrictions
  - Implement proper error responses for project not found and validation failures
  - Write unit tests for project update and delete operations
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 5.2, 5.4_

- [x] 5. Create ModelSelector frontend component
  - Build ModelSelector class to fetch and display available Ollama models
  - Implement dropdown UI with loading states and error handling
  - Add model selection persistence and form integration
  - Handle Ollama service unavailable scenarios with user-friendly messages
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 9.4, 9.5_

- [x] 6. Redesign project creation form with new layout
  - Replace userId field with project name input field
  - Integrate ModelSelector component into project creation form
  - Add form validation for project name requirements
  - Implement loading states and prevent double-submission
  - _Requirements: 5.1, 5.2, 5.5, 6.1, 8.1, 8.2, 8.3, 8.4_

- [x] 7. Build enhanced ProjectCard component with edit/delete actions
  - Create ProjectCard class with edit and delete button functionality
  - Implement inline editing for project names with save/cancel actions
  - Add delete confirmation modal with proper warning messages
  - Handle API calls for project updates and deletions with error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3_

- [x] 8. Implement new layout structure with artifacts above terminal
  - Restructure HTML layout to place artifacts section above progress section
  - Create responsive grid layout with sidebar, content area, and projects panel
  - Implement proper visual hierarchy with clear section separation
  - Add responsive breakpoints for mobile and tablet layouts
  - _Requirements: 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Create Terminal component for IDE-style progress display
  - Build Terminal class with dark theme and monospace font styling
  - Implement scrollable log display with automatic scroll-to-bottom
  - Add terminal controls (clear, scroll to bottom) and proper event handling
  - Integrate with existing WebSocket progress updates
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Build ArtifactViewer component for enhanced artifact display
  - Create ArtifactViewer class to display artifacts in card-based layout
  - Implement clickable artifacts with modal or expanded view functionality
  - Add proper empty states and loading indicators for artifacts
  - Integrate with existing artifact creation WebSocket events
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 11. Apply shadcn-inspired styling to all UI components
  - Update all buttons, form elements, and cards with new design system
  - Implement hover states, focus indicators, and interaction feedback
  - Add consistent shadows, borders, and spacing throughout the interface
  - Ensure minimal color usage with professional appearance
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2_

- [x] 12. Implement comprehensive error handling and user feedback
  - Add error display component with different severity levels and auto-dismiss
  - Implement loading states for all async operations with visual indicators
  - Add success confirmation messages for completed actions
  - Create specific error handling for Ollama service connection issues
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13. Fix duplicate project creation issue
  - Add form submission debouncing to prevent multiple rapid submissions
  - Implement proper button disabled states during project creation
  - Add client-side validation before form submission
  - Write integration tests to verify single project creation
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 14. Write comprehensive tests for new functionality
  - Create unit tests for ModelSelector, ProjectCard, Terminal, and ArtifactViewer components
  - Write integration tests for project CRUD operations with new fields
  - Add visual regression tests for design system components
  - Create end-to-end tests for complete project creation and management workflow
  - _Requirements: All requirements - testing coverage_

- [x] 15. Integrate all components and finalize responsive layout
  - Wire together all new components in the main application
  - Test responsive behavior across different screen sizes
  - Ensure proper component communication and state management
  - Perform final styling adjustments and polish for production readiness
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_