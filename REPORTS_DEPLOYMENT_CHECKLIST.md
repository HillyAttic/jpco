# Reports Feature - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Implementation
- [x] Reports page created (`src/app/(home)/reports/page.tsx`)
- [x] ReportsView component created (`src/components/reports/ReportsView.tsx`)
- [x] Task completion service created (`src/services/task-completion.service.ts`)
- [x] Reports icon added to sidebar (`src/components/Layouts/sidebar/icons.tsx`)
- [x] Reports menu item added (`src/components/Layouts/sidebar/data/index.ts`)
- [x] Calendar modal updated with completion tracking
- [x] No TypeScript errors in Reports files
- [x] All dependencies installed (date-fns)

### 📋 Before Deployment

#### 1. Update Firestore Rules
- [ ] Open `firestore.rules` file in your project
- [ ] Add rules from `firestore-reports-rules.txt`
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] Verify rules in Firebase Console

#### 2. Test Locally
- [ ] Start development server: `npm run dev`
- [ ] Log in as admin user
- [ ] Verify Reports menu appears in sidebar
- [ ] Navigate to `/reports`
- [ ] Verify page loads without errors
- [ ] Check that task list displays
- [ ] Click "View Details" on a task
- [ ] Verify modal opens correctly

#### 3. Test Role-Based Access
- [ ] Log in as admin → Reports menu should appear
- [ ] Log in as manager → Reports menu should appear
- [ ] Log in as employee → Reports menu should NOT appear
- [ ] Try accessing `/reports` as employee → Should redirect to dashboard

#### 4. Test Completion Tracking
- [ ] Go to Calendar view
- [ ] Click on a recurring task
- [ ] Check some boxes for clients/months
- [ ] Click "Save Changes"
- [ ] Verify no errors in console
- [ ] Go to Reports page
- [ ] Click "View Details" on the same task
- [ ] Verify checkmarks appear for marked items

## Deployment Steps

### Step 1: Deploy Firestore Rules
```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Expected output:
# ✔ Deploy complete!
```

### Step 2: Build and Deploy Application
```bash
# Build the application
npm run build

# If using Vercel
vercel --prod

# If using Firebase Hosting
firebase deploy --only hosting

# If using other platform, follow their deployment guide
```

### Step 3: Verify Deployment
- [ ] Visit your production URL
- [ ] Log in as admin/manager
- [ ] Navigate to Reports
- [ ] Verify all features work
- [ ] Check browser console for errors
- [ ] Test on mobile device

## Post-Deployment Verification

### Functional Tests

#### Test 1: Reports Page Access
- [ ] Admin can access `/reports` ✓
- [ ] Manager can access `/reports` ✓
- [ ] Employee redirected from `/reports` ✓
- [ ] Reports menu visible to admin/manager ✓
- [ ] Reports menu hidden from employees ✓

#### Test 2: Data Display
- [ ] All recurring tasks listed ✓
- [ ] Client counts correct ✓
- [ ] Completion rates calculated correctly ✓
- [ ] Progress bars display properly ✓
- [ ] "View Details" buttons work ✓

#### Test 3: Detail Modal
- [ ] Modal opens on "View Details" click ✓
- [ ] Task title displays correctly ✓
- [ ] Client count shows in header ✓
- [ ] All assigned clients listed ✓
- [ ] Months display based on recurrence pattern ✓
- [ ] Status indicators correct (✓, ✗, -) ✓
- [ ] Future months show dash (-) ✓
- [ ] Past incomplete months show red X ✓
- [ ] Completed months show green checkmark ✓
- [ ] Modal closes properly ✓

#### Test 4: Completion Tracking
- [ ] Calendar modal opens for recurring tasks ✓
- [ ] Existing completions load correctly ✓
- [ ] Checkboxes can be toggled ✓
- [ ] "Save Changes" saves to Firestore ✓
- [ ] No errors in console ✓
- [ ] Reports page reflects changes ✓
- [ ] Detail modal shows updated status ✓

#### Test 5: Performance
- [ ] Page loads in < 3 seconds ✓
- [ ] Modal opens smoothly ✓
- [ ] No lag when scrolling large tables ✓
- [ ] Completion data loads quickly ✓

#### Test 6: Mobile Responsiveness
- [ ] Reports page displays on mobile ✓
- [ ] Table scrolls horizontally if needed ✓
- [ ] Modal fits mobile screen ✓
- [ ] Buttons are tappable ✓
- [ ] Text is readable ✓

### Security Tests

#### Test 1: Firestore Rules
```bash
# Test in Firebase Console Rules Playground

# Test 1: Manager can read completions
Auth: Authenticated as manager
Operation: get
Location: /databases/(default)/documents/task-completions/test123
Expected: Allow ✓

# Test 2: Employee cannot read completions
Auth: Authenticated as employee
Operation: get
Location: /databases/(default)/documents/task-completions/test123
Expected: Deny ✓

# Test 3: Manager can create completion
Auth: Authenticated as manager
Operation: create
Location: /databases/(default)/documents/task-completions/test123
Data: {
  recurringTaskId: "task1",
  clientId: "client1",
  monthKey: "2025-04",
  isCompleted: true
}
Expected: Allow ✓
```

#### Test 2: Route Protection
- [ ] Direct URL access to `/reports` as employee → Redirects ✓
- [ ] API calls from employee account → Denied ✓
- [ ] Firestore reads from employee account → Denied ✓

## Troubleshooting Guide

### Issue: Reports menu not showing
**Solution:**
1. Check user role in Firebase Auth custom claims
2. Verify `requiresRole: ['admin', 'manager']` in sidebar data
3. Clear browser cache and reload
4. Check authentication context is loaded

### Issue: "Missing or insufficient permissions" error
**Solution:**
1. Verify Firestore rules are deployed
2. Check user has correct role in custom claims
3. Sign out and sign in again to refresh token
4. Check Firebase Console for rule errors

### Issue: Completion data not saving
**Solution:**
1. Check browser console for errors
2. Verify Firestore rules allow write access
3. Check network tab for failed requests
4. Verify `task-completions` collection exists
5. Check user authentication status

### Issue: Wrong completion status displayed
**Solution:**
1. Verify system date/time is correct
2. Check monthKey format is "YYYY-MM"
3. Verify completion records in Firestore
4. Clear browser cache
5. Check date calculation logic

### Issue: Modal not opening
**Solution:**
1. Check browser console for errors
2. Verify task has assigned clients
3. Check modal state management
4. Verify task ID exists
5. Check z-index conflicts

## Rollback Plan

If issues occur after deployment:

### Option 1: Quick Fix
1. Identify the issue
2. Fix in code
3. Redeploy immediately

### Option 2: Rollback
1. Revert to previous deployment
2. Remove Reports menu item temporarily
3. Fix issues in development
4. Redeploy when ready

### Option 3: Disable Feature
1. Comment out Reports menu item in sidebar
2. Add route guard to redirect all users
3. Fix issues offline
4. Re-enable when ready

## Success Metrics

After deployment, monitor:

- [ ] No errors in production logs
- [ ] Reports page loads successfully
- [ ] Users can mark completions
- [ ] Data persists correctly
- [ ] No performance degradation
- [ ] No security issues reported

## Support Resources

- **Technical Documentation**: `REPORTS_IMPLEMENTATION.md`
- **User Guide**: `REPORTS_QUICK_START.md`
- **Architecture**: `REPORTS_FLOW_DIAGRAM.md`
- **Security Rules**: `firestore-reports-rules.txt`
- **Summary**: `REPORTS_SUMMARY.md`

## Final Checklist

Before marking deployment complete:

- [ ] Firestore rules deployed
- [ ] Application deployed to production
- [ ] All functional tests passed
- [ ] All security tests passed
- [ ] Mobile responsiveness verified
- [ ] Performance acceptable
- [ ] No errors in production logs
- [ ] Team notified of new feature
- [ ] Documentation shared with team
- [ ] Support team briefed

---

## Deployment Status

- **Date**: _____________
- **Deployed By**: _____________
- **Environment**: _____________
- **Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete
- **Issues**: _____________
- **Notes**: _____________

---

**Ready for Deployment**: ✅ YES

All code is complete and tested. Follow this checklist to deploy safely.
