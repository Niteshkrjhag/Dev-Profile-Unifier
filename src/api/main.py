from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
from dotenv import load_dotenv

load_dotenv()

from src.core.observability import tracker
from src.core.resolution import ProfileResolver
from src.core.supabase_client import SupabaseDB

app = FastAPI(
    title="Effiflo Dev Profile Unifier",
    description="Unified developer profiles from GitHub, StackOverflow, Dev.to, and HackerNews.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResolveRequest(BaseModel):
    name: Optional[str] = None
    github: Optional[str] = None
    stackoverflow: Optional[str] = None
    devto: Optional[str] = None
    hackernews: Optional[str] = None
    location: Optional[str] = None
    workplace: Optional[str] = None
    gender: Optional[str] = None
    profession_status: Optional[str] = None

@app.get("/health")
async def health_check():
    """Observability endpoint returning metrics."""
    return {
        "status": "healthy",
        "metrics": tracker.get_metrics()
    }

@app.post("/profiles/resolve")
async def resolve_profile(payload: ResolveRequest):
    """
    Kicks off ingestion and entity resolution.
    Will implement Approach 2 (Interactive Payload) here.
    """
    if not payload.name and not payload.github and not payload.stackoverflow:
        raise HTTPException(status_code=400, detail="Must provide at least a name or a primary handle (github/stackoverflow).")
        
    resolver = ProfileResolver()
    handles = {
        "github": payload.github,
        "stackoverflow": payload.stackoverflow,
        "devto": payload.devto,
        "hackernews": payload.hackernews
    }
    # Clean None values
    handles = {k: v for k, v in handles.items() if v}
    
    # Package metadata for bio-matching
    user_metadata = {
        "location": payload.location,
        "workplace": payload.workplace,
        "gender": payload.gender,
        "profession_status": payload.profession_status
    }
    user_metadata = {k: v for k, v in user_metadata.items() if v}
    
    result = await resolver.resolve_and_store(payload.name, handles, user_metadata)
    
    if result["status"] == "multiple_choices":
        # Simulate an HTTP 300 Multiple Choices response pattern per Approach 2
        return {
            "status": "multiple_choices",
            "message": result["message"],
            "canonical_id": result["canonical_id"],
            "candidates": result["ambiguous_matches"]
        }
        
    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    return {"canonical_id": result["canonical_id"]}

@app.get("/profiles/{profile_id}")
async def get_profile(profile_id: str):
    """
    Returns the merged canonical profile from Supabase.
    """
    db = SupabaseDB()
    profile = db.get_full_canonical_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found or no confirmed links.")
    return profile

class LinkStatusUpdate(BaseModel):
    status: str # "confirmed" or "rejected"

@app.get("/admin/links")
async def get_admin_links():
    """
    Fetches all links requiring admin audit (pending_review or rejected).
    """
    db = SupabaseDB()
    return db.get_review_links()

@app.put("/admin/links/{canonical_id}/{raw_profile_id}")
async def update_admin_link(canonical_id: str, raw_profile_id: str, payload: LinkStatusUpdate):
    """
    Manually overrides the status of a specific link.
    """
    if payload.status not in ["confirmed", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'confirmed' or 'rejected'")
    
    db = SupabaseDB()
    try:
        db.update_link_status(canonical_id, raw_profile_id, payload.status)
        return {"status": "success", "new_status": payload.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
