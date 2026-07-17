from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseFetcher(ABC):
    """
    Abstract base class for all platform fetchers.
    Defines the standard interface for retrieving profile data.
    """

    @abstractmethod
    def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Fetches the complete developer profile data for a specific handle on this platform.
        Must return a structured dictionary containing the platform's specific data points.
        """
        pass

    @abstractmethod
    def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        Searches for users by a generic name and fetches their data.
        Useful for platforms like Stack Overflow or GitHub where name search is robust.
        """
        pass
