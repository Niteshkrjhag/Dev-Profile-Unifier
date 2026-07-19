import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the project root to the Python path dynamically
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load the .env file from the project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from src.core.resolution import ProfileResolver

async def main():
    resolver = ProfileResolver()
    
    # Test 1: Name Only Search
    print("\n--- Test 1: Name Only Search ---")
    try:
        res1 = await resolver.resolve_and_store("Nitesh Kumar Jha", {})
        print(f"Status: {res1.get('status')}")
        if res1.get('status') == 'multiple_choices':
            print(f"Candidates found: {len(res1.get('ambiguous_matches', []))}")
    except Exception as e:
        print(f"Error in Test 1: {e}")

    # Test 2: Handle Provided (Graph Crawler)
    print("\n--- Test 2: Handle Provided ---")
    try:
        res2 = await resolver.resolve_and_store("Nitesh Kumar Jha", {"github": "Niteshkrjhag"})
        print(f"Status: {res2.get('status')}")
        print(f"Canonical ID: {res2.get('canonical_id')}")
    except Exception as e:
        print(f"Error in Test 2: {e}")

    # Test 3: Name Only with Metadata
    print("\n--- Test 3: Name Only with Metadata ---")
    try:
        res3 = await resolver.resolve_and_store("Nitesh Kumar Jha", {}, user_metadata={"location": "India", "workplace": "Google"})
        print(f"Status: {res3.get('status')}")
        if res3.get('status') == 'multiple_choices':
            # Print the top candidate match score
            top_candidate = res3.get('ambiguous_matches')[0]
            print(f"Top Candidate Match Score: {top_candidate.get('match_score')}")
    except Exception as e:
        print(f"Error in Test 3: {e}")

if __name__ == "__main__":
    asyncio.run(main())
