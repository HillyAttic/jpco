#!/usr/bin/env tsx
/**
 * Script to add authentication to API routes
 * 
 * This script helps identify and update API routes that need authentication.
 * It scans for TODO comments and provides a report.
 * 
 * Usage:
 *   npx tsx scripts/add-auth-to-routes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteInfo {
  file: string;
  method: string;
  line: number;
  hasAuth: boolean;
  hasTodo: boolean;
}

const API_DIR = path.join(process.cwd(), 'src', 'app', 'api');

function scanDirectory(dir: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    return routes;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      routes.push(...scanDirectory(fullPath));
    } else if (file.name === 'route.ts') {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Check for HTTP methods
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const method of methods) {
          if (line.includes(`export async function ${method}`)) {
            // Check if this function has authentication
            const functionEnd = findFunctionEnd(lines, i);
            const functionBody = lines.slice(i, functionEnd).join('\n');
            
            const hasAuth = functionBody.includes('verifyAuthToken') || 
                           functionBody.includes('withAuth') ||
                           functionBody.includes('withRoleAuth');
            
            const hasTodo = functionBody.includes('TODO: Add authentication');

            routes.push({
              file: fullPath.replace(process.cwd(), ''),
              method,
              line: i + 1,
              hasAuth,
              hasTodo,
            });
          }
        }
      }
    }
  }

  return routes;
}

function findFunctionEnd(lines: string[], startLine: number): number {
  let braceCount = 0;
  let started = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          return i + 1;
        }
      }
    }
  }

  return lines.length;
}

function generateReport(routes: RouteInfo[]): void {
  console.log('\n========================================');
  console.log('  API ROUTE AUTHENTICATION AUDIT');
  console.log('========================================\n');

  const needsAuth = routes.filter(r => !r.hasAuth);
  const hasAuth = routes.filter(r => r.hasAuth);
  const hasTodo = routes.filter(r => r.hasTodo);

  console.log(`Total Routes: ${routes.length}`);
  console.log(`✅ Protected: ${hasAuth.length}`);
  console.log(`❌ Unprotected: ${needsAuth.length}`);
  console.log(`⚠️  Has TODO: ${hasTodo.length}\n`);

  if (needsAuth.length > 0) {
    console.log('========================================');
    console.log('  ROUTES NEEDING AUTHENTICATION');
    console.log('========================================\n');

    const grouped = groupByFile(needsAuth);

    for (const [file, fileRoutes] of Object.entries(grouped)) {
      console.log(`📄 ${file}`);
      for (const route of fileRoutes) {
        console.log(`   ${route.method} (line ${route.line})`);
      }
      console.log('');
    }
  }

  if (hasAuth.length > 0) {
    console.log('========================================');
    console.log('  PROTECTED ROUTES');
    console.log('========================================\n');

    const grouped = groupByFile(hasAuth);

    for (const [file, fileRoutes] of Object.entries(grouped)) {
      console.log(`✅ ${file}`);
      for (const route of fileRoutes) {
        console.log(`   ${route.method} (line ${route.line})`);
      }
      console.log('');
    }
  }

  // Generate priority list
  console.log('========================================');
  console.log('  PRIORITY RECOMMENDATIONS');
  console.log('========================================\n');

  const highPriority = [
    '/api/tasks',
    '/api/employees',
    '/api/clients',
    '/api/categories',
    '/api/teams',
    '/api/recurring-tasks',
  ];

  const mediumPriority = [
    '/api/attendance',
    '/api/roster',
    '/api/notifications',
  ];

  console.log('🔴 HIGH PRIORITY (Manager/Admin only):');
  for (const pattern of highPriority) {
    const matching = needsAuth.filter(r => r.file.includes(pattern));
    if (matching.length > 0) {
      console.log(`   ${pattern} - ${matching.length} route(s)`);
    }
  }

  console.log('\n🟡 MEDIUM PRIORITY (Employee access):');
  for (const pattern of mediumPriority) {
    const matching = needsAuth.filter(r => r.file.includes(pattern));
    if (matching.length > 0) {
      console.log(`   ${pattern} - ${matching.length} route(s)`);
    }
  }

  console.log('\n========================================');
  console.log('  NEXT STEPS');
  console.log('========================================\n');

  console.log('1. Review the unprotected routes above');
  console.log('2. Add authentication using the pattern:');
  console.log('');
  console.log('   const { verifyAuthToken } = await import(\'@/lib/server-auth\');');
  console.log('   const authResult = await verifyAuthToken(request);');
  console.log('   if (!authResult.success) return ErrorResponses.unauthorized();');
  console.log('');
  console.log('3. Add role-based checks as needed');
  console.log('4. Test each route after updating');
  console.log('5. Deploy and monitor\n');
}

function groupByFile(routes: RouteInfo[]): Record<string, RouteInfo[]> {
  const grouped: Record<string, RouteInfo[]> = {};

  for (const route of routes) {
    if (!grouped[route.file]) {
      grouped[route.file] = [];
    }
    grouped[route.file].push(route);
  }

  return grouped;
}

// Main execution
console.log('Scanning API routes...\n');
const routes = scanDirectory(API_DIR);
generateReport(routes);

// Exit with error code if there are unprotected routes
const needsAuth = routes.filter(r => !r.hasAuth);
if (needsAuth.length > 0) {
  process.exit(1);
}
