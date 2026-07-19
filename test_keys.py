import os
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai

load_dotenv()

def test_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        print("❌ Supabase URL or Key not found in .env")
        return False
    
    try:
        supabase: Client = create_client(url, key)
        # Just check if we can query the raw_profiles table
        response = supabase.table("raw_profiles").select("id").limit(1).execute()
        print("✅ Supabase connection successful! Queried raw_profiles.")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Gemini API Key not found in .env")
        return False
        
    try:
        client = genai.Client(api_key=api_key)
        if hasattr(client.models, 'generate_content'):
            interaction = client.models.generate_content(
            model="gemini-3.5-flash", 
            contents="Say 'Hello Gemini!' and nothing else."
        )
        print(f"✅ Gemini connection successful! Response: {interaction.text}")
        return True
    except Exception as e:
        # Fallback to older model name if 3.5 doesn't exist
        print(f"❌ Gemini connection failed: {e}")
        return False

if __name__ == "__main__":
    print("--- Testing API Keys ---")
    db_ok = test_supabase()
    llm_ok = test_gemini()
    
    if db_ok and llm_ok:
        print("--- All Keys Working! ---")
    else:
        print("--- Fix Keys Before Proceeding ---")
