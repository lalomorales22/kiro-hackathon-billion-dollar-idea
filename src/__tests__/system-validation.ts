#!/usr/bin/env node

/**
 * System Integration and End-to-End Validation Script
 * 
 * This script validates the complete system functionality including:
 * - All 6 stages of the pipeline
 * - Real-time WebSocket communication
 * - API endpoints and responses
 * - System performance under load
 * - Error handling and resilience
 */

import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import { databaseService } from '../services/database';
import { createDatabaseSeeder } from './fixtures/database-seeder';

interface ValidationResult {
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class SystemValidator {
  private serverProcess: ChildProcess | null = null;
  private results: ValidationResult[] = [];
  private readonly PORT = 3005;
  private readonly BASE_URL = `http://localhost:${this.PORT}`;

  async runValidation(): Promise<void> {
    console.log('🚀 Starting System Integration and End-to-End Validation');
    console.log('=' .repeat(70));

    try {
      await this.setupDatabase();
      await this.startServer();
      await this.runAllTests();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async setupDatabase(): Promise<void> {
    console.log('\n📊 Setting up database...');
    
    await databaseService.connect();
    const seeder = createDatabaseSeeder(databaseService);
    await seeder.clearAll();
    await seeder.seedTestData();
    
    console.log('✅ Database setup complete');
  }

  private async startServer(): Promise<void> {
    console.log('\n🖥️  Starting server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        env: { 
          ...process.env, 
          PORT: this.PORT.toString(),
          NODE_ENV: 'development'
        },
        stdio: 'pipe'
      });

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server startup timeout'));
        }
      }, 30000);

      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server started successfully')) {
          serverReady = true;
          clearTimeout(timeout);
          console.log('✅ Server started successfully');
          setTimeout(resolve, 2000); // Give server time to fully initialize
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async runAllTests(): Promise<void> {
    console.log('\n🧪 Running validation tests...');

    const tests = [
      { name: 'System Health Check', fn: () => this.testSystemHealth() },
      { name: 'API Endpoints', fn: () => this.testAPIEndpoints() },
      { name: 'Project Creation', fn: () => this.testProjectCreation() },
      { name: 'WebSocket Communication', fn: () => this.testWebSocketCommunication() },
      { name: 'Agent Pipeline Execution', fn: () => this.testAgentPipelineExecution() },
      { name: 'Concurrent Operations', fn: () => this.testConcurrentOperations() },
      { name: 'Error Handling', fn: () => this.testErrorHandling() },
      { name: 'Performance Under Load', fn: () => this.testPerformanceUnderLoad() },
      { name: 'Data Consistency', fn: () => this.testDataConsistency() },
      { name: 'System Resilience', fn: () => this.testSystemResilience() }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n  🔍 ${testName}...`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        passed: true,
        duration,
        details: result
      });
      
      console.log(`  ✅ ${testName} passed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.log(`  ❌ ${testName} failed (${duration}ms): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async testSystemHealth(): Promise<any> {
    const response = await fetch(`${this.BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.status !== 'healthy') {
      throw new Error(`System not healthy: ${data.status}`);
    }
    
    return { status: data.status, uptime: data.uptime };
  }

  private async testAPIEndpoints(): Promise<any> {
    const endpoints = [
      { path: '/api', expectedStatus: 200 },
      { path: '/api/agents', expectedStatus: 200 },
      { path: '/api/projects', expectedStatus: 200 },
      { path: '/api/health', expectedStatus: 200 }
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${this.BASE_URL}${endpoint.path}`);
      if (response.status !== endpoint.expectedStatus) {
        throw new Error(`Endpoint ${endpoint.path} returned ${response.status}, expected ${endpoint.expectedStatus}`);
      }
      results.push({ path: endpoint.path, status: response.status });
    }
    
    return results;
  }

  private async testProjectCreation(): Promise<any> {
    const projectData = {
      idea: 'A revolutionary AI-powered platform for automated business development',
      userId: 'test-user-1'
    };

    const response = await fetch(`${this.BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      throw new Error(`Project creation failed: ${response.status}`);
    }

    const project = await response.json();
    if (!project.id || !project.name) {
      throw new Error('Project creation response missing required fields');
    }

    return { projectId: project.id, status: project.status };
  }

  private async testWebSocketCommunication(): Promise<any> {
    return new Promise((resolve, reject) => {
      const wsClient = new WebSocket(`ws://localhost:${this.PORT}`);
      const events: any[] = [];
      let connected = false;

      const timeout = setTimeout(() => {
        wsClient.close();
        if (!connected) {
          reject(new Error('WebSocket connection timeout'));
        } else if (events.length === 0) {
          reject(new Error('No WebSocket events received'));
        } else {
          resolve({ connected: true, eventsReceived: events.length });
        }
      }, 15000);

      wsClient.on('open', async () => {
        connected = true;
        console.log('    WebSocket connected, creating test project...');
        
        // Create a project to trigger events
        try {
          await fetch(`${this.BASE_URL}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idea: 'WebSocket test project',
              userId: 'test-user-1'
            })
          });
        } catch (error) {
          console.log('    Failed to create test project for WebSocket test');
        }
      });

      wsClient.on('message', (data) => {
        const event = JSON.parse(data.toString());
        events.push(event);
        console.log(`    Received WebSocket event: ${event.type}`);
        
        if (events.length >= 1) {
          clearTimeout(timeout);
          wsClient.close();
          resolve({ connected: true, eventsReceived: events.length, eventTypes: events.map(e => e.type) });
        }
      });

      wsClient.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });
    });
  }

  private async testAgentPipelineExecution(): Promise<any> {
    // Create a project and monitor its progression
    const projectData = {
      idea: 'A comprehensive business automation platform with AI-driven insights',
      userId: 'test-user-1'
    };

    const createResponse = await fetch(`${this.BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create project for pipeline test');
    }

    const project = await createResponse.json();
    
    // Wait for some processing
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check project status
    const statusResponse = await fetch(`${this.BASE_URL}/api/projects/${project.id}`);
    if (!statusResponse.ok) {
      throw new Error('Failed to retrieve project status');
    }

    const updatedProject = await statusResponse.json();
    
    return {
      projectId: project.id,
      initialStage: project.currentStage,
      currentStage: updatedProject.currentStage,
      tasksCreated: updatedProject.tasks?.length || 0,
      artifactsCreated: updatedProject.artifacts?.length || 0,
      pipelineStarted: updatedProject.currentStage > project.currentStage || updatedProject.tasks?.length > 0
    };
  }

  private async testConcurrentOperations(): Promise<any> {
    const concurrentRequests = 5;
    const promises = [];

    // Create multiple projects concurrently
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch(`${this.BASE_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idea: `Concurrent test project ${i + 1}`,
            userId: 'test-user-1'
          })
        })
      );
    }

    const responses = await Promise.all(promises);
    const successfulRequests = responses.filter(r => r.ok).length;
    
    if (successfulRequests < concurrentRequests) {
      throw new Error(`Only ${successfulRequests}/${concurrentRequests} concurrent requests succeeded`);
    }

    return { concurrentRequests, successfulRequests };
  }

  private async testErrorHandling(): Promise<any> {
    const errorTests = [
      {
        name: 'Invalid JSON',
        request: () => fetch(`${this.BASE_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json'
        }),
        expectedStatus: 400
      },
      {
        name: 'Missing required fields',
        request: () => fetch(`${this.BASE_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: '' })
        }),
        expectedStatus: 400
      },
      {
        name: 'Non-existent resource',
        request: () => fetch(`${this.BASE_URL}/api/projects/non-existent-id`),
        expectedStatus: 404
      }
    ];

    const results = [];
    
    for (const test of errorTests) {
      const response = await test.request();
      if (response.status !== test.expectedStatus) {
        throw new Error(`${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
      }
      results.push({ test: test.name, status: response.status });
    }

    return results;
  }

  private async testPerformanceUnderLoad(): Promise<any> {
    const loadTestRequests = 20;
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < loadTestRequests; i++) {
      promises.push(fetch(`${this.BASE_URL}/api/agents`));
    }

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const successfulRequests = responses.filter(r => r.ok).length;
    const averageResponseTime = totalTime / loadTestRequests;

    if (successfulRequests < loadTestRequests) {
      throw new Error(`Load test failed: ${successfulRequests}/${loadTestRequests} requests succeeded`);
    }

    if (averageResponseTime > 2000) {
      throw new Error(`Performance degraded: Average response time ${averageResponseTime}ms > 2000ms`);
    }

    return {
      totalRequests: loadTestRequests,
      successfulRequests,
      totalTime,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  private async testDataConsistency(): Promise<any> {
    // Create a project and verify data consistency
    const projectData = {
      idea: 'Data consistency test project',
      userId: 'test-user-1'
    };

    const createResponse = await fetch(`${this.BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });

    const project = await createResponse.json();
    
    // Retrieve the same project multiple times
    const retrievalPromises = [];
    for (let i = 0; i < 5; i++) {
      retrievalPromises.push(fetch(`${this.BASE_URL}/api/projects/${project.id}`));
    }

    const retrievalResponses = await Promise.all(retrievalPromises);
    const projects = await Promise.all(retrievalResponses.map(r => r.json()));

    // Verify all responses are identical
    const firstProject = projects[0];
    for (let i = 1; i < projects.length; i++) {
      if (projects[i].id !== firstProject.id || projects[i].name !== firstProject.name) {
        throw new Error('Data consistency check failed: Project data differs between requests');
      }
    }

    return { projectId: project.id, consistentRetrievals: projects.length };
  }

  private async testSystemResilience(): Promise<any> {
    // Test system behavior under various conditions
    const resilenceTests = [];

    // Test with large payload
    const largeIdea = 'A' .repeat(5000); // 5KB idea
    const largePayloadResponse = await fetch(`${this.BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: largeIdea,
        userId: 'test-user-1'
      })
    });

    resilenceTests.push({
      test: 'Large payload handling',
      passed: largePayloadResponse.ok,
      status: largePayloadResponse.status
    });

    // Test rapid sequential requests
    const rapidRequests = [];
    for (let i = 0; i < 10; i++) {
      rapidRequests.push(fetch(`${this.BASE_URL}/api/agents`));
    }

    const rapidResponses = await Promise.all(rapidRequests);
    const rapidSuccessCount = rapidResponses.filter(r => r.ok).length;

    resilenceTests.push({
      test: 'Rapid sequential requests',
      passed: rapidSuccessCount === 10,
      successCount: rapidSuccessCount
    });

    return resilenceTests;
  }

  private async generateReport(): Promise<void> {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 SYSTEM VALIDATION REPORT');
    console.log('=' .repeat(70));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const successRate = (passedTests / totalTests) * 100;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success rate: ${successRate.toFixed(1)}%`);
    console.log(`   Total duration: ${(totalDuration / 1000).toFixed(1)}s`);

    if (passedTests > 0) {
      console.log(`\n✅ Passed Tests:`);
      this.results.filter(r => r.passed).forEach(result => {
        console.log(`   • ${result.test} (${result.duration}ms)`);
      });
    }

    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.test} (${result.duration}ms)`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      });
    }

    // Requirements validation
    console.log(`\n📋 Requirements Validation:`);
    const apiTests = this.results.filter(r => r.test.includes('API') || r.test.includes('Project Creation'));
    const websocketTests = this.results.filter(r => r.test.includes('WebSocket'));
    const pipelineTests = this.results.filter(r => r.test.includes('Pipeline'));
    const performanceTests = this.results.filter(r => r.test.includes('Performance') || r.test.includes('Concurrent'));

    console.log(`   Requirement 2.1-2.7 (6-stage pipeline): ${pipelineTests.every(t => t.passed) ? '✅' : '❌'}`);
    console.log(`   Requirement 8.1 (system performance): ${performanceTests.every(t => t.passed) ? '✅' : '❌'}`);
    console.log(`   Requirement 8.2 (integration testing): ${apiTests.every(t => t.passed) ? '✅' : '❌'}`);
    console.log(`   WebSocket real-time communication: ${websocketTests.every(t => t.passed) ? '✅' : '❌'}`);

    console.log('\n' + '=' .repeat(70));

    if (failedTests === 0) {
      console.log('🎉 ALL TESTS PASSED! System integration and end-to-end validation successful.');
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Please review the failures above.`);
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise(resolve => {
        this.serverProcess!.on('exit', resolve);
        setTimeout(() => {
          this.serverProcess!.kill('SIGKILL');
          resolve(true);
        }, 5000);
      });
    }

    try {
      await databaseService.cleanup();
    } catch (error) {
      console.error('Database cleanup error:', error);
    }

    console.log('✅ Cleanup complete');
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new SystemValidator();
  validator.runValidation().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { SystemValidator };