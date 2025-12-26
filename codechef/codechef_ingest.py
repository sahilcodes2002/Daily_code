import time
import json
import requests
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError

# =========================
# CONFIG
# =========================
API_BASE = "https://dailycode.dailycode.workers.dev"
ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNvZGVzc2FoaWxAZ21haWwuY29tIn0.z4w3qbSvYKbViev1cTMgbMXi3sN0rlOIrU9F0JclMjk"

HEADERS = {
    "Authorization": f"Bearer {ADMIN_TOKEN}",
    "Content-Type": "application/json"
}

MAX_TOTAL = 10000
PER_DIFFICULTY_LIMIT = MAX_TOTAL // 3

DIFFICULTY_ORDER = [
    ("medium", "C", 2),
    ("hard", "D", 3),
    ("easy", "B", 1),
]

GENERIC_TAGS = ["codechef", "implementation"]
PROGRESS_FILE = "progress.json"

# =========================
# PROGRESS
# =========================
def load_progress():
    if Path(PROGRESS_FILE).exists():
        return json.loads(Path(PROGRESS_FILE).read_text())
    return {
        "difficulty_index": 0,
        "page": 1,
        "created_per_diff": {
            "medium": 0,
            "hard": 0,
            "easy": 0
        },
        "total_created": 0
    }

def save_progress(p):
    Path(PROGRESS_FILE).write_text(json.dumps(p, indent=2))

# =========================
# NETWORK HELPERS
# =========================
def safe_get(url):
    while True:
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Network error: {e}")
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
# TAG SETUP
# =========================
def ensure_generic_tags():
    tags = safe_get(f"{API_BASE}/admin/tags")["tags"]
    tag_map = {t["tag_name"].lower(): t["id"] for t in tags}

    missing = [t for t in GENERIC_TAGS if t not in tag_map]
    if missing:
        safe_post(f"{API_BASE}/admin/tags/bulk", {"tags": missing})
        tags = safe_get(f"{API_BASE}/admin/tags")["tags"]
        tag_map = {t["tag_name"].lower(): t["id"] for t in tags}

    return [tag_map[t] for t in GENERIC_TAGS]

# =========================
# SCRAPER
# =========================
def scrape_codechef():
    progress = load_progress()
    tag_ids = ensure_generic_tags()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        for i in range(progress["difficulty_index"], len(DIFFICULTY_ORDER)):
            difficulty, diff_letter, importance = DIFFICULTY_ORDER[i]
            page_num = progress["page"] if i == progress["difficulty_index"] else 1

            print(f"\n🚀 Starting {difficulty.upper()} from page {page_num}")

            while (
                progress["created_per_diff"][difficulty] < PER_DIFFICULTY_LIMIT
                and progress["total_created"] < MAX_TOTAL
            ):
                url = f"https://www.codechef.com/problems/{difficulty}?page={page_num}"
                print(f"🔍 {difficulty} | Page {page_num}")

                try:
                    page.goto(url, timeout=60000)
                except Exception as e:
                    print(f"⚠️ Page load failed: {e}")
                    time.sleep(10)
                    continue

                # 🔑 CRITICAL FIX: give JS time
                time.sleep(6)

                rows = []
                for attempt in range(2):  # retry once
                    try:
                        page.wait_for_selector("table tbody tr", timeout=10000)
                        rows = page.query_selector_all("table tbody tr")
                        if rows:
                            break
                    except TimeoutError:
                        print("⏳ Waiting again for rows...")
                        time.sleep(5)

                print(f"➡️ Found {len(rows)} rows")

                if not rows:
                    print("⚠️ No rows after retry — assuming end of pages")
                    break

                for row in rows:
                    if (
                        progress["created_per_diff"][difficulty] >= PER_DIFFICULTY_LIMIT
                        or progress["total_created"] >= MAX_TOTAL
                    ):
                        break

                    cells = row.query_selector_all("td")
                    if len(cells) < 2:
                        continue

                    code = cells[0].inner_text().strip()
                    title = cells[1].inner_text().strip()

                    if not code or not title:
                        continue

                    payload = {
                        "title": title,
                        "problem_link": f"https://www.codechef.com/problems/{code}",
                        "difficulty": diff_letter,
                        "tagIds": tag_ids,
                        "Pattern": "CodeChef Practice",
                        "mydifficulty": diff_letter,
                        "importance": importance,
                        "notes": f"CodeChef {difficulty} problem"
                    }

                    safe_post(f"{API_BASE}/admin/postproblems", payload)

                    progress["created_per_diff"][difficulty] += 1
                    progress["total_created"] += 1

                    print(f"✅ [{progress['total_created']}] {code} — {title}")
                    save_progress(progress)

                    time.sleep(0.7)

                page_num += 1
                if page_num == 112 :
                    break
                progress["page"] = page_num
                save_progress(progress)

            progress["difficulty_index"] = i + 1
            progress["page"] = 1
            save_progress(progress)

        browser.close()

    print(f"\n🎉 DONE. Added {progress['total_created']} CodeChef problems.")

# =========================
# ENTRY
# =========================
if __name__ == "__main__":
    scrape_codechef()
