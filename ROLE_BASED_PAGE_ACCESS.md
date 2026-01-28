# Role-Based Page Access Implementation

## Overview
Implemented role-based access control to restrict certain pages to managers and administrators only. Employees can no longer access Teams, Employees, and Attendance Tray pages.

## Restricted Pages

### 1. Teams Page (`/teams`)
- **Access**: Manager and Admin only
- **Restriction**: Employees cannot view or manage teams

### 2. Employees Page (`/employees`)
- **Access**: Manager and Admin only
- **Restriction**: Employees cannot view or manage other employees

### 3. Attendance Tray Page (`/attendance/tray`)
- **Access**: Manager and Admin only
- **Restriction**: Employees can only track their own attendance, not view the tray

## Changes Made

### 1. Page Protection with ManagerGuard

#### `src/app/teams/page.tsx`
- Added `ManagerGuard` import
- Wrapped entire page content with `ManagerGuard`
- Added fallback UI for unauthorized access
- Added `ShieldExclamationIcon` import

```typescript
import { ManagerGuard } from '@/components/Auth/PermissionGuard';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function TeamsPage() {
  return (
    <ManagerGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
            <ShieldExclamationIcon className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            You don't have permission to access this page. Only managers and administrators can view team management.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      }
    >
      {/* Page content */}
    </ManagerGuard>
  );
}
```

#### `src/app/employees/page.tsx`
- Same implementation as Teams page
- Custom message for employee management

#### `src/app/attendance/tray/page.tsx`
- Same implementation as Teams page
- Custom message for attendance tray
- Uses `ShieldAlert` icon from lucide-react

### 2. Sidebar Menu Filtering

#### `src/components/Layouts/sidebar/data/index.ts`
Added `requiresRole` property to restricted menu items:

```typescript
{
  title: "Teams",
  url: "/teams",
  icon: Icons.User,
  items: [],
  requiresRole: ['admin', 'manager'], // Only managers and admins can see this
},
{
  title: "Employees",
  url: "/employees",
  icon: Icons.User,
  items: [],
  requiresRole: ['admin', 'manager'], // Only managers and admins can see this
},
{
  title: "Attendance",
  icon: Icons.ClockIcon,
  items: [
    {
      title: "Track Attendance",
      url: "/attendance",
    },
    {
      title: "Attendance Tray",
      url: "/attendance/tray",
      requiresRole: ['admin', 'manager'], // Only managers and admins can see this
    },
  ],
},
```

#### `src/components/Layouts/sidebar/index.tsx`
Added role-based filtering logic:

```typescript
import { useAuthEnhanced } from "@/hooks/use-auth-enhanced";

export function Sidebar() {
  const { hasRole } = useAuthEnhanced();
  
  // Filter menu items based on role requirements
  {section.items
    .filter((item: any) => {
      if (item.requiresRole) {
        return hasRole(item.requiresRole);
      }
      return true;
    })
    .map((item) => {
      // Filter subitems based on role requirements
      const filteredSubItems = item.items.filter((subItem: any) => {
        if (subItem.requiresRole) {
          return hasRole(subItem.requiresRole);
        }
        return true;
      });
      
      // Render menu item with filtered subitems
    })
  }
```

## How It Works

### Page Level Protection
1. User navigates to a restricted page (e.g., `/teams`)
2. `ManagerGuard` checks user's role using `useAuthEnhanced` hook
3. If user has 'admin' or 'manager' role → Page content is displayed
4. If user has 'employee' role → Fallback UI is displayed with access denied message

### Sidebar Menu Filtering
1. Sidebar component loads menu items from `NAV_DATA`
2. For each menu item, checks if `requiresRole` property exists
3. If exists, calls `hasRole(item.requiresRole)` to check user's role
4. Only displays menu items that user has permission to access
5. Same logic applies to submenu items (like "Attendance Tray")

## User Experience

### For Employees:
- ❌ Cannot see "Teams" menu item in sidebar
- ❌ Cannot see "Employees" menu item in sidebar
- ❌ Cannot see "Attendance Tray" submenu item
- ✅ Can see "Track Attendance" (their own attendance)
- ❌ If they try to access restricted URLs directly, they see an access denied page

### For Managers:
- ✅ Can see all menu items
- ✅ Can access all pages
- ✅ Can manage teams, employees, and view attendance tray

### For Admins:
- ✅ Can see all menu items
- ✅ Can access all pages
- ✅ Full access to all features

## Fallback UI Features

The access denied page includes:
- Shield icon with warning color
- Clear "Access Restricted" heading
- Descriptive message explaining the restriction
- "Go Back" button to return to previous page
- Responsive design with proper spacing
- Dark mode support

## Security Notes

1. **Client-Side Protection**: The guards provide UI-level protection
2. **API Protection**: Backend APIs should also validate user roles
3. **Direct URL Access**: Users trying to access restricted URLs directly will see the fallback UI
4. **Role Verification**: Uses the existing `useAuthEnhanced` hook for role checking

## Testing

### Test Cases:

#### As Employee:
- [ ] Cannot see "Teams" in sidebar
- [ ] Cannot see "Employees" in sidebar
- [ ] Cannot see "Attendance Tray" in sidebar
- [ ] Can see "Track Attendance"
- [ ] Accessing `/teams` directly shows access denied
- [ ] Accessing `/employees` directly shows access denied
- [ ] Accessing `/attendance/tray` directly shows access denied
- [ ] "Go Back" button works correctly

#### As Manager:
- [ ] Can see "Teams" in sidebar
- [ ] Can see "Employees" in sidebar
- [ ] Can see "Attendance Tray" in sidebar
- [ ] Can access `/teams` page
- [ ] Can access `/employees` page
- [ ] Can access `/attendance/tray` page

#### As Admin:
- [ ] Can see all menu items
- [ ] Can access all pages
- [ ] Full functionality available

## Files Modified

1. `src/app/teams/page.tsx`
   - Added ManagerGuard wrapper
   - Added fallback UI
   - Added ShieldExclamationIcon import

2. `src/app/employees/page.tsx`
   - Added ManagerGuard wrapper
   - Added fallback UI
   - Added ShieldExclamationIcon import

3. `src/app/attendance/tray/page.tsx`
   - Added ManagerGuard wrapper
   - Added fallback UI
   - Added ShieldAlert icon import

4. `src/components/Layouts/sidebar/data/index.ts`
   - Added `requiresRole` property to Teams menu item
   - Added `requiresRole` property to Employees menu item
   - Added `requiresRole` property to Attendance Tray submenu item

5. `src/components/Layouts/sidebar/index.tsx`
   - Added `useAuthEnhanced` hook import
   - Added role-based filtering logic for menu items
   - Added role-based filtering logic for submenu items

## Related Components

- `src/components/Auth/PermissionGuard.tsx` - Contains ManagerGuard component
- `src/hooks/use-auth-enhanced.tsx` - Provides hasRole function
- `src/contexts/enhanced-auth.context.tsx` - Authentication context

## Future Enhancements

1. Add more granular permissions (e.g., view-only access)
2. Add audit logging for access attempts
3. Add custom permission levels beyond roles
4. Add permission-based feature flags
5. Add role-based API endpoint protection

---

**Status**: ✅ Complete
**Last Updated**: January 28, 2026
**Access Control**: Manager and Admin only for Teams, Employees, and Attendance Tray
