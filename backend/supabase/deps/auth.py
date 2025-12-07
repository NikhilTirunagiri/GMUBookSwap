"""
Authentication dependencies for FastAPI routes.
Validates JWT tokens from Supabase Auth.
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

# HTTPBearer will automatically parse the Authorization header
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    Validate the JWT token using Supabase client and return user information.

    Returns:
        dict: User information containing user_id and email

    Raises:
        HTTPException: 401 if token is missing or invalid
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in."
        )

    token = credentials.credentials

    try:
        # Create Supabase client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Validate token and get user
        user_response = client.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = user_response.user

        # Return user information without requiring user_profiles table
        return {
            "user_id": user.id,
            "email": user.email,
            "token": token
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )


def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    Optional authentication - returns None if not authenticated.
    Useful for endpoints that work with or without auth.
    """
    if credentials is None:
        return None

    try:
        return get_current_user(credentials)
    except HTTPException:
        return None
