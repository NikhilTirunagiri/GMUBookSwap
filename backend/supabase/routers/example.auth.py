from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from supabase import create_client, Client
from deps.auth import get_current_user

# Load config from environment (as in config.py)
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()

class SignUpRequest(BaseModel):
    email: str
    password: str
    username: str
    role: str = "user"  # Default to user, can be overridden

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(payload: LoginRequest):
    try:
        auth_res = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {e}")

    user = auth_res.user
    session = auth_res.session

    if user is None or session is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Get user profile data
    try:
        profile_res = supabase.table("user_profiles").select("*").eq("id", user.id).execute()
        profile = profile_res.data[0] if profile_res.data else None
    except Exception as e:
        profile = None

    return {
        "user_id": user.id,
        "email": user.email,
        "username": profile.get("username") if profile else None,
        "role": profile.get("role") if profile else None,
        "group_id": profile.get("group_id") if profile else None,
        "token": session.access_token,
        "refresh_token": session.refresh_token
    }