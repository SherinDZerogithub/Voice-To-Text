import sys
sys.path.insert(0, 'backend')  # Add backend as top-level

try:
    import main as main_mod
    print("Backend main imported successfully from backend folder.")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
