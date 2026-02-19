#!/usr/bin/env tsx
/**
 * Fix Missing Imports Script
 * 
 * Adds missing ErrorResponses import to files that use it
 * 
 * Usage:
 *   npx tsx scripts/fix-missing-imports.ts
 */

import * as fs from 'fs';
import * as path from 'path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.ts')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function fixImports() {
  console.log('\n========================================');
  console.log('  FIXING MISSING IMPORTS');
  console.log('========================================\n');

  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const files = getAllFiles(apiDir);

  let fixed = 0;
  let skipped = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check if file uses ErrorResponses but doesn't import it
    const usesErrorResponses = content.includes('ErrorResponses.');
    const hasImport = content.includes("from '@/lib/api-error-handler'") ||
                     content.includes('import { ErrorResponses }') ||
                     content.includes('import { handleApiError, ErrorResponses }');
    
    if (usesErrorResponses && !hasImport) {
      console.log(`📝 Adding import to: ${path.relative(process.cwd(), file)}`);
      
      // Find the last import statement
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        // Add the import after the last import
        lines.splice(lastImportIndex + 1, 0, "import { ErrorResponses } from '@/lib/api-error-handler';");
        
        fs.writeFileSync(file, lines.join('\n'), 'utf-8');
        fixed++;
      }
    } else if (usesErrorResponses && hasImport) {
      skipped++;
    }
  }

  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================\n');
  console.log(`✅ Fixed: ${fixed} files`);
  console.log(`⏭️  Skipped: ${skipped} files (already have import)\n`);
  
  if (fixed > 0) {
    console.log('Run the audit again to verify:');
    console.log('  npx tsx scripts/add-auth-to-routes.ts\n');
  }
}

fixImports();
