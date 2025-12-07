import fastapi
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

# HTTPBearer will automatically parse the Authorization header
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    Validate the JWT token using Supabase client and return user information.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    
    token = credentials.credentials
    
    try:
        # Use Supabase client to validate token and get user
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Set the session with the token
        client.auth.set_session(token, token)
        
        # Get the current user using Supabase's built-in auth
        user = client.auth.get_user()
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user.user.id
        email = user.user.email
        
        # Fetch user profile from database
        try:
            prof = client.table("user_profiles").select("*").eq("id", user_id).execute()
            profile = prof.data[0] if prof.data else None
            
            if not profile:
                raise HTTPException(status_code=404, detail="User profile not found")
            
            return {
                "user_id": user_id,
                "email": email,
                "username": profile.get("username"),
                "role": profile.get("role"),
                "group_id": profile.get("group_id"),
                "token": token
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get user profile: {e}")
            
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
