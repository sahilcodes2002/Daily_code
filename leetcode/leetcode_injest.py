import time
import requests

# =========================
# CONFIG
# =========================
API_BASE = "https://dailycode.dailycode.workers.dev"
LEETCODE_API = "https://leetcode.com/api/problems/all/"

ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNvZGVzc2FoaWxAZ21haWwuY29tIn0.z4w3qbSvYKbViev1cTMgbMXi3sN0rlOIrU9F0JclMjk"

HEADERS = {
    "Authorization": f"Bearer {ADMIN_TOKEN}",
    "Content-Type": "application/json",
}

MAX_TOTAL = 8000

# LeetCode difficulty → your system
# 1 = Easy, 2 = Medium, 3 = Hard
DIFFICULTY_MAP = {
    2: ("C", 2),  # Medium
    3: ("D", 3),  # Hard
    1: ("B", 1),  # Easy
}

GENERIC_TAGS = ["leetcode", "implementation"]

# =========================
# NETWORK HELPERS
# =========================
def safe_get(url, headers=None):
    while True:
        try:
            r = requests.get(url, headers=headers, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Network error: {e}")
            print("⏳ Waiting 10s...")
            time.sleep(10)


def safe_post(url, payload):
    while True:
        try:
            r = requests.post(url, headers=HEADERS, json=payload, timeout=30)
            r.raise_for_status()
            return
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Network error: {e}")
            time.sleep(10)

# =========================
# TAG SETUP (SAME AS CODECHEF)
# =========================
def ensure_generic_tags():
    data = safe_get(f"{API_BASE}/admin/tags", headers=HEADERS)
    tags = data["tags"]

    tag_map = {t["tag_name"].lower(): t["id"] for t in tags}

    missing = [t for t in GENERIC_TAGS if t not in tag_map]
    if missing:
        safe_post(f"{API_BASE}/admin/tags/bulk", {"tags": missing})
        data = safe_get(f"{API_BASE}/admin/tags", headers=HEADERS)
        tags = data["tags"]
        tag_map = {t["tag_name"].lower(): t["id"] for t in tags}

    return [tag_map[t] for t in GENERIC_TAGS]

# =========================
# MAIN INGESTION
# =========================
def ingest_leetcode():
    print("📥 Fetching LeetCode problems...")
    data = safe_get(LEETCODE_API)

    problems = data["stat_status_pairs"]
    tag_ids = ensure_generic_tags()

    total_created = 0

    # Order: MEDIUM → HARD → EASY
    for diff_level in [2, 3, 1]:
        diff_letter, importance = DIFFICULTY_MAP[diff_level]

        print(f"\n🚀 Starting difficulty {diff_level}")

        for p in problems:
            if total_created >= MAX_TOTAL:
                break

            if p["difficulty"]["level"] != diff_level:
                continue

            if p.get("paid_only"):
                continue

            stat = p["stat"]
            title = stat["question__title"]
            slug = stat["question__title_slug"]

            payload = {
                "title": title,
                "problem_link": f"https://leetcode.com/problems/{slug}/",
                "difficulty": diff_letter,
                "tagIds": tag_ids,
                "Pattern": "LeetCode Practice",
                "mydifficulty": diff_letter,
                "importance": importance,
                "notes": "LeetCode problem"
            }

            safe_post(f"{API_BASE}/admin/postproblems", payload)

            total_created += 1
            print(f"✅ [{total_created}] {title}")

            time.sleep(0.5)

    print(f"\n🎉 DONE. Added {total_created} LeetCode problems.")

# =========================
# ENTRY
# =========================
if __name__ == "__main__":
    ingest_leetcode()
