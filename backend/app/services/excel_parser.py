import pandas as pd
import io
import re
from typing import List, Dict, Any, Tuple

def clean_identifier(val: Any) -> str:
    if isinstance(val, (pd.Series, list)):
        for item in val:
            res = clean_identifier(item)
            if res:
                return res
        return ""
    if pd.isna(val) or val is None:
        return ""
    val_str = str(val).strip()
    if val_str.endswith(".0"):
        val_str = val_str[:-2]
    if "e+" in val_str.lower() or "e-" in val_str.lower():
        try:
            val_str = f"{float(val_str):.0f}"
        except Exception:
            pass
    return val_str

def parse_price(val: Any) -> float | None:
    if isinstance(val, (pd.Series, list)):
        for item in val:
            res = parse_price(item)
            if res is not None:
                return res
        return None
    if pd.isna(val) or val is None:
        return None
    val_str = str(val).strip().replace('$', '').replace(',', '')
    try:
        return float(val_str)
    except Exception:
        return None

def parse_product_file(file_content: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parses Excel (.xlsx, .xls) or CSV files reliably.
    Returns (valid_products_list, error_reports_list)
    """
    ext = filename.lower().split('.')[-1]
    
    try:
        if ext == 'csv':
            df = pd.read_csv(io.BytesIO(file_content), dtype=str)
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(file_content), dtype=str)
        else:
            raise ValueError(f"Unsupported file format '.{ext}'. Supported formats: .xlsx, .xls, .csv")
    except Exception as e:
        raise ValueError(f"Failed to read file: {str(e)}")

    if df.empty:
        raise ValueError("Uploaded file contains no data rows.")

    # Deduplicate original column names if duplicate headers exist in Excel file
    cols = list(df.columns)
    seen_cols: Dict[str, int] = {}
    new_cols = []
    for c in cols:
        c_str = str(c).strip()
        if c_str in seen_cols:
            seen_cols[c_str] += 1
            new_cols.append(f"{c_str}_dup{seen_cols[c_str]}")
        else:
            seen_cols[c_str] = 1
            new_cols.append(c_str)
    df.columns = new_cols

    # Auto-detect header row if first row was blank or unmapped
    if df.columns[0].startswith("Unnamed:") and len(df) > 1:
        for r_idx in range(min(5, len(df))):
            row_vals = [str(v).lower() for v in df.iloc[r_idx].values if not pd.isna(v)]
            if any('name' in v or 'product' in v or 'sku' in v or 'item' in v for v in row_vals):
                df.columns = df.iloc[r_idx]
                df = df.iloc[r_idx + 1:].reset_index(drop=True)
                break

    # Column mapping normalization: ensure target field is mapped AT MOST ONCE
    column_map = {}
    used_targets = set()

    for col in df.columns:
        norm = str(col).strip().lower().replace('_', ' ').replace('-', ' ')
        target = None
        if 'sku' in norm:
            target = 'sku'
        elif 'product' in norm or 'title' in norm or 'item' in norm or 'name' in norm:
            target = 'name'
        elif 'brand' in norm or 'manufacturer' in norm or 'vendor' in norm:
            target = 'brand'
        elif 'category' in norm:
            target = 'category'
        elif 'mpn' in norm or 'model' in norm:
            target = 'mpn'
        elif 'upc' in norm:
            target = 'upc'
        elif 'ean' in norm:
            target = 'ean'
        elif 'pack' in norm or 'size' in norm:
            target = 'pack_size'
        elif 'variant' in norm:
            target = 'variant'
        elif 'price' in norm or 'cost' in norm or 'msrp' in norm or 'retail' in norm:
            target = 'price'

        if target and target not in used_targets:
            column_map[col] = target
            used_targets.add(target)
        else:
            column_map[col] = str(col)

    df = df.rename(columns=column_map)

    valid_products = []
    errors = []
    seen_skus: Dict[str, int] = {}

    for idx, row in df.iterrows():
        row_num = idx + 2  # Excel row (1-indexed + header)
        
        name = clean_identifier(row.get('name'))
        sku = clean_identifier(row.get('sku'))
        brand = clean_identifier(row.get('brand'))
        category = clean_identifier(row.get('category'))
        mpn = clean_identifier(row.get('mpn'))
        raw_upc = clean_identifier(row.get('upc'))
        raw_ean = clean_identifier(row.get('ean'))
        pack_size = clean_identifier(row.get('pack_size'))
        variant = clean_identifier(row.get('variant'))
        price_val = parse_price(row.get('price'))

        # If name is empty, try to fallback to any non-empty cell in the row
        if not name:
            non_empty_vals = [clean_identifier(v) for k, v in row.items() if clean_identifier(v)]
            if non_empty_vals:
                name = non_empty_vals[0]

        row_errors = []

        if not name:
            row_errors.append("Missing Product Name")

        if not sku:
            sku = f"SKU-{row_num:04d}"

        # Clean digits for UPC and EAN
        upc = re.sub(r'\D', '', raw_upc) if raw_upc else ""
        ean = re.sub(r'\D', '', raw_ean) if raw_ean else ""

        if raw_upc and not raw_upc.isdigit() and not upc:
            row_errors.append(f"Invalid UPC format '{raw_upc}' (must contain digits only)")

        if raw_ean and not raw_ean.isdigit() and not ean:
            row_errors.append(f"Invalid EAN format '{raw_ean}' (must contain digits only)")

        # Deduplicate SKUs in file automatically by suffixing
        if sku in seen_skus:
            seen_skus[sku] += 1
            sku = f"{sku}-dup{seen_skus[sku]}"
        else:
            seen_skus[sku] = 1

        if row_errors:
            errors.append({
                "row": row_num,
                "sku": sku,
                "name": name,
                "errors": row_errors
            })
        else:
            valid_products.append({
                "sku": sku,
                "name": name,
                "brand": brand or None,
                "category_name": category or "General",
                "mpn": mpn or None,
                "upc": upc or None,
                "ean": ean or None,
                "pack_size": pack_size or None,
                "variant": variant or None,
                "specifications": {"price": price_val if price_val is not None else 24.99}
            })

    return valid_products, errors
