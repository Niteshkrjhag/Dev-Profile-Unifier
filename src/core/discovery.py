import re
from typing import Dict, List

class DiscoveryEngine:
    """
    Parses links and bio text to discover cross-platform handles.
    """

    @staticmethod
    def extract_handles_from_links(links: List[str]) -> Dict[str, str]:
        """
        Takes a list of URLs and returns a dictionary of discovered platform handles.
        Example: {"github": "octocat", "stackoverflow": "octocat"}
        """
        discovered = {}
        for link in links:
            if not link:
                continue

            # Stack Overflow: https://stackoverflow.com/users/13666482/nitesh-kr-jha
            so_match = re.search(r"stackoverflow\.com/users/\d+/([^/]+)", link)
            if so_match:
                discovered["stackoverflow"] = so_match.group(1)

            # Dev.to: https://dev.to/username
            devto_match = re.search(r"dev\.to/([^/]+)", link)
            if devto_match:
                discovered["devto"] = devto_match.group(1)

            # Hacker News: https://news.ycombinator.com/user?id=username
            hn_match = re.search(r"news\.ycombinator\.com/user\?id=([^&]+)", link)
            if hn_match:
                discovered["hackernews"] = hn_match.group(1)

            # GitHub: https://github.com/username
            gh_match = re.search(r"github\.com/([^/]+)", link)
            if gh_match:
                discovered["github"] = gh_match.group(1)

        return discovered

    @staticmethod
    def cross_pollinate(profile_data: Dict[str, dict]) -> Dict[str, str]:
        """
        Examines already fetched profile data across all platforms 
        and extracts links (blog, website, twitter, etc.) to discover new handles.
        Returns a dict of new platform -> handle mappings.
        """
        all_links = []
        
        # Extract GitHub links
        gh_profile = profile_data.get("github", {}).get("profile", {})
        if gh_profile:
            all_links.append(gh_profile.get("blog"))
            all_links.append(gh_profile.get("html_url"))

        # Extract Stack Overflow links
        so_users = profile_data.get("stackoverflow", {}).get("matched_users", [])
        for u in so_users:
            all_links.append(u.get("profile", {}).get("website_url"))
            all_links.append(u.get("profile", {}).get("link"))

        # Extract Dev.to links
        devto_profile = profile_data.get("devto", {}).get("profile", {})
        if devto_profile:
            all_links.append(devto_profile.get("website_url"))

        return DiscoveryEngine.extract_handles_from_links([l for l in all_links if l])
