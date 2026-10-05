from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseSourceAdapter(ABC):
    """
    Abstract Base Class for all Source Adapters.
    Every source site adapter must inherit from BaseSourceAdapter and implement product search and detail extraction.
    """
    adapter_name: str = "BaseSourceAdapter"

    def __init__(self, source_config: Dict[str, Any], credential: Optional[Dict[str, Any]] = None):
        self.source_config = source_config
        self.credential = credential

    @abstractmethod
    async def validate_credential(self) -> tuple[bool, Optional[str]]:
        """
        Validate source credentials. Returns (is_valid, error_message).
        """
        pass

    @abstractmethod
    async def search_product(self, product_query: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search product on source site. Returns candidate match data.
        """
        pass

    @abstractmethod
    async def extract_product_details(self, source_product_id_or_url: str) -> Dict[str, Any]:
        """
        Extract detailed product data, price, MSRP, pack size, availability, and evidence.
        """
        pass
