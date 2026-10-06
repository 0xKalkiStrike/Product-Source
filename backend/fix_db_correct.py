import sqlite3
import json
import os

db_path = 'c:/hacker/Product-Source/product_intelligence.db'
if not os.path.exists(db_path):
    print("DB does not exist:", db_path)
    exit()

conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT id, name, specifications FROM products WHERE specifications LIKE '%cdn11.bigcommerce.com%'")
rows = c.fetchall()
print("Found rows:", len(rows))

updated = 0
for row in rows:
    pid, name, specs_str = row
    if not specs_str:
        continue
    specs = json.loads(specs_str)
    img_url = specs.get('image_url', '')
    if 'cdn11.bigcommerce.com' in img_url:
        print(f"Fixing {name} - {img_url}")
        specs['image_url'] = 'https://images.unsplash.com/photo-1527016016007-57ab3850c89d?w=400&q=80'
        c.execute("UPDATE products SET specifications = ? WHERE id = ?", (json.dumps(specs), pid))
        updated += 1
        
conn.commit()
print("Updated rows:", updated)
conn.close()
