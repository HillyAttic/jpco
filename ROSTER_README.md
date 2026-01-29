# 📅 Roster & Calendar System

A comprehensive roster management system that allows users to manage their own schedules via a calendar view, while Admin/Managers can view the complete organization roster in an Excel-style monthly planning table.

## 🎯 Overview

The Roster System provides:
- **Personal Calendar Management** for all users
- **Organization-wide Roster View** for Admin/Manager
- **Real-time Synchronization** across all views
- **Overlap Prevention** to avoid scheduling conflicts
- **Role-based Access Control** for security
- **Mobile-responsive Design** for all devices

## 📚 Documentation

This system includes comprehensive documentation:

1. **[ROSTER_QUICK_START.md](./ROSTER_QUICK_START.md)** - Start here! Setup and user guide
2. **[ROSTER_IMPLEMENTATION.md](./ROSTER_IMPLEMENTATION.md)** - Technical implementation details
3. **[ROSTER_SYSTEM_SUMMARY.md](./ROSTER_SYSTEM_SUMMARY.md)** - Feature summary and overview
4. **[ROSTER_DEPLOYMENT_CHECKLIST.md](./ROSTER_DEPLOYMENT_CHECKLIST.md)** - Deployment guide
5. **[firestore-roster-rules.txt](./firestore-roster-rules.txt)** - Firestore security rules

## 🚀 Quick Start

### 1. Setup Firebase

#### Create Firestore Indexes
Go to Firebase Console → Firestore Database → Indexes and create:

```
Collection: rosters
- userId (Ascending) + month (Ascending) + year (Ascending)
- month (Ascending) + year (Ascending)
- userId (Ascending) + startDate (Ascending)
```

#### Configure Security Rules
Copy rules from `firestore-roster-rules.txt` to Firebase Console → Firestore Database → Rules

### 2. Access the System

Navigate to the Roster menu in the sidebar:
```
MANAGEMENT
  └── Roster
      ├── Update Schedule (Manage your schedule)
      └── View Schedule (View schedules)
```

### 3. Start Using

**Regular Users:**
- Add activities to your schedule
- View your personal calendar
- Edit or delete your activities

**Admin/Manager:**
- View organization-wide roster
- See all employees' schedules
- Export data (future feature)

## 📁 File Structure

```
src/
├── types/
│   └── roster.types.ts              # TypeScript interfaces
├── services/
│   └── roster.service.ts            # Business logic & Firestore operations
├── app/
│   ├── roster/
│   │   ├── update-schedule/
│   │   │   └── page.tsx            # User calendar view
│   │   └── view-schedule/
│   │       └── page.tsx            # Role-based schedule view
│   └── api/
│       └── roster/
│           ├── route.ts            # CRUD API endpoints
│           └── monthly/
│               └── route.ts        # Monthly roster API
└── components/
    └── Layouts/
        └── sidebar/
            └── data/
                └── index.ts        # Navigation (updated)

Documentation/
├── ROSTER_README.md                 # This file
├── ROSTER_QUICK_START.md           # Setup & user guide
├── ROSTER_IMPLEMENTATION.md        # Technical details
├── ROSTER_SYSTEM_SUMMARY.md        # Feature summary
├── ROSTER_DEPLOYMENT_CHECKLIST.md  # Deployment guide
└── firestore-roster-rules.txt      # Security rules
```

## ✨ Features

### For All Users
- ✅ Personal calendar view
- ✅ Add/Edit/Delete activities
- ✅ Month/Year navigation
- ✅ Activity list view
- ✅ Overlap prevention
- ✅ Date validation
- ✅ Mobile responsive

### For Admin/Manager
- ✅ Excel-style roster table
- ✅ View all employees
- ✅ See all activities
- ✅ Continuous activity blocks
- ✅ Dynamic month generation
- ✅ Leap year support

### Technical Features
- ✅ Firestore integration
- ✅ Real-time sync
- ✅ Role-based access
- ✅ Authentication required
- ✅ Input validation
- ✅ Error handling
- ✅ Loading states

## 🎨 User Interface

### Update Schedule (Calendar View)
```
┌─────────────────────────────────────┐
│ Update Schedule      [Add Activity] │
├─────────────────────────────────────┤
│  ◄  January 2026  ►                 │
├─────────────────────────────────────┤
│ Sun Mon Tue Wed Thu Fri Sat         │
│  1   2   3   4   5   6   7          │
│  8   9  10  11  12  13  14          │
│ 15  16  17  18  19  20  21          │
│ 22  23  24  25  26  27  28          │
│ 29  30  31                          │
├─────────────────────────────────────┤
│ Your Activities                     │
│ • Audit (Jan 5-8)        [Edit][Del]│
│ • Monthly Visit (Jan 15) [Edit][Del]│
└─────────────────────────────────────┘
```

### View Schedule (Excel-Style for Admin/Manager)
```
┌──────────────────────────────────────────────────────┐
│ Monthly (January 2026)                               │
├──────────────────────────────────────────────────────┤
│ EMP NAME │ 1│ 2│ 3│ 4│ 5│ 6│ 7│ 8│ 9│10│...│31│
├──────────┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼───┼──┤
│ John Doe │  │  │  │  │Audit      │  │  │   │  │
│ Jane S.  │  │  │Visit│  │  │  │  │  │   │  │
│ Bob M.   │  │  │  │  │  │  │  │  │ROC│   │  │
└──────────┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴───┴──┘
```

## 🔒 Security

- **Authentication**: All operations require valid user authentication
- **Authorization**: Users can only modify their own schedules
- **Role-based Access**: Admin/Manager have read-only access to all schedules
- **Firestore Rules**: Enforce security at database level
- **Input Validation**: All inputs are validated before processing
- **XSS Protection**: User inputs are sanitized

## 📊 Data Structure

```typescript
interface RosterEntry {
  id?: string;
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

## 🔧 API Endpoints

### GET /api/roster
Get roster entries with filters
```typescript
Query Parameters:
- userId?: string
- month?: number
- year?: number
```

### POST /api/roster
Create a new roster entry
```typescript
Body: {
  userId: string;
  userName: string;
  activityName: string;
  startDate: string;
  endDate: string;
  month: number;
  year: number;
  notes?: string;
}
```

### PUT /api/roster
Update a roster entry
```typescript
Body: {
  id: string;
  activityName?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}
```

### DELETE /api/roster
Delete a roster entry
```typescript
Query Parameters:
- id: string
```

### GET /api/roster/monthly
Get monthly roster view (Admin/Manager only)
```typescript
Query Parameters:
- month: number
- year: number
```

## 🧪 Testing

Run the deployment checklist to ensure everything works:
```bash
# See ROSTER_DEPLOYMENT_CHECKLIST.md for complete testing guide
```

Key areas to test:
- [ ] User can create activities
- [ ] User can edit activities
- [ ] User can delete activities
- [ ] Overlap prevention works
- [ ] Admin sees Excel view
- [ ] Regular user sees calendar only
- [ ] Mobile responsive
- [ ] Month navigation works

## 🐛 Troubleshooting

### Common Issues

**"Unauthorized" Error**
- Ensure you're logged in
- Check authentication token is valid

**Activities Not Showing**
- Verify correct month/year selected
- Check Firestore indexes are created
- Ensure activities exist for that period

**Excel View Not Loading**
- Verify user role is 'admin' or 'manager'
- Check Firestore security rules
- Review browser console for errors

**Overlap Error**
- Check for existing activities in date range
- Edit or delete conflicting activity first

## 📈 Future Enhancements

Planned features:
1. Excel/CSV export
2. Bulk import from CSV
3. Activity templates
4. Color coding by activity type
5. Email notifications
6. Recurring schedules
7. Team filtering
8. Activity search
9. Reports generation
10. Admin edit capability

## 🤝 Contributing

To add new features:
1. Review existing code structure
2. Follow TypeScript best practices
3. Maintain responsive design
4. Add proper error handling
5. Update documentation
6. Test thoroughly

## 📞 Support

For help:
1. Check documentation files
2. Review troubleshooting section
3. Check browser console for errors
4. Verify Firebase configuration
5. Test with different user roles

## 📝 License

This roster system is part of the JPCO Admin Dashboard.

## 🎉 Acknowledgments

Built with:
- Next.js 14
- React 18
- TypeScript
- Firebase/Firestore
- Tailwind CSS

---

**Version**: 1.0.0  
**Last Updated**: January 29, 2026  
**Status**: ✅ Production Ready

For detailed information, see the documentation files listed at the top of this README.
