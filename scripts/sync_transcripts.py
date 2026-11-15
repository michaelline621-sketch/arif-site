import av
_orig_av_open = av.open
def _patched_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)
av.open = _patched_av_open

import os
import sys
import json
import time
import glob
import subprocess
from datetime import datetime, timezone
from faster_whisper import WhisperModel
from google import genai

CHANNEL_URL = "https://www.youtube.com/@ArifSalafi/videos"
DATA_FILE = "data/transcripts-index.json"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
print("กำลังโหลดโมเดล Whisper...")
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

def format_sec(sec):
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

def get_recent_videos(max_results=20):
    cmd = [
        sys.executable, "-m", "yt_dlp", "--flat-playlist", "--dump-single-json",
        "--playlist-end", str(max_results), CHANNEL_URL
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if res.returncode != 0:
        raise RuntimeError(f"ดึงรายชื่อคลิปไม่สำเร็จ: {res.stderr}")
    data = json.loads(res.stdout)
    return data.get("entries", [])

def download_audio(vid):
    for old in glob.glob(f"temp_{vid}*"):
        os.remove(old)
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "-f", "worstaudio[ext=m4a]/worstaudio",
        "-o", f"temp_{vid}.%(ext)s",
        f"https://www.youtube.com/watch?v={vid}"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    files = [f for f in glob.glob(f"temp_{vid}*") if not f.endswith(".part")]
    if not files:
        err_line = [l for l in (res.stderr or "").splitlines() if "ERROR" in l]
        raise RuntimeError(err_line[-1] if err_line else "โหลดเสียงไม่สำเร็จ")
    return files[0]

def transcribe_local_whisper(audio_path):
    try:
        segs_raw, info = whisper_model.transcribe(audio_path, beam_size=5, vad_filter=True)
        total_dur = info.duration or 0
        print(f"  -> ตรวจพบภาษา: {info.language} | ความยาวคลิป: {format_sec(total_dur)}")
        merged = []
        cur_start = None
        cur_texts = []
        last_print = time.time()

        for s in segs_raw:
            txt = s.text.strip()
            if not txt:
                continue

            if time.time() - last_print >= 3:
                pct = f" ({min(100, int((s.end / total_dur) * 100))}%)" if total_dur > 0 else ""
                preview = txt[:32] + "..." if len(txt) > 32 else txt
                print(f"  -> กำลังถอดเสียง [{format_sec(s.end)} / {format_sec(total_dur)}]{pct} : {preview}", flush=True)
                last_print = time.time()

            if cur_start is None:
                cur_start = round(s.start)
            cur_texts.append(txt)
            if len(" ".join(cur_texts)) >= 140:
                merged.append({"t": cur_start, "txt": " ".join(cur_texts)})
                cur_start = None
                cur_texts = []

        if cur_texts and cur_start is not None:
            merged.append({"t": cur_start, "txt": " ".join(cur_texts)})
        print(f"  -> ถอดเสียงครบ 100% ได้ทั้งหมด {len(merged)} ช่วงประโยค", flush=True)
        return merged
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

def proofread_with_gemini(segments, video_title):
    if not client or not segments:
        return segments
    chunk_size = 50
    cleaned_all = []
    total_chunks = (len(segments) + chunk_size - 1) // chunk_size
    for idx, i in enumerate(range(0, len(segments), chunk_size), start=1):
        chunk = segments[i:i + chunk_size]
        print(f"  -> กำลังเกลาคำสะกดด้วย Gemini ชุดที่ {idx}/{total_chunks}...", flush=True)
        prompt = f"แก้คำสะกดที่เพี้ยนจากการถอดเสียงของคลิป '{video_title}' (เช่น ศัพท์อิสลาม ปรัชญา วิทยาศาสตร์) โดยห้ามเปลี่ยนโครงสร้าง JSON และห้ามเปลี่ยนเลขเวลา t:\n{json.dumps(chunk, ensure_ascii=False)}"
        try:
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            cleaned_all.extend(json.loads(response.text))
            time.sleep(2)
        except Exception as e:
            print(f"  -> ข้ามการเกลาชุดที่ {idx} (ใช้ข้อความต้นฉบับแทน): {str(e)[:60]}", flush=True)
            cleaned_all.extend(chunk)
    return cleaned_all

def main():
    os.makedirs("data", exist_ok=True)
    db = json.load(open(DATA_FILE, "r", encoding="utf-8")) if os.path.exists(DATA_FILE) else {"channel": "@ArifSalafi", "updated_at": "", "videos": []}
    existing_ids = {v["id"] for v in db.get("videos", [])}
    print("กำลังโหลดรายชื่อคลิปจากช่อง @ArifSalafi...", flush=True)
    videos = get_recent_videos(20)
    count = 0
    for item in videos:
        vid = item.get("id")
        title = item.get("title", "")
        if not vid or vid in existing_ids:
            continue
        if count >= 3:
            break
        try:
            print(f"\n[คลิปที่ {count + 1}/3] กำลังโหลดเสียง: {title}...", flush=True)
            audio_file = download_audio(vid)
            raw_segs = transcribe_local_whisper(audio_file)
            cleaned = proofread_with_gemini(raw_segs, title)
            db["videos"].insert(0, {"id": vid, "title": title, "date": "", "segments": cleaned})
            db["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            json.dump(db, open(DATA_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            count += 1
            print(f"สำเร็จ: {title} ({len(cleaned)} ประโยค)", flush=True)
        except Exception as e:
            print(f"ข้าม {title}: {e}", flush=True)

if __name__ == "__main__":
    main()