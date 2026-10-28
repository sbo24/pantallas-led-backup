import requests
import os

SHOWSTRACK_API_URL = os.getenv("SHOWSTRACK_API_URL", "http://localhost:8000")
SHOWSTRACK_USERNAME = os.getenv("SHOWSTRACK_USERNAME", "admin")
SHOWSTRACK_PASSWORD = os.getenv("SHOWSTRACK_PASSWORD", "admin")

def get_jwt_token():
    resp = requests.post(
        f"{SHOWSTRACK_API_URL}/api/admin/auth/login",
        data={"username": SHOWSTRACK_USERNAME, "password": SHOWSTRACK_PASSWORD},
    )
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

def check_history():
    token = get_jwt_token()
    if not token:
        print("Auth failed")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{SHOWSTRACK_API_URL}/api/admin/import/history", headers=headers)
    print(resp.status_code)
    try:
        data = resp.json()
        print("Total items:", data.get("total"))
        for item in data.get("items", [])[:10]:
            print(item["id"], item["source"], item["processed_at"], item["status"])
    except Exception as e:
        print("Error parsing json:", e)

if __name__ == "__main__":
    check_history()
