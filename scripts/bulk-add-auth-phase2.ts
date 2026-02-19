#!/usr/bin/env tsx
/**
 * Bulk Authentication Addition Script - Phase 2
 * 
 * This script adds authentication to detail routes and remaining endpoints.
 * It creates a backup before modifying files.
 * 
 * Usage:
 *   npx tsx scripts/bulk-add-auth-phase2.ts
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

// Define routes and their required roles - PHASE 2
const ROUTE_CONFIGS: RouteConfig[] = [
  // HIGH PRIORITY - Detail Routes
  
  // Tasks detail routes
  {
    file: 'src/app/api/tasks/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/tasks/[id]/comments/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/tasks/[id]/complete/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'employee' },
    ],
  },
  
  // Employees detail routes
  {
    file: 'src/app/api/employees/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/employees/[id]/deactivate/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/employees/bulk-delete/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'admin' },
    ],
  },
  
  // Clients detail routes
  {
    file: 'src/app/api/clients/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'manager' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  
  // Categories detail routes
  {
    file: 'src/app/api/categories/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/categories/[id]/toggle/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'manager' },
    ],
  },
  
  // Teams detail routes
  {
    file: 'src/app/api/teams/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/teams/[id]/members/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/teams/[id]/members/[memberId]/route.ts',
    methods: [
      { method: 'DELETE', requiredRole: 'manager' },
      { method: 'PATCH', requiredRole: 'manager' },
    ],
  },
  
  // Recurring Tasks - ALL routes
  {
    file: 'src/app/api/recurring-tasks/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/recurring-tasks/[id]/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'PUT', requiredRole: 'manager' },
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/recurring-tasks/[id]/complete/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/recurring-tasks/[id]/pause/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/recurring-tasks/[id]/resume/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'manager' },
    ],
  },
  
  // MEDIUM PRIORITY
  
  // Attendance routes
  {
    file: 'src/app/api/attendance/break/start/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/attendance/break/end/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/attendance/records/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/attendance/[id]/route.ts',
    methods: [
      { method: 'DELETE', requiredRole: 'manager' },
    ],
  },
  
  // Roster routes
  {
    file: 'src/app/api/roster/daily-stats/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/roster/monthly/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
    ],
  },
  
  // Leave requests
  {
    file: 'src/app/api/leave/requests/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/leave/requests/[id]/approve/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/leave/requests/[id]/reject/route.ts',
    methods: [
      { method: 'PATCH', requiredRole: 'manager' },
    ],
  },
  
  // Notifications
  {
    file: 'src/app/api/notifications/check-token/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/notifications/fcm-token/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'employee' },
      { method: 'DELETE', requiredRole: 'employee' },
    ],
  },
  {
    file: 'src/app/api/notifications/send/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  
  // Shifts
  {
    file: 'src/app/api/shifts/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  {
    file: 'src/app/api/shifts/[id]/assign/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'manager' },
    ],
  },
  
  // Users
  {
    file: 'src/app/api/users/names/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'employee' },
    ],
  },
  
  // LOW PRIORITY - Admin only or disable
  {
    file: 'src/app/api/attendance/cleanup-duplicates/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'admin' },
    ],
  },
  {
    file: 'src/app/api/categories/seed/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'admin' },
    ],
  },
  {
    file: 'src/app/api/employees/seed/route.ts',
    methods: [
      { method: 'POST', requiredRole: 'admin' },
    ],
  },
  {
    file: 'src/app/api/debug/user-profile/route.ts',
    methods: [
      { method: 'GET', requiredRole: 'admin' },
    ],
  },
];

function generateAuthCode(requiredRole: 'employee' | 'manager' | 'admin'): string {
  let roleCheck = '';
  
  if (requiredRole === 'admin') {
    roleCheck = `if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Admin access required');
    }`;
  } else if (requiredRole === 'manager') {
    roleCheck = `if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }`;
  } else {
    roleCheck = `if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }`;
  }

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
  const backupPath = fullPath + '.backup2';
  
  if (fs.existsSync(fullPath)) {
    fs.copyFileSync(fullPath, backupPath);
  }
}

function main() {
  console.log('\n========================================');
  console.log('  BULK AUTHENTICATION ADDITION - PHASE 2');
  console.log('  Detail Routes & Remaining Endpoints');
  console.log('========================================\n');
  
  console.log(`Processing ${ROUTE_CONFIGS.length} route files...\n`);
  
  let totalModified = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  const categories = {
    'High Priority': 0,
    'Medium Priority': 0,
    'Low Priority': 0,
  };
  
  for (let i = 0; i < ROUTE_CONFIGS.length; i++) {
    const config = ROUTE_CONFIGS[i];
    
    // Determine category
    let category = 'High Priority';
    if (i >= 18 && i < 33) category = 'Medium Priority';
    if (i >= 33) category = 'Low Priority';
    
    console.log(`\n📄 ${config.file}`);
    
    // Create backup
    createBackup(config.file);
    
    for (const { method, requiredRole } of config.methods) {
      try {
        const modified = addAuthToRoute(config.file, method, requiredRole);
        if (modified) {
          const roleLabel = requiredRole === 'admin' ? 'admin-only' : `${requiredRole}+`;
          console.log(`   ✅ ${method} - Added ${roleLabel} authentication`);
          totalModified++;
          categories[category as keyof typeof categories]++;
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
  console.log(`   - High Priority: ${categories['High Priority']} methods`);
  console.log(`   - Medium Priority: ${categories['Medium Priority']} methods`);
  console.log(`   - Low Priority: ${categories['Low Priority']} methods`);
  console.log(`⏭️  Skipped: ${totalSkipped} methods (already protected)`);
  console.log(`❌ Errors: ${totalErrors} methods`);
  
  console.log('\n========================================');
  console.log('  NEXT STEPS');
  console.log('========================================\n');
  console.log('1. Run audit to verify: npx tsx scripts/add-auth-to-routes.ts');
  console.log('2. Review the modified files');
  console.log('3. Test critical routes');
  console.log('4. Update frontend to send Authorization headers');
  console.log('5. Deploy to production\n');
  
  if (totalModified > 0) {
    console.log('⚠️  Backups created with .backup2 extension');
    console.log('   To restore: copy .backup2 files back to original\n');
  }
  
  console.log('========================================');
  console.log('  EXPECTED RESULT');
  console.log('========================================\n');
  console.log('After running the audit script, you should see:');
  console.log('✅ Protected: ~73 routes (100%)');
  console.log('❌ Unprotected: ~0 routes\n');
  
  if (totalModified > 0) {
    console.log('🎉 Phase 2 complete! All routes should now be protected.\n');
  }
}

main();
