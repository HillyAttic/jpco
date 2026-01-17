# Error Handling Implementation Guide

This document describes the centralized error handling system implemented for all API routes.

## Overview

The error handling system provides:
- Consistent error response format across all API routes
- Automatic handling of common error types (Zod validation, Firebase, etc.)
- User-friendly error messages
- Proper HTTP status codes
- Development vs production error detail levels

## Error Response Format

All API errors follow this standard format:

```typescript
interface ErrorResponse {
  error: string;        // Error category (e.g., "Validation Error", "Database Error")
  message: string;      // User-friendly error message
  statusCode: number;   // HTTP status code
  details?: Record<string, string[]>;  // Optional field-level validation errors
}
```

## Usage in API Routes

### Import the Error Handler

```typescript
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
```

### Wrap Route Handlers in Try-Catch

```typescript
export async function GET(request: NextRequest) {
  try {
    // Your route logic here
    const data = await someService.getData();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Use Pre-built Error Responses

```typescript
// Unauthorized (401)
if (!user) {
  return ErrorResponses.unauthorized();
}

// Forbidden (403)
if (!hasPermission) {
  return ErrorResponses.forbidden('You cannot access this resource');
}

// Not Found (404)
if (!resource) {
  return ErrorResponses.notFound('Client');
}

// Bad Request (400)
if (invalidInput) {
  return ErrorResponses.badRequest('Invalid input data', validationErrors);
}

// Conflict (409)
if (alreadyExists) {
  return ErrorResponses.conflict('Client with this email already exists');
}
```

### Validation Error Handling

Zod validation errors are automatically handled:

```typescript
const validationResult = schema.safeParse(body);
if (!validationResult.success) {
  return ErrorResponses.badRequest(
    'Validation failed',
    validationResult.error.flatten().fieldErrors as Record<string, string[]>
  );
}
```

## Automatic Error Type Handling

The `handleApiError` function automatically handles:

1. **ApiError**: Custom API errors with status codes
2. **ZodError**: Validation errors from Zod schemas
3. **Firebase Errors**: Database operation errors
4. **Standard Errors**: Generic JavaScript errors
5. **Unknown Errors**: Fallback for unexpected error types

## Firebase Error Mapping

Firebase error codes are automatically mapped to user-friendly messages:

| Firebase Code | Message | Status Code |
|--------------|---------|-------------|
| permission-denied | You do not have permission to perform this action | 403 |
| not-found | The requested resource was not found | 500 |
| already-exists | A resource with this identifier already exists | 500 |
| resource-exhausted | Service quota exceeded. Please try again later | 500 |
| unauthenticated | Authentication required | 403 |
| unavailable | Service temporarily unavailable. Please try again | 500 |
| deadline-exceeded | Request timeout. Please try again | 500 |

## HTTP Status Codes

The system uses standard HTTP status codes:

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate resource)
- **500**: Internal Server Error

## Development vs Production

- **Development**: Full error details including stack traces are logged to console
- **Production**: Generic error messages are returned to clients, detailed errors are logged server-side

## Example: Complete API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await verifyAuth(request);
    if (!user) {
      return ErrorResponses.unauthorized();
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = createSchema.safeParse(body);
    
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Check for duplicates
    const existing = await service.findByEmail(validationResult.data.email);
    if (existing) {
      return ErrorResponses.conflict('Email already exists');
    }

    // Create resource
    const result = await service.create(validationResult.data);
    return NextResponse.json(result, { status: 201 });
    
  } catch (error) {
    // All errors are handled consistently
    return handleApiError(error);
  }
}
```

## Migration Guide

To update existing API routes:

1. Import the error handler:
   ```typescript
   import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
   ```

2. Replace manual error responses with `ErrorResponses` methods:
   ```typescript
   // Before
   return NextResponse.json({ error: 'Not found' }, { status: 404 });
   
   // After
   return ErrorResponses.notFound('Resource');
   ```

3. Replace catch blocks:
   ```typescript
   // Before
   catch (error) {
     console.error('Error:', error);
     return NextResponse.json({ error: 'Failed' }, { status: 500 });
   }
   
   // After
   catch (error) {
     return handleApiError(error);
   }
   ```

## Updated Routes

The following routes have been updated with the new error handling:

- ✅ `/api/clients` (GET, POST)
- ✅ `/api/clients/[id]` (GET, PUT, DELETE)

## Remaining Routes to Update

The following routes should be updated to use the centralized error handling:

- `/api/tasks` (GET, POST)
- `/api/tasks/[id]` (GET, PUT, DELETE, PATCH)
- `/api/recurring-tasks` (GET, POST)
- `/api/recurring-tasks/[id]` (GET, PUT, DELETE, PATCH)
- `/api/recurring-tasks/[id]/pause` (PATCH)
- `/api/recurring-tasks/[id]/resume` (PATCH)
- `/api/recurring-tasks/[id]/complete` (PATCH)
- `/api/teams` (GET, POST)
- `/api/teams/[id]` (GET, PUT, DELETE)
- `/api/teams/[id]/members` (POST)
- `/api/teams/[id]/members/[memberId]` (DELETE)
- `/api/employees` (GET, POST)
- `/api/employees/[id]` (GET, PUT, DELETE)
- `/api/employees/[id]/deactivate` (PATCH)
- `/api/categories` (GET, POST)
- `/api/categories/[id]` (GET, PUT, DELETE)

## Testing Error Handling

Test error scenarios:

```typescript
// Test validation errors
const response = await fetch('/api/clients', {
  method: 'POST',
  body: JSON.stringify({ name: '', email: 'invalid' }),
});
// Should return 400 with field-level errors

// Test not found
const response = await fetch('/api/clients/nonexistent-id');
// Should return 404 with "Client not found"

// Test unauthorized
const response = await fetch('/api/clients', {
  headers: { /* no auth token */ },
});
// Should return 401 with "Authentication required"
```

## Best Practices

1. **Always use try-catch**: Wrap all route handlers in try-catch blocks
2. **Use ErrorResponses**: Use pre-built error responses for common cases
3. **Validate early**: Check authentication and validation before business logic
4. **Be specific**: Provide helpful error messages that guide users
5. **Log appropriately**: Log detailed errors server-side, return safe messages to clients
6. **Test error paths**: Test both success and error scenarios

## Future Enhancements

Potential improvements:

- Integration with error tracking service (Sentry, Rollbar)
- Request ID tracking for debugging
- Rate limiting error responses
- Localized error messages
- Error analytics and monitoring
