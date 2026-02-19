#!/usr/bin/env tsx
/**
 * Bulk Authentication Addition Script
 * 
 * This script adds authentication to multiple API routes automatically.
 * It creates a backup before modifying files.
 * 
 * Usage:
 *   npx tsx scripts/bulk-add-auth.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteConfig {
  file: string;
  methods: {
    method: string;
    requiredRole: 'employee' | 'manager' | 'admin';
  }[];
}

// Define routes and their required roles
const ROUTE_CONFIGS: RouteConfig[] = [
  // HIGH PRIORITY - Manager/Admin only
  {
    file: 'src/app/api/tasks/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/tasks/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/employees/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/employees/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/clients/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/clients/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/categories/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/categories/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/teams/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/teams/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  // MEDIUM PRIORITY - Employee access
  {
    file: 'src/app/api/attendance/clock-in/route.ts',
    methods: [{ method: 'POST', requiredRole: 'employee' }],
  },
  {
    file: 'src/app/api/attendance/clock-out/route.ts',
    methods: [{ method: 'POST', requiredRole: 'employee' }],
  },
  {
    file: 'src/app/api/attendance/status/route.ts',
    methods: [{ method: 'GET', requiredRole: 'employee' }],
  },
  {
    file: 'src/app/api/roster/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'manager' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/notifications/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'employee' },
    ],
  },
];

function generateAuthCode(requiredRole: 'employee' | 'manager' | 'admin'): string {
  const roleCheck = requiredRole === 'employee'
    ? `if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }`
    : `if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }`;

  return `    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized(authResult.error);
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    ${roleCheck}
`;
}

function addAuthToRoute(filePath: string, method: string, requiredRole: 'employee' | 'manager' | 'admin'): boolean {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  // Find the function declaration
  const functionPattern = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`);
  let functionLineIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (functionPattern.test(lines[i])) {
      functionLineIndex = i;
      break;
    }
  }
  
  if (functionLineIndex === -1) {
    console.log(`⚠️  Method ${method} not found in ${filePath}`);
    return false;
  }
  
  // Find the try block
  let tryLineIndex = -1;
  for (let i = functionLineIndex; i < Math.min(functionLineIndex + 10, lines.length); i++) {
    if (lines[i].trim().startsWith('try {')) {
      tryLineIndex = i;
      break;
    }
  }
  
  if (tryLineIndex === -1) {
    console.log(`⚠️  Try block not found for ${method} in ${filePath}`);
    return false;
  }
  
  // Check if auth already exists
  const nextFewLines = lines.slice(tryLineIndex, tryLineIndex + 15).join('\n');
  if (nextFewLines.includes('verifyAuthToken') || nextFewLines.includes('authResult')) {
    console.log(`✅ ${filePath} - ${method} already has authentication`);
    return false;
  }
  
  // Insert auth code after try {
  const authCode = generateAuthCode(requiredRole);
  const authLines = authCode.split('\n');
  
  // Insert after the try { line
  lines.splice(tryLineIndex + 1, 0, ...authLines);
  
  // Write back
  const newContent = lines.join('\n');
  fs.writeFileSync(fullPath, newContent, 'utf-8');
  
  return true;
}

function createBackup(filePath: string): void {
  const fullPath = path.join(process.cwd(), filePath);
  const backupPath = fullPath + '.backup';
  
  if (fs.existsSync(fullPath)) {
    fs.copyFileSync(fullPath, backupPath);
  }
}

function main() {
  console.log('\n========================================');
  console.log('  BULK AUTHENTICATION ADDITION');
  console.log('========================================\n');
  
  console.log(`Processing ${ROUTE_CONFIGS.length} route files...\n`);
  
  let totalModified = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (const config of ROUTE_CONFIGS) {
    console.log(`\n📄 ${config.file}`);
    
    // Create backup
    createBackup(config.file);
    
    for (const { method, requiredRole } of config.methods) {
      try {
        const modified = addAuthToRoute(config.file, method, requiredRole);
        if (modified) {
          console.log(`   ✅ ${method} - Added ${requiredRole}+ authentication`);
          totalModified++;
        } else {
          totalSkipped++;
        }
      } catch (error: any) {
        console.log(`   ❌ ${method} - Error: ${error.message}`);
        totalErrors++;
      }
    }
  }
  
  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================\n');
  console.log(`✅ Modified: ${totalModified} methods`);
  console.log(`⏭️  Skipped: ${totalSkipped} methods`);
  console.log(`❌ Errors: ${totalErrors} methods`);
  console.log('\n========================================');
  console.log('  NEXT STEPS');
  console.log('========================================\n');
  console.log('1. Review the modified files');
  console.log('2. Test each route');
  console.log('3. Run: npx tsx scripts/add-auth-to-routes.ts');
  console.log('4. Fix any remaining routes manually');
  console.log('5. Deploy to production\n');
  
  if (totalModified > 0) {
    console.log('⚠️  Backups created with .backup extension');
    console.log('   To restore: copy .backup files back to original\n');
  }
}

main();
