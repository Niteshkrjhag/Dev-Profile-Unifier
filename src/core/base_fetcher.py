from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseFetcher(ABC):
    """
    Abstract base class for all platform fetchers.
    Defines the standard asynchronous interface for retrieving profile data.
    """

    @abstractmethod
    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetch comprehensive profile data for a given handle.
        """
        pass

    @abstractmethod
    async def search_by_name(self, name: str) -> List[Dict[str, Any]]:
        """
        Asynchronously search for a profile by name. Returns top candidates.
        """
        pass
