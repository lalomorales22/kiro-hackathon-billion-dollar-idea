import { IOllamaService, IGroqService, Project } from '../types/index.js';
import { ollamaService } from './ollama.js';
import { groqService } from './groq.js';

/**
 * Factory for providing the appropriate AI service based on project configuration
 */
export class AIServiceFactory {
  /**
   * Get the appropriate AI service for a project
   * @param project The project to get the service for
   * @param groqApiKey Optional Groq API key for Groq projects
   * @returns The appropriate AI service
   */
  static getServiceForProject(project: Project, groqApiKey?: string): IOllamaService | IGroqService {
    // Check if project uses Groq model
    if (project.modelType === 'groq') {
      // Configure Groq service with API key if provided
      if (groqApiKey) {
        groqService.setApiKey(groqApiKey);
        return groqService;
      } else {
        console.warn(`[AIServiceFactory] Groq project ${project.id} missing API key, falling back to Ollama`);
        return ollamaService;
      }
    }
    
    // Default to Ollama service
    return ollamaService;
  }

  /**
   * Get the Ollama service instance
   * @returns The Ollama service
   */
  static getOllamaService(): IOllamaService {
    return ollamaService;
  }

  /**
   * Get the Groq service instance
   * @param apiKey Optional API key to configure the service
   * @returns The Groq service
   */
  static getGroqService(apiKey?: string): IGroqService {
    if (apiKey) {
      groqService.setApiKey(apiKey);
    }
    return groqService;
  }

  /**
   * Check if a project uses Groq model
   * @param project The project to check
   * @returns True if project uses Groq model
   */
  static isGroqProject(project: Project): boolean {
    return project.modelType === 'groq';
  }

  /**
   * Check if a project uses Ollama model
   * @param project The project to check
   * @returns True if project uses Ollama model
   */
  static isOllamaProject(project: Project): boolean {
    return project.modelType === 'ollama' || !project.modelType;
  }

  /**
   * Get the appropriate AI service with fallback to Ollama on errors
   * @param project The project to get the service for
   * @param groqApiKey Optional Groq API key for Groq projects
   * @returns The appropriate AI service with fallback capability
   */
  static async getServiceWithFallback(project: Project, groqApiKey?: string): Promise<IOllamaService | IGroqService> {
    try {
      const service = this.getServiceForProject(project, groqApiKey);
      
      // Test service health for Groq projects
      if (this.isGroqProject(project) && groqApiKey) {
        const isHealthy = await service.isHealthy();
        if (!isHealthy) {
          console.warn(`[AIServiceFactory] Groq service unhealthy for project ${project.id}, falling back to Ollama`);
          return ollamaService;
        }
      }
      
      return service;
    } catch (error) {
      console.error(`[AIServiceFactory] Error getting service for project ${project.id}, falling back to Ollama:`, error);
      return ollamaService;
    }
  }
}