#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  timeout: number;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'API Integration',
    file: 'api-integration.test.ts',
    timeout: 60000,
    description: 'Tests REST API endpoints and basic functionality'
  },
  {
    name: 'WebSocket Integration',
    file: 'websocket-realtime-integration.test.ts',
    timeout: 90000,
    description: 'Tests real-time WebSocket communication'
  },
  {
    name: 'Agent Orchestration',
    file: 'agent-orchestration-integration.test.ts',
    timeout: 120000,
    description: 'Tests agent execution and orchestration'
  },
  {
    name: 'Error Handling',
    file: 'error-handling-integration.test.ts',
    timeout: 60000,
    description: 'Tests system resilience and error recovery'
  },
  {
    name: 'System Resilience',
    file: 'system-resilience.test.ts',
    timeout: 90000,
    description: 'Tests system stability under various conditions'
  },
  {
    name: 'Performance Load Testing',
    file: 'performance-load.test.ts',
    timeout: 180000,
    description: 'Tests system performance under load'
  },
  {
    name: 'Six-Stage Validation',
    file: 'six-stage-validation.test.ts',
    timeout: 600000,
    description: 'Tests complete 6-stage pipeline execution'
  },
  {
    name: 'End-to-End System',
    file: 'end-to-end-system.test.ts',
    timeout: 600000,
    description: 'Comprehensive end-to-end system validation'
  }
];

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

async function runTestSuite(suite: TestSuite): Promise<TestResult> {
  const startTime = Date.now();
  
  console.log(`\n🧪 Running ${suite.name}...`);
  console.log(`   ${suite.description}`);
  
  try {
    const testFile = path.join(__dirname, suite.file);
    
    if (!existsSync(testFile)) {
      throw new Error(`Test file not found: ${suite.file}`);
    }
    
    // Run the test with vitest
    execSync(`npx vitest run ${testFile} --reporter=verbose`, {
      stdio: 'inherit',
      timeout: suite.timeout,
      cwd: process.cwd()
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${suite.name} passed in ${duration}ms`);
    
    return {
      name: suite.name,
      passed: true,
      duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${suite.name} failed in ${duration}ms`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      name: suite.name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting System Integration and End-to-End Testing Suite');
  console.log('=' .repeat(60));
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Check prerequisites
  console.log('\n🔍 Checking prerequisites...');
  
  try {
    // Check if Ollama is available
    execSync('curl -s http://localhost:11434/api/tags', { stdio: 'pipe' });
    console.log('✅ Ollama service is available');
  } catch (error) {
    console.log('⚠️  Ollama service not available - some tests may be skipped');
  }
  
  // Check if database is accessible
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    if (existsSync(dbPath)) {
      console.log('✅ Database file exists');
    } else {
      console.log('⚠️  Database file not found - will be created during tests');
    }
  } catch (error) {
    console.log('⚠️  Database check failed');
  }
  
  // Run test suites
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
    
    // Add delay between test suites to prevent resource conflicts
    if (suite !== testSuites[testSuites.length - 1]) {
      console.log('   Waiting 5 seconds before next test suite...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Generate summary report
  const totalDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.passed);
  const failedTests = results.filter(r => !r.passed);
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('=' .repeat(60));
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   Total test suites: ${results.length}`);
  console.log(`   Passed: ${passedTests.length}`);
  console.log(`   Failed: ${failedTests.length}`);
  console.log(`   Success rate: ${((passedTests.length / results.length) * 100).toFixed(1)}%`);
  console.log(`   Total duration: ${(totalDuration / 1000).toFixed(1)}s`);
  
  if (passedTests.length > 0) {
    console.log(`\n✅ Passed Test Suites:`);
    passedTests.forEach(result => {
      console.log(`   • ${result.name} (${(result.duration / 1000).toFixed(1)}s)`);
    });
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Test Suites:`);
    failedTests.forEach(result => {
      console.log(`   • ${result.name} (${(result.duration / 1000).toFixed(1)}s)`);
      if (result.error) {
        console.log(`     Error: ${result.error.substring(0, 100)}...`);
      }
    });
  }
  
  // Performance metrics
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  const minDuration = Math.min(...results.map(r => r.duration));
  
  console.log(`\n⏱️  Performance Metrics:`);
  console.log(`   Average test suite duration: ${(avgDuration / 1000).toFixed(1)}s`);
  console.log(`   Longest test suite: ${(maxDuration / 1000).toFixed(1)}s`);
  console.log(`   Shortest test suite: ${(minDuration / 1000).toFixed(1)}s`);
  
  // System validation summary
  console.log(`\n🎯 System Validation Results:`);
  
  const apiPassed = results.find(r => r.name === 'API Integration')?.passed;
  const websocketPassed = results.find(r => r.name === 'WebSocket Integration')?.passed;
  const orchestrationPassed = results.find(r => r.name === 'Agent Orchestration')?.passed;
  const sixStagePassed = results.find(r => r.name === 'Six-Stage Validation')?.passed;
  const e2ePassed = results.find(r => r.name === 'End-to-End System')?.passed;
  const performancePassed = results.find(r => r.name === 'Performance Load Testing')?.passed;
  
  console.log(`   REST API functionality: ${apiPassed ? '✅' : '❌'}`);
  console.log(`   WebSocket real-time communication: ${websocketPassed ? '✅' : '❌'}`);
  console.log(`   Agent orchestration pipeline: ${orchestrationPassed ? '✅' : '❌'}`);
  console.log(`   Complete 6-stage execution: ${sixStagePassed ? '✅' : '❌'}`);
  console.log(`   End-to-end system integration: ${e2ePassed ? '✅' : '❌'}`);
  console.log(`   Performance under load: ${performancePassed ? '✅' : '❌'}`);
  
  // Requirements validation
  console.log(`\n📋 Requirements Validation:`);
  console.log(`   Requirement 2.1 (6-stage pipeline): ${sixStagePassed ? '✅' : '❌'}`);
  console.log(`   Requirement 2.2-2.7 (stage execution): ${sixStagePassed ? '✅' : '❌'}`);
  console.log(`   Requirement 8.1 (system performance): ${performancePassed ? '✅' : '❌'}`);
  console.log(`   Requirement 8.2 (integration testing): ${e2ePassed ? '✅' : '❌'}`);
  
  console.log('\n' + '=' .repeat(60));
  
  if (failedTests.length === 0) {
    console.log('🎉 ALL TESTS PASSED! System is ready for production.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the failures above.');
    process.exit(1);
  }
}

// Run the test suite
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error running test suite:', error);
    process.exit(1);
  });
}

export { runAllTests, testSuites };