# Team Member Mapping - Testing Guide

## Test Scenarios

### Scenario 1: Create Task with Team Member Mappings

**Objective**: Verify that team member mappings can be created successfully

**Steps**:
1. Log in as Admin
2. Navigate to `/tasks/recurring`
3. Click "Create New Recurring Task"
4. Fill in task details:
   - Title: "Test Task - Team Member Mapping"
   - Description: "Testing team member mapping feature"
   - Recurrence: Monthly
   - Start Date: Today
5. Click "Configure Team Member Mapping"
6. In the dialog:
   - Select "Ajay" from Team Member dropdown
   - Select 3 clients from Clients dropdown
   - Verify "Ajay: 3 clients" appears in mappings
   - Select "Balram" from Team Member dropdown
   - Select 5 clients from Clients dropdown
   - Verify "Balram: 5 clients" appears in mappings
7. Click "Save Mappings"
8. Verify summary shows "2 Team Members Mapped"
9. Click "Create Recurring Task"

**Expected Result**:
- ✅ Task created successfully
- ✅ Mappings saved to Firestore
- ✅ Task appears in recurring tasks list

---

### Scenario 2: Employee Sees Only Assigned Clients

**Objective**: Verify that employees see only their assigned clients

**Steps**:
1. Create a task with mappings (as in Scenario 1)
2. Log out from Admin account
3. Log in as "Balram" (employee account)
4. Navigate to `/dashboard`
5. Find the test task in the dashboard
6. Check the client count button

**Expected Result**:
- ✅ Task is visible to Balram
- ✅ Client count shows "5 Clients" (not 8 total)
- ✅ Assignment badge shows "Balram" in purple
- ✅ Clicking client count shows only Balram's 5 clients
- ✅ Ajay's 3 clients are NOT visible

---

### Scenario 3: Admin Sees All Clients

**Objective**: Verify that admins see all clients regardless of mappings

**Steps**:
1. Log in as Admin
2. Navigate to `/dashboard`
3. Find the test task
4. Check the client count button

**Expected Result**:
- ✅ Task is visible
- ✅ Client count shows "8 Clients" (all clients)
- ✅ Clicking client count shows all 8 clients
- ✅ Can see both Ajay's and Balram's clients

---

### Scenario 4: Edit Existing Mappings

**Objective**: Verify that mappings can be edited

**Steps**:
1. Log in as Admin
2. Navigate to `/tasks/recurring`
3. Click edit on the test task
4. Click "Configure Team Member Mapping"
5. In the dialog:
   - Select "Ajay" from Team Member dropdown
   - Add 2 more clients (total 5 now)
   - Remove 1 client from Balram (total 4 now)
   - Add new user "Himanshu" with 3 clients
6. Click "Save Mappings"
7. Verify summary shows "3 Team Members Mapped"
8. Click "Update Recurring Task"

**Expected Result**:
- ✅ Mappings updated successfully
- ✅ Ajay now has 5 clients
- ✅ Balram now has 4 clients
- ✅ Himanshu now has 3 clients
- ✅ Total: 12 clients

---

### Scenario 5: Remove All Mappings

**Objective**: Verify that all mappings can be removed

**Steps**:
1. Log in as Admin
2. Edit the test task
3. Click "Configure Team Member Mapping"
4. Click X button next to each user to remove all mappings
5. Click "Save Mappings"
6. Verify summary shows "Configure Team Member Mapping" (no count)
7. Click "Update Recurring Task"

**Expected Result**:
- ✅ All mappings removed
- ✅ Task still exists
- ✅ No team member mappings in Firestore
- ✅ Employees see all clients (no filtering)

---

### Scenario 6: Employee Not in Mapping

**Objective**: Verify behavior when employee is not in any mapping

**Steps**:
1. Create a task with mappings for Ajay and Balram only
2. Log in as "Himanshu" (not in mappings)
3. Navigate to `/dashboard`

**Expected Result**:
- ✅ Task is NOT visible to Himanshu
- ✅ Himanshu sees only tasks assigned to him
- ✅ No error messages

---

### Scenario 7: Multiple Tasks with Different Mappings

**Objective**: Verify that different tasks can have different mappings

**Steps**:
1. Create Task A with mappings: Ajay (5 clients), Balram (3 clients)
2. Create Task B with mappings: Balram (7 clients), Himanshu (4 clients)
3. Create Task C with mappings: Ajay (2 clients), Himanshu (6 clients)
4. Log in as Balram
5. Navigate to `/dashboard`

**Expected Result**:
- ✅ Balram sees Task A (3 clients)
- ✅ Balram sees Task B (7 clients)
- ✅ Balram does NOT see Task C
- ✅ Client counts are accurate for each task

---

### Scenario 8: Team Assignment vs Team Member Mapping

**Objective**: Verify behavior when both team and mappings are used

**Steps**:
1. Create a task with:
   - Team: "Financial Team"
   - Team Member Mappings: Ajay (5 clients), Balram (3 clients)
2. Log in as Balram (member of Financial Team)
3. Navigate to `/dashboard`

**Expected Result**:
- ✅ Task is visible to Balram
- ✅ Client count shows "3 Clients" (from mapping, not all team clients)
- ✅ Both team badge and individual badge may be shown
- ✅ Mapping takes precedence for client filtering

---

### Scenario 9: Large Number of Clients

**Objective**: Verify performance with many clients

**Steps**:
1. Create a task with mappings:
   - Ajay: 50 clients
   - Balram: 75 clients
   - Himanshu: 100 clients
2. Log in as Balram
3. Navigate to `/dashboard`
4. Click client count button

**Expected Result**:
- ✅ Page loads without lag
- ✅ Client count shows "75 Clients"
- ✅ Modal opens quickly
- ✅ All 75 clients are displayed
- ✅ Scrolling is smooth

---

### Scenario 10: API Security Test

**Objective**: Verify that API enforces access control

**Steps**:
1. Create a task with mappings for Ajay only
2. Get Balram's auth token
3. Make direct API call to `/api/recurring-tasks` with Balram's token
4. Check response

**Expected Result**:
- ✅ API returns only tasks where Balram is mapped
- ✅ Task from step 1 is NOT in response
- ✅ No unauthorized data leakage

---

## Edge Cases

### Edge Case 1: Empty Mappings Array

**Scenario**: Task has `teamMemberMappings: []`

**Expected Behavior**:
- All employees see all clients (no filtering)
- Behaves like a regular task without mappings

---

### Edge Case 2: User Deleted from System

**Scenario**: User in mapping is deleted from system

**Expected Behavior**:
- Task still exists
- Mapping still exists but user is inactive
- Admin can edit and remove the mapping
- No errors in dashboard

---

### Edge Case 3: Client Deleted from System

**Scenario**: Client in mapping is deleted

**Expected Behavior**:
- Task still exists
- Mapping still references deleted client ID
- Dashboard handles gracefully (shows "Unknown Client" or skips)
- No errors

---

### Edge Case 4: Duplicate Client Assignment

**Scenario**: Same client assigned to multiple users

**Expected Behavior**:
- Both users see the client
- No conflicts
- Each user sees their own view

---

### Edge Case 5: No Clients Assigned to User

**Scenario**: User in mapping but `clientIds: []`

**Expected Behavior**:
- User sees the task
- Client count shows "0 Clients"
- No errors

---

## Performance Tests

### Test 1: Load Time with Many Mappings

**Setup**: 10 tasks, each with 10 users, each user with 20 clients

**Metrics to Check**:
- Dashboard load time < 3 seconds
- API response time < 1 second
- No memory leaks

---

### Test 2: Mapping Dialog Performance

**Setup**: 100 users, 500 clients

**Metrics to Check**:
- Dialog opens < 500ms
- Dropdown renders < 200ms
- Smooth scrolling
- No UI freezing

---

## Regression Tests

### Test 1: Existing Tasks Still Work

**Objective**: Verify that tasks without mappings still work

**Steps**:
1. Create a task WITHOUT team member mappings
2. Assign to a team
3. Log in as team member
4. Check dashboard

**Expected Result**:
- ✅ Task is visible
- ✅ All team clients are visible
- ✅ No errors

---

### Test 2: Non-Recurring Tasks Unaffected

**Objective**: Verify that non-recurring tasks are not affected

**Steps**:
1. Create a non-recurring task
2. Assign to specific users
3. Check dashboard

**Expected Result**:
- ✅ Non-recurring tasks work as before
- ✅ No impact from team member mapping feature

---

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

---

## Accessibility Tests

### Test 1: Keyboard Navigation

**Steps**:
1. Open mapping dialog
2. Use Tab key to navigate
3. Use Enter to select items
4. Use Escape to close

**Expected Result**:
- ✅ All elements are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Logical tab order

---

### Test 2: Screen Reader

**Steps**:
1. Enable screen reader
2. Navigate through mapping dialog
3. Listen to announcements

**Expected Result**:
- ✅ All labels are read correctly
- ✅ Button purposes are clear
- ✅ Form fields are properly labeled

---

## Test Checklist

### Functional Tests
- [ ] Create task with mappings
- [ ] Edit existing mappings
- [ ] Delete mappings
- [ ] Employee sees filtered clients
- [ ] Admin sees all clients
- [ ] Multiple users with different mappings
- [ ] Remove user from mapping
- [ ] Add clients to existing mapping

### Security Tests
- [ ] API enforces access control
- [ ] Employees cannot see other's clients
- [ ] Direct API calls are filtered
- [ ] Token validation works

### Performance Tests
- [ ] Dashboard loads quickly
- [ ] Dialog opens quickly
- [ ] Large client lists handled well
- [ ] No memory leaks

### UI/UX Tests
- [ ] Badges display correctly
- [ ] Client count is accurate
- [ ] Modal shows correct clients
- [ ] Error messages are clear
- [ ] Loading states work

### Edge Cases
- [ ] Empty mappings
- [ ] Deleted users
- [ ] Deleted clients
- [ ] Duplicate assignments
- [ ] No clients assigned

### Regression Tests
- [ ] Existing tasks work
- [ ] Non-recurring tasks unaffected
- [ ] Team assignments still work
- [ ] Other features unaffected

---

## Bug Report Template

```markdown
**Bug Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Screenshots**:
[Attach if applicable]

**Environment**:
- Browser: 
- OS: 
- User Role: 
- Account: 

**Console Errors**:
```
[Paste console errors]
```

**Additional Notes**:

```

---

## Test Results Template

```markdown
## Test Results - [Date]

**Tester**: [Name]
**Environment**: [Production/Staging/Local]
**Browser**: [Browser and version]

### Functional Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| Create with mappings | ✅ Pass | |
| Edit mappings | ✅ Pass | |
| Delete mappings | ✅ Pass | |
| Employee filtering | ✅ Pass | |
| Admin view | ✅ Pass | |

### Security Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| API access control | ✅ Pass | |
| Client filtering | ✅ Pass | |

### Performance Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| Dashboard load | ✅ Pass | 2.1s |
| Dialog open | ✅ Pass | 0.3s |

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Status
✅ All tests passed
⚠️ Minor issues found
❌ Critical issues found
```
