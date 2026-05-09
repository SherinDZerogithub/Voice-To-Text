import sys
sys.path.insert(0, '.')

try:
    import backend.main as main_mod
    print("Backend main imported successfully.")
except Exception as e:
    print(f"Error importing backend.main: {type(e).__name__}: {e}")
