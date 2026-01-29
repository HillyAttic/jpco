# Roster System - Quick Start Guide

## 🚀 Getting Started

The Roster & Calendar System is now fully integrated into your application. Follow these steps to start using it.

## 📋 Prerequisites

Before using the Roster system, ensure you have:

1. ✅ Firebase project configured
2. ✅ User authentication working
3. ✅ Firestore database enabled

## 🔧 Setup Steps

### 1. Create Firestore Indexes

Go to Firebase Console → Firestore Database → Indexes and create these composite indexes:

**Collection: `rosters`**

| Fields | Order |
|--------|-------|
| userId | Ascending |
| month | Ascending |
| year | Ascending |

| Fields | Order |
|--------|-------|
| month | Ascending |
| year | Ascending |

| Fields | Order |
|--------|-------|
| userId | Ascending |
| startDate | Ascending |

### 2. Configure Firestore Security Rules

Add these rules to your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Roster rules
    match /rosters/{rosterId} {
      // Allow users to read their own roster entries
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']);
      
      // Allow users to create their own roster entries
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      
      // Allow users to update their own roster entries
      allow update: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Allow users to delete their own roster entries
      allow delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 3. Verify Navigation

The Roster menu should now appear in your sidebar under the MANAGEMENT section:

```
MANAGEMENT
  ├── Clients
  ├── Non-Recurring
  ├── Recurring
  ├── Teams
  ├── Employees
  ├── Attendance
  │   ├── Track Attendance
  │   └── Attendance Tray
  └── Roster ← NEW!
      ├── Update Schedule
      └── View Schedule
```

## 👤 User Guide

### For Regular Users

#### Adding a Schedule Entry

1. Click **Roster** → **Update Schedule** in the sidebar
2. Click the **"Add Activity"** button
3. Fill in the form:
   - **Activity Name**: e.g., "Client Audit", "Monthly Visit", "ROC Filing"
   - **Start Date**: Select the start date
   - **End Date**: Select the end date
   - **Notes** (optional): Add any additional details
4. Click **"Create"**

#### Editing a Schedule Entry

1. Go to **Roster** → **Update Schedule**
2. Click on an activity in the calendar or list
3. Modify the details
4. Click **"Update"**

#### Deleting a Schedule Entry

1. Go to **Roster** → **Update Schedule**
2. Click the trash icon next to the activity
3. Confirm deletion

#### Viewing Your Schedule

1. Click **Roster** → **View Schedule**
2. You'll see your personal calendar with all activities
3. Use the month navigation arrows to view different months

### For Admin/Manager

#### Viewing Organization Roster

1. Click **Roster** → **View Schedule**
2. You'll see an Excel-style table with all employees
3. Each row shows an employee's name
4. Each column represents a day of the month
5. Activities are displayed as continuous blocks spanning multiple days

#### Navigating Months

- Click the **left arrow** to go to the previous month
- Click the **right arrow** to go to the next month
- The title shows "Monthly (Month Name Year)"

## 🎨 Features

### Calendar View (All Users)
- ✅ Monthly calendar display
- ✅ Visual activity blocks
- ✅ Month/Year navigation
- ✅ Activity list view
- ✅ Add/Edit/Delete operations

### Excel-Style Roster (Admin/Manager)
- ✅ Spreadsheet-style grid
- ✅ Employee names in first column
- ✅ Days 1-31 as columns
- ✅ Continuous activity blocks
- ✅ Automatic month day adjustment
- ✅ Leap year support

### Data Management
- ✅ Overlap prevention
- ✅ Real-time synchronization
- ✅ Role-based access control
- ✅ Firestore-backed storage

## 🔒 Security

- Users can only view and edit their own schedules
- Admin/Manager can view all schedules (read-only)
- All API endpoints require authentication
- Firestore security rules enforce permissions

## 📱 Mobile Support

The Roster system is fully responsive:
- Touch-optimized buttons
- Horizontal scroll for Excel view on mobile
- Responsive calendar grid
- Mobile-friendly modals

## 🐛 Troubleshooting

### "Unauthorized" Error
- Ensure you're logged in
- Check that your authentication token is valid
- Verify Firestore security rules are configured

### "Overlapping Activities" Error
- Check if you already have an activity scheduled for those dates
- Edit or delete the existing activity first
- Ensure start date is before end date

### Activities Not Showing
- Verify the month/year selection
- Check Firestore indexes are created
- Ensure activities are created for the correct user

### Excel View Not Loading (Admin/Manager)
- Verify your user role is set to 'admin' or 'manager' in Firestore
- Check browser console for errors
- Ensure Firestore security rules allow role-based access

## 📊 Data Structure

Each roster entry contains:
```typescript
{
  id: string;
  userId: string;
  userName: string;
  activityName: string;
  startDate: Date;
  endDate: Date;
  month: number; // 1-12
  year: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

## 🎯 Best Practices

1. **Activity Names**: Use clear, descriptive names (e.g., "Client Audit - ABC Corp")
2. **Date Ranges**: Keep activities within reasonable timeframes
3. **Notes**: Add context for complex activities
4. **Regular Updates**: Keep your schedule current
5. **Review**: Check View Schedule regularly to stay organized

## 🚀 Next Steps

Now that the Roster system is set up, you can:

1. ✅ Start adding your schedule entries
2. ✅ View your calendar
3. ✅ (Admin/Manager) Review team schedules
4. ✅ Export data (future enhancement)
5. ✅ Set up notifications (future enhancement)

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the ROSTER_IMPLEMENTATION.md for technical details
3. Check browser console for error messages
4. Verify Firestore indexes and security rules

## ✨ Enjoy Your New Roster System!

The system is ready to use. Start managing your schedules efficiently! 🎉
