

import requests
import time
import sys
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_BASE = "https://dailycode.dailycode.workers.dev"
ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNvZGVzc2FoaWxAZ21haWwuY29tIn0.z4w3qbSvYKbViev1cTMgbMXi3sN0rlOIrU9F0JclMjk"
MAX_PROBLEMS = 10000

HEADERS = {
    "Authorization": f"Bearer {ADMIN_TOKEN}",
    "Content-Type": "application/json"
}

# -----------------------------
# Resilient HTTP session
# -----------------------------
def create_session():
    session = requests.Session()

    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=2,     # exponential backoff
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"]
    )

    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    return session

session = create_session()

# -----------------------------
# Helper functions
# -----------------------------
def importance_from_rating(rating):
    return min(4, max(1, (rating - 800) // 300))

def safe_request(method, url, **kwargs):
    while True:
        try:
            r = session.request(method, url, timeout=20, **kwargs)
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Network error: {e}")
            print("⏳ Waiting for internet... retrying in 10s")
            time.sleep(10)

def get_all_cf_problems():
    print("Fetching Codeforces problems...")
    r = safe_request("GET", "https://codeforces.com/api/problemset.problems")
    return r.json()["result"]["problems"]

def get_existing_tags():
    r = safe_request("GET", f"{API_BASE}/admin/tags", headers=HEADERS)
    tags = r.json()["tags"]
    return {t["tag_name"].lower(): t["id"] for t in tags}

def bulk_create_tags(tags):
    if not tags:
        return
    safe_request(
        "POST",
        f"{API_BASE}/admin/tags/bulk",
        headers=HEADERS,
        json={"tags": list(tags)}
    )

def post_problem(payload):
    safe_request(
        "POST",
        f"{API_BASE}/admin/postproblems",
        headers=HEADERS,
        json=payload
    )

# -----------------------------
# Main ingestion loop
# -----------------------------
def main():
    problems = get_all_cf_problems()
    tag_map = get_existing_tags()

    created = 0

    for p in problems:
        if created >= MAX_PROBLEMS:
            break

        rating = p.get("rating")
        index = p.get("index")
        contest_id = p.get("contestId")

        if not rating or not contest_id:
            continue

        if rating < 1000 or rating > 2000:
            continue

        if index not in ["A", "B", "C", "D", "E"]:
            continue

        link = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"

        raw_tags = [t.strip() for t in p.get("tags", []) if t.strip()]
        raw_tags_lower = [t.lower() for t in raw_tags]

        # Auto-create missing tags
        missing = set(t for t in raw_tags_lower if t not in tag_map)
        if missing:
            bulk_create_tags(missing)
            tag_map = get_existing_tags()

        tag_ids = [tag_map[t] for t in raw_tags_lower if t in tag_map]
        if not tag_ids:
            continue

        payload = {
            "title": p["name"],
            "problem_link": link,
            "difficulty": index,
            "tagIds": tag_ids,
            "Pattern": ", ".join(raw_tags[:3]),
            "mydifficulty": index,
            "importance": importance_from_rating(rating),
            "notes": f"Codeforces {rating} rated problem"
        }

        try:
            post_problem(payload)
            created += 1
            print(f"✅ Added [{created}] {p['name']} ({rating})")
            time.sleep(1)
        except Exception as e:
            # Should never reach here due to safe_request
            print(f"❌ Unexpected error: {e}")
            time.sleep(5)

    print(f"\n🎉 Done. Added {created} problems.")

if __name__ == "__main__":
    main()
