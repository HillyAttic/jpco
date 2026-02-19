#!/usr/bin/env node
/**
 * Identify which API routes use Firebase Client SDK vs Admin SDK
 * This helps determine which routes need to be converted
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteAnalysis {
  file: string;
  usesClientSDK: boolean;
  usesAdminSDK: boolean;
  clientSDKImports: string[];
  adminSDKImports: string[];
  services: string[];
}

const API_DIR = path.join(process.cwd(), 'src', 'app', 'api');

// Patterns to identify Client SDK usage
const CLIENT_SDK_PATTERNS = [
  /from ['"]@\/lib\/firebase['"]/,
  /import.*\{.*db.*\}.*from ['"]@\/lib\/firebase['"]/,
  /import.*\{.*auth.*\}.*from ['"]@\/lib\/firebase['"]/,
  /import.*\{.*storage.*\}.*from ['"]@\/lib\/firebase['"]/,
];

// Patterns to identify Admin SDK usage
const ADMIN_SDK_PATTERNS = [
  /from ['"]@\/lib\/firebase-admin['"]/,
  /import.*\{.*adminDb.*\}.*from ['"]@\/lib\/firebase-admin['"]/,
  /import.*\{.*adminAuth.*\}.*from ['"]@\/lib\/firebase-admin['"]/,
];

// Service patterns
const SERVICE_PATTERNS = [
  /from ['"]@\/services\/([^'"]+)['"]/g,
];

function analyzeFile(filePath: string): RouteAnalysis | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const clientSDKImports: string[] = [];
    const adminSDKImports: string[] = [];
    const services: string[] = [];
    
    // Check for Client SDK imports
    CLIENT_SDK_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        clientSDKImports.push(matches[0]);
      }
    });
    
    // Check for Admin SDK imports
    ADMIN_SDK_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        adminSDKImports.push(matches[0]);
      }
    });
    
    // Extract service imports
    SERVICE_PATTERNS.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        services.push(match[1]);
      }
    });
    
    return {
      file: path.relative(process.cwd(), filePath),
      usesClientSDK: clientSDKImports.length > 0,
      usesAdminSDK: adminSDKImports.length > 0,
      clientSDKImports,
      adminSDKImports,
      services,
    };
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
    return null;
  }
}

function scanDirectory(dir: string): RouteAnalysis[] {
  const results: RouteAnalysis[] = [];
  
  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.name === 'route.ts') {
        const analysis = analyzeFile(fullPath);
        if (analysis) {
          results.push(analysis);
        }
      }
    }
  }
  
  scan(dir);
  return results;
}

function main() {
  console.log('🔍 Analyzing API Routes for SDK Usage...\n');
  console.log('='.repeat(80));
  
  const analyses = scanDirectory(API_DIR);
  
  // Categorize routes
  const clientSDKRoutes = analyses.filter(a => a.usesClientSDK);
  const adminSDKRoutes = analyses.filter(a => a.usesAdminSDK);
  const mixedRoutes = analyses.filter(a => a.usesClientSDK && a.usesAdminSDK);
  const neitherRoutes = analyses.filter(a => !a.usesClientSDK && !a.usesAdminSDK);
  
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total API Routes: ${analyses.length}`);
  console.log(`✅ Using Admin SDK Only: ${adminSDKRoutes.length - mixedRoutes.length}`);
  console.log(`❌ Using Client SDK Only: ${clientSDKRoutes.length - mixedRoutes.length}`);
  console.log(`⚠️  Using Both (Mixed): ${mixedRoutes.length}`);
  console.log(`⚪ Using Neither: ${neitherRoutes.length}`);
  
  // Routes using Client SDK (WRONG)
  if (clientSDKRoutes.length > 0) {
    console.log('\n\n❌ ROUTES USING CLIENT SDK (NEED CONVERSION)');
    console.log('='.repeat(80));
    clientSDKRoutes.forEach(route => {
      console.log(`\n📄 ${route.file}`);
      if (route.clientSDKImports.length > 0) {
        console.log(`   Client SDK: ${route.clientSDKImports.join(', ')}`);
      }
      if (route.services.length > 0) {
        console.log(`   Services: ${route.services.join(', ')}`);
      }
    });
  }
  
  // Routes using Admin SDK (CORRECT)
  if (adminSDKRoutes.length > 0) {
    console.log('\n\n✅ ROUTES USING ADMIN SDK (CORRECT)');
    console.log('='.repeat(80));
    adminSDKRoutes.forEach(route => {
      console.log(`\n📄 ${route.file}`);
      if (route.adminSDKImports.length > 0) {
        console.log(`   Admin SDK: ${route.adminSDKImports.join(', ')}`);
      }
      if (route.services.length > 0) {
        console.log(`   Services: ${route.services.join(', ')}`);
      }
    });
  }
  
  // Mixed routes (NEEDS CLEANUP)
  if (mixedRoutes.length > 0) {
    console.log('\n\n⚠️  ROUTES USING BOTH (NEEDS CLEANUP)');
    console.log('='.repeat(80));
    mixedRoutes.forEach(route => {
      console.log(`\n📄 ${route.file}`);
      console.log(`   Client SDK: ${route.clientSDKImports.join(', ')}`);
      console.log(`   Admin SDK: ${route.adminSDKImports.join(', ')}`);
      if (route.services.length > 0) {
        console.log(`   Services: ${route.services.join(', ')}`);
      }
    });
  }
  
  // Analyze services used
  console.log('\n\n📦 SERVICES USED BY API ROUTES');
  console.log('='.repeat(80));
  const allServices = new Set<string>();
  analyses.forEach(a => a.services.forEach(s => allServices.add(s)));
  
  const servicesList = Array.from(allServices).sort();
  servicesList.forEach(service => {
    const routesUsingService = analyses.filter(a => a.services.includes(service));
    console.log(`\n${service}`);
    console.log(`   Used by ${routesUsingService.length} route(s)`);
    
    // Check if service file exists and what it uses
    const servicePath = path.join(process.cwd(), 'src', 'services', `${service}.ts`);
    if (fs.existsSync(servicePath)) {
      const serviceAnalysis = analyzeFile(servicePath);
      if (serviceAnalysis) {
        if (serviceAnalysis.usesClientSDK) {
          console.log(`   ❌ Uses Client SDK - NEEDS ADMIN VERSION`);
        }
        if (serviceAnalysis.usesAdminSDK) {
          console.log(`   ✅ Uses Admin SDK`);
        }
      }
    }
  });
  
  console.log('\n\n🎯 RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log('\n1. Convert Client SDK routes to Admin SDK:');
  console.log(`   - ${clientSDKRoutes.length - mixedRoutes.length} routes need conversion`);
  console.log('\n2. Clean up mixed routes:');
  console.log(`   - ${mixedRoutes.length} routes use both SDKs`);
  console.log('\n3. Create Admin service versions for:');
  const clientSDKServices = servicesList.filter(service => {
    const servicePath = path.join(process.cwd(), 'src', 'services', `${service}.ts`);
    if (fs.existsSync(servicePath)) {
      const analysis = analyzeFile(servicePath);
      return analysis?.usesClientSDK;
    }
    return false;
  });
  clientSDKServices.forEach(service => {
    console.log(`   - ${service}.ts → ${service}-admin.ts`);
  });
  
  console.log('\n='.repeat(80));
}

main();
