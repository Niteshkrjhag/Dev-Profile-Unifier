from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

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

@app.get("/health")
async def health_check():
    """Observability endpoint returning metrics."""
    return {
        "status": "healthy",
        "message": "FastAPI is running successfully."
    }

@app.post("/profiles/resolve")
async def resolve_profile(payload: Dict[str, Any]):
    """
    Kicks off ingestion and entity resolution.
    Will implement Approach 2 (Interactive Payload) here.
    """
    return {"message": "Not implemented yet. Waiting for Supabase."}

@app.get("/profiles/{profile_id}")
async def get_profile(profile_id: str):
    """
    Returns the merged canonical profile from Supabase.
    """
    return {"message": "Not implemented yet. Waiting for Supabase."}
