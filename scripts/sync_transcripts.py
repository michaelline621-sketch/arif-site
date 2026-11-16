def fetch_sub_from_yt(vid):
    for old in glob.glob(f"temp_sub_{vid}*"):
        os.remove(old)
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--cookies", COOKIES_FILE,
        "--skip-download",
        "--write-sub", "--write-auto-sub",
        "--sub-langs", "all",
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
        last_line = [l.strip() for l in (r.stderr or r.stdout or "").splitlines() if l.strip()]
        raise RuntimeError(f"NO_SUB ({last_line[-1][:90] if last_line else 'no vtt'})")
    th = [f for f in files if ".th" in f]
    segs = parse_vtt(th[0] if th else files[0])
    for f in glob.glob(f"temp_sub_{vid}*"):
        os.remove(f)
    if not segs:
        raise RuntimeError("EMPTY_SUB")
    return segs