# Security Architecture Diagram

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/App)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 1. User logs in
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Firebase Authentication                         │
│  - Validates credentials                                             │
│  - Issues ID Token (JWT)                                             │
│  - Token contains: uid, email, custom claims (role)                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 2. Returns ID Token
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/App)                         │
│  - Stores ID Token                                                   │
│  - Adds to Authorization header: "Bearer <token>"                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 3. API Request with token
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js API Route Handler                         │
│  /api/recurring-tasks/[id]/route.ts                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 4. Extract token from header
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      verifyAuthToken()                               │
│  src/lib/server-auth.ts                                              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. Extract Bearer token from Authorization header           │   │
│  │ 2. Verify token using Firebase Admin SDK                    │   │
│  │ 3. Get user profile from Firestore                          │   │
│  │ 4. Extract role and permissions                             │   │
│  │ 5. Return authenticated user object                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
         ┌──────────────────┐        ┌──────────────────┐
         │   Success ✅      │        │   Failure ❌      │
         │                  │        │                  │
         │ Returns:         │        │ Returns:         │
         │ - uid            │        │ - 401 Error      │
         │ - email          │        │ - Error message  │
         │ - role           │        │                  │
         │ - permissions    │        └──────────────────┘
         └──────────────────┘
                    │
                    │ 5. Check role-based permissions
                    ▼
         ┌──────────────────────────────────┐
         │   Role-Based Access Control      │
         │                                  │
         │  if (!['admin', 'manager']       │
         │      .includes(userRole)) {      │
         │    return 403 Forbidden          │
         │  }                               │
         └──────────────────────────────────┘
                    │
                    │ 6. Execute business logic
                    ▼
         ┌──────────────────────────────────┐
         │   Firebase Admin SDK             │
         │   (Bypasses Firestore Rules)     │
         │                                  │
         │  - Read/Write to Firestore       │
         │  - Send notifications            │
         │  - Update user profiles          │
         └──────────────────────────────────┘
                    │
                    │ 7. Return response
                    ▼
         ┌──────────────────────────────────┐
         │   200 OK with data               │
         │   or                             │
         │   Error response                 │
         └──────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Layer 1: Network                             │
│  - HTTPS/TLS encryption                                              │
│  - CORS policies                                                     │
│  - Rate limiting (TODO)                                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Layer 2: Authentication                           │
│  - Firebase ID Token verification                                    │
│  - Token expiration check                                            │
│  - User identity validation                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Layer 3: Authorization                            │
│  - Role-based access control (RBAC)                                  │
│  - Permission checks                                                 │
│  - Resource ownership validation                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Layer 4: Input Validation                         │
│  - Zod schema validation                                             │
│  - Type checking                                                     │
│  - Sanitization                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Layer 5: Data Access                              │
│  - Firestore security rules (client SDK)                             │
│  - Admin SDK (server-side, bypasses rules)                           │
│  - Query filtering by user context                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Layer 6: Audit Logging                            │
│  - Activity tracking                                                 │
│  - Security event logging                                            │
│  - Compliance reporting                                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                              ADMIN                                   │
│  - Full system access                                                │
│  - User management                                                   │
│  - Role assignment                                                   │
│  - System configuration                                              │
│  - Audit log access                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Inherits all permissions from
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                             MANAGER                                  │
│  - Team management                                                   │
│  - Task creation/assignment                                          │
│  - Client management                                                 │
│  - Report viewing                                                    │
│  - Employee data access                                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Inherits all permissions from
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            EMPLOYEE                                  │
│  - View assigned tasks                                               │
│  - Update task status                                                │
│  - Clock in/out                                                      │
│  - View own attendance                                               │
│  - Personal task management                                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Before vs After Fix

### BEFORE (Vulnerable) ❌

```
Client Request
      │
      ▼
API Route Handler
      │
      │ ❌ NO AUTHENTICATION CHECK
      │
      ▼
Firebase Admin SDK
      │
      │ ⚠️ Bypasses Firestore Rules
      │
      ▼
Firestore Database
      │
      ▼
Return ALL Data (No filtering)
```

### AFTER (Secure) ✅

```
Client Request + ID Token
      │
      ▼
API Route Handler
      │
      ▼
verifyAuthToken()
      │
      ├─ Verify token with Firebase Admin SDK
      ├─ Get user profile from Firestore
      └─ Extract role and permissions
      │
      ▼
Role-Based Access Check
      │
      ├─ Admin? → Full access
      ├─ Manager? → Team data access
      └─ Employee? → Own data only
      │
      ▼
Firebase Admin SDK (with context)
      │
      ├─ Filter by user context
      ├─ Apply business rules
      └─ Log activity
      │
      ▼
Firestore Database
      │
      ▼
Return Filtered Data
```

## Token Structure

```json
{
  "iss": "https://securetoken.google.com/jpcopanel",
  "aud": "jpcopanel",
  "auth_time": 1234567890,
  "user_id": "abc123xyz",
  "sub": "abc123xyz",
  "iat": 1234567890,
  "exp": 1234571490,
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": ["user@example.com"]
    },
    "sign_in_provider": "password"
  },
  "role": "manager",
  "permissions": ["tasks.manage", "users.view"]
}
```

## Security Decision Tree

```
                    Incoming Request
                          │
                          ▼
                 Has Authorization Header?
                    │           │
                   No          Yes
                    │           │
                    ▼           ▼
              Return 401   Extract Token
                              │
                              ▼
                      Token Valid?
                         │      │
                        No     Yes
                         │      │
                         ▼      ▼
                   Return 401  Get User Profile
                                  │
                                  ▼
                          User Exists?
                             │      │
                            No     Yes
                             │      │
                             ▼      ▼
                       Return 401  Check Role
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                        ▼             ▼             ▼
                     Admin        Manager       Employee
                        │             │             │
                        ▼             ▼             ▼
                   Full Access   Team Access   Own Data Only
                        │             │             │
                        └─────────────┼─────────────┘
                                      │
                                      ▼
                              Execute Request
                                      │
                                      ▼
                              Return Response
```

## Firestore Rules Flow

```
Client SDK Request
      │
      ▼
Firestore Rules Engine
      │
      ├─ Check: isAuthenticated()?
      │     │
      │     ├─ No → Deny
      │     └─ Yes → Continue
      │
      ├─ Check: getUserRole()
      │     │
      │     ├─ From custom claims (fast)
      │     └─ From Firestore doc (fallback)
      │
      ├─ Check: Role matches requirement?
      │     │
      │     ├─ No → Deny (403)
      │     └─ Yes → Continue
      │
      ├─ Check: Resource ownership?
      │     │
      │     ├─ resource.data.userId == request.auth.uid?
      │     └─ Or isManager()?
      │
      └─ Check: Protected fields?
            │
            ├─ Modifying role/permissions? → Deny
            └─ Safe fields only? → Allow
```

## Summary

- **Authentication**: Verifies WHO you are (Firebase ID Token)
- **Authorization**: Verifies WHAT you can do (Role-based)
- **Firestore Rules**: Client SDK protection (defense in depth)
- **API Auth**: Server SDK protection (primary security layer)
- **Audit Logging**: Tracks WHO did WHAT and WHEN

All layers work together to provide comprehensive security.
