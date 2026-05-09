import sqlite3
conn = sqlite3.connect('backend/app.db')
cur = conn.cursor()
try:
    cur.execute("SELECT reflection FROM mood_logs LIMIT 1")
    print("reflection column exists, query succeeded.")
except sqlite3.OperationalError as e:
    print(f"Error: {e}")
conn.close()
