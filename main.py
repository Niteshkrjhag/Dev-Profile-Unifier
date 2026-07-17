import argparse
import json
from src.core.profile_collector import ProfileCollector

def main():
    parser = argparse.ArgumentParser(description="Collect developer profiles from multiple platforms.")
    parser.add_argument("--name", type=str, help="Developer's full name")
    parser.add_argument("--email", type=str, help="Developer's email address")
    parser.add_argument("--handle", type=str, help="Generic handle to search across all platforms")
    
    # Platform specific
    parser.add_argument("--gh", type=str, help="GitHub handle")
    parser.add_argument("--so", type=str, help="Stack Overflow handle/name")
    parser.add_argument("--devto", type=str, help="Dev.to handle")
    parser.add_argument("--hn", type=str, help="Hacker News handle")
    
    parser.add_argument("--out", type=str, default="unified_profile.json", help="Output JSON file")
    
    args = parser.parse_args()

    specific_handles = {}
    if args.gh: specific_handles["github"] = args.gh
    if args.so: specific_handles["stackoverflow"] = args.so
    if args.devto: specific_handles["devto"] = args.devto
    if args.hn: specific_handles["hackernews"] = args.hn

    collector = ProfileCollector()
    print("Collecting profile data. This may take a few moments depending on rate limits...")
    results = collector.collect(
        name=args.name,
        email=args.email,
        generic_handle=args.handle,
        specific_handles=specific_handles
    )

    with open(args.out, 'w') as f:
        json.dump(results, f, indent=4)

    print(f"Collection complete. Data saved to {args.out}")
    print(f"Discovered handles via cross-pollination: {results['metadata']['discovered_handles']}")

if __name__ == "__main__":
    main()
