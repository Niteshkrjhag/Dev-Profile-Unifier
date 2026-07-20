import asyncio
from dotenv import load_dotenv
load_dotenv()
from src.core.resolution import ProfileResolver

def test_filtering():
    resolver = ProfileResolver()
    
    base_data = {
        "profile": {
            "name": "Nitesh Kumar Jha",
            "bio": "Software Engineer working with Python and React in India.",
            "location": "India",
            "company": "Google"
        },
        "tags": ["python", "react", "fastapi"]
    }
    
    # Create 10 fake candidates
    candidates = []
    for i in range(10):
        # The 7th candidate (index 6) will have a highly matching bio
        if i == 6:
            bio = "Software Engineer at Google in India. Python and React developer."
        else:
            bio = f"Random bio for person {i} doing java."
            
        candidates.append({
            "handle": f"user_{i}",
            "profile": {
                "name": f"Nitesh {i}",
                "bio": bio,
                "location": "USA" if i != 6 else "India",
                "company": "Unknown" if i != 6 else "Google"
            }
        })
        
    print(f"Total candidates before: {len(candidates)}")
    filtered = resolver._rank_and_filter_candidates(base_data, candidates, limit=3)
    
    print(f"Total candidates after: {len(filtered)}")
    print("Top candidate handle:", filtered[0]["handle"])
    print("Top candidate score:", filtered[0].get("match_score"))

if __name__ == "__main__":
    test_filtering()
