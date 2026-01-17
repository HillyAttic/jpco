# Role-Based Authentication System

## Overview

This document provides a comprehensive guide to the role-based authentication system implemented for the Next.js task management application. The system provides secure user authentication, role-based access control, and seamless integration with existing application features.

## Architecture

The authentication system follows a layered architecture with the following components:

- **Enhanced Auth Context**: Provides authentication state and role-based utilities
- **Role Management Service**: Manages user roles and permissions in Firestore
- **User Management Service**: Handles user CRUD operations and admin functions
- **Protected Route Components**: Provides route-level access control
- **Permission Guard Components**: Provides component-level access control
- **Server-side Authentication**: API route protection middleware

## User Roles

The system supports three distinct user roles:

### Admin
- **Full system access** with user management capabilities
- **Permissions**: users.manage, roles.assign, reports.view, tasks.manage, teams.manage, attendance.manage
- **Can**: Manage all users, assign roles, view all reports, manage all tasks and teams

### Manager
- **Team management** with reporting capabilities
- **Permissions**: reports.view, tasks.manage, teams.view, attendance.view
- **Can**: View team reports, manage team tasks, view team information

### Employee
- **Basic access** to assigned tasks and own records
- **Permissions**: tasks.view, tasks.update, attendance.own
- **Can**: View and update assigned tasks, manage own attendance

## Key Components

### Enhanced Auth Context

```typescript
import { useEnhancedAuth } from '@/hooks/use-auth-enhanced';

const { user, isAdmin, isManager, hasPermission, hasRole } = useEnhancedAuth();
```

### Protected Routes

```typescript
import { ProtectedRoute, AdminRoute, ManagerRoute } from '@/components/auth/ProtectedRoute';

// Role-based protection
<AdminRoute>
  <AdminDashboard />
</AdminRoute>

// Permission-based protection
<ProtectedRoute requiredPermissions={['users.manage']}>
  <UserManagement />
</ProtectedRoute>
```

### Permission Guards

```typescript
import { PermissionGuard, AdminGuard } from '@/components/auth/PermissionGuard';

// Conditional rendering
<AdminGuard>
  <AdminOnlyButton />
</AdminGuard>

<PermissionGuard permissions={['reports.view']}>
  <ReportsSection />
</PermissionGuard>
```

### Server-side Protection

```typescript
import { withAuth, withAdminAuth } from '@/lib/server-auth';

// Protect API routes
export const GET = withAuth(async (request) => {
  // Handle authenticated request
});

// Admin-only API routes
export const POST = withAdminAuth(async (request) => {
  // Handle admin request
});
```

## Usage Examples

### Basic Authentication Check

```typescript
const { isAuthenticated, user } = useEnhancedAuth();

if (!isAuthenticated()) {
  return <LoginForm />;
}

return <Dashboard user={user} />;
```

### Role-based Navigation

```typescript
const { isAdmin, isManager, canViewReports } = useAuthEnhanced();

return (
  <nav>
    <Link href="/dashboard">Dashboard</Link>
    {isManager && <Link href="/team">Team Management</Link>}
    {isAdmin && <Link href="/admin/users">User Management</Link>}
    {canViewReports() && <Link href="/reports">Reports</Link>}
  </nav>
);
```

### Permission-based Features

```typescript
const { hasPermission, canManageUsers } = useAuthEnhanced();

return (
  <div>
    {hasPermission('tasks.manage') && (
      <Button onClick={createTask}>Create Task</Button>
    )}
    {canManageUsers() && (
      <Button onClick={inviteUser}>Invite User</Button>
    )}
  </div>
);
```

## API Routes

### Authentication Routes

- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update current user profile

### Admin Routes

- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `GET /api/admin/users/[id]` - Get specific user (admin only)
- `PUT /api/admin/users/[id]` - Update specific user (admin only)
- `DELETE /api/admin/users/[id]` - Delete specific user (admin only)

## Testing

The authentication system includes comprehensive tests:

### Unit Tests
- Authentication context functionality
- Role management service operations
- Protected route behavior
- Permission guard logic

### Property-Based Tests
- Role-based access control across all user/route combinations
- Custom claims synchronization with concurrent updates
- Permission inheritance verification across role hierarchies
- Error handling consistency across different failure modes

### Integration Tests
- Complete authentication flows from login to resource access
- Cross-component authentication state sharing
- Real-time permission updates

## Security Features

### Token Management
- Automatic token refresh
- Session invalidation on security events
- Real-time permission updates

### Access Control
- Route-level protection
- Component-level conditional rendering
- API endpoint protection
- Role hierarchy enforcement

### Audit Logging
- All authentication events logged
- Role changes tracked
- Admin actions recorded
- User activity monitoring

## Error Handling

The system provides user-friendly error messages for common scenarios:

- Invalid credentials
- Insufficient permissions
- Network connectivity issues
- Service unavailability
- Rate limiting

## Performance Considerations

- Efficient role checking with cached claims
- Minimal re-renders with optimized context
- Lazy loading of user profiles
- Optimistic UI updates

## Future Enhancements

- Multi-factor authentication
- Single sign-on (SSO) integration
- Advanced permission granularity
- Role-based data filtering
- Session management dashboard

## Troubleshooting

### Common Issues

1. **User not seeing updated permissions**
   - Solution: Call `refreshClaims()` or wait for automatic token refresh

2. **Protected routes not working**
   - Check if user is properly authenticated
   - Verify role assignments in Firestore
   - Ensure custom claims are set correctly

3. **API routes returning 401/403**
   - Verify authorization header is included
   - Check token validity
   - Confirm user has required permissions

### Debug Tools

Use the browser console to inspect authentication state:

```javascript
// Check current auth state
console.log(window.__ENHANCED_AUTH_DEBUG__);

// Force token refresh
window.__ENHANCED_AUTH_REFRESH__();
```

## Support

For issues or questions about the authentication system:

1. Check the test files for usage examples
2. Review the component documentation
3. Consult the Firebase Authentication documentation
4. Contact the development team