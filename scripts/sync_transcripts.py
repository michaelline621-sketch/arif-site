import os
import re
import sys
import json
import time
import random
import subprocess
from datetime import datetime, timezone
from http.cookiejar import MozillaCookieJar
import requests
from youtube_transcript_api import YouTubeTranscriptApi

CHANNEL_URL = "https://www.youtube.com/@ArifSalafi/videos"
DATA_FILE = "data/transcripts-index.json"
COOKIES_FILE = "cookies.txt"
BATCH_LIMIT = 50
SCAN_VIDEOS = 150

def build_session():
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36"})
    if os.path.exists(COOKIES_FILE):
        j = MozillaCookieJar(COOKIES_FILE)
        j.load(ignore_discard=True, ignore_expires=True)
        s.cookies = j
    return s

def get_recent_videos(max_results=SCAN_VIDEOS):
    cmd = [sys.executable, "-m", "yt_dlp", "--cookies", COOKIES_FILE, "--flat-playlist", "--dump-single-json", "--playlist-end", str(max_results), CHANNEL_URL]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return json.loads(r.stdout).get("entries", [])

def merge_segments(raw_items):
    merged, cur_start, cur_texts = [], None, []
    for item in raw_items:
        t = round(float(item.get("start", 0)))
        txt = re.sub(r"\s+", " ", str(item.get("text", ""))).strip()
        if not txt:
            continue
        if cur_start is None:
            cur_start = t
        cur_texts.append(txt)
        if len(" ".join(cur_texts)) >= 140:
            merged.append({"t": cur_start, "txt": " ".join(cur_texts)})
            cur_start, cur_texts = None, []
    if cur_texts and cur_start is not None:
        merged.append({"t": cur_start, "txt": " ".join(cur_texts)})
    return merged

def main():
    os.makedirs("data", exist_ok=True)
    db = json.load(open(DATA_FILE, "r", encoding="utf-8")) if os.path.exists(DATA_FILE) else {"channel": "@ArifSalafi", "updated_at": "", "videos": []}
    existing_ids = {v["id"] for v in db.get("videos", [])}
    api = YouTubeTranscriptApi(http_client=build_session())
    print(f"กำลังโหลดรายชื่อคลิปย้อนหลัง {SCAN_VIDEOS} คลิป (มีในระบบแล้ว {len(existing_ids)} คลิป)...", flush=True)
    videos = get_recent_videos(SCAN_VIDEOS)
    count = 0
    for item in videos:
        vid = item.get("id")
        title = item.get("title", "")
        if not vid or vid in existing_ids:
            continue
        if count >= BATCH_LIMIT:
            break
        try:
            print(f"\n[{count+1}/{BATCH_LIMIT}] {title}...", flush=True)
            tlist = api.list(vid)
            chosen = None
            for lang in ["th", "th-TH", "en", "en-US"]:
                try:
                    chosen = tlist.find_transcript([lang])
                    break
                except Exception:
                    pass
            if chosen is None:
                chosen = next(iter(tlist))
            segs = merge_segments([{"start": s.start, "text": s.text} for s in chosen.fetch()])
            db["videos"].insert(0, {"id": vid, "title": title, "date": "", "segments": segs})
            db["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            json.dump(db, open(DATA_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            existing_ids.add(vid)
            count += 1
            w = random.randint(20, 30)
            print(f"สำเร็จ ({len(segs)} ช่วง) -> พัก {w} วิ...", flush=True)
            time.sleep(w)
        except Exception as e:
            err = str(e)
            if "members-only" in err.lower() or "join this channel" in err.lower():
                print(f"ข้าม (คลิปสมาชิก): {title}", flush=True)
                continue
            print(f"ข้าม {title}: {err[:120]}", flush=True)
            if "blocking requests" in err.lower() or "429" in err.lower():
                print("ตรวจพบ IP บล็อก — หยุดรอบนี้", flush=True)
                break
            time.sleep(10)
    print(f"\nเสร็จสิ้น: เพิ่ม {count} คลิป (รวม {len(db['videos'])} คลิป)", flush=True)

if __name__ == "__main__":
    main()