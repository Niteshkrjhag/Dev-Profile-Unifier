from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn

from src.core.resolution import ProfileResolver
from src.core.supabase_client import SupabaseDB
from src.utils.metrics import Tracker

app = FastAPI(title="Effiflo Dev Profile Unifier", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize singletons
resolver = ProfileResolver()
db = SupabaseDB()
tracker = Tracker()

class SearchRequest(BaseModel):
    name: str
    user_metadata: Optional[Dict[str, str]] = {}
    handles: Optional[Dict[str, str]] = {}
    mode: Optional[str] = "transparent"

class ManualResolveRequest(BaseModel):
    canonical_id: str
    selected_candidate: dict

@app.post("/profiles/resolve")
async def resolve_profile(req: SearchRequest):
    """
    Kicks off the resolution engine for a given name and optional handles.
    """
    if not req.name:
        raise HTTPException(status_code=400, detail="Name is mandatory.")
        
    try:
        result = await resolver.resolve_and_store(
            name=req.name,
            user_metadata=req.user_metadata,
            handles=req.handles,
            mode=req.mode
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/profiles/manual-resolve")
async def manual_resolve_profile(req: ManualResolveRequest):
    """
    Resumes resolution after a human-in-the-loop fallback.
    """
    try:
        result = await resolver.manual_disambiguation_resume(
            canonical_id=req.canonical_id,
            selected_candidate=req.selected_candidate
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/profiles/{canonical_id}")
async def get_profile(canonical_id: str):
    """
    Returns the merged canonical profile, including which sources contributed what.
    """
    profile = db.get_full_canonical_profile(canonical_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Canonical profile not found.")
    return profile

@app.get("/health")
async def health_check():
    """
    Observability Dashboard metrics.
    - GitHub API rate-limit consumption
    - Total external API calls made
    - LLM token usage and estimated cost
    - Number of profiles resolved, average resolution time
    """
    metrics = tracker.get_metrics()
    
    # Estimate LLM cost (Gemini 1.5 Flash is roughly $0.075 / 1M input tokens)
    total_tokens = metrics.get("llm_tokens_used", 0)
    estimated_cost_usd = (total_tokens / 1_000_000) * 0.075
    metrics["estimated_llm_cost_usd"] = round(estimated_cost_usd, 4)
    
    # Calculate average resolution time
    resolutions = metrics.get("total_resolutions", 0)
    total_time_ms = metrics.get("total_resolution_time_ms", 0)
    avg_time_ms = (total_time_ms / resolutions) if resolutions > 0 else 0
    metrics["average_resolution_time_ms"] = round(avg_time_ms, 2)
    
    return {
        "status": "healthy",
        "observability": metrics
    }

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("src.server:app", host="0.0.0.0", port=port, reload=True)
