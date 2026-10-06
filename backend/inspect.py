import sqlite3
import json

conn = sqlite3.connect('c:/hacker/Product-Source/backend/product_intelligence.db')
c = conn.cursor()
c.execute("SELECT name, specifications FROM products WHERE specifications LIKE '%Rogue-Nicotine%' OR name LIKE '%Rogue-Nicotine%'")
rows = c.fetchall()
print("Found rows:", len(rows))
for r in rows:
    print(r[0])
    print(json.dumps(json.loads(r[1]), indent=2))
