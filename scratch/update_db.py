import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "app.db")

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}. It will be created by the app.")
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

new_columns = [
    ("emoji", "TEXT"),
    ("description", "TEXT"),
    ("feedback", "TEXT"),
    ("poetic_summary", "TEXT"),
    ("confidence", "TEXT"),
    ("gemini_confidence", "INTEGER"),
    ("environment_type", "TEXT"),
    ("color_palette", "TEXT"),
    ("secondary_moods", "TEXT"),
    ("all_scores", "TEXT")
]

for col_name, col_type in new_columns:
    try:
        cursor.execute(f"ALTER TABLE mood_logs ADD COLUMN {col_name} {col_type}")
        print(f"Added column {col_name}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"Column {col_name} already exists")
        else:
            print(f"Error adding {col_name}: {e}")

conn.commit()
conn.close()
print("Database update complete.")
