import sys
import os

# Ensure backend module import works
sys.path.insert(0, '.')

# Import database module
import database

engine_url = database.engine.url
db_path = engine_url.database

print(f"Engine URL: {engine_url}")
print(f"Resolved DB path: {os.path.abspath(db_path)}")

# Check if DB file exists
print(f"Exists: {os.path.exists(db_path)}")

# If exists, inspect schema
if os.path.exists(db_path):
    import sqlite3
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables: {tables}")
    if 'mood_logs' in tables:
        cur.execute("PRAGMA table_info(mood_logs)")
        cols = [c[1] for c in cur.fetchall()]
        print(f"mood_logs columns: {cols}")
        # Check for missing
        missing = [col for col in ['reflection', 'doodles', 'gentle_reminder'] if col not in cols]
        print(f"Missing columns: {missing}")
    conn.close()
