# 🚀 Run Phase 2 Authentication Script

## What Phase 2 Does

Phase 2 will protect the remaining **54 unprotected routes**:

- ✅ All detail routes (`/api/*/[id]/route.ts`)
- ✅ All nested routes (`/api/*/[id]/comments`, etc.)
- ✅ All action routes (pause, resume, complete, etc.)
- ✅ All remaining CRUD operations
- ✅ Admin-only routes (seed, debug, cleanup)

## Run Phase 2 Now

```powershell
npx tsx scripts/bulk-add-auth-phase2.ts
```

This will:
1. Add authentication to 54 remaining routes
2. Create `.backup2` files for safety
3. Apply appropriate role-based access control:
   - **Admin-only**: seed routes, debug routes, cleanup
   - **Manager+**: create/update/delete operations
   - **Employee+**: read operations, own data

## Expected Output

You should see:
```
✅ Modified: ~54 methods
   - High Priority: ~32 methods
   - Medium Priority: ~18 methods
   - Low Priority: ~4 methods
⏭️  Skipped: ~0 methods
❌ Errors: 0 methods
```

## Verify Success

After Phase 2 completes, run the audit:

```powershell
npx tsx scripts/add-auth-to-routes.ts
```

**Expected result:**
```
Total Routes: 73
✅ Protected: 73
❌ Unprotected: 0
```

## If You See Errors

If any routes fail to update:

1. Check the error message
2. The file has a `.backup2` for safety
3. Fix manually using the pattern from other routes
4. Re-run the audit to verify

## After Phase 2

Once all routes are protected:

1. **Test the API** (see below)
2. **Update frontend code** to send Authorization headers
3. **Deploy to production**

## Quick API Test

```powershell
# Start dev server
npm run dev

# In another terminal, test without auth (should return 401)
curl http://localhost:3000/api/tasks/test-id
curl http://localhost:3000/api/employees/test-id
curl http://localhost:3000/api/clients/test-id

# All should return: {"error":"Missing or invalid authorization header"}
```

## Backup Information

- **Phase 1 backups**: `.backup` extension
- **Phase 2 backups**: `.backup2` extension

To restore all Phase 2 changes:
```powershell
Get-ChildItem -Recurse -Filter "*.backup2" | ForEach-Object {
    $original = $_.FullName -replace '\.backup2$', ''
    Copy-Item $_.FullName $original -Force
}
```

## Progress Summary

**Before Phase 1**: 73 unprotected (100% vulnerable)
**After Phase 1**: 54 unprotected (74% vulnerable)
**After Phase 2**: 0 unprotected (0% vulnerable) ✅

## What's Next After Phase 2

1. **Update Frontend** (1-2 hours)
   - Add `authenticatedFetch()` helper
   - Replace all `fetch()` calls to API routes
   - See `IMMEDIATE_ACTION_PLAN.md` Step 4

2. **Test Everything** (30 minutes)
   - Test each major feature
   - Verify authentication works
   - Check role-based access

3. **Deploy** (5 minutes)
   ```powershell
   npm run build
   vercel --prod
   ```

4. **Monitor** (Ongoing)
   - Check Firebase Console for errors
   - Review audit logs
   - Monitor for 401/403 errors

---

## 🎯 Ready? Run Phase 2 Now!

```powershell
npx tsx scripts/bulk-add-auth-phase2.ts
```

This is the final step to secure all your API routes!
