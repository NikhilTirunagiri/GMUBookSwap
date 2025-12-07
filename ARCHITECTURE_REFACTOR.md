# Architecture Refactor: Backend-Only Authentication

## Overview

The GMU Bookswap application has been refactored to use a **clean separation of concerns**:
- **Frontend**: UI only, no direct database or Supabase access
- **Backend (FastAPI)**: All authentication, authorization, validation, and database operations

This is a more maintainable, secure, and scalable architecture for production.

## Previous Architecture (Problematic)

```
Frontend (Browser)
    ↓
    ├──→ Supabase Directly (for auth & queries)
    │    - Required NEXT_PUBLIC_SUPABASE_URL
    │    - Required NEXT_PUBLIC_SUPABASE_ANON_KEY
    │    - Mixed business logic between frontend and backend
    │
    └──→ FastAPI Backend (for some book operations)
         - Inconsistent approach
```

**Problems:**
- Frontend had direct access to Supabase
- Business logic scattered across frontend and backend
- Confusing which operations went through backend vs. direct
- Frontend needed Supabase credentials

## New Architecture (Clean)

```
Frontend (Browser)
    ↓
    └──→ FastAPI Backend ONLY
         ↓
         └──→ Supabase (database + auth)
```

**Benefits:**
- ✅ Single source of truth for business logic
- ✅ Centralized authentication and authorization
- ✅ Frontend is purely presentational
- ✅ Easier to test and maintain
- ✅ Backend can be swapped without frontend changes
- ✅ No Supabase credentials needed in frontend

## Changes Made

### 1. Backend Changes

#### New File: `/backend/supabase/routers/auth.py`
Complete authentication router with endpoints:
- `POST /auth/signup` - Register new user with GMU email
- `POST /auth/login` - Authenticate and return JWT tokens
- `POST /auth/logout` - Sign out user
- `GET /auth/me` - Get current user info
- `POST /auth/refresh` - Refresh access token

All endpoints include:
- Pydantic validation (GMU email pattern, password length, etc.)
- Email verification enforcement
- Comprehensive error handling
- JWT token management

#### Updated: `/backend/supabase/main.py`
```python
from routers import books, auth

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(books.router, prefix="/books", tags=["Books"])
```

### 2. Frontend Changes

#### Updated: `/frontend/lib/api.ts`
**Complete rewrite** - removed all Supabase dependencies:

**Token Management:**
```typescript
// Token storage in localStorage
export function getAccessToken(): string | null
export function setAccessToken(token: string): void
export function getRefreshToken(): string | null
export function setRefreshToken(token: string): void
export function clearTokens(): void
export function setTokens(accessToken: string, refreshToken: string): void
```

**Authentication Functions:**
```typescript
export async function signup(data: SignupData): Promise<{ message: string }>
export async function login(data: LoginData): Promise<AuthResponse>
export async function logout(): Promise<void>
export async function getCurrentUser(): Promise<UserData>
export async function refreshAccessToken(): Promise<string>
export function isAuthenticated(): boolean
```

**API Helpers:**
```typescript
export async function apiGet(endpoint: string): Promise<Response>
export async function apiPost(endpoint: string, body: any): Promise<Response>
export async function apiPut(endpoint: string, body: any): Promise<Response>
export async function apiDelete(endpoint: string): Promise<Response>
```

All API calls automatically include JWT token from localStorage in Authorization header.

#### Updated: `/frontend/lib/config.ts`
Simplified to only require API URL:
```typescript
export const config = {
  api: {
    url: getEnvVar('NEXT_PUBLIC_API_URL'),
  },
} as const;
```

**Removed** Supabase URL and anon key requirements.

#### Updated: `/frontend/.env.local`
```bash
# Only one environment variable needed!
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### New File: `/frontend/app/components/RouteGuard.tsx`
Client-side route protection that checks authentication status:
```typescript
const PROTECTED_ROUTES = ["/listing", "/sell", "/my-listings", "/cart"];

// Redirects to login if not authenticated
```

#### Updated: `/frontend/app/layout.tsx`
```tsx
<CartProvider>
  <RouteGuard>
    {children}
  </RouteGuard>
</CartProvider>
```

#### Updated Pages:
1. **`/frontend/app/page.tsx`** (Login)
   - Uses `login()` from api.ts
   - Stores JWT tokens in localStorage
   - No Supabase imports

2. **`/frontend/app/signup/page.tsx`**
   - Uses `signup()` from api.ts
   - Added full_name field
   - No Supabase imports

3. **`/frontend/app/components/top-navbar.tsx`**
   - Uses `logout()` from api.ts
   - Clears local tokens on logout

4. **`/frontend/app/cart/page.tsx`**
   - Uses `getCurrentUser()` from api.ts
   - No Supabase imports

5. **`/frontend/app/my-listings/page.tsx`**
   - Uses `getCurrentUser()` from api.ts
   - No Supabase imports

6. **`/frontend/app/sell/page.tsx`**
   - Uses `getCurrentUser()` from api.ts
   - No Supabase imports

#### Removed Files:
- `/frontend/lib/supabaseClient.ts` - No longer needed
- `/frontend/middleware.ts` - Replaced with RouteGuard component

### 3. Environment Variables

#### Frontend `.env.local`
```bash
# Before (3 variables required):
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000

# After (1 variable required):
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend `.env` (unchanged)
```bash
SUPABASE_URL=https://...
SUPABASE_KEY=eyJ...
```

## Authentication Flow

### 1. Signup
```
User fills form → Frontend calls POST /auth/signup
→ Backend validates GMU email + password
→ Backend creates user in Supabase
→ Supabase sends verification email
→ User verifies email
→ User can login
```

### 2. Login
```
User enters credentials → Frontend calls POST /auth/login
→ Backend validates with Supabase
→ Backend checks email_confirmed_at
→ Backend returns access_token + refresh_token
→ Frontend stores tokens in localStorage
→ Frontend redirects to /listing
```

### 3. Authenticated Requests
```
User performs action → Frontend calls API with token
→ Backend validates JWT token
→ Backend checks authorization (ownership, etc.)
→ Backend performs database operation
→ Returns result to frontend
```

### 4. Logout
```
User clicks logout → Frontend calls POST /auth/logout
→ Backend invalidates session
→ Frontend clears localStorage tokens
→ Frontend redirects to /
```

## Security Improvements

1. **No Exposed Credentials**: Frontend no longer has direct access to database
2. **Centralized Authorization**: All ownership checks happen in backend
3. **Token-Based Auth**: JWT tokens with automatic expiration
4. **Server-Side Validation**: All Pydantic validation on backend
5. **Email Verification**: Enforced at backend login endpoint
6. **Single Entry Point**: All requests go through FastAPI for logging/monitoring

## Migration Guide

### For Development

1. **Update `.env.local`** (frontend):
   ```bash
   # Remove these:
   # NEXT_PUBLIC_SUPABASE_URL=...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...

   # Keep only:
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

2. **Start Backend**:
   ```bash
   cd backend/supabase
   python -m uvicorn main:app --reload
   ```

3. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Test Authentication**:
   - Go to http://localhost:3000
   - Create new account (will send verification email)
   - Verify email via link
   - Login with verified account
   - All protected routes should work

### For Production

1. **Backend Deployment**:
   - Deploy FastAPI to your server/cloud
   - Set environment variables for Supabase
   - Ensure CORS includes your frontend domain

2. **Frontend Deployment**:
   - Update `NEXT_PUBLIC_API_URL` to production backend URL
   - Build: `npm run build`
   - Deploy to Vercel/Netlify/etc.

3. **DNS/SSL**:
   - Backend should be HTTPS in production
   - Update CORS settings to match frontend domain

## Testing Checklist

- [ ] User can signup with GMU email
- [ ] Verification email is sent
- [ ] Unverified users cannot login
- [ ] Verified users can login
- [ ] Login returns access token
- [ ] Token is stored in localStorage
- [ ] Protected routes check authentication
- [ ] Unauthenticated users are redirected to login
- [ ] Users can create listings (authenticated)
- [ ] Users can only delete their own listings
- [ ] Users can logout
- [ ] Logout clears tokens
- [ ] After logout, protected routes redirect to login

## Future Enhancements

1. **Token Refresh**: Implement automatic token refresh when access token expires
2. **Remember Me**: Optional long-lived refresh tokens
3. **Password Reset**: Add password reset flow via email
4. **Session Management**: Track active sessions, force logout on all devices
5. **Rate Limiting**: Add rate limits to auth endpoints
6. **2FA**: Two-factor authentication for added security

## Troubleshooting

### "Missing required environment variable: NEXT_PUBLIC_API_URL"
- Restart your Next.js dev server after adding/changing .env.local
- Environment variables are only loaded at startup

### "401 Unauthorized" on API calls
- Check if access token exists in localStorage
- Token might have expired - implement refresh logic
- Backend might not be running

### CORS errors
- Ensure backend CORS middleware includes frontend URL
- Check that frontend is making requests to correct API URL

### "Please verify your email"
- Check spam folder for verification email
- Resend verification from Supabase dashboard if needed

## Summary

This refactor creates a **production-ready architecture** where:
- Frontend is a pure UI layer communicating only with your backend
- Backend handles ALL business logic, auth, and database access
- Easier to maintain, test, and scale
- More secure with centralized validation and authorization
- Consistent API patterns throughout the application

The frontend is now **completely agnostic** of your database provider - you could switch from Supabase to PostgreSQL, MongoDB, etc. without changing any frontend code!
