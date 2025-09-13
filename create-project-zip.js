#!/usr/bin/env node

/**
 * Script to create a ZIP file of the project artifacts
 * Run with: node create-project-zip.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Check if zip command is available
function hasZipCommand() {
    try {
        execSync('which zip', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Files to include in the ZIP
const filesToInclude = [
    // Core application files
    'public/index.html',
    'public/app.js',
    'public/styles.css',
    'public/design-system.css',
    
    // Component files
    'public/ProjectCard.js',
    'public/ArtifactViewer.js',
    'public/ModelSelector.js',
    'public/Terminal.js',
    'public/ErrorHandler.js',
    'public/ApiKeyManager.js',
    
    // Test and demo files
    'public/download-test.html',
    'public/groq-demo.html',
    'public/api-key-manager-test.html',
    
    // Backend files
    'src/index.ts',
    'src/services/groq.ts',
    'src/controllers/GroqController.ts',
    'src/controllers/ProjectController.ts',
    'src/services/ProjectService.ts',
    'src/services/AgentOrchestrator.ts',
    'src/services/AIServiceFactory.ts',
    'src/types/index.ts',
    
    // Configuration files
    'package.json',
    '.env.example',
    
    // Documentation
    'README.md',
    'DOWNLOAD_AND_MODAL_FIX.md',
    'GROQ_FIX_SUMMARY.md',
    'GROQ_COMPLETE_FIX.md',
    'GROQ_API_KEY_GUIDE.md',
    
    // Spec files
    '.kiro/specs/groq-model-integration/requirements.md',
    '.kiro/specs/groq-model-integration/design.md',
    '.kiro/specs/groq-model-integration/tasks.md'
];

function createZip() {
    const zipName = `billion-dollar-idea-platform-${new Date().toISOString().split('T')[0]}.zip`;
    
    console.log('🗜️  Creating project ZIP file...');
    console.log(`📦 ZIP file: ${zipName}`);
    
    if (!hasZipCommand()) {
        console.error('❌ Error: zip command not found. Please install zip utility.');
        console.log('💡 On macOS: zip is pre-installed');
        console.log('💡 On Ubuntu/Debian: sudo apt install zip');
        console.log('💡 On Windows: Use WSL or install 7-zip');
        process.exit(1);
    }
    
    // Filter files that actually exist
    const existingFiles = filesToInclude.filter(file => {
        const exists = fs.existsSync(file);
        if (!exists) {
            console.log(`⚠️  Skipping missing file: ${file}`);
        }
        return exists;
    });
    
    if (existingFiles.length === 0) {
        console.error('❌ No files found to include in ZIP');
        process.exit(1);
    }
    
    console.log(`📁 Including ${existingFiles.length} files:`);
    existingFiles.forEach(file => console.log(`   ✓ ${file}`));
    
    try {
        // Create ZIP file
        const command = `zip -r "${zipName}" ${existingFiles.map(f => `"${f}"`).join(' ')}`;
        execSync(command, { stdio: 'inherit' });
        
        console.log('');
        console.log('✅ ZIP file created successfully!');
        console.log(`📦 File: ${zipName}`);
        console.log(`📊 Size: ${(fs.statSync(zipName).size / 1024 / 1024).toFixed(2)} MB`);
        
    } catch (error) {
        console.error('❌ Error creating ZIP file:', error.message);
        process.exit(1);
    }
}

// Run the script
createZip();