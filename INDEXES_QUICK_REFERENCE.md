# Firestore Indexes - Quick Reference

## Deploy Commands

```bash
# Deploy indexes only
firebase deploy --only firestore:indexes

# Deploy rules and indexes
firebase deploy --only firestore

# Windows CMD
deploy-indexes.bat

# Windows PowerShell
.\deploy-indexes.ps1
```

## Index Summary

| Collection | Fields | Purpose |
|------------|--------|---------|
| **leave-requests** | status + createdAt | Filter by status |
| **leave-requests** | employeeId + createdAt | Employee's leaves |
| **leave-requests** | status + employeeId + createdAt | Employee's leaves by status |
| **leave-requests** | leaveType + createdAt | Filter by leave type |
| **client-visits** | clientId + visitDate | Client visit history |
| **client-visits** | employeeId + visitDate | Employee visit history |
| **client-visits** | clientId + employeeId + visitDate | Client-employee visits |
| **client-visits** | taskType + visitDate | Visits by task type |
| **manager-hierarchies** | managerId + createdAt | Manager's hierarchy |
| **attendance-records** | employeeId + clockIn | Employee attendance |
| **attendance-records** | employeeId + date | Employee attendance by date |

## Files Created

- ✅ `firestore.indexes.json` - Index definitions
- ✅ `deploy-indexes.bat` - Windows CMD script
- ✅ `deploy-indexes.ps1` - PowerShell script
- ✅ `firebase.json` - Updated with indexes path
- ✅ `FIRESTORE_INDEXES_GUIDE.md` - Detailed documentation
- ✅ `INDEXES_QUICK_REFERENCE.md` - This file

## Monitoring

Check index status:
1. Firebase Console → Firestore Database → Indexes
2. Look for "Building" or "Enabled" status
3. Wait for all indexes to show "Enabled"

## Common Issues

**Error: "The query requires an index"**
- Click the provided URL to auto-create, OR
- Add to `firestore.indexes.json` and redeploy

**Index build taking too long**
- Normal for large collections
- Check Firebase Console for progress
- Can take minutes to hours depending on data size

**Deployment failed**
- Verify `firebase.json` syntax
- Check `firestore.indexes.json` format
- Ensure Firebase CLI is logged in: `firebase login`
