from typing import Dict, Any, Tuple, Optional
import difflib

def calculate_fuzzy_ratio(str1: str, str2: str) -> float:
    if not str1 or not str2:
        return 0.0
    return difflib.SequenceMatcher(None, str1.lower().strip(), str2.lower().strip()).ratio()

def evaluate_product_match(
    target_product: Dict[str, Any],
    candidate_data: Dict[str, Any]
) -> Tuple[bool, str, float, Dict[str, Any]]:
    """
    Evaluates a candidate product against target product specs using strict priority rule pipeline.
    Returns (is_match, priority_level, confidence_score, evidence_dict).
    """
    target_upc = target_product.get("upc") or target_product.get("ean")
    cand_upc = candidate_data.get("upc") or candidate_data.get("ean")

    target_mpn = target_product.get("mpn")
    cand_mpn = candidate_data.get("mpn")

    target_sku = target_product.get("sku")
    cand_sku = candidate_data.get("sku") or candidate_data.get("candidate_id")

    target_name = (target_product.get("name") or "").strip().lower()
    cand_name = (candidate_data.get("candidate_name") or candidate_data.get("name") or "").strip().lower()

    target_brand = (target_product.get("brand") or "").strip().lower()
    cand_brand = (candidate_data.get("brand") or "").strip().lower()

    # Priority 1: UPC / EAN exact match
    if target_upc and cand_upc and target_upc == cand_upc:
        return True, "UPC_EAN", 1.0, {
            "matched_by": "UPC/EAN Exact Match",
            "matched_upc": target_upc
        }

    # Priority 2: MPN exact match
    if target_mpn and cand_mpn and target_mpn.lower() == cand_mpn.lower():
        return True, "MPN", 0.98, {
            "matched_by": "Manufacturer Part Number (MPN) Exact Match",
            "matched_mpn": target_mpn
        }

    # Priority 3: SKU exact match
    if target_sku and cand_sku and target_sku.lower() in cand_sku.lower():
        return True, "SKU", 0.95, {
            "matched_by": "SKU Identifier Match",
            "matched_sku": target_sku
        }

    # Priority 4: Brand + Model exact match
    if target_brand and cand_brand and target_brand == cand_brand:
        if target_name and cand_name and (target_name in cand_name or cand_name in target_name):
            return True, "BRAND_MODEL", 0.92, {
                "matched_by": "Brand & Product Name Containment Match",
                "matched_brand": target_brand
            }

    # Priority 5: Controlled Fuzzy Matching
    fuzzy_score = calculate_fuzzy_ratio(target_name, cand_name)
    if fuzzy_score >= 0.80:
        return True, "FUZZY", round(fuzzy_score, 2), {
            "matched_by": "Controlled Levenshtein String Similarity Match",
            "fuzzy_similarity_ratio": round(fuzzy_score, 2)
        }

    # No match
    return False, "NONE", 0.0, {
        "reason": "Failed to satisfy identifier matching pipeline thresholds"
    }
