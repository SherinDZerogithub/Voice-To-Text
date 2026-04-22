import requests

BACKEND_URL = "http://localhost:8000"

def test_image_url():
    print("Testing /analyze-image with imageUrl...")
    data = {
        "imageUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80"
    }
    # Using multipart/form-data as per our update
    files = {
        "imageUrl": (None, data["imageUrl"])
    }
    response = requests.post(f"{BACKEND_URL}/analyze-image", files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    try:
        test_image_url()
    except Exception as e:
        print(f"Error: {e}")
