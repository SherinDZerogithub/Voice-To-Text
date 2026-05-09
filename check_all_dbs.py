import sqlite3
import os

db_paths = [
    'app.db',
    'backend/app.db',
    'backend/mood_analytics.db'
]

for db_path in db_paths:
    full = os.path.abspath(db_path)
    print(f"\n=== {full} ===")
    if not os.path.exists(full):
        print("  (file does not exist)")
        continue
    try:
        conn = sqlite3.connect(full)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print("Tables:", tables)
        for (tbl,) in tables:
            cursor.execute(f"PRAGMA table_info({tbl})")
            cols = [c[1] for c in cursor.fetchall()]
            print(f"  {tbl}: {cols}")
        conn.close()
    except Exception as e:
        print(f"  Error: {e}")
