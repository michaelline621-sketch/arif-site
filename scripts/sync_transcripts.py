import os
import re
import sys
import json
import time
import glob
import random
import subprocess
from datetime import datetime, timezone

CHANNEL_URL = "https://www.youtube.com/@ArifSalafi/videos"
DATA_FILE = "data/transcripts-index.json"
COOKIES_FILE = "cookies.txt"
BATCH_LIMIT = 100
SCAN_VIDEOS = 500


def get_recent_videos(max_results=SCAN_VIDEOS):
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--cookies", COOKIES_FILE,
        "--flat-playlist", "--dump-single-json",
        "--playlist-end", str(max_results), CHANNEL_URL
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return json.loads(r.stdout).get("entries", [])


def parse_ts(ts):
    p = ts.strip().split(":")
    if len(p) == 3:
        return round(float(p[0]) * 3600 + float(p[1]) * 60 + float(p[2]))
    if len(p) == 2:
        return round(float(p[0]) * 60 + float(p[1]))
    return 0


def parse_vtt(path):
    txt = open(path, "r", encoding="utf-8", errors="ignore").read()
    blocks = re.split(r"\n\s*\n", txt)
    items, last = [], ""
    for b in blocks:
        lines = [l.strip() for l in b.splitlines() if l.strip()]
        ti = next((i for i, l in enumerate(lines) if "-->" in l), -1)
        if ti == -1:
            continue
        t = parse_ts(lines[ti].split("-->")[0])
        c = re.sub(r"<[^>]+>", "", " ".join(lines[ti + 1:]))
        c = re.sub(r"&nbsp;|&amp;|&quot;|&#39;", " ", c)
        c = re.sub(r"\s+", " ", c).strip()
        if not c or c == last:
            continue
        if last and c.startswith(last):
            diff = c[len(last):].strip()
            last = c
            if not diff:
                continue
            c = diff
        else:
            last = c
        items.append({"t": t, "txt": c})

    merged, cur_t, cur = [], None, []
    for it in items:
        if cur_t is None:
            cur_t = it["t"]
        cur.append(it["txt"])
        if len(" ".join(cur)) >= 140:
            merged.append({"t": cur_t, "txt": " ".join(cur)})
            cur_t, cur = None, []
    if cur and cur_t is not None:
        merged.append({"t": cur_t, "txt": " ".join(cur)})
    return merged


def fetch_sub_from_yt(vid):
    for old in glob.glob(f"temp_sub_{vid}*"):
        os.remove(old)

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--cookies", COOKIES_FILE,
        "--skip-download",
        "--write-sub", "--write-auto-sub",
        "--sub-langs", "th-orig,th.*,en.*,th,en",
        "--sub-format", "vtt",
        "-o", f"temp_sub_{vid}.%(ext)s",
        f"https://www.youtube.com/watch?v={vid}"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    combined = ((r.stdout or "") + "\n" + (r.stderr or "")).lower()

    if "members-only" in combined or "join this channel" in combined:
        raise RuntimeError("MEMBERS_ONLY")
    if "429" in combined or "too many requests" in combined or "sign in to confirm" in combined:
        raise RuntimeError("RATE_LIMIT")

    files = glob.glob(f"temp_sub_{vid}*.vtt")
    if not files:
        raise RuntimeError("NO_SUB")

    preferred = [f for f in files if "th-orig" in f or ".th" in f]
    segs = parse_vtt(preferred[0] if preferred else files[0])

    for f in glob.glob(f"temp_sub_{vid}*"):
        os.remove(f)

    if not segs:
        raise RuntimeError("EMPTY_SUB")
    return segs


def main():
    os.makedirs("data", exist_ok=True)
    if os.path.exists(DATA_FILE):
        db = json.load(open(DATA_FILE, "r", encoding="utf-8"))
    else:
        db = {"channel": "@ArifSalafi", "updated_at": "", "videos": []}

    existing = {v["id"] for v in db.get("videos", [])}
    print(f"กำลังโหลดรายชื่อคลิปย้อนหลัง {SCAN_VIDEOS} คลิป (มีในระบบแล้ว {len(existing)} คลิป)...", flush=True)
    videos = get_recent_videos(SCAN_VIDEOS)

    count = 0
    for item in videos:
        vid = item.get("id")
        title = item.get("title", "")
        if not vid or vid in existing:
            continue
        if count >= BATCH_LIMIT:
            break
        try:
            print(f"\n[{count + 1}/{BATCH_LIMIT}] {title}...", flush=True)
            segs = fetch_sub_from_yt(vid)
            db["videos"].insert(0, {"id": vid, "title": title, "date": "", "segments": segs})
            db["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            json.dump(db, open(DATA_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            existing.add(vid)
            count += 1
            w = random.randint(20, 30)
            print(f"สำเร็จ ({len(segs)} ช่วง) -> พัก {w} วิ...", flush=True)
            time.sleep(w)
        except Exception as e:
            err = str(e)
            if err == "MEMBERS_ONLY":
                print(f"ข้าม (คลิปสมาชิก): {title}", flush=True)
                continue
            if err == "RATE_LIMIT":
                print("ตรวจพบ Rate Limit — หยุดรอบนี้", flush=True)
                break
            print(f"ข้าม {title}: {err}", flush=True)
            time.sleep(5)

    print(f"\nเสร็จสิ้น: เพิ่ม {count} คลิป (รวม {len(db['videos'])} คลิป)", flush=True)


if __name__ == "__main__":
    main()