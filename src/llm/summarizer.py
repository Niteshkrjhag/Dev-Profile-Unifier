import os
import json
from google import genai
from pydantic import BaseModel
from typing import Dict, Any, Tuple

class EntityResolutionOutput(BaseModel):
    is_match: bool
    confidence: float
    reason: str

class LLMConfigurationError(Exception):
    pass

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        # Use 3.5-flash as per environment specs
        self.model_name = "gemini-3.5-flash"

    async def tiebreaker_resolution(self, profile1: dict, profile2: dict, user_metadata: dict = None) -> Tuple[bool, float, str, int]:
        """
        Uses Gemini to determine if two raw profiles belong to the same person.
        Returns: (is_match, confidence_score, reason, tokens_used)
        """
        if not self.client:
            raise LLMConfigurationError("No API key configured for Gemini LLM tiebreaker.")

        metadata_instruction = ""
        if user_metadata:
            metadata_instruction = f"""
            CRITICAL MATCHING CRITERIA:
            The user is explicitly searching for a person with the following attributes: {json.dumps(user_metadata)}
            If Profile 2's bio, location, company, or any other raw text strongly matches these exact attributes, 
            you MUST weight this heavily as a positive match (confidence > 0.85).
            """

        prompt = f"""
        Act as an expert Entity Resolution Agent for developer profiles.
        Analyze the following two JSON profiles from different platforms.
        Determine if they belong to the EXACT same human being.
        
        Look for nuanced signals:
        - Tech stack overlaps
        - Writing style similarities
        - Shared open source repositories or companies
        {metadata_instruction}
        
        Profile 1 (Anchor): {json.dumps(profile1)}
        Profile 2 (Candidate): {json.dumps(profile2)}
        
        Respond with a JSON object containing:
        - "is_match": true/false
        - "confidence": a float between 0.0 and 1.0
        - "reason": A short explanation of why.
        """
        
        try:
            # We configure Gemini to return JSON using async client
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=EntityResolutionOutput
                )
            )
            
            # Safely extract the Pydantic object natively
            result = response.parsed
            
            # Extract tokens if available
            tokens = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                tokens = getattr(response.usage_metadata, "total_token_count", 0)
                
            if result:
                return result.is_match, result.confidence, result.reason, tokens
            return False, 0.0, "LLM returned empty structured response", tokens
            
        except Exception as e:
            return False, 0.0, f"Error calling Gemini: {str(e)}", 0

    async def generate_summary(self, unified_data: str) -> Tuple[str, int]:
        """
        Generates a 1-paragraph summary of a developer based on their unified data.
        Returns: (summary_string, tokens_used)
        """
        if not self.client:
            return "No LLM key configured.", 0
            
        # Prevent Context Window Bloat (Prune if > ~40k tokens / 160,000 chars)
        if len(unified_data) > 160000:
            try:
                data_dict = json.loads(unified_data)
                pruned_data = {}
                for plat, p_data in data_dict.items():
                    if isinstance(p_data, dict):
                        pruned_data[plat] = {
                            "profile": p_data.get("profile", {}),
                            "languages": p_data.get("languages", {}),
                            "top_tags": p_data.get("top_tags", [])
                        }
                unified_data = json.dumps(pruned_data)
            except Exception:
                pass # Fallback if string is not valid JSON
                
        prompt = f"""
        Write a concise, 1-paragraph professional summary of this developer based on their combined footprint.
        Highlight their primary languages, key focus areas, and notable impact. Do NOT invent information.
        
        Data: {unified_data}
        """
        
        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            tokens = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                tokens = getattr(response.usage_metadata, "total_token_count", 0)
                
            return response.text, tokens
            
        except Exception as e:
            return f"Summary generation failed: {str(e)}", 0
