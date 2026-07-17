import pytest
from src.core.discovery import DiscoveryEngine

def test_extract_handles_from_links():
    links = [
        "https://stackoverflow.com/users/13666482/nitesh-kr-jha",
        "https://dev.to/nitesh_krjha_3b665153b84",
        "https://news.ycombinator.com/user?id=niteshkrjhag",
        "https://github.com/niteshkrjhag",
        "https://randomwebsite.com/about",
        None,
        ""
    ]

    discovered = DiscoveryEngine.extract_handles_from_links(links)

    assert discovered.get("stackoverflow") == "nitesh-kr-jha"
    assert discovered.get("devto") == "nitesh_krjha_3b665153b84"
    assert discovered.get("hackernews") == "niteshkrjhag"
    assert discovered.get("github") == "niteshkrjhag"

def test_cross_pollinate_empty():
    discovered = DiscoveryEngine.cross_pollinate({})
    assert discovered == {}

def test_cross_pollinate_extracts_from_github_profile():
    mock_data = {
        "github": {
            "profile": {
                "blog": "https://dev.to/some_user",
                "html_url": "https://github.com/some_user"
            }
        }
    }
    
    discovered = DiscoveryEngine.cross_pollinate(mock_data)
    assert discovered.get("devto") == "some_user"
    assert discovered.get("github") == "some_user"
