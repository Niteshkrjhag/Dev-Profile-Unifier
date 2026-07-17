import os
import sys
import json
import requests
import argparse
from dotenv import load_dotenv

load_dotenv(dotenv_path='../.env')

GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
STACK_EXCHANGE_KEY = os.getenv('STACK_EXCHANGE_KEY')
DEVTO_API_KEY = os.getenv('DEVTO_API_KEY')

def fetch_github(name, handle):
    results = {}
    headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    
    if name:
        query = f'"{name}"'
        res = requests.get(f"https://api.github.com/search/users?q={query}", headers=headers)
        if res.status_code == 200:
            results['search_by_name'] = res.json()
            
    if handle:
        res = requests.get(f"https://api.github.com/users/{handle}", headers=headers)
        if res.status_code == 200:
            results['fetch_by_handle'] = res.json()
            
    return results

def fetch_stackexchange(name, handle):
    results = {}
    params = {
        "order": "desc",
        "sort": "reputation",
        "site": "stackoverflow"
    }
    if STACK_EXCHANGE_KEY:
        params['key'] = STACK_EXCHANGE_KEY
        
    if name:
        p = params.copy()
        p['inname'] = name
        res = requests.get("https://api.stackexchange.com/2.3/users", params=p)
        if res.status_code == 200:
            results['search_by_name'] = res.json()
            
    if handle and handle != name:
        p = params.copy()
        p['inname'] = handle
        res = requests.get("https://api.stackexchange.com/2.3/users", params=p)
        if res.status_code == 200:
            results['search_by_handle'] = res.json()
            
    return results

def fetch_devto(handle):
    results = {}
    headers = {"api-key": DEVTO_API_KEY} if DEVTO_API_KEY else {}
    if handle:
        res = requests.get(f"https://dev.to/api/users/by_username?url={handle}", headers=headers)
        if res.status_code == 200:
            results['fetch_by_handle'] = res.json()
    return results

def fetch_hackernews(handle):
    results = {}
    if handle:
        res = requests.get(f"https://hn.algolia.com/api/v1/users/{handle}")
        if res.status_code == 200:
            results['fetch_by_handle'] = res.json()
    return results

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', type=str, help="Person's generic name")
    parser.add_argument('--handle', type=str, help="Person's generic handle (fallback)")
    parser.add_argument('--gh-handle', type=str, help="GitHub specific handle")
    parser.add_argument('--so-handle', type=str, help="Stack Overflow specific handle or name")
    parser.add_argument('--devto-handle', type=str, help="Dev.to specific handle")
    parser.add_argument('--hn-handle', type=str, help="Hacker News specific handle")
    parser.add_argument('--outfile', type=str, required=True, help="Output JSON file")
    args = parser.parse_args()

    # Resolve platform specific handles vs generic handle
    gh = args.gh_handle or args.handle
    so = args.so_handle or args.handle or args.name
    devto = args.devto_handle or args.handle
    hn = args.hn_handle or args.handle

    data = {
        "query": {
            "name": args.name,
            "github_handle": gh,
            "stackoverflow_inname": so,
            "devto_handle": devto,
            "hn_handle": hn
        },
        "github": fetch_github(args.name, gh),
        "stackexchange": fetch_stackexchange(args.name, so),
        "devto": fetch_devto(devto),
        "hackernews": fetch_hackernews(hn)
    }

    with open(args.outfile, 'w') as f:
        json.dump(data, f, indent=4)
        
    print(f"Data saved to {args.outfile}")

if __name__ == "__main__":
    main()
