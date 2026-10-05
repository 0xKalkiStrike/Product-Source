from typing import Dict, Type, Any, Optional
from adapters.base.base_adapter import BaseSourceAdapter
from adapters.generic.generic_adapter import GenericSourceAdapter
from adapters.cigar.cigar_adapter import CigarSourceAdapter
from adapters.vape.vape_adapter import VapeSourceAdapter

ADAPTER_REGISTRY: Dict[str, Type[BaseSourceAdapter]] = {
    "GenericSourceAdapter": GenericSourceAdapter,
    "CigarSourceAdapter": CigarSourceAdapter,
    "VapeSourceAdapter": VapeSourceAdapter
}

def get_source_adapter(
    adapter_name: str,
    source_config: Dict[str, Any],
    credential: Optional[Dict[str, Any]] = None
) -> BaseSourceAdapter:
    adapter_cls = ADAPTER_REGISTRY.get(adapter_name, GenericSourceAdapter)
    return adapter_cls(source_config=source_config, credential=credential)
