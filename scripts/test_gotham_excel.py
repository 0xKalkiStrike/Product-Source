import sys
import os
import io
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.excel_parser import parse_product_file

def test_duplicate_columns_excel():
    # Simulate an Excel sheet like Gotham.xlsx with duplicate headers (e.g., Product Name & Item Name & Description)
    df_data = {
        "Product Name": ["Gotham Cigar 1", "Gotham Vape 2"],
        "Item Name": ["Cigar 1 Description", "Vape 2 Description"],
        "SKU": ["GOT-001", "GOT-002"],
        "Item SKU": ["GOT-001-ALT", "GOT-002-ALT"],
        "Brand": ["Gotham Brand", "Gotham Brand"],
        "Vendor": ["Vendor X", "Vendor Y"],
        "Price": ["29.99", "49.99"],
        "Retail Price": ["34.99", "54.99"]
    }
    df = pd.DataFrame(df_data)
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    
    excel_bytes = excel_buffer.getvalue()
    
    products, errors = parse_product_file(excel_bytes, "Gotham.xlsx")
    print(f"Parsed products count: {len(products)}")
    print(f"Products sample: {products}")
    print(f"Errors: {errors}")

if __name__ == "__main__":
    test_duplicate_columns_excel()
