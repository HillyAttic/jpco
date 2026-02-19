# 🎯 Finish The Job - 33 Routes Remaining

## Current Status: 55% Complete

You've done the hard part! 40 routes are protected. Now finish the remaining 33 routes to reach 100% security.

## ⏱️ Time Required: 30-45 minutes

## 🎯 The Pattern (Copy This)

```typescript
export async function METHOD(request: NextRequest, { params }: any) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized(authResult.error);
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    // Your existing code continues here...
    const { id } = await params;
    // ...
  } catch (error) {
    return handleApiError(error);
  }
}
```

## 📝 Checklist - Fix These Files

### Group 1: Tasks (6 routes) - 10 minutes

- [ ] `src/app/api/tasks/[id]/route.ts`
  - [ ] GET (line 28) - manager+
  - [ ] PUT (line 73) - manager+
  - [ ] DELETE (line 183) - manager+

- [ ] `src/app/api/tasks/[id]/comments/route.ts`
  - [ ] GET (line 6) - employee+
  - [ ] POST (line 42) - employee+

- [ ] `src/app/api/tasks/[id]/complete/route.ts`
  - [ ] PATCH (line 11) - employee+

### Group 2: Employees (4 routes) - 8 minutes

- [ ] `src/app/api/employees/[id]/route.ts`
  - [ ] GET (line 23) - manager+
  - [ ] PUT (line 69) - manager+
  - [ ] DELETE (line 140) - manager+

- [ ] `src/app/api/employees/[id]/deactivate/route.ts`
  - [ ] PATCH (line 10) - manager+

### Group 3: Clients (3 routes) - 6 minutes

- [ ] `src/app/api/clients/[id]/route.ts`
  - [ ] GET (line 28) - manager+
  - [ ] PUT (line 72) - manager+
  - [ ] DELETE (line 131) - manager+

### Group 4: Categories (4 routes) - 8 minutes

- [ ] `src/app/api/categories/[id]/route.ts`
  - [ ] GET (line 20) - employee+
  - [ ] PUT (line 63) - manager+
  - [ ] DELETE (line 120) - manager+

- [ ] `src/app/api/categories/[id]/toggle/route.ts`
  - [ ] PATCH (line 16) - manager+

### Group 5: Teams (6 routes) - 10 minutes

- [ ] `src/app/api/teams/[id]/route.ts`
  - [ ] GET (line 11) - employee+
  - [ ] PUT (line 56) - manager+
  - [ ] DELETE (line 151) - manager+

- [ ] `src/app/api/teams/[id]/members/route.ts`
  - [ ] POST (line 18) - manager+

- [ ] `src/app/api/teams/[id]/members/[memberId]/route.ts`
  - [ ] DELETE (line 15) - manager+
  - [ ] PATCH (line 71) - manager+

### Group 6: Recurring Tasks (6 routes) - 10 minutes

- [ ] `src/app/api/recurring-tasks/[id]/route.ts`
  - [ ] GET (line 45) - employee+
  - [ ] PUT (line 80) - manager+
  - [ ] DELETE (line 157) - manager+

- [ ] `src/app/api/recurring-tasks/[id]/complete/route.ts`
  - [ ] PATCH (line 16) - employee+

- [ ] `src/app/api/recurring-tasks/[id]/pause/route.ts`
  - [ ] PATCH (line 10) - manager+

- [ ] `src/app/api/recurring-tasks/[id]/resume/route.ts`
  - [ ] PATCH (line 10) - manager+

### Group 7: Other (4 routes) - 8 minutes

- [ ] `src/app/api/leave/requests/[id]/approve/route.ts`
  - [ ] PATCH (line 5) - manager+

- [ ] `src/app/api/leave/requests/[id]/reject/route.ts`
  - [ ] PATCH (line 5) - manager+

- [ ] `src/app/api/shifts/[id]/assign/route.ts`
  - [ ] POST (line 5) - manager+

- [ ] `src/app/api/attendance/[id]/route.ts`
  - [ ] DELETE (line 5) - manager+

## 🔄 Workflow

For each file:

1. **Open the file**
2. **Find the function** (use the line number as a guide)
3. **Add authentication code** right after `try {`
4. **Verify import exists**: `import { ErrorResponses, handleApiError } from '@/lib/api-error-handler';`
5. **Save the file**
6. **Check off the box** above

## 🎯 Role Guidelines

- **employee+** = All authenticated users can access
  ```typescript
  if (!['admin', 'manager', 'employee'].includes(userRole)) {
    return ErrorResponses.forbidden('Insufficient permissions');
  }
  ```

- **manager+** = Only managers and admins
  ```typescript
  if (!['admin', 'manager'].includes(userRole)) {
    return ErrorResponses.forbidden('Only managers and admins can access this resource');
  }
  ```

- **admin** = Admin only
  ```typescript
  if (userRole !== 'admin') {
    return ErrorResponses.forbidden('Admin access required');
  }
  ```

## ✅ Verify After Each Group

```powershell
npx tsx scripts/add-auth-to-routes.ts
```

Watch the "Protected" number go up!

## 🎉 When You're Done

Run the final audit:

```powershell
npx tsx scripts/add-auth-to-routes.ts
```

**Expected result:**
```
Total Routes: 73
✅ Protected: 73
❌ Unprotected: 0
```

## 🚀 Then Deploy

1. Test locally
2. Build: `npm run build`
3. Deploy: `vercel --prod` or your deployment method
4. Monitor Firebase Console

## 💪 You've Got This!

You've already done the hard part (automated 40 routes). These last 33 are just copy-paste work.

**Estimated time**: 30-45 minutes
**Reward**: 100% secured application
**Risk reduction**: MEDIUM → LOW

---

**Start with Group 1 (Tasks) and work your way down!**
