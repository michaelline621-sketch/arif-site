import os
import json
import urllib.request
from datetime import datetime, timezone
from youtube_transcript_api import YouTubeTranscriptApi
from google import genai

CHANNEL_HANDLE = "@ArifSalafi"
DATA_FILE = "data/transcripts-index.json"
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

def get_uploads_playlist_id(handle):
    url = f"https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle={handle}&key={YOUTUBE_API_KEY}"
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode())
        return data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

def get_recent_videos(playlist_id, max_results=25):
    url = f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults={max_results}&playlistId={playlist_id}&key={YOUTUBE_API_KEY}"
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode())
        return data.get("items", [])

def merge_short_captions(raw_segments, max_chars=140):
    """รวมซับไตเติ้ลสั้นๆ 2-3 บรรทัดให้เป็นประโยคที่สมบูรณ์ขึ้นเพื่อให้อ่านง่ายและประหยัดโควต้า AI"""
    merged = []
    cur_start = None
    cur_texts = []
    cur_len = 0
    for s in raw_segments:
        txt = s.get("text", "").replace("\n", " ").strip()
        if not txt:
            continue
        if cur_start is None:
            cur_start = round(s["start"])
        cur_texts.append(txt)
        cur_len += len(txt)
        if cur_len >= max_chars:
            merged.append({"t": cur_start, "txt": " ".join(cur_texts)})
            cur_start = None
            cur_texts = []
            cur_len = 0
    if cur_texts:
        merged.append({"t": cur_start, "txt": " ".join(cur_texts)})
    return merged

def proofread_segments_with_gemini(segments, video_title):
    """ใช้ Gemini ช่วยแก้คำผิดจากการถอดเสียงภาษาไทยของ YouTube โดยคงเวลา t เดิมไว้"""
    chunk_size = 60
    cleaned_all = []
    for i in range(0, len(segments), chunk_size):
        chunk = segments[i:i + chunk_size]
        prompt = f"""
คุณคือบรรณาธิการตรวจแก้สคริปต์ภาษาไทยจากคลิปชื่อ "{video_title}" ของช่อง Arif Salafi (เนื้อหาเกี่ยวกับศาสนาอิสลาม ปรัชญา และวิทยาศาสตร์)
จงแก้ไขเฉพาะคำที่สะกดผิดหรือเพี้ยนจากระบบถอดเสียงอัตโนมัติของ YouTube (เช่น คำทับศัพท์อิสลาม อะกีดะฮ์ เตาฮีด อัลกุรอาน หะดีษ ชื่อนักวิทยาศาสตร์ ศัพท์ปรัชญา หรือคำพ้องเสียงที่บริบทเพี้ยน)
กฎเหล็ก:
1. ห้ามเปลี่ยนโครงสร้าง JSON และห้ามเปลี่ยนตัวเลขเวลา "t" เด็ดขาด
2. ห้ามแต่งเติมเนื้อหาใหม่ ให้คงน้ำเสียงและคำพูดเดิมของผู้พูดไว้
3. ส่งกลับเป็น JSON Array รูปแบบเดิมเท่านั้น:
{json.dumps(chunk, ensure_ascii=False)}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        cleaned_chunk = json.loads(response.text)
        cleaned_all.extend(cleaned_chunk)
    return cleaned_all

def main():
    if not YOUTUBE_API_KEY or not GEMINI_API_KEY:
        raise RuntimeError("กรุณาตั้งค่า YOUTUBE_API_KEY และ GEMINI_API_KEY ใน GitHub Secrets")

    os.makedirs("data", exist_ok=True)
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            db = json.load(f)
    else:
        db = {"channel": CHANNEL_HANDLE, "updated_at": "", "videos": []}

    existing_ids = {v["id"] for v in db.get("videos", [])}
    playlist_id = get_uploads_playlist_id(CHANNEL_HANDLE)
    videos = get_recent_videos(playlist_id)

    updated = False
    for item in videos:
        vid = item["snippet"]["resourceId"]["videoId"]
        title = item["snippet"]["title"]
        published = item["snippet"]["publishedAt"][:10]

        if vid in existing_ids:
            continue

        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(vid)
            try:
                transcript = transcript_list.find_transcript(["th"])
            except Exception:
                transcript = transcript_list.find_generated_transcript(["th"])
            raw_transcript = transcript.fetch()
            merged = merge_short_captions(raw_transcript)
            cleaned_segments = proofread_segments_with_gemini(merged, title)

            db["videos"].insert(0, {
                "id": vid,
                "title": title,
                "date": published,
                "segments": cleaned_segments
            })
            updated = True
            print(f"สำเร็จ: {title} ({len(cleaned_segments)} ช่วงเวลา)")
        except Exception as e:
            print(f"ข้ามคลิป {vid} ({title}): {e}")

    if updated:
        db["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
