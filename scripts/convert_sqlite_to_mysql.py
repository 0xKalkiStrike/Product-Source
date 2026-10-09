import sqlite3
import re
import os

def sqlite_to_mysql(sqlite_db_path, mysql_sql_path):
    conn = sqlite3.connect(sqlite_db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]

    with open(mysql_sql_path, "w", encoding="utf-8") as f:
        f.write("-- MySQL / MariaDB dump generated from SQLite database product_intelligence.db\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
        f.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n")
        f.write("SET NAMES utf8mb4;\n\n")

        for table in tables:
            f.write(f"--\n-- Table structure for table `{table}`\n--\n")
            f.write(f"DROP TABLE IF EXISTS `{table}`;\n")

            cursor.execute(f"PRAGMA table_info('{table}');")
            columns_info = cursor.fetchall()
            # cid, name, type, notnull, dflt_value, pk

            col_defs = []
            pk_cols = []
            for col in columns_info:
                cid, name, col_type, notnull, dflt_val, pk = col
                col_type_upper = col_type.upper()

                # Map SQLite type to MySQL type
                if "INT" in col_type_upper:
                    mysql_type = "BIGINT"
                elif "BOOL" in col_type_upper:
                    mysql_type = "TINYINT(1)"
                elif "REAL" in col_type_upper or "FLOAT" in col_type_upper or "DOUBLE" in col_type_upper:
                    mysql_type = "DOUBLE"
                elif "JSON" in col_type_upper:
                    mysql_type = "LONGTEXT"
                elif "DATETIME" in col_type_upper or "TIMESTAMP" in col_type_upper:
                    mysql_type = "VARCHAR(64)" # Store ISO timestamps robustly
                else:
                    if pk or name == "id" or "id" in name or name == "email" or name == "status" or name == "role":
                        mysql_type = "VARCHAR(255)"
                    else:
                        mysql_type = "LONGTEXT"

                null_str = "NOT NULL" if notnull else "NULL"
                col_def = f"  `{name}` {mysql_type} {null_str}"
                col_defs.append(col_def)
                if pk:
                    pk_cols.append(f"`{name}`")

            if pk_cols:
                col_defs.append(f"  PRIMARY KEY ({', '.join(pk_cols)})")

            create_stmt = f"CREATE TABLE `{table}` (\n" + ",\n".join(col_defs) + "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n"
            f.write(create_stmt)

            # Dump data
            cursor.execute(f"SELECT * FROM `{table}`;")
            rows = cursor.fetchall()
            col_names = [col[1] for col in columns_info]

            if rows:
                f.write(f"-- Dumping data for table `{table}`\n")
                col_list_str = ", ".join([f"`{c}`" for c in col_names])
                
                # Chunk inserts
                chunk_size = 50
                for i in range(0, len(rows), chunk_size):
                    chunk = rows[i:i+chunk_size]
                    val_strs = []
                    for row in chunk:
                        vals = []
                        for val in row:
                            if val is None:
                                vals.append("NULL")
                            elif isinstance(val, (int, float)):
                                vals.append(str(val))
                            elif isinstance(val, bool):
                                vals.append("1" if val else "0")
                            else:
                                # String escaping
                                val_str = str(val).replace("\\", "\\\\").replace("'", "''").replace("\x00", "").replace("\r", "\\r").replace("\n", "\\n")
                                vals.append(f"'{val_str}'")
                        val_strs.append(f"({', '.join(vals)})")
                    insert_stmt = f"INSERT INTO `{table}` ({col_list_str}) VALUES\n" + ",\n".join(val_strs) + ";\n"
                    f.write(insert_stmt)
                f.write("\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")

    conn.close()
    print(f"[SUCCESS] Converted SQLite '{sqlite_db_path}' to MySQL dump '{mysql_sql_path}'")

if __name__ == "__main__":
    sqlite_to_mysql("product_intelligence.db", "product_intelligence_mysql.sql")
