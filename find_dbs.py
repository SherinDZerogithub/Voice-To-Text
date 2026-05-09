import os
import sqlite3

for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.db'):
            path = os.path.join(root, f)
            size = os.path.getsize(path)
            print(f"{path}  size={size} bytes")
            try:
                conn = sqlite3.connect(path)
                cur = conn.cursor()
                cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [r[0] for r in cur.fetchall()]
                print(f"  tables: {tables}")
                if 'mood_logs' in tables:
                    cur.execute("PRAGMA table_info(mood_logs)")
                    cols = [c[1] for c in cur.fetchall()]
                    print(f"  mood_logs columns: {cols}")
                conn.close()
            except Exception as e:
                print(f"  Error reading: {e}")
