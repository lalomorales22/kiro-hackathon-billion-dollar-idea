#!/usr/bin/env tsx

import { databaseService } from '../services/database';

async function initializeDatabase() {
  console.log('🚀 Initializing database...');
  
  try {
    // Connect to database
    await databaseService.connect();
    
    // Perform health check
    const healthCheck = await databaseService.healthCheck();
    console.log(`📊 Health check result: ${healthCheck.status} - ${healthCheck.message}`);
    
    if (healthCheck.status === 'healthy') {
      console.log('✅ Database initialization completed successfully!');
    } else {
      console.error('❌ Database initialization failed - health check unsuccessful');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

// Run initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch((error) => {
    console.error('❌ Unexpected error during database initialization:', error);
    process.exit(1);
  });
}

export { initializeDatabase };