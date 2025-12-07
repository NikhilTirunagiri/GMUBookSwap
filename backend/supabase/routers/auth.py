from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv
import os
from supabase import create_client, Client
from deps.auth import get_current_user

# Load config from environment
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()

# Pydantic models for request validation
class SignUpRequest(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9._%+-]+@gmu\.edu$")
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class RefreshRequest(BaseModel):
    refresh_token: str

# Sign up endpoint
@router.post("/signup")
def signup(payload: SignUpRequest):
    """
    Register a new user with GMU email.
    Sends verification email automatically.
    """
    try:
        # Sign up with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "full_name": payload.full_name
                }
            }
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=400,
                detail="Signup failed. Email may already be registered."
            )

        return {
            "message": "Signup successful! Please check your GMU email to verify your account.",
            "user_id": auth_response.user.id,
            "email": auth_response.user.email,
            "email_confirmed": auth_response.user.email_confirmed_at is not None
        }

    except Exception as e:
        error_message = str(e)
        if "already registered" in error_message.lower():
            raise HTTPException(status_code=400, detail="This email is already registered")
        raise HTTPException(status_code=400, detail=f"Signup failed: {error_message}")

# Login endpoint
@router.post("/login")
def login(payload: LoginRequest):
    """
    Authenticate user and return session tokens.
    Requires email verification.
    """
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })

        user = auth_response.user
        session = auth_response.session

        if not user or not session:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Check if email is verified
        if not user.email_confirmed_at:
            raise HTTPException(
                status_code=403,
                detail="Please verify your email address before logging in. Check your inbox for the verification link."
            )

        return {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.user_metadata.get("full_name"),
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e).lower()
        if "invalid" in error_message or "credentials" in error_message:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

# Logout endpoint
@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """
    Sign out the current user and invalidate their session.
    Requires authentication.
    """
    try:
        # Sign out using the user's token
        supabase.auth.sign_out()

        return {
            "message": "Logged out successfully",
            "user_id": current_user["user_id"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")

# Get current user endpoint
@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get the current authenticated user's information.
    Requires authentication.
    """
    try:
        # Fetch full user details from Supabase
        user_response = supabase.auth.get_user(current_user["token"])

        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="User not found")

        user = user_response.user

        return {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.user_metadata.get("full_name"),
            "email_confirmed": user.email_confirmed_at is not None,
            "created_at": user.created_at
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

# Refresh token endpoint
@router.post("/refresh")
def refresh_token(payload: RefreshRequest):
    """
    Refresh an expired access token using a refresh token.
    """
    try:
        # Refresh the session
        auth_response = supabase.auth.refresh_session(payload.refresh_token)

        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        session = auth_response.session

        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {str(e)}")
