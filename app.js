async function fetchTranscriptsSharded(){const r=await fetch('/data/transcripts-manifest.json');const m=await r.json();const ps=await Promise.all(m.shards.map(u=>fetch('/'+u.replace(/^\/+/, '')).then(x=>x.json())));const d=m.type==='list'?ps.flat():m.type==='wrapped_list'?{...m.meta,[m.list_key]:ps.flat()}:Object.assign({},...ps);return{ok:true,status:200,json:async()=>d};}
/* ARIF SALAFI · หน้าแรก (คลังค้นหา) · อ่านข้อมูลจาก Google Sheet ถ้าตั้ง SHEET_ID ไม่งั้นใช้ข้อมูลสำรอง */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {}, FB = window.SITE_FALLBACK || {};
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { u = String(u || "").trim(); return /^(https?:\/\/|\.?\/?[\w\-\/.%]+$)/i.test(u) ? u : ""; }
  var LOCAL_EP_COVERS = 21;   // ปก ep01-ep21 ของ ON LIFE TIME อยู่ในโฟลเดอร์ images
  var D = {};                 // ข้อมูลที่จัดรูปแล้ว
  var LIB = !!C.SHOW_LIBRARY; // เปิดส่วนห้องสมุดหรือไม่ (ปิดไว้ก่อน)
  if (!LIB) { [].forEach.call(document.querySelectorAll("[data-lib]"), function (el) { el.parentNode.removeChild(el); }); }
  var DEFAULT_SYN = [["พระเจ้า", "อัลลอฮ์", "อัลลอฮ", "god", "ผู้สร้าง"], ["dna", "ดีเอ็นเอ", "รหัสพันธุกรรม", "พันธุกรรม"], ["วิวัฒนาการ", "ดาร์วิน", "evolution", "กำเนิดสปีชีส์"], ["เสรีภาพ", "freedom", "liberty"], ["รับอิสลาม", "เข้ารับอิสลาม", "revert"], ["เงิน", "การเงิน", "บิตคอยน์", "bitcoin", "ลงทุน"], ["ผี", "ซาตาน", "ปีศาจ"], ["เพลง", "ดนตรี", "music"], ["กุรอาน", "อัลกุรอาน", "quran", "คัมภีร์"], ["เลิกนับถือศาสนา", "เอทิสต์", "อเทวนิยม", "atheist", "ไม่เชื่อพระเจ้า"]];
  var DEFAULT_AUTO_TAGS = [
    { p: "เทววิทยา & ศาสนา", kw: "พระเจ้า,อิสลาม,กุรอาน,คัมภีร์,ไบเบิล,ศาสนา,เตาฮีด,ศรัทธา,ผู้สร้าง,อัลลอฮ์,มุสลิม,ซาตาน" },
    { p: "วิทยาศาสตร์ & ธรรมชาติ", kw: "DNA,ดีเอ็นเอ,เซลล์,วิวัฒนาการ,ดาร์วิน,จักรวาล,บิ๊กแบง,ฟิสิกส์,ชีววิทยา,ต้นกำเนิดชีวิต,รหัสพันธุกรรม" },
    { p: "ปรัชญา & ตรรกศาสตร์", kw: "ปรัชญา,ตรรกะ,ตรรกศาสตร์,เสรีภาพ,เหตุผล,จริยธรรม,ความจริง,เสรีนิยม,ศีลธรรม" },
    { p: "การเงิน & ธุรกิจ", kw: "การเงิน,ธุรกิจ,ลงทุน,บิตคอยน์,bitcoin,รายได้,เงินเฟ้อ,เศรษฐกิจ,ทำเงิน" },
    { p: "สุขภาพ & ฟิตเนส", kw: "สุขภาพ,ออกกำลังกาย,ฟิตเนส,โภชนาการ,ลดน้ำหนัก,นอนหลับ,อาหารเสริม" }
  ];

  /* ---------------- อ่านข้อมูล ---------------- */
  function parseCSV(t) {
    var rows = [], row = [], cur = "", q = false, i = 0, c;
    t = String(t || "").replace(/^\uFEFF/, "");
    for (; i < t.length; i++) {
      c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else { q = false; } } else { cur += c; } }
      else if (c === '"') { q = true; }
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") { i++; } row.push(cur); rows.push(row); row = []; cur = ""; }
      else { cur += c; }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ""; }); });
  }
  function sheetId(v) { var m = /\/d\/([A-Za-z0-9_-]+)/.exec(v || ""); return m ? m[1] : String(v || "").trim(); }
  var NEED = { "บทความ": "หัวข้อ", "เรื่องเล่า": "เส้นทาง", "รายการ": "ชื่อรายการ", "ตอน": "ชื่อตอน", "ซีรีส์": "ชื่อซีรีส์", "ตอนซีรีส์": "ซีรีส์", "คลิปสั้น": "คำถาม", "หนังสือ": "ชื่อหนังสือ", "ตั้งค่า": "ชื่อ", "ยอดนิยม": "ประเภท", "จุดตอบ": "คำถาม", "เส้นทาง": "เส้นทาง", "แขกรับเชิญ": "ชื่อที่ใช้แสดง", "คำพ้อง": "กลุ่มคำพ้อง", "หมวดอัตโนมัติ": "หมวด" };
  var OPTIONAL = { "ตอนซีรีส์": 1, "ยอดนิยม": 1, "จุดตอบ": 1, "เส้นทาง": 1, "เรื่องเล่า": 1, "บทความ": 1, "แขกรับเชิญ": 1, "คำพ้อง": 1, "หมวดอัตโนมัติ": 1 };
  function fetchTab(id, tab) {
    var url = "https://docs.google.com/spreadsheets/d/" + id + "/gviz/tq?tqx=out:csv&headers=1&sheet=" + encodeURIComponent(tab);
    var ctrl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, 12000);
    return fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined }).then(function (r) { clearTimeout(to); if (!r.ok) { throw new Error("http"); } return r.text(); })
      .then(function (t) {
        var rows = parseCSV(t), h = -1, i;
        // แท็บที่ทุกคอลัมน์เป็นข้อความ (เช่น ตั้งค่า) Google อาจเดาหัวตารางผิด เลยมีแถวว่างนำหน้า: หาแถวหัวตารางใน 3 แถวแรก
        for (i = 0; i < Math.min(3, rows.length); i++) { if (findCol(rows[i], NEED[tab]) >= 0) { h = i; break; } }
        if (h < 0) { throw new Error("no-tab"); }
        return h ? rows.slice(h) : rows;
      });
  }
  function mergeAnswerFallback(live, fallback) {
    if (!fallback || fallback.length < 2) { return live || []; }
    if (!live || live.length < 2) { return fallback; }
    var li = findCol(live[0], "รหัสวิดีโอ"), ltime = findCol(live[0], "เวลาเริ่ม"), ls = findCol(live[0], "สรุปสั้น"), ltopic = findCol(live[0], "หัวข้อ");
    var fi = findCol(fallback[0], "รหัสวิดีโอ"), ftime = findCol(fallback[0], "เวลาเริ่ม"), fs = findCol(fallback[0], "สรุปสั้น"), ftopic = findCol(fallback[0], "หัวข้อ");
    if ([li, ltime, ls, fi, ftime, fs].some(function (i) { return i < 0; })) { return live; }
    var source = live;
    if (ltopic < 0 && ftopic >= 0) {
      source = live.map(function (row, index) { var copy = row.slice(); copy.push(index ? "" : fallback[0][ftopic]); return copy; });
      ltopic = source[0].length - 1;
    }
    function key(row, id, t) { return [row[id], row[t]].map(function (v) { return String(v == null ? "" : v).trim(); }).join("¦"); }
    var byKey = Object.create(null);
    for (var i = 1; i < fallback.length; i++) {
      var fk = key(fallback[i], fi, ftime);
      if (fk) { byKey[fk] = { summary: fallback[i][fs], topics: ftopic >= 0 ? fallback[i][ftopic] : "" }; }
    }
    return source.map(function (row, index) {
      if (!index) { return row; }
      var copy = row.slice(), k = key(row, li, ltime), fallbackRow = byKey[k];
      if (fallbackRow && !String(copy[ls] || "").trim() && fallbackRow.summary) { copy[ls] = fallbackRow.summary; }
      if (fallbackRow && ltopic >= 0 && !String(copy[ltopic] || "").trim() && fallbackRow.topics) { copy[ltopic] = fallbackRow.topics; }
      return copy;
    });
  }
  function loadAll() {
    var id = sheetId(C.SHEET_ID), tabs = Object.keys(NEED);
    if (!id) { return Promise.resolve({ raw: FB, live: false }); }
    return Promise.all(tabs.map(function (t) { return fetchTab(id, t).then(function (r) { return [t, r]; }, function () { return [t, null]; }); })).then(function (list) {
      var raw = {}, ok = 0;
      list.forEach(function (p) { if (p[1]) { raw[p[0]] = p[0] === "จุดตอบ" ? mergeAnswerFallback(p[1], FB[p[0]]) : p[1]; ok++; } else { raw[p[0]] = OPTIONAL[p[0]] ? ((p[0] === "จุดตอบ" || p[0] === "เส้นทาง") ? (FB[p[0]] || []) : []) : (FB[p[0]] || []); } });
      return { raw: raw, live: ok > 0 };
    });
  }
  function findCol(head, name) {
    var i; for (i = 0; i < head.length; i++) { if (String(head[i]).trim() === name) { return i; } }
    for (i = 0; i < head.length; i++) { if (String(head[i]).trim().indexOf(name) === 0) { return i; } }
    return -1;
  }
  function table(rows, names) {
    if (!rows || rows.length < 2) { return []; }
    var head = rows[0], idx = {}, out = [];
    Object.keys(names).forEach(function (k) { idx[k] = findCol(head, names[k]); });
    for (var r = 1; r < rows.length; r++) {
      var o = {}; Object.keys(idx).forEach(function (k) { o[k] = idx[k] >= 0 ? String(rows[r][idx[k]] == null ? "" : rows[r][idx[k]]).trim() : ""; });
      out.push(o);
    }
    return out;
  }
  function ytId(v) {
    v = String(v || "").trim(); if (/^[A-Za-z0-9_-]{11}$/.test(v)) { return v; }
    var m = /[?&]v=([A-Za-z0-9_-]{11})/.exec(v) || /youtu\.be\/([A-Za-z0-9_-]{11})/.exec(v) || /\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/.exec(v);
    return m ? m[1] : "";
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function days(date) { var t = Date.parse(date); return isNaN(t) ? 1e9 : (Date.now() - t) / 86400000; }
  function split(s) { return String(s || "").split(/[,،;]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function splitQ(s) { return String(s || "").split(/[;\n]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  // "12:30" หรือ "1:02:30" หรือตัวเลขวินาที -> วินาที (ไม่ถูกต้อง = 0)
  function parseClock(v) {
    v = String(v == null ? "" : v).trim();
    var m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(v);
    if (m) { return (+m[1] || 0) * 3600 + (+m[2]) * 60 + (+m[3]); }
    return /^\d{1,6}$/.test(v) ? +v : 0;
  }
  function fmtClock(sec) { var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ":" + pad(m) : "" + m) + ":" + pad(s); }

  function build(raw) {
    var S = {}; table(raw["ตั้งค่า"], { k: "ชื่อ", v: "ค่า" }).forEach(function (r) { if (r.k) { S[r.k] = r.v; } });
    D.S = S; D.newDays = parseInt(S["จำนวนวันที่ขึ้นป้าย NEW"], 10) || 14;
    D.programs = table(raw["รายการ"], { n: "ลำดับ", name: "ชื่อรายการ", label: "ป้าย", desc: "คำอธิบาย", pl: "ลิงก์เพลย์ลิสต์", cover: "รูปปก", hide: "แสดงบนเว็บ" })
      .filter(function (p) { return p.name && p.hide !== "ไม่"; }).sort(function (a, b) { return (parseInt(a.n, 10) || 99) - (parseInt(b.n, 10) || 99); });
    var firstProg = D.programs.length ? D.programs[0].name : "ON LIFE TIME";
    D.eps = table(raw["ตอน"], { n: "ตอนที่", title: "ชื่อตอน", id: "รหัสวิดีโอ", cover: "รูปปก", date: "วันที่ลง", program: "รายการ", topics: "หัวข้อ", qs: "คำถามที่ตอบ", sum: "สรุป", ss: "สถานะสรุป" })
      .filter(function (e) { return e.title; }).map(function (e) {
        e.k = "ep"; e.num = parseInt(e.n, 10) || 0; e.id = ytId(e.id); e.programs = String(e.program || "").split(/[,;|]/).map(function (x) { return x.trim(); }).filter(Boolean); e.program = e.programs[0] || firstProg; if (!e.programs.length) { e.programs = [e.program]; } e.qs = splitQ(e.qs); e.summary = /ตรวจแล้ว/.test(e.ss) ? e.sum : "";
        e.img = safeUrl(e.cover) || (e.program === firstProg && e.num >= 1 && e.num <= LOCAL_EP_COVERS ? "images/ep" + pad(e.num) + ".jpg" : "");
        e.yt = e.id ? "https://www.youtube.com/watch?v=" + e.id : ""; e.isNew = days(e.date) <= D.newDays; return e;
      });
    D.sep = table(raw["ตอนซีรีส์"], { series: "ซีรีส์", n: "ตอนที่", title: "ชื่อตอน", id: "รหัสวิดีโอ", cover: "รูปปก", date: "วันที่ลง" })
      .filter(function (e) { return e.title && e.series; }).map(function (e) { e.k = "sep"; e.num = parseInt(e.n, 10) || 0; e.id = ytId(e.id); e.img = safeUrl(e.cover); e.yt = e.id ? "https://www.youtube.com/watch?v=" + e.id : ""; e.isNew = days(e.date) <= D.newDays; return e; });
    var cnt = {}; D.sep.forEach(function (e) { cnt[e.series] = (cnt[e.series] || 0) + 1; });
    D.series = table(raw["ซีรีส์"], { shelf: "ชั้นวาง", title: "ชื่อซีรีส์", count: "จำนวนตอน", tag: "ประโยคโปรย", badge: "ป้าย", pillar: "เสาหลัก", level: "ระดับ", syn: "เรื่องย่อ", pl: "ลิงก์เพลย์ลิสต์", locked: "เฉพาะ INSIDER", topics: "หัวข้อ" })
      .filter(function (s) { return s.title; }).map(function (s) {
        s.k = "series"; s.level = parseInt(s.level, 10) || 2; s.url = safeUrl(s.pl); s.soon = !s.url || /ใช่/.test(s.locked);
        if (cnt[s.title]) { s.count = cnt[s.title] + " ตอน"; } return s;
      });
    D.shorts = table(raw["คลิปสั้น"], { q: "คำถาม", cat: "หมวด", url: "ลิงก์คลิป", cover: "ปก", tags: "คำค้น", date: "วันที่ลง", hot: "ยอดฮิต", sum: "สรุป", desc: "คำบรรยาย", ss: "สถานะสรุป", pin: "ปักหมุด", qs: "คำถามที่ตอบ" })
      .filter(function (s) { return s.q; }).map(function (s) {
        s.k = "short"; s.id = ytId(s.url); s.img = safeUrl(s.cover) || (s.id ? "yt:" + s.id : ""); s.isNew = days(s.date) <= D.newDays; s.qs = splitQ(s.qs); s.pinned = /ใช่/.test(s.pin); s.summary = /ตรวจแล้ว/.test(s.ss) ? (s.sum || s.desc) : ""; return s;
      });
    var rank = {}; table(raw["ยอดนิยม"], { type: "ประเภท", r: "อันดับ", id: "รหัสวิดีโอ", gain: "ยอดดูเพิ่ม" }).forEach(function (r) { if (r.type === "คลิปสั้น" && r.id) { rank[r.id] = parseInt(r.r, 10) || 99; } });
    D.shorts.sort(function (a, b) { var ra = rank[a.id] || 999, rb = rank[b.id] || 999; if (ra !== rb) { return ra - rb; } return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0); });
    D.shorts.forEach(function (s) { s.hotRank = rank[s.id] || 0; });
    D.books = table(raw["หนังสือ"], { cat: "หมวด", ct: "ชื่อบนปก", cs: "ชื่อรองบนปก", title: "ชื่อหนังสือ", sub: "ชื่อรอง", blurb: "คำโปรย", link: "ลิงก์", status: "สถานะ", form: "ลิงก์ฟอร์มรายชื่อ", cover: "รูปปก", topics: "หัวข้อ" })
      .filter(function (b) { return b.title; }).map(function (b) { b.k = "book"; b.free = /อ่านฟรี/.test(b.status); b.url = safeUrl(b.link) || (/Waitlist|Pre-order/i.test(b.status) ? safeUrl(b.form) : ""); b.img = safeUrl(b.cover); return b; });

    // ชื่อของวิดีโอจากรหัส ใช้บอกที่มาของจุดตอบ
    var titleOf = {};
    D.eps.concat(D.sep).forEach(function (e) { if (e.id && !titleOf[e.id]) { titleOf[e.id] = e.title; } });
    D.shorts.forEach(function (s) { if (s.id && !titleOf[s.id]) { titleOf[s.id] = s.q; } });
    D.titleOf = titleOf;
    D.shortIds = {}; D.shorts.forEach(function (s) { if (s.id) { D.shortIds[s.id] = 1; } });
    // จุดตอบ: คำถาม + รหัสวิดีโอ + นาทีที่เริ่ม (ข้ามแถวสถานะ ซ่อน / รอตรวจ)
    D.answers = table(raw["จุดตอบ"], { q: "คำถาม", id: "รหัสวิดีโอ", t: "เวลาเริ่ม", sum: "สรุปสั้น", topics: "หัวข้อ", src: "ที่มา", st: "สถานะ", pin: "ปักหมุด" })
      .filter(function (a) { return a.q && ytId(a.id) && !/ซ่อน|รอตรวจ/.test(a.st); })
      .map(function (a) {
        a.k = "ans"; a.id = ytId(a.id); a.sec = parseClock(a.t); a.tl = splitQ(a.topics.replace(/,/g, ";"));
        a.srcTitle = a.src || titleOf[a.id] || ""; a.pinned = /ใช่/.test(a.pin); a.summary = a.sum; return a;
      });
    // เส้นทางเรียนรู้ (แท็บ เส้นทาง): แต่ละเส้นทางคือประตูบนหน้าแรก ข้อในเส้นทางเรียงตามลำดับ ถ้าไม่ใส่สรุป จะดึงสรุปจากจุดตอบที่รหัสวิดีโอและเวลาตรงกัน
    var sumBy = {}; D.answers.forEach(function (a) { if (a.summary) { sumBy[a.id + "|" + a.sec] = a.summary; } });
    var pmap = {}, plst = [];
    table(raw["เส้นทาง"], { title: "เส้นทาง", n: "ลำดับ", q: "คำถาม", id: "รหัสวิดีโอ", t: "เวลาเริ่ม", sum: "สรุป", ser: "ซีรีส์แนะนำ", door: "ประตู", end: "จบที่", short: "คลิปสั้น", grp: "ช่วง", pimg: "ภาพประตู", pdesc: "คำอธิบายเส้นทาง", sum2: "คำอธิบายคลิป" }).forEach(function (r, i) {
      var lid = ytId(r.id), shid = ytId(r.short), id = lid || shid; if (!r.title || !r.q || !id) { return; }   // ไม่ใส่รหัสวิดีโอ แต่ใส่คลิปสั้น = ข้อที่เป็นคลิปสั้นล้วน
      if (!pmap[r.title]) { pmap[r.title] = { title: r.title, steps: [], serNames: [], door: r.door !== "ไม่", img: "", desc: "" }; plst.push(pmap[r.title]); }
      if (!pmap[r.title].img && r.pimg) { pmap[r.title].img = safeUrl(r.pimg) || ""; } if (!pmap[r.title].desc && r.pdesc) { pmap[r.title].desc = String(r.pdesc).trim(); }
      String(r.ser || "").split(/[;|\n]/).forEach(function (nm) { nm = nm.trim(); if (nm && pmap[r.title].serNames.indexOf(nm) < 0) { pmap[r.title].serNames.push(nm); } });
      var only = !lid, sec = only ? 0 : parseClock(r.t); pmap[r.title].steps.push({ q: r.q, id: id, only: only, sec: sec, end: only ? 0 : parseClock(r.end), short: shid, group: String(r.grp || "").trim(), sum: r.sum || r.sum2 || (only ? "" : sumBy[id + "|" + sec]) || "", n: parseInt(r.n, 10) || (i + 1) });
    });
    plst.forEach(function (p) { p.steps.sort(function (a, b) { return a.n - b.n; }); });
    // จบช่วง: ใช้ค่าในช่อง จบที่ ของชีตถ้ามี ไม่งั้นใช้เวลาเริ่มของคำตอบถัดไปในคลิปเดียวกัน (ห่างอย่างน้อย 20 วินาที) ถ้าไม่มี = เล่นต่อจนจบคลิป
    var secsBy = {}; D.answers.forEach(function (a) { (secsBy[a.id] = secsBy[a.id] || []).push(a.sec); });
    Object.keys(secsBy).forEach(function (k) { secsBy[k].sort(function (a, b) { return a - b; }); });
    plst.forEach(function (p) { p.steps.forEach(function (st) {
      if (st.only || st.end > st.sec) { return; }
      st.end = 0; var arr = secsBy[st.id] || [];
      for (var k = 0; k < arr.length; k++) { if (arr[k] >= st.sec + 20) { st.end = arr[k]; break; } }
    }); });
    D.paths = plst.filter(function (p) { return p.steps.length; });
    // ซีรีส์แนะนำท้ายเส้นทาง: จับชื่อกับแท็บ ซีรีส์ (ชื่อตรงกัน ไม่สนตัวพิมพ์เล็กใหญ่) ชื่อที่ไม่เจอข้ามไป
    D.paths.forEach(function (p) { p.series = p.serNames.map(function (nm) { var k = nm.toLowerCase(); return D.series.filter(function (x) { return String(x.title).trim().toLowerCase() === k; })[0]; }).filter(Boolean); });
    // ผู้ร่วมทาง (แท็บ แขกรับเชิญ): แสดงเฉพาะแถวที่ช่อง ยินยอมแสดง = ใช่ เท่านั้น ถ้าเจ้าตัวถอน ตั้งเป็น ไม่ แล้วหายทันที
    D.guests = table(raw["แขกรับเชิญ"], { name: "ชื่อที่ใช้แสดง", bg: "พื้นเพ", q: "คำถามที่พามา", id: "รหัสวิดีโอ", t: "เวลาเริ่ม", paths: "เส้นทาง", ok: "ยินยอมแสดง" })
      .filter(function (g) { return g.name && String(g.ok || "").trim() === "ใช่" && ytId(g.id); })
      .map(function (g) { g.id = ytId(g.id); g.sec = parseClock(g.t); g.pathList = String(g.paths || "").split(/[;|]/).map(function (x) { return x.trim(); }).filter(Boolean); return g; });
    // เรื่องเล่า (ไม่บังคับ): ข้อความเล่าเรื่องแทรกระหว่างคลิป หนึ่งแถว = หนึ่งย่อหน้า แถวที่ช่อง แสดง = ไม่ จะไม่ขึ้น
    D.story = table(raw["เรื่องเล่า"], { pathName: "เส้นทาง", ch: "ช่วง", n: "ลำดับ", kind: "ชนิด", text: "เนื้อหา", show: "แสดง" })
      .map(function (r, ix) { r._ix = ix; return r; })
      .filter(function (r) { return tr(r.pathName) && tr(r.text) && tr(r.show) !== "ไม่"; })
      .sort(function (a, b) { return (parseFloat(a.n) || 0) - (parseFloat(b.n) || 0) || a._ix - b._ix; })
      .map(function (r) { r.pathName = tr(r.pathName); r.text = String(r.text).trim(); return r; });
    // บทความ (ไม่บังคับ): หนึ่งแถว = หนึ่งบทความ แถวที่ช่อง แสดง = ไม่ จะไม่ขึ้น เรียงใหม่สุดก่อน
    var covUsed = {};
    D.articles = table(raw["บทความ"], { title: "หัวข้อ", cat: "หมวด", sum: "สรุป", body: "เนื้อหา", date: "วันที่", by: "ผู้เขียน", vid: "รหัสวิดีโอ", t: "เวลาเริ่ม", img: "ภาพปก", show: "แสดง" })
      .filter(function (r) { return tr(r.title) && tr(r.body) && tr(r.show) !== "ไม่"; })
      .map(function (r, ix) {
        var plain = artPlain(r.body), cv = artImg(r, covUsed), dt = Date.parse(r.date) ? r.date : (cv.d || r.date);
        return { title: tr(r.title), key: tr(r.title), cat: artClean(r.cat), sum: artClean(r.sum), body: String(r.body), date: tr(dt), dateTxt: artDate(dt), by: tr(r.by), vid: ytId(r.vid), sec: parseClock(r.t), img: cv.img, lead: artLead(r.body, r.title, 170), len: plain.length, read: Math.max(1, Math.round(plain.length / 600)), _t: Date.parse(dt) || 0, _ix: ix };
      })
      .sort(function (a, b) { return b._t - a._t || a._ix - b._ix; });
    (function () { var seen = {}; D.articles.forEach(function (a) { var n = seen[a.title] = (seen[a.title] || 0) + 1; if (n > 1) { a.key = a.title + " (" + n + ")"; } }); })();   // ชื่อซ้ำกัน: ลิงก์ไม่ชนกัน
    var syn = table(raw["คำพ้อง"], { g: "กลุ่มคำพ้อง" }).map(function (r) { return split(r.g).map(function (w) { return w.toLowerCase(); }); }).filter(function (g) { return g.length > 1; });
    D.syn = syn.length ? syn : DEFAULT_SYN;
    D.autoRules = table(raw["หมวดอัตโนมัติ"], { p: "หมวด", kw: "คำสำคัญ" }).filter(function (r) { return r.p && r.kw; }).map(function (r) { return { p: r.p, kw: split(r.kw).map(function (w) { return norm(w); }).filter(Boolean) }; });
    if (!D.autoRules.length) { D.autoRules = DEFAULT_AUTO_TAGS.map(function (r) { return { p: r.p, kw: split(r.kw).map(function (w) { return norm(w); }) }; }); }
    D.articles.forEach(function (x) { if (!x.cat) { x.cat = artAutoCat(x); } });   // หมวดบทความที่ว่างหรือเป็น [merged] ให้จัดอัตโนมัติจากคำสำคัญ

    // หมวดทั้งหมดอ่านจากชีต ไม่จำกัดจำนวน
    var seenP = {}, plist = [];
    function addP(p) { p = String(p || "").trim(); if (p && !seenP[p]) { seenP[p] = 1; plist.push(p); } }
    D.series.forEach(function (s) { addP(s.pillar); }); D.shorts.forEach(function (s) { addP(s.cat); }); D.autoRules.forEach(function (r) { addP(r.p); });
    var order = split(S["ลำดับหมวด"]);
    if (order.length) { plist = order.filter(function (p) { return seenP[p]; }).concat(plist.filter(function (p) { return order.indexOf(p) < 0; })); }
    D.pillars = plist;
    D.lib = [];
  }

  /* ---------------- ภาพและการ์ด ---------------- */
  window.arifThumbFix = function (img) {
    var id = img.getAttribute("data-yt"); if (!id || img.getAttribute("data-fb")) { return; }
    if (img.naturalWidth > 120) { return; }
    img.setAttribute("data-fb", "1"); img.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
  };
  function ytImg(id, cls) { return '<img class="' + (cls || "") + '" loading="lazy" decoding="async" alt="" data-yt="' + esc(id) + '" src="https://i.ytimg.com/vi/' + esc(id) + '/maxresdefault.jpg" onload="arifThumbFix(this)" onerror="arifThumbFix(this)">'; }
  function imgTag(item) {
    if (item.img && item.img.indexOf("yt:") === 0) { return ytImg(item.img.slice(3)); }
    if (item.img) { return '<img loading="lazy" decoding="async" alt="" src="' + esc(item.img) + '">'; }
    if (item.id) { return ytImg(item.id); }
    return "";
  }
  var YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8ZM10 15V9l5.2 3L10 15Z"/></svg>';
  var PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M1 0l10 6-10 6z"/></svg>';
  var CH = { p: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', n: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' };
  var REG = {};   // รายการที่เปิดเล่นได้ กดด้วย data-play

  function epCard(e, key) {
    REG[key] = e;
    return '<li><div class="epc"><button class="th" type="button" data-play="' + key + '" aria-label="เล่นตอน ' + esc(e.title) + '">' + imgTag(e) +
      (e.num ? '<span class="no">EP ' + e.num + "</span>" : "") + (e.isNew ? '<span class="nw2">NEW</span>' : "") + '</button>' +
      '<h3>' + esc(e.title) + '</h3>' + (e.series ? '<p class="sub">' + esc(e.series) + "</p>" : (e.program ? '<p class="sub">' + esc(e.program) + "</p>" : "")) +
      (e.yt ? '<a class="yt" href="' + esc(e.yt) + '" target="_blank" rel="noopener">' + YT + 'ดูบน YouTube ↗</a>' : "") + '</div></li>';
  }
  function srCard(s) {
    var meta = '<div class="meta">' + (s.count ? "<span>" + esc(s.count) + "</span>" : "") + (s.pillar ? "<span>" + esc(s.pillar) + "</span>" : "") + (s.badge ? "<span>" + esc(s.badge) + "</span>" : "") + "</div>";
    return '<li style="display:flex"><div class="src"><h3>' + esc(s.title) + "</h3>" + (s.tag ? "<p>" + esc(s.tag) + "</p>" : "") + meta +
      (s.soon ? '<span class="soon" style="display:inline-block;margin-top:8px">เร็ว ๆ นี้</span>' : '<a class="yt" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + YT + 'เปิดเพลย์ลิสต์ ↗</a>') + "</div></li>";
  }
  function shCard(s, key) {
    REG[key] = s;
    var inner = '<span class="top"><span class="cat">' + esc(s.cat || "คลิปสั้น") + "</span>" + (s.hotRank && s.hotRank <= 3 ? '<span class="hot">ยอดนิยม</span>' : (s.isNew ? '<span class="nw">NEW</span>' : "")) + "</span>" +
      '<span class="q">' + esc(s.q) + '</span><span class="foot">' + (s.id || s.url ? '<span class="pl">' + PLAY + "</span>ดูคำตอบ" : "เร็ว ๆ นี้") + "</span>";
    return '<li><div class="shw"><button class="sc' + (s.img ? "" : " sc-placeholder") + '" type="button" data-play="' + key + '"' + (s.id || s.url ? "" : ' aria-disabled="true"') + ' aria-label="ดูคลิป ' + esc(s.q) + '">' + imgTag(s) + inner + "</button></div></li>";
  }
  function bkCard(b) {
    var cover = b.img ? '<img alt="" loading="lazy" src="' + esc(b.img) + '">' : '<span class="t">' + esc(b.ct || b.title) + '</span><span class="a">' + esc(b.cs || b.sub) + "</span>";
    var tag = b.free ? '<span class="bst free">อ่านฟรี</span>' : (b.status ? '<span class="bst">' + esc(b.status) + "</span>" : "");
    var inner = '<div class="bc' + (b.free && b.img ? " sq" : "") + '"' + (b.free && b.img ? ' style="--c:url(' + esc(b.img) + ')"' : "") + ">" + tag + (b.free && b.img ? "<i></i>" : cover) + '</div><p class="bt">' + esc(b.title) + '</p>';
    return '<li><div class="bw">' + (b.url ? '<a class="bk" href="' + esc(b.url) + '" target="_blank" rel="noopener">' + inner + "</a>" : '<div class="bk">' + inner + "</div>") + '<p class="bsm">' + esc(b.cat || "") + "</p></div></li>";
  }
  function libCard(b, i) {
    var img = b.img ? '<img alt="" loading="lazy" src="' + esc(b.img) + '">' : '<span class="t">' + esc(b.t) + '</span><span class="a">' + esc(String(b.a || "").split(",")[0]) + "</span>";
    return '<li><div class="lw"><a class="bk" href="library/?book=' + encodeURIComponent(b.id) + '"><div class="bc" style="background:' + ["#4a1712", "#33201f", "#3a1d1a", "#2a1515"][i % 4] + '">' + img + '</div><p class="bt">' + esc(b.t) + '</p></a><p class="bsm">' + esc(b.c || "") + "</p></div></li>";
  }
  /* กลุ่มหัวข้อ (ไอคอนประจำกลุ่ม) ปรับได้ที่ TOPIC_FAMILIES ใน config.js
     หัวข้อที่ไม่อยู่ในกลุ่มใดจะรวมไปอยู่กลุ่มสุดท้ายอัตโนมัติ */
  var FAM_SVG = function (p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + "</svg>"; };
  var FAM_ICON = {
    moon: FAM_SVG('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
    scale: FAM_SVG('<path d="M12 3v18M6 21h12M4 7h16M4 7l-2.5 6a3.5 3.5 0 0 0 5 0zM20 7l-2.5 6a3.5 3.5 0 0 0 5 0z"/>'),
    atom: FAM_SVG('<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>'),
    book: FAM_SVG('<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>'),
    users: FAM_SVG('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6 6 0 0 1 21.5 20"/>'),
    mic: FAM_SVG('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>')
  };
  var DEFAULT_FAM = [
    { name: "ศาสนาและความเชื่อ", icon: "moon", topics: ["อิสลามและหลักศรัทธา", "หลักปฏิบัติและข้อวินิจฉัยอิสลาม", "การรับอิสลามและมุสลิมใหม่", "ศาสนาเปรียบเทียบ", "วัฒนธรรมและความเชื่อพื้นบ้าน"] },
    { name: "พิสูจน์พระเจ้าและเหตุผล", icon: "scale", topics: ["การพิสูจน์พระเจ้า", "ปรัชญาและตรรกศาสตร์"] },
    { name: "วิทยาศาสตร์", icon: "atom", topics: ["วิวัฒนาการและต้นกำเนิดชีวิต", "วิทยาศาสตร์และจักรวาล", "สุขภาพและการแพทย์"] },
    { name: "คัมภีร์และประวัติศาสตร์", icon: "book", topics: ["อัลกุรอานและคัมภีร์", "ประวัติศาสตร์และบุคคลสำคัญ"] },
    { name: "ชีวิตและสังคม", icon: "users", topics: ["จริยธรรมและสังคม", "พัฒนาตนเองและการใช้ชีวิต", "ครอบครัวและความสัมพันธ์", "การเงินและธุรกิจฮาลาล", "เสรีภาพและสิทธิมนุษยชน", "การเมืองและสถานการณ์โลก", "สื่อ เทคโนโลยี และวัฒนธรรมร่วมสมัย"] },
    { name: "รายการและอื่น ๆ", icon: "mic", topics: ["รายการและเบื้องหลัง", "อื่น ๆ", "อื่นๆ"] }
  ];
  function famBuild(topics) {
    var src = (C.TOPIC_FAMILIES && C.TOPIC_FAMILIES.length) ? C.TOPIC_FAMILIES : DEFAULT_FAM, seen = {};
    var fams = src.map(function (f) {
      var ts = (f.topics || []).filter(function (t) { return topics.indexOf(t) >= 0; }); ts.forEach(function (t) { seen[t] = 1; });
      return { name: f.name, icon: FAM_ICON[f.icon] || "", topics: ts };
    });
    var left = topics.filter(function (t) { return !seen[t]; });
    if (left.length && fams.length) { fams[fams.length - 1].topics = fams[fams.length - 1].topics.concat(left); }
    fams.forEach(function (f) { f.topics.sort(function (x, y) { return topics.indexOf(x) - topics.indexOf(y); }); });
    return fams.filter(function (f) { return f.topics.length; });
  }
  /* คำตอบที่ควรขึ้นหน้าแรก: ตัดช่วงเปิดรายการ/โฆษณา/เบื้องหลัง ชื่อสั้นหรือยาวเกินไป */
  var ANS_JUNK = /^(เปิดรายการ|เข้ารายการ|เริ่ม|โฆษณา|ไฮไลต์|ปิดรายการ|ปิด|ขอบคุณ)/;
  function ansGood(a) {
    var q = String(a.q || "");
    return a.sec >= 120 && !ANS_JUNK.test(q) && q.length >= 10 && q.length <= 80 && !(a.tl[0] && ["รายการและเบื้องหลัง", "อื่น ๆ", "อื่นๆ"].indexOf(a.tl[0]) >= 0);
  }
  function ansCard(a, key, topic) {
    REG[key] = a;
    var tags = a.tl.filter(function (t) { return t !== topic; }).slice(0, topic ? 1 : 2);
    return '<button class="acard" type="button" data-play="' + key + '"><b class="tm">' + PLAY + fmtClock(a.sec) + "</b><h3>" + esc(a.q) + "</h3>" + (a.sum ? "<p>" + esc(a.sum) + "</p>" : "") +
      (a.srcTitle ? '<span class="asrc">' + YT + "<i>" + esc(a.srcTitle) + "</i></span>" : "") +
      tags.map(function (t) { return '<span class="atag">' + (topic ? "+ " : "") + esc(t) + "</span>"; }).join("") + "</button>";
  }
  function car(html, cls) { return '<ul class="row ' + (cls || "") + '">' + html + '</ul><button type="button" class="cb p" aria-label="ก่อนหน้า" hidden>' + CH.p + '</button><button type="button" class="cb n" aria-label="ถัดไป" hidden>' + CH.n + "</button>"; }
  function initCar(el) {
    var u = el.querySelector(".row"), p = el.querySelector(".cb.p"), n = el.querySelector(".cb.n");
    if (!u || !p) { return; }
    function upd() { p.hidden = u.scrollLeft < 8; n.hidden = u.scrollLeft + u.clientWidth >= u.scrollWidth - 8; }
    p.onclick = function () { u.scrollBy({ left: -Math.max(200, u.clientWidth * 0.8), behavior: "smooth" }); };
    n.onclick = function () { u.scrollBy({ left: Math.max(200, u.clientWidth * 0.8), behavior: "smooth" }); };
    u.addEventListener("scroll", upd, { passive: true }); window.addEventListener("resize", upd); upd(); setTimeout(upd, 300);
  }

  /* ---------------- หน้าแรก ---------------- */
  var SHPIL = "", SRPIL = "", SR_LIMIT = 8, srAll = false;
  function drawHero() {
    var perProg = {}; D.eps.forEach(function (e) { e.programs.forEach(function (pn) { perProg[pn] = (perProg[pn] || 0) + 1; }); });
    var progs = D.programs.filter(function (p) { return perProg[p.name]; });
    var st = "";
    if (D.eps.length) { st += "<li><b>" + D.eps.length + "</b>ตอน</li>"; }
    if (D.shorts.length) { st += "<li><b>" + D.shorts.length + "</b>คลิปสั้น</li>"; }
    if (D.answers.length) { st += "<li><b>" + D.answers.length + "</b>คำถามที่ตอบแล้ว</li>"; }
    if (LIB) { st += '<li id="stLib" hidden><b>0</b>เล่มในห้องสมุด</li>'; }
    $("hxStats").innerHTML = st;
    // ป้ายคำถามลอย: กดแล้วเล่นคลิปนั้นทันที เลือก 6 กล่อง = ปักหมุด 3 + ยอดนิยมประจำสัปดาห์ 2 + สุ่ม 1
    // ถ้าปักหมุดหรือยอดนิยมไม่ครบ เติมจากที่เหลือ พยายามไม่ให้ซ้ำหมวดเดียวกัน สุ่มชุดใหม่ทุกครั้งที่เปิดหน้า (ชุดเดิมตลอดรอบเดียวกัน)
    function shuffle(arr) { var a2 = arr.slice(), i, j, t; for (i = a2.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a2[i]; a2[i] = a2[j]; a2[j] = t; } return a2; }
    function clip(t) { t = String(t || "").replace(/#\S+/g, "").replace(/\s+/g, " ").trim(); return t.length > 60 ? t.slice(0, 58).trim() + "…" : t; }
    if (!D.heroPick) {
      var pool = [];
      var goodAns = D.answers.filter(function (x) { return x.pinned || ansGood(x); }); if (goodAns.length < 6) { goodAns = D.answers; }
      goodAns.forEach(function (x) { pool.push({ t: x.q, ref: x, cat: "", pin: x.pinned, hot: 0 }); });
      D.shorts.forEach(function (s) { if (s.id) { pool.push({ t: s.qs[0] || s.q, ref: s, cat: s.cat, pin: s.pinned, hot: s.hotRank || 0 }); } });
      if (!pool.length) { D.eps.forEach(function (x) { if (x.id) { pool.push({ t: x.title, ref: x, cat: x.program, pin: false, hot: 0 }); } }); }
      var chosen = [], seenT = {}, usedCat = {};
      function take(list, n, kind) {
        for (var i = 0; i < list.length && n > 0 && chosen.length < 6; i++) {
          var it = list[i], key = it.t; if (seenT[key] || chosen.indexOf(it) >= 0) { continue; }
          seenT[key] = 1; usedCat[it.cat] = 1; it.kind = kind || ""; chosen.push(it); n--;
        }
      }
      take(shuffle(pool.filter(function (p) { return p.pin; })), 3, "pin");
      take(pool.filter(function (p) { return p.hot; }).sort(function (x, y) { return x.hot - y.hot; }), 2, "hot");
      var rest = shuffle(pool.filter(function (p) { return chosen.indexOf(p) < 0; }));
      var diff = rest.filter(function (p) { return !usedCat[p.cat]; });
      take(diff, 1); take(rest, 6 - chosen.length);
      D.heroPick = chosen.slice(0, 6);
    }
    var IC = {
      pin: '<svg class="hx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16v6M8.5 3h7l-1 6 3 4.5H6.5L9.5 9z"/></svg>',
      hot: '<svg class="hx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.9l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'
    }, KT = { pin: "แนะนำ", hot: "ยอดนิยมประจำสัปดาห์" };
    $("hxTags").innerHTML = D.heroPick.map(function (x, i) {
      var key = "x" + i; REG[key] = x.ref;
      return '<button type="button" class="hx-tag hx-t' + (i + 1) + '" data-play="' + key + '" aria-label="เล่นคลิป ' + esc(x.t) + (x.kind ? " (" + KT[x.kind] + ")" : "") + '"' + (x.kind ? ' title="' + KT[x.kind] + '"' : "") + "><i>" + PLAY.replace("<svg", '<svg style="color:#fff"') + "</i><span>" + esc(clip(x.t)) + "</span>" + (x.kind ? IC[x.kind] : "") + "</button>";
    }).join("");
  }
  var phTimer = 0;
  function startHeroPh() {
    var el = $("hxPh"); if (!el) { return; }
    function cleanQ(q) { return String(q || "").replace(/^(q\s*&\s*a|ถาม-?ตอบ|ตอบเมนต์|ตอบคำถาม|คำถามที่[^\s:：]*|คำถาม|เปิดไมค์|มุสลิมใหม่ถาม)\s*[:：\-–]\s*/i, "").replace(/#\S+/g, "").replace(/\s+/g, " ").trim(); }
    var all = D.answers.filter(function (a) { return ansGood(a) && QRE.test(a.q); }).map(function (a) { return cleanQ(a.q); });
    var qs = all.filter(function (q) { return q.length >= 10 && q.length <= 36; }), k, j, tmp;
    if (qs.length < 4) { qs = all.filter(function (q) { return q.length >= 10 && q.length <= 46; }); }
    for (k = qs.length - 1; k > 0; k--) { j = Math.floor(Math.random() * (k + 1)); tmp = qs[k]; qs[k] = qs[j]; qs[j] = tmp; }
    qs = qs.slice(0, 8);
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (qs.length < 2 || still) { el.textContent = qs[0] || "ทำไมคนถึงเลิกนับถือศาสนา"; return; }
    var i = 0;
    function show() { el.textContent = qs[i % qs.length]; el.classList.remove("out"); }
    show(); clearInterval(phTimer);
    phTimer = setInterval(function () { if (document.hidden) { return; } el.classList.add("out"); setTimeout(function () { i++; show(); }, 320); }, 3600);
  }
  function drawHome() {
    $("loading").hidden = true;
    drawHero();
    drawDoors(); drawArtHome();
    startHeroPh();
    // คำถามที่ตอบแล้ว
    $("answers").hidden = !D.answers.length;
    if (D.answers.length) {
      var out = [], used = {}, usedTopic = {};
      function put(a) { out.push(a); used[a.id] = 1; usedTopic[a.tl[0] || ""] = 1; }
      D.answers.filter(function (a) { return a.pinned; }).forEach(function (a) { if (out.length < 6) { put(a); } });
      // ไม่มีปักหมุด: คัดคำตอบที่เป็นคำถามจริง คนละหัวข้อ คนละคลิป และหมุนเวียนทุกวัน
      var good = D.answers.filter(ansGood); if (good.length < 6) { good = D.answers; }
      var off = good.length ? Math.floor(Date.now() / 864e5) % good.length : 0, rot = good.slice(off).concat(good.slice(0, off));
      rot.forEach(function (a) { if (out.length < 6 && out.indexOf(a) < 0 && !used[a.id] && !usedTopic[a.tl[0] || ""] && QRE.test(a.q)) { put(a); } });
      rot.forEach(function (a) { if (out.length < 6 && out.indexOf(a) < 0 && !used[a.id]) { put(a); } });
      rot.forEach(function (a) { if (out.length < 6 && out.indexOf(a) < 0) { put(a); } });
      $("ansGrid").innerHTML = out.map(function (a, i) { return ansCard(a, "n" + i); }).join("");
      $("ansAll").hidden = D.answers.length <= 6; $("ansAll").textContent = "ดูทั้งหมด " + D.answers.length + " ข้อ →";
    }
    // รายการ
    var progs = D.programs;
    $("shows").hidden = !progs.length;
    $("progList").innerHTML = progs.map(function (p) {
      var n = D.eps.filter(function (e) { return e.programs.indexOf(p.name) >= 0; }).length, cv = safeUrl(p.cover);
      var tagc = /ใหม่/.test(p.label) ? "tg new" : "tg";
      return '<a class="pc" href="#program=' + encodeURIComponent(p.name) + '">' + (cv ? '<img alt="" src="' + esc(cv) + '">' : '<div class="ev" aria-hidden="true"><b>' + esc(p.name) + "</b></div>") +
        "<div>" + (p.label ? '<span class="' + tagc + '">' + esc(p.label) + "</span>" : "") + "<h3>" + esc(p.name) + "</h3><p>" + esc(p.desc || "") + '</p><span class="go">' + (n ? n + " ตอน · ดูทุกตอน →" : "ดูตอนล่าสุด →") + "</span></div></a>";
    }).join("");
    // คลิปสั้น
    $("shorts").hidden = !D.shorts.length;
    if (D.shorts.length) {
      var pills = '<button type="button" class="chip" data-sp="" aria-pressed="' + (!SHPIL) + '">ทั้งหมด</button>' + D.pillars.filter(function (p) { return D.shorts.some(function (s) { return s.cat === p; }); }).map(function (p) { return '<button type="button" class="chip" data-sp="' + esc(p) + '" aria-pressed="' + (SHPIL === p) + '">' + esc(p) + "</button>"; }).join("");
      $("shpills").innerHTML = pills;
      var list = D.shorts.filter(function (s) { return !SHPIL || s.cat === SHPIL; });
      $("shcar").innerHTML = car(list.slice(0, 30).map(function (s, i) { return shCard(s, "h" + i); }).join("")); initCar($("shcar"));
      $("shAll").textContent = "คลิปสั้นทั้งหมด " + D.shorts.length.toLocaleString("th-TH") + " คลิป →";
    }
    // ตอนล่าสุด
    var all = D.eps.concat(D.sep).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.num - a.num); }).slice(0, 14);
    $("latest").hidden = !all.length;
    $("epcar").innerHTML = car(all.map(function (e, i) { return epCard(e, "l" + i); }).join("")); initCar($("epcar"));
    // ซีรีส์
    $("series").hidden = !D.series.length;
    if (D.series.length) {
      $("srpills").innerHTML = '<button type="button" class="chip" data-srp="" aria-pressed="' + (!SRPIL) + '">ทั้งหมด</button>' + D.pillars.filter(function (p) { return D.series.some(function (s) { return s.pillar === p; }); }).map(function (p) { return '<button type="button" class="chip" data-srp="' + esc(p) + '" aria-pressed="' + (SRPIL === p) + '">' + esc(p) + "</button>"; }).join("");
      var sl = D.series.filter(function (s) { return !SRPIL || s.pillar === SRPIL; }), shown = srAll ? sl : sl.slice(0, SR_LIMIT);
      $("srgrid").innerHTML = shown.map(function (s) { return srCard(s).replace('<li style="display:flex">', "<div>").replace("</li>", "</div>"); }).join("");
      $("srMore").hidden = srAll || sl.length <= SR_LIMIT; $("srMore").textContent = "แสดงซีรีส์ทั้งหมด " + sl.length + " รายการ";
    }
    $("how").hidden = false;
    $("books").hidden = !D.books.length;
    $("bkcar").innerHTML = car(D.books.map(bkCard).join("")); initCar($("bkcar"));
    // ลิงก์โซเชียล: ค่าในชีต "ตั้งค่า" มาก่อน ถ้าว่างใช้ SOCIAL ใน config.js
    var SOC = function (k) { return safeUrl(D.S[k]) || safeUrl((C.SOCIAL || {})[k]); };
    var yt = SOC("youtube"); if (yt) { $("ytBtn").href = yt; $("ytBtn").setAttribute("aria-label", "ติดตามช่อง YouTube"); } else { $("ytBtn").hidden = true; }
    ["youtube", "facebook", "instagram", "tiktok"].forEach(function (k) { var u = SOC(k); [].forEach.call(document.querySelectorAll('[data-social="' + k + '"]'), function (a) { if (u) { a.href = u; a.target = "_blank"; a.rel = "noopener"; a.hidden = false; } }); });
    [].forEach.call(document.querySelectorAll("[data-soc]"), function (w) { w.hidden = !w.querySelector("a:not([hidden])"); });
  }

  /* ---------------- มุมมองรายการ (#program= #all=ep #answers) ---------------- */
  /* เมนูบนสุด: ไฮไลต์หน้าที่เปิดอยู่จริง (ไม่ค้างที่ "คำตอบ") */
  function markNav() {
    var path = location.pathname.replace(/\/+/g, "/"); if (path.length > 1 && path.slice(-1) !== "/") { path += "/"; }
    var h = (location.hash || "").replace(/^#/, ""), cur = path;
    if (path === "/" || !PUBLIC_ROUTES[path]) {
      if (/^clips/.test(h)) { cur = "/shorts/"; } else if (/^(program=|all=ep)/.test(h)) { cur = "/episodes/"; } else if (h === "answers") { cur = "/answers/"; }
    }
    [].forEach.call(document.querySelectorAll(".nav a"), function (a) {
      var on = a.getAttribute("href") === cur; a.classList.toggle("on", on);
      if (on) { a.setAttribute("aria-current", "page"); } else { a.removeAttribute("aria-current"); }
    });
  }
  /* หน้าย่อย (/answers/ ฯลฯ) ซ่อนหน้าปกทันทีด้วยคลาส view-on จึงไม่มีหน้าแรกโผล่แวบก่อน */
  function setView(res) {
    var el = document.documentElement; el.classList.toggle("view-on", !!res); el.classList.remove("view-wait", "theater-open"); clearTimeout(IDLE_T);
    var wasHome = !$("home").hidden; if (res && wasHome) { HOME_Y = window.scrollY; }
    if (!res && D.paths) { drawDoors(); }
    $("res").hidden = !res; $("home").hidden = !!res; if (res) { $("res").innerHTML = res; [].forEach.call($("res").querySelectorAll(".rgc"), initCar); }
    markNav();
    if (!res && !wasHome && HOME_Y >= 0) { jumpTo(HOME_Y); HOME_Y = -1; }
  }
  function clearBtn() { return '<button class="btn btn-line" type="button" id="clr">✕ กลับหน้าแรก</button>'; }
  // เลื่อนทันที ไม่ใช้ smooth: ตอนสลับหน้า หน้าแรกถูกซ่อนจนเอกสารสั้นลง ถ้าเลื่อนแบบ smooth จะเห็นหน้าวิ่งขึ้นบนสุดเร็ว ๆ แล้วเวียนหัว
  function jumpTo(y) { var el = document.documentElement, old = el.style.scrollBehavior; y = Math.max(0, y); el.style.scrollBehavior = "auto"; try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); } el.style.scrollBehavior = old; }
  function toTop() { jumpTo($("res").getBoundingClientRect().top + window.scrollY - 84); }
  var HOME_Y = -1;
  function setHdrH() { var h = document.querySelector(".hdr"), el = document.documentElement; if (h) { el.style.setProperty("--hdrh", h.offsetHeight + "px"); } el.style.setProperty("--sbw", Math.max(0, window.innerWidth - el.clientWidth) + "px"); }   // --sbw = ความกว้างแถบเลื่อน (วินโดวส์) ใช้ทำภาพเต็มความกว้างโดยไม่ให้หน้าเลื่อนซ้ายขวา
  window.addEventListener("resize", setHdrH);
  setHdrH();

  /* ---------------- เส้นทางเรียนรู้: หน้าแรกแบบประตู + หน้าเส้นทาง ----------------
     ข้อมูลมาจากแท็บ เส้นทาง ในชีต ความคืบหน้า (ฟังแล้ว) จดไว้ในเบราว์เซอร์ของผู้ชมเท่านั้น ไม่ส่งไปที่ใด */
  var PK = "arif.paths";
  function pDone() { try { var v = JSON.parse(localStorage.getItem(PK) || "{}"); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } }
  function pSave(v) { try { localStorage.setItem(PK, JSON.stringify(v)); } catch (e) {} }
  function pKey(pi, i) { var p = D.paths[pi], s = p.steps[i]; return p.title + "¦" + s.id + "¦" + s.sec; }
  function pCount(pi) { var d = pDone(), n = 0; D.paths[pi].steps.forEach(function (s, i) { if (d[pKey(pi, i)]) { n++; } }); return n; }
  /* ---------------- หน้าแรก: ประตูแบบแถบสูง, แผงรายละเอียดเมื่อประตูขยาย, ฉากเลื่อนแบบพารัลแลกซ์ ---------------- */
  var DD = { el: null, from: null, pi: -1 }, AUTO = null, SC = { on: false, tick: false };
  var EDIT = (function () { try { var q = /[?&]edit=(\d)/.exec(location.search); if (q) { localStorage.setItem("arif.edit", q[1]); } return localStorage.getItem("arif.edit") === "1"; } catch (e) { return false; } })();   // ?edit=1 = โหมดทีม: เห็นช่องคำอธิบายที่ยังว่าง
  function reduceMotion() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }

  /* ---------------- งานศิลป์ที่วาดด้วยโค้ด (SVG): ฉากเดินทางสู่ประตู + ภาพประจำประตูแต่ละบาน ไม่ใช้ภาพจากคลิป ---------------- */
  function prng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ridge(seed, base, amp, jag, bottom) {   // เส้นสันเขา: jag 1 = แหลม, 0 = โค้งเนิน
    var r = prng(seed), cs = [], i, x, d = "M0," + bottom;
    for (i = 0; i < 6; i++) { cs.push({ f: (i + 1) * (1.1 + r() * .9), p: r() * 6.283, a: Math.pow(.56, i) }); }
    for (x = 0; x <= 1600; x += 16) {
      var u = x / 1600 * 6.283, h = 0, n = 0; cs.forEach(function (c) { var v = Math.sin(c.f * u + c.p); h += c.a * (jag * (1 - Math.abs(v)) + (1 - jag) * (v * .5 + .5)); n += c.a; });
      d += " L" + x + "," + (base - amp * h / n).toFixed(1);
    }
    return d + " L1600," + bottom + " Z";
  }
  function archD(cx, by, w, h) {   // ซุ้มโค้งแหลม
    var l = cx - w / 2, rr = cx + w / 2;
    return "M" + l + "," + by + " L" + l + "," + (by - h * .55) + " C" + l + "," + (by - h * .82) + " " + (cx - w * .16) + "," + (by - h * .93) + " " + cx + "," + (by - h) + " C" + (cx + w * .16) + "," + (by - h * .93) + " " + rr + "," + (by - h * .82) + " " + rr + "," + (by - h * .55) + " L" + rr + "," + by + " Z";
  }
  var ART_ON = C.ART_IMAGES !== false, ART_BASE = String(C.ART_BASE || "images/art/"), ART_DOORS = ["door-1.webp", "door-2.webp", "door-3.webp", "door-4.webp", "door-5.webp"];
  var HERO = { w: 2576, h: 1438, dx: .733, dy: .55, opx: .5, opy: .6 };   // ขนาดภาพฉากหลัก และตำแหน่งประตูในภาพ (สัดส่วน)
  function sceneImgs() {
    var u = ART_BASE;
    return '<picture class="dl dl-bg"><source media="(max-width:859px)" srcset="' + u + 'scene-hero-mobile.webp"><img src="' + u + 'scene-hero.webp" alt="" decoding="async"></picture>' +
      '<img class="dl dl-end" src="' + u + 'scene-end.webp" alt="" decoding="async" loading="lazy">' +
      '<img class="dl dl-fg" src="' + u + 'layer-5.webp" alt="" decoding="async" loading="lazy">' +
      '<img class="dl dl-fx" src="' + u + 'layer-6.webp" alt="" decoding="async" loading="lazy">';
  }
  function sceneArt(sfx) {
    sfx = sfx || ""; var out = sceneArt0(); return sfx ? out.replace(/id="(g\w+|fBl)"/g, 'id="$1' + sfx + '"').replace(/url\(#(g\w+|fBl)\)/g, "url(#$1" + sfx + ")") : out;
  }
  function sceneArt0() {
    var r = prng(7), i, stars = "";
    for (i = 0; i < 170; i++) { var sy = Math.pow(r(), 1.6) * 540; stars += '<circle cx="' + (r() * 1600).toFixed(0) + '" cy="' + sy.toFixed(0) + '" r="' + (r() * 1.5 + .35).toFixed(2) + '" opacity="' + (r() * .7 + .25).toFixed(2) + '"/>'; }
    var fl = ""; for (i = 0; i < 18; i++) { fl += '<circle class="ff" cx="' + (260 + r() * 1100).toFixed(0) + '" cy="' + (600 + r() * 260).toFixed(0) + '" r="' + (r() * 2 + 1.2).toFixed(1) + '" style="animation-delay:' + (-r() * 9).toFixed(1) + 's;animation-duration:' + (7 + r() * 7).toFixed(1) + 's"/>'; }
    var DX = 1000, DB = 598;   // ตำแหน่งประตูบนขอบฟ้า
    var f1 = ridge(11, 520, 150, .95, 900), f2 = ridge(23, 575, 95, .8, 900), m1 = ridge(31, 645, 70, .15, 900), m2 = ridge(41, 705, 60, .1, 900);
    var svg = function (cls, inner) { return '<svg class="dl ' + cls + '" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" focusable="false">' + inner + "</svg>"; };
    return svg("dl-sky", '<defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04060b"/><stop offset=".3" stop-color="#0a1226"/><stop offset=".5" stop-color="#251427"/><stop offset=".62" stop-color="#7a2618"/><stop offset=".72" stop-color="#e0702a"/><stop offset=".84" stop-color="#ffb066"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>' +
        '<radialGradient id="gNeb" cx=".16" cy=".16" r=".5"><stop offset="0" stop-color="#2d8f93" stop-opacity=".5"/><stop offset="1" stop-color="#2d8f93" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="gCl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb878" stop-opacity="0"/><stop offset=".5" stop-color="#ffcf9a" stop-opacity=".5"/><stop offset="1" stop-color="#ffb878" stop-opacity="0"/></linearGradient></defs>' +
        '<rect width="1600" height="900" fill="url(#gSky)"/><rect width="1600" height="900" fill="url(#gNeb)"/><g fill="#fff">' + stars + '</g>' +
        '<ellipse cx="420" cy="470" rx="380" ry="9" fill="url(#gCl)"/><ellipse cx="1180" cy="440" rx="300" ry="7" fill="url(#gCl)"/><ellipse cx="760" cy="520" rx="440" ry="12" fill="url(#gCl)"/><ellipse cx="1400" cy="500" rx="260" ry="8" fill="url(#gCl)"/>') +
      svg("dl-glow", '<defs><radialGradient id="gGlow" cx="' + (DX / 1600) + '" cy="' + (DB / 900) + '" r=".46"><stop offset="0" stop-color="#fff2cf" stop-opacity=".95"/><stop offset=".1" stop-color="#ffc27a" stop-opacity=".75"/><stop offset=".4" stop-color="#e0562a" stop-opacity=".3"/><stop offset="1" stop-color="#e0562a" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="gSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe9"/><stop offset=".55" stop-color="#ffe3b0"/><stop offset="1" stop-color="#ffb878" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#gGlow)"/><circle cx="560" cy="560" r="130" fill="url(#gSun)" opacity=".85"/>') +
      svg("dl-far", '<defs><linearGradient id="gF1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2f40"/><stop offset=".55" stop-color="#1d1728"/><stop offset="1" stop-color="#10121d"/></linearGradient><linearGradient id="gF2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2034"/><stop offset="1" stop-color="#0c0e17"/></linearGradient></defs>' +
        '<path d="' + f1 + '" fill="url(#gF1)"/><path d="' + f1.replace(/ L1600,900 Z$/, "").replace(/^M0,900 L/, "M") + '" fill="none" stroke="#ffb878" stroke-opacity=".28" stroke-width="1.6"/><path d="' + f2 + '" fill="url(#gF2)"/>') +
      svg("dl-door", '<defs><linearGradient id="gDoor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe9"/><stop offset=".5" stop-color="#ffd58f"/><stop offset="1" stop-color="#ff8f4a"/></linearGradient></defs>' +
        '<path d="' + archD(DX, DB, 112, 182) + '" fill="#0a0b12"/><path d="' + archD(DX, DB, 84, 152) + '" fill="url(#gDoor)"/><path d="' + archD(DX, DB + 1, 142, 204) + '" fill="none" stroke="#ffb878" stroke-opacity=".4" stroke-width="2"/>') +
      svg("dl-mid", '<defs><linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1823"/><stop offset=".25" stop-color="#120d17"/><stop offset="1" stop-color="#050508"/></linearGradient>' +
        '<filter id="fBl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter><linearGradient id="gRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd58f" stop-opacity=".62"/><stop offset=".6" stop-color="#ff9b52" stop-opacity=".16"/><stop offset="1" stop-color="#ff9b52" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + m1 + '" fill="url(#gM)"/><path d="M' + (DX - 34) + "," + (DB + 6) + " C" + (DX - 70) + ",700 " + (DX - 190) + ",790 " + (DX - 300) + ',900 L' + (DX + 340) + ',900 C' + (DX + 150) + ',790 ' + (DX + 80) + ',700 ' + (DX + 34) + "," + (DB + 6) + ' Z" fill="url(#gRoad)" filter="url(#fBl)"/><path d="' + m2 + '" fill="#07070c"/>') +
      svg("dl-mist", '<defs><linearGradient id="gMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb878" stop-opacity="0"/><stop offset=".5" stop-color="#ffb878" stop-opacity=".2"/><stop offset="1" stop-color="#ffb878" stop-opacity="0"/></linearGradient></defs><rect y="560" width="1600" height="170" fill="url(#gMist)"/><g fill="#ffd89a">' + fl + "</g>") +
      svg("dl-near", '<path d="' + ridge(53, 810, 70, .05, 900) + '" fill="#030305"/>');
  }
  function doorArt(k) {   // ภาพประตูแต่ละบาน (แนวตั้ง 300x600) วาดด้วยโค้ด ไม่ใช้ภาพจากคลิป
    var r = prng(100 + k), i, g = "", T = "var(--tint)", base = '<defs><linearGradient id="gA' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070d"/><stop offset=".6" stop-color="#0d0f1c"/><stop offset="1" stop-color="#17101a"/></linearGradient>' +
      '<radialGradient id="gB' + k + '" cx=".5" cy=".72" r=".6"><stop offset="0" style="stop-color:' + T + '" stop-opacity=".62"/><stop offset="1" style="stop-color:' + T + '" stop-opacity="0"/></radialGradient></defs><rect width="300" height="600" fill="url(#gA' + k + ')"/><rect width="300" height="600" fill="url(#gB' + k + ')"/>';
    if (k % 5 === 0) {   // จักรวาล: ดาวและวงแหวน
      for (i = 0; i < 70; i++) { g += '<circle cx="' + (r() * 300).toFixed(0) + '" cy="' + (r() * 470).toFixed(0) + '" r="' + (r() * 1.3 + .3).toFixed(2) + '" fill="#fff" opacity="' + (r() * .7 + .25).toFixed(2) + '"/>'; }
      g += '<g fill="none" style="stroke:' + T + '"><ellipse cx="150" cy="330" rx="120" ry="34" stroke-opacity=".5" transform="rotate(-18 150 330)"/><ellipse cx="150" cy="330" rx="84" ry="22" stroke-opacity=".4" transform="rotate(-18 150 330)"/><circle cx="150" cy="330" r="26" stroke-opacity=".9" stroke-width="2"/></g><circle cx="150" cy="330" r="9" fill="#fff"/>';
    } else if (k % 5 === 1) {   // เป้าหมายชีวิต: ถนนสู่ขอบฟ้า
      g += '<circle cx="150" cy="300" r="58" fill="#ffd9a0" opacity=".85"/><circle cx="150" cy="300" r="110" style="fill:' + T + '" opacity=".25"/><path d="M0,330 L300,330 L300,600 L0,600 Z" fill="#07070c"/><path d="M142,330 L158,330 L270,600 L30,600 Z" fill="#1c1420"/><path d="M148,330 L152,330 L160,600 L140,600 Z" style="fill:' + T + '" opacity=".7"/><path d="M0,330 Q75,305 150,326 T300,322 L300,336 L0,336 Z" fill="#0c0b14"/>';
    } else if (k % 5 === 2) {   // หลายศาสนา: ซุ้มหลายบาน แสงหลายสี
      var xs = [38, 92, 150, 208, 262], hs = [150, 210, 280, 220, 170];
      xs.forEach(function (x, j) { g += '<path d="' + archD(x, 520, 46, hs[j]) + '" fill="#0a0910"/><path d="' + archD(x, 520, 32, hs[j] - 22) + '" style="fill:' + T + '" opacity="' + (.35 + j * .1).toFixed(2) + '"/>'; });
      g += '<rect y="520" width="300" height="80" fill="#07060b"/>';
    } else if (k % 5 === 3) {   // เข้าใจโดยไม่ตัดสิน: ประตูเปิดและลำแสง
      g += '<path d="M120,470 L40,600 L260,600 L180,470 Z" style="fill:' + T + '" opacity=".28"/><path d="' + archD(150, 470, 124, 300) + '" fill="#0a0910"/><path d="' + archD(150, 470, 98, 262) + '" style="fill:' + T + '" opacity=".9"/><path d="' + archD(150, 470, 60, 190) + '" fill="#fff6dc" opacity=".92"/><rect y="470" width="300" height="130" fill="#07060b" opacity=".85"/>';
    } else {   // ลวดลายเรขาคณิต
      var pts = function (cx, cy, rad, rot) { var s2 = "", a; for (a = 0; a < 16; a++) { var rr = a % 2 ? rad * .62 : rad, t = rot + a * Math.PI / 8; s2 += (a ? " L" : "M") + (cx + rr * Math.cos(t)).toFixed(1) + "," + (cy + rr * Math.sin(t)).toFixed(1); } return s2 + " Z"; };
      var cells = [[150, 150, 80], [150, 330, 80], [60, 240, 60], [240, 240, 60], [150, 510, 70], [30, 420, 44], [270, 420, 44]];
      cells.forEach(function (c) { g += '<path d="' + pts(c[0], c[1], c[2], .2) + '" fill="none" style="stroke:' + T + '" stroke-opacity=".75" stroke-width="1.6"/><path d="' + pts(c[0], c[1], c[2] * .55, .2 + Math.PI / 8) + '" fill="none" style="stroke:' + T + '" stroke-opacity=".4"/>'; });
    }
    return '<svg class="sdoor-art" viewBox="0 0 300 600" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">' + base + g + "</svg>";
  }
  function doorThumb(id, big) { return "https://i.ytimg.com/vi/" + id + (big ? "/maxresdefault.jpg" : "/hqdefault.jpg"); }
  function doorImgId(p) { for (var i = 0; i < p.steps.length; i++) { if (!p.steps[i].only) { return p.steps[i].id; } } return p.steps[0].id; }
  function doorImg(p, big) { return p.img ? p.img : doorThumb(doorImgId(p), big); }
  function pathGroupNames(p) { var g = []; p.steps.forEach(function (s) { if (s.group && g.indexOf(s.group) < 0) { g.push(s.group); } }); return g; }
  function pathMinutes(p) { var m = 0; p.steps.forEach(function (s) { m += s.only ? 1 : (s.end > s.sec ? (s.end - s.sec) / 60 : 6); }); return m >= 12 ? Math.round(m / 5) * 5 : Math.max(1, Math.round(m)); }
  function drawDoors() {
    var wrap = $("doorsWrap"), qh = document.querySelector("#quick-start .quick-head"); if (!wrap) { return; }
    var ps = D.paths || []; wrap.hidden = !ps.length; if (qh) { qh.hidden = !!ps.length; }
    var af = $("doorsAfter"); if (af) { af.hidden = !ps.length; }
    if (!ps.length) { sceneInit(); return; }
    var HS = ["100%", "100%", "100%", "100%", "100%"], DYS = ["0px", "0px", "0px", "0px", "0px"], dn = 0, doorN = ps.filter(function (p) { return p.door; }).length;
    $("doors").setAttribute("data-n", doorN);
    $("doors").innerHTML = ps.map(function (p, i) {
      if (!p.door) { return ""; }
      var n = pCount(i), tn = dn++;
      return '<a class="sdoor" href="#door=' + encodeURIComponent(p.title) + '" data-i="' + i + '" style="--tint:var(--dt' + (tn % 5) + ");--k:" + tn + ";--h:" + HS[tn % 5] + ";--dy:" + DYS[tn % 5] + '">' + doorArt(tn) + (ART_ON || p.img ? '<i class="sdoor-img" style="background-image:url(' + esc(p.img || ART_BASE + ART_DOORS[tn % 5]) + ')"></i>' : "") + '<span class="sdoor-top">ประตูที่ ' + (tn + 1) + '</span><span class="sdoor-bot"><b class="sdoor-q">' + esc(p.title) + '</b><span class="sdoor-meta">เริ่มจาก “' + esc(p.steps[0].q.replace(/^คำถาม: /, "")) + '”</span><span class="sdoor-n">' + p.steps.length + " ข้อ" + (n ? " · ฟังแล้ว " + n : "") + "</span></span></a>";
    }).join("");
    // ข้อความต้อนรับจากคุณอารีฟ (ตั้งในชีต ตั้งค่า) ว่าง = ไม่แสดง
    var ht = String(D.S["ข้อความต้อนรับจากอารีฟ"] || "").trim(), hv = ytId(D.S["วิดีโอต้อนรับ (ลิงก์ YouTube)"] || ""), hb = $("doorsHello");
    if (hb) {
      hb.hidden = !(ht || hv);
      if (ht || hv) { if (hv) { REG.hello = { k: "ans", id: hv, sec: 0, q: "จากอารีฟ", title: "จากอารีฟ", summary: "" }; }
        hb.innerHTML = '<span class="dh-k">จากอารีฟ</span>' + (ht ? "<p>" + esc(ht).replace(/\n+/g, "</p><p>") + "</p>" : "") + (hv ? '<button type="button" class="btn btn-line" data-play="hello">' + PLAY + " ดูวิดีโอทักทาย</button>" : ""); }
    }
    // คำมั่นของพื้นที่นี้ (แก้ได้ที่ PLEDGE ใน config.js)
    var pl = $("doorsPledge"), pg = (C.PLEDGE || []).filter(Boolean);
    if (pl) { pl.hidden = !pg.length; pl.innerHTML = pg.length ? '<li class="dp-k">คำมั่นของพื้นที่นี้</li>' + pg.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") : ""; }
    var gl = $("doorsGuests"); if (gl) { gl.hidden = !(D.guests && D.guests.length); gl.innerHTML = '<a href="#guests">เรื่องราวจากผู้ร่วมทาง <span aria-hidden="true">→</span></a>'; }
    var alt = ps.filter(function (p) { return !p.door; })[0], al = $("doorsAlt");
    if (al) { al.hidden = !alt; al.innerHTML = alt ? '<a href="#path=' + encodeURIComponent(alt.title) + '">' + esc(alt.title) + ' <span aria-hidden="true">→</span></a>' : ""; }
    sceneInit();
  }
  // ฉากเลื่อน: เลื่อนลงจากคุณอารีฟ ข้อความค่อย ๆ ลอยขึ้นและจาง ประตูผุดขึ้นทีละบาน (ปิดเองเมื่อจอเล็ก/ผู้ชมตั้งลดการเคลื่อนไหว)
  function sceneInit() {
    var sc = $("doorsWrap"); if (!sc) { return; }
    var art = $("dart");
    if (art && !art.firstChild) {
      if (ART_ON) { art.innerHTML = sceneImgs(); var bi = art.querySelector(".dl-bg img"); if (bi) { bi.onerror = function () { art.classList.remove("img"); art.innerHTML = sceneArt(); ART_ON = false; sceneInit(); }; } art.classList.add("img"); }
      else { art.innerHTML = sceneArt(); }
    }
    if (art) {
      var W = art.clientWidth || window.innerWidth, H = art.clientHeight || window.innerHeight;
      if (art.classList.contains("img")) {   // คำนวณจุดซูม (ประตู) จากภาพจริง ตามการจัดภาพแบบ cover
        var k = Math.max(W / HERO.w, H / HERO.h), dw = HERO.w * k, dh = HERO.h * k, ox = (W - dw) * HERO.opx, oy = (H - dh) * HERO.opy, dx = HERO.dx * dw + ox, dy = HERO.dy * dh + oy;
        art.style.setProperty("--opx", (HERO.opx * 100) + "%"); art.style.setProperty("--opy", (HERO.opy * 100) + "%");
        sc.style.setProperty("--ox", dx.toFixed(0) + "px"); sc.style.setProperty("--oy", dy.toFixed(0) + "px");
        sc.style.setProperty("--tx", (W * .5 - dx).toFixed(0) + "px"); sc.style.setProperty("--ty", (H * .55 - dy).toFixed(0) + "px");
        sc.style.setProperty("--fx", (W * .5).toFixed(0) + "px"); sc.style.setProperty("--fy", (H * .55).toFixed(0) + "px");
      } else {
        var k2 = Math.max(W / 1600, H / 900); sc.style.setProperty("--ox", (1000 * k2 + (W - 1600 * k2) / 2).toFixed(0) + "px"); sc.style.setProperty("--oy", ((598 - (900 - H / k2)) * k2).toFixed(0) + "px");
      }
    }
    var ok = !sc.hidden && !reduceMotion() && window.innerWidth >= 860 && window.innerHeight >= 440 && !!(window.CSS && CSS.supports && CSS.supports("position", "sticky"));
    sc.classList.toggle("pinned", ok); SC.on = ok; if (!ok) { sc.style.removeProperty("--p"); return; }
    sceneUpdate();
  }
  function sceneUpdate() {
    SC.tick = false; var sc = $("doorsWrap"), inn = $("dsceneIn"); if (!sc || !inn || !SC.on || sc.hidden || $("home").hidden) { return; }
    var r = sc.getBoundingClientRect(), hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--hdrh"), 10) || 64, total = sc.offsetHeight - (window.innerHeight - hh);
    var p = total > 0 ? Math.min(1, Math.max(0, (hh - r.top) / total)) : 0; sc.style.setProperty("--p", p.toFixed(4));
    if (p > 0.05 && p < 0.95 && Math.abs(inn.getBoundingClientRect().top - hh) > 8) { sc.classList.remove("pinned"); SC.on = false; sc.style.removeProperty("--p"); }   // sticky ไม่ทำงาน: กลับเป็นหน้าธรรมดา
  }
  window.addEventListener("scroll", function () { if (SC.on && !SC.tick) { SC.tick = true; requestAnimationFrame(sceneUpdate); } }, { passive: true });
  window.addEventListener("resize", function () { sceneInit(); });
  // แผงรายละเอียดประตู (ขยายจากแถบ)
  function ddBuild() {
    if (DD.el) { return DD.el; }
    var d = document.createElement("div"); d.className = "dd"; d.id = "dd"; d.hidden = true; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "ddT");
    d.innerHTML = '<div class="dd-bg" data-ddclose="1"></div><div class="dd-panel" id="ddPanel"><div class="dd-img" id="ddImg"></div><button type="button" class="dd-x" data-ddclose="1" aria-label="ปิด">✕</button>' +
      '<div class="dd-body" id="ddBody"><div class="dd-left"><span class="dd-k" id="ddK"></span><h2 id="ddT"></h2></div><div class="dd-right"><h3 class="dd-sub" id="ddSub"></h3><p class="dd-meta" id="ddMeta"></p><p class="dd-desc" id="ddDesc"></p>' +
      '<div class="dd-btns"><a class="dd-go" id="ddGo" href="#" data-ddstart="0">' + PLAY + ' เริ่มฟังเส้นทางนี้</a><a class="dd-list" id="ddList" href="#" data-ddstart="-1">อ่านเรื่องเล่าเอง</a></div><div class="dd-next" id="ddNext"></div></div></div></div>';
    document.body.appendChild(d); DD.el = d; return d;
  }
  function openDoor(title) {
    var pi = -1; (D.paths || []).forEach(function (p, i) { if (p.title === title) { pi = i; } }); if (pi < 0) { return; }
    if (DD.el && !DD.el.hidden && DD.pi === pi) { return; }   // hashchange และ popstate เรียกซ้ำ ไม่ต้องเปิดซ้ำ
    var p = D.paths[pi], d = ddBuild(), enc = encodeURIComponent(p.title), groups = pathGroupNames(p), no = 0;
    D.paths.forEach(function (x, j) { if (j < pi && x.door) { no++; } });
    DD.pi = pi; DD.from = document.querySelector('.sdoor[data-i="' + pi + '"]');
    d.style.setProperty("--tint", "var(--dt" + (no % 5) + ")");
    $("ddK").textContent = p.door ? "เส้นทางเรียนรู้ · ประตูที่ " + (no + 1) : "เส้นทางเรียนรู้"; $("ddT").textContent = p.title;
    $("ddSub").textContent = "เริ่มจาก “" + p.steps[0].q.replace(/^คำถาม: /, "") + "”";
    $("ddMeta").textContent = p.steps.length + " ข้อ" + (groups.length ? " | " + groups.length + " ช่วง" : "") + " | ประมาณ " + pathMinutes(p) + " นาที";
    $("ddDesc").textContent = p.desc || ("รวม " + p.steps.length + " คลิป" + (groups.length ? " ใน " + groups.length + " ช่วง: " + groups.slice(0, 3).join(" › ") + (groups.length > 3 ? " › …" : "") : ""));
    $("ddGo").href = "#path=" + enc; $("ddList").href = "#path=" + enc;
    $("ddNext").innerHTML = '<b>เริ่มฟังจากข้อไหนก็ได้</b><div class="dd-cards">' + p.steps.slice(0, 2).map(function (st, i) { return '<a class="dd-card" href="#path=' + enc + '" data-ddstart="' + i + '"><span class="dd-n">ข้อ ' + (i + 1) + (st.only ? " · คลิปสั้น" : "") + '</span><span class="dd-ct">' + esc(st.q.replace(/^คำถาม: /, "")) + "</span></a>"; }).join("") + "</div>";
    var img = $("ddImg"); img.style.backgroundImage = "none"; img.innerHTML = (p.img ? "" : sceneArt("p")) + (p.img || ART_ON ? '<img class="dd-pic" alt="" src="' + esc(p.img || ART_BASE + "scene-hero.webp") + '">' : ""); img.style.setProperty("--hue", ["150deg", "0deg", "28deg", "-42deg", "92deg"][no % 5] || "0deg");
    d.hidden = false; document.documentElement.classList.add("dd-open");
    var panel = $("ddPanel");
    if (DD.from && panel.animate && !reduceMotion()) {
      var a = DD.from.getBoundingClientRect(), b = panel.getBoundingClientRect();
      panel.animate([{ clipPath: "inset(" + (a.top - b.top) + "px " + (b.right - a.right) + "px " + (b.bottom - a.bottom) + "px " + (a.left - b.left) + "px round 18px)" }, { clipPath: "inset(0px 0px 0px 0px round 36px)" }], { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" });
      $("ddBody").animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 240, easing: "ease-out", fill: "backwards" });
      d.firstChild.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360 });
    }
    setTimeout(function () { var g = $("ddGo"); if (g && !d.hidden) { try { g.focus({ preventScroll: true }); } catch (e) {} } }, 60);
  }
  function closeDoor(instant, clearHash) {
    var d = DD.el; if (!d || d.hidden) { return; }
    var finish = function () {
      d.hidden = true; document.documentElement.classList.remove("dd-open");
      if (clearHash && /^#door=/.test(location.hash)) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
      if (DD.from && DD.from.focus) { try { DD.from.focus({ preventScroll: true }); } catch (e) {} }
    };
    var panel = $("ddPanel"), from = DD.from && document.body.contains(DD.from) ? DD.from : null;
    if (!instant && from && panel.animate && !reduceMotion()) {
      var a = from.getBoundingClientRect(), b = panel.getBoundingClientRect();
      var an = panel.animate([{ clipPath: "inset(0px 0px 0px 0px round 36px)" }, { clipPath: "inset(" + (a.top - b.top) + "px " + (b.right - a.right) + "px " + (b.bottom - a.bottom) + "px " + (a.left - b.left) + "px round 18px)" }], { duration: 420, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
      an.onfinish = function () { finish(); an.cancel(); }; return;
    }
    finish();
  }
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target && e.target.matches && e.target.matches(".st-poster:not(.on)")) { e.preventDefault(); if (e.target.hasAttribute("data-artplay")) { artPlay(e.target); } else { stPlay(e.target); } return; }
    if (!DD.el || DD.el.hidden) { return; }
    if (e.key === "Escape") { e.preventDefault(); closeDoor(false, true); return; }
    if (e.key === "Tab") { var f = [].slice.call(DD.el.querySelectorAll("a[href],button")).filter(function (n) { return n.offsetParent !== null; }); if (!f.length) { return; } var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  var PL = { pi: -1, i: -1 }, PG = { groups: [], gix: [], has: false, guest: false, pi: -1 };
  // ตัวบอกว่าอยู่ช่วงไหน: หัวข้อช่วงในรายการ + แถบช่วงเหนือตัวเล่น (แต่ละช่วงเติมตามจำนวนข้อที่ฟังแล้ว)
  function updateSections() {
    if (!PG.has || PG.pi < 0) { return; }
    var d = pDone(), cg = (PL.pi >= 0 && PL.i >= 0) ? PG.gix[PL.i] : -1, root = $("res");
    PG.groups.forEach(function (g, k) {
      var done = 0, n = g.to - g.from + 1, i;
      for (i = g.from; i <= g.to; i++) { if (d[pKey(PG.pi, i)]) { done++; } }
      var h = root.querySelector('.pgroup[data-g="' + k + '"]'); if (h) { h.classList.toggle("on", k === cg); h.querySelector(".pg-c").textContent = (k === cg ? "กำลังอยู่ที่นี่ · " : "") + "ฟังแล้ว " + done + "/" + n; }
      var sg = root.querySelector('.pseg-i[data-gseg="' + k + '"]'); if (sg) { sg.classList.toggle("on", k === cg); sg.firstChild.style.width = (100 * done / n) + "%"; }
    });
    var pk = $("psecK"), pt = $("psecT"), k2 = cg >= 0 ? cg : 0;
    if (pk && pt) {
      if (PG.guest) { pk.textContent = "กำลังฟังเรื่องเล่า"; pt.textContent = "จากผู้ร่วมทาง"; }
      else { pk.textContent = cg >= 0 ? "ตอนนี้อยู่ช่วงที่ " + (k2 + 1) + " จาก " + PG.groups.length : "เส้นทางนี้มี " + PG.groups.length + " ช่วง เริ่มที่ช่วงที่ 1"; pt.textContent = PG.groups[k2].name; }
    }
  }
  function setShortMode(on) { var w = $("res").querySelector(".pwrap"), pp = $("pplayer"), bx = $("pbox"); if (w) { w.classList.toggle("short-mode", !!on); } if (pp) { pp.classList.toggle("shorty", !!on); } if (bx) { bx.classList.toggle("is-short", !!on); } }
  // โหมดโฟกัส: หรี่แสงรอบนอก ให้ตัวเล่นเด่น (จำค่าที่ผู้ชมเลือกไว้ในเบราว์เซอร์) และปุ่มซ่อน/เปิดตัวเล่น
  var FOCUS = (function () { try { return localStorage.getItem("arif.theater") !== "0"; } catch (e) { return true; } })(), LAST = null, IDLE_T = 0;   // FOCUS = โหมดโฟกัสกลางจอ (ค่าเริ่มต้นเปิด) ปิด = ดูพร้อมรายการ
  function wake() {
    clearTimeout(IDLE_T); var w = $("res") && $("res").querySelector(".pwrap"); if (!w) { return; }
    w.classList.remove("idle"); if (w.classList.contains("theater")) { IDLE_T = setTimeout(function () { w.classList.add("idle"); }, 3500); }   // ไม่ขยับ 3.5 วินาที: ซ่อนข้อความและปุ่มรอบวิดีโอ
  }
  function applyFocus() {
    var root = document.documentElement, w = $("res").querySelector(".pwrap"); if (!w) { root.classList.remove("theater-open"); return; }
    var on = w.classList.contains("playing") && !w.classList.contains("player-hidden");
    w.classList.toggle("theater", on && FOCUS); w.classList.toggle("focus", on && !FOCUS); root.classList.toggle("theater-open", on && FOCUS);
    var b = $("pfocus"); if (b) { b.textContent = FOCUS ? "ดูพร้อมรายการ" : "โหมดโฟกัสกลางจอ"; }
    wake();
  }
  function prevStep() { if (PL.pi < 0 || PL.i < 1) { return; } var st = D.paths[PL.pi].steps[PL.i - 1]; playStep(PL.pi, PL.i - 1, st.short ? "s" : ""); }
  ["mousemove", "keydown", "touchstart", "pointerdown"].forEach(function (ev) { document.addEventListener(ev, function () { if (document.documentElement.classList.contains("theater-open")) { wake(); } }, { passive: true }); });
  document.addEventListener("keydown", function (e) {
    if (!document.documentElement.classList.contains("theater-open")) { return; }
    if (e.key === "Escape") { e.preventDefault(); hidePlayer(); } else if (e.key === "ArrowRight") { e.preventDefault(); nextStep(); } else if (e.key === "ArrowLeft") { e.preventDefault(); prevStep(); }
  });
  function showPlayer() { var w = $("res").querySelector(".pwrap"), sw = $("pshow"); if (w) { w.classList.remove("player-hidden"); } if (sw) { sw.hidden = true; } }
  function hidePlayer() {
    var w = $("res").querySelector(".pwrap"); if (!w) { return; }
    LAST = PL.pi >= 0 ? { pi: PL.pi, i: PL.i, mode: PL.mode } : null;
    PL = { pi: -1, i: -1 }; PG.guest = false;
    $("pbox").innerHTML = PG.poster || ""; setShortMode(!!PG.posterShort);   // ถอดวิดีโอออก เสียงหยุด
    $("pnext").hidden = true; $("pyt").hidden = true; var pv0 = $("pprev"); if (pv0) { pv0.hidden = true; } var fb = $("pfb"); if (fb) { fb.hidden = true; }
    [].forEach.call($("res").querySelectorAll(".pstep.on"), function (x) { x.classList.remove("on"); });
    markPlaying(false); w.classList.add("player-hidden"); var sw = $("pshow"); if (sw) { sw.hidden = false; } applyFocus(); updateSections();
  }
  function markPlaying(on) { var w = $("res").querySelector(".pwrap"), pp = $("pplayer"); if (w) { w.classList.toggle("playing", on); } if (pp) { pp.classList.toggle("is-playing", on); } applyFocus(); }
  function ytEmbed(s) { return '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(s.id) + "?autoplay=1&rel=0&playsinline=1" + (s.sec ? "&start=" + s.sec : "") + (s.end > s.sec ? "&end=" + s.end : "") + '" title="' + esc(s.q) + '" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'; }
  function viewPath(title) {
    var pi = -1; (D.paths || []).forEach(function (p, i) { if (p.title === title) { pi = i; } });
    PL = { pi: -1, i: -1 };
    if (pi < 0) { setView('<div class="rhead"><h2>ไม่พบเส้นทางนี้</h2>' + clearBtn() + '</div><p class="rn">ลองเลือกประตูจากหน้าแรกอีกครั้ง</p>'); toTop(); return; }
    var p = D.paths[pi], d = pDone(), n = pCount(pi), first = p.steps[0];
    setHdrH();
    var groups = [], gix = [];
    p.steps.forEach(function (s, i) { var last = groups[groups.length - 1], g = s.group || (last ? last.name : ""); if (!last || last.name !== g) { groups.push({ name: g, from: i, to: i }); } else { last.to = i; } gix[i] = groups.length - 1; });
    var hasG = groups.some(function (g) { return g.name; });
    PG = { pi: pi, groups: groups, gix: gix, has: hasG, guest: false, poster: '<button type="button" class="pposter" data-pplay="' + pi + ':0" aria-label="เริ่มฟังข้อที่ 1">' + imgTag({ id: first.id }) + '<span class="pplay">' + PLAY + "</span></button>", posterShort: !!first.only };
    var tn = 0; D.paths.forEach(function (x, j) { if (j < pi && x.door) { tn++; } }); tn = p.door ? tn % 5 : 0;
    var intBtn = (FBK.url && INT_LABEL) ? '<button type="button" class="pbtn pint" data-fbint="1">' + esc(INT_LABEL) + "</button>" : "";
    var psec = hasG ? '<div class="psec" id="psec"><span class="psec-k" id="psecK"></span><b class="psec-t" id="psecT"></b><div class="pseg" id="pseg">' + groups.map(function (g, k) { return '<button type="button" class="pseg-i" data-gseg="' + k + '" aria-label="ไปที่ช่วงที่ ' + (k + 1) + ": " + esc(g.name) + '" title="' + esc(g.name) + '"><i></i></button>'; }).join("") + "</div></div>" : "";
    setView('<div class="rhead"><h2>' + esc(p.title) + "</h2>" + clearBtn() + '</div><p class="rn">เรียงจากพื้นฐานไปสู่คำถามที่ลึกขึ้น กด “ฟังคำตอบ” แล้ววิดีโอจะเล่นตรงช่วงนั้น โดยเส้นทางยังอยู่ให้เห็นข้าง ๆ ไม่ต้องดูทั้งคลิป</p>' +
      '<div class="pwrap' + (first.only ? " short-mode" : "") + '" style="--tint:var(--dt' + tn + ')"><div class="pdim" aria-hidden="true"></div><button type="button" class="pshow" id="pshow" data-pshow="1" hidden>' + PLAY + ' เปิดตัวเล่น</button><div class="pside"><div class="pplayer' + (first.only ? " shorty" : "") + '" id="pplayer"><div class="pbar2"><button type="button" class="pbtn" id="pfocus" data-pfocus="1">ดูพร้อมรายการ</button><button type="button" class="pbtn" data-phide="1">✕ ซ่อนวิดีโอ</button></div>' + psec + '<div class="pbox' + (first.only ? " is-short" : "") + '" id="pbox"><button type="button" class="pposter" data-pplay="' + pi + ':0" aria-label="เริ่มฟังข้อที่ 1">' + imgTag({ id: first.id }) + '<span class="pplay">' + PLAY + '</span></button></div>' +
      '<div class="pnow" id="pnow"><span class="pnow-k" id="pnowk">เริ่มที่ข้อ 1</span><b id="pnowq">' + esc(first.q.replace(/^คำถาม: /, "")) + '</b><p class="pdesc-now" id="pdescNow" hidden></p></div>' +
      '<div class="pctl"><button type="button" class="btn btn-line" id="pprev" data-pprev="1" hidden>◀ ก่อนหน้า</button><button type="button" class="btn btn-go" id="pnext" data-pnext="1" hidden>ฟังเสร็จแล้ว ไปข้อถัดไป ▸</button><a class="pyt" id="pyt" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + first.id + (first.sec ? "&t=" + first.sec + "s" : "") + '" hidden>เปิดบน YouTube ↗</a>' + (FBK.url ? '<button type="button" class="rr-fb" id="pfb" data-fbp="' + pi + ':0" hidden>⚑ แจ้งปัญหาข้อนี้</button>' : "") + intBtn + "</div></div></div>" +
      '<div class="pmain"><div class="pbar"><span id="pcnt">ฟังแล้ว ' + n + " จาก " + p.steps.length + '</span><i><b id="pfill" style="width:' + (100 * n / p.steps.length) + '%"></b></i></div>' +
      '<ol class="psteps">' + (function () { var lastG = null; return p.steps.map(function (s, i) {
        var dn = !!d[pKey(pi, i)], head = "";
        if (s.group && s.group !== lastG) { head = '<li class="pgroup" data-g="' + gix[i] + '" role="heading" aria-level="3"><span class="pg-n">ช่วงที่ ' + (gix[i] + 1) + '</span><span class="pg-t">' + esc(s.group) + '</span><span class="pg-c"></span></li>'; } lastG = s.group || lastG;
        return head + '<li class="pstep' + (dn ? " done" : "") + (s.only ? " only" : "") + '" data-i="' + i + '"><span class="pnode" aria-hidden="true">' + (dn ? "✓" : (i + 1)) + "</span><h3>" + esc(s.q.replace(/^คำถาม: /, "")) + "</h3>" + descHtml(s) +
          '<div class="pacts">' + (s.only
            ? '<button type="button" class="btn btn-go" data-pplay="' + pi + ":" + i + ':s">' + PLAY + " ฟังคลิปสั้น</button>"
            : s.short
            ? '<button type="button" class="btn btn-go" data-pplay="' + pi + ":" + i + ':s">' + PLAY + ' ฟังฉบับสั้น</button><button type="button" class="btn btn-line" data-pplay="' + pi + ":" + i + '">ฟังช่วงเต็ม ตั้งแต่นาทีที่ ' + fmtClock(s.sec) + "</button>"
            : '<button type="button" class="btn btn-go" data-pplay="' + pi + ":" + i + '">' + PLAY + " ฟังคำตอบ ตั้งแต่นาทีที่ " + fmtClock(s.sec) + "</button>") + '<button type="button" class="pmark" data-pmark="' + pi + ":" + i + '" aria-pressed="' + dn + '">' + (dn ? "ฟังแล้ว" : "ทำเครื่องหมายว่าฟังแล้ว") + "</button>" + (!s.only && s.end > s.sec ? '<span class="pdur">ช่วงนี้ประมาณ ' + Math.max(1, Math.round((s.end - s.sec) / 60)) + " นาที (" + fmtClock(s.sec) + "–" + fmtClock(s.end) + ")</span>" : "") + "</div></li>";
      }).join(""); })() + "</ol>" +
      (function () { var gl = (D.guests || []).map(function (g, gi) { return { g: g, gi: gi }; }).filter(function (x) { return x.g.pathList.indexOf(p.title) >= 0; });
        return gl.length ? '<section class="pguests"><h3>ฟังเรื่องของคนที่เคยอยู่ตรงนี้</h3><p>ผู้ร่วมทางที่ยินยอมให้เล่าเรื่องของตัวเอง ฟังเมื่อพร้อม ไม่ต้องเห็นด้วยกับทุกอย่าง</p><div class="gcards">' + gl.map(function (x) { return guestCard(x.g, x.gi); }).join("") + '</div><p class="pg-all"><a href="#guests">เรื่องราวจากผู้ร่วมทางทั้งหมด →</a></p></section>' : ""; })() +
      (p.series && p.series.length ? '<section class="pser"><h3>อยากเรียนต่อเป็นชุด</h3><p>ซีรีส์ที่เข้ากับเส้นทางนี้ เปิดเพลย์ลิสต์ดูต่อเนื่องบน YouTube</p><div class="pser-l">' + p.series.map(function (x) {
        var lv = x.level === 1 ? "เหมาะกับคนเพิ่งเริ่ม" : x.level === 3 ? "เจาะลึก" : "พอมีพื้นฐาน", meta = esc((x.count ? x.count + " · " : "") + lv + (x.tag ? " · " + x.tag : "")), body = "<b>" + esc(x.title) + "</b><span>" + meta + (x.soon ? " · ลิงก์เพลย์ลิสต์กำลังจะมา" : "") + "</span>";
        return x.soon ? '<div class="pser-i">' + body + "</div>" : '<a class="pser-i" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + body + " <i aria-hidden=\"true\">↗</i></a>";
      }).join("") + "</div></section>" : "") +
      '<section class="pmore"><h3>อยากเดินต่อทางไหนอีก</h3><div class="chips">' + D.paths.filter(function (x, j) { return j !== pi && x.door; }).map(function (x) { return '<a class="chip" href="#path=' + encodeURIComponent(x.title) + '">' + esc(x.title) + "</a>"; }).join("") + "</div></section></div></div>");
    document.title = p.title + " | ARIF SALAFI"; LAST = null; updateSections(); applyFocus(); toTop();
    if (AUTO && AUTO.title === p.title) { var au = AUTO; AUTO = null; if (au.i >= 0 && p.steps[au.i]) { playStep(pi, au.i, p.steps[au.i].short ? "s" : ""); } }
  }
  function descHtml(s) {
    if (s.sum) { return '<p class="pdesc">' + esc(s.sum) + "</p>"; }
    return EDIT ? '<p class="pdesc pdesc-empty">เขียนคำอธิบายคลิปที่นี่ · ชีต เส้นทาง · คอลัมน์ สรุป · แถวของ “' + esc(s.q.length > 40 ? s.q.slice(0, 40) + "…" : s.q) + "”</p>" : "";
  }
  function playStep(pi, i, mode) {
    var p = D.paths[pi], s = p && p.steps[i]; if (!s) { return; }
    var sh = (mode === "s" || s.only) && s.short;   // ฉบับสั้น (คลิปสั้นที่ตัดมาแล้ว) ถ้ามี
    showPlayer(); PL = { pi: pi, i: i, mode: sh ? "s" : "" }; PG.guest = false; markPlaying(true);
    setShortMode(!!sh); $("pbox").innerHTML = ytEmbed(sh ? { id: s.short, sec: 0, end: 0, q: s.q } : s);
    $("pnowk").textContent = "กำลังฟังข้อ " + (i + 1) + " จาก " + p.steps.length + (sh ? " · ฉบับสั้น" : (s.end > s.sec ? " · เล่นเฉพาะช่วงนี้ (ถึง " + fmtClock(s.end) + ")" : "")); $("pnowq").textContent = s.q.replace(/^คำถาม: /, ""); var pdn = $("pdescNow"); if (pdn) { pdn.textContent = s.sum || ""; pdn.hidden = !s.sum; }
    var yt = $("pyt"); yt.href = sh ? "https://www.youtube.com/shorts/" + s.short : "https://www.youtube.com/watch?v=" + s.id + (s.sec ? "&t=" + s.sec + "s" : ""); yt.hidden = false;
    var nx = $("pnext"); nx.hidden = false; nx.textContent = i + 1 < p.steps.length ? "ฟังเสร็จแล้ว ไปข้อถัดไป ▸" : "ฟังเสร็จแล้ว จบเส้นทางนี้ ✓"; var pv = $("pprev"); if (pv) { pv.hidden = i === 0; }
    var fb = $("pfb"); if (fb) { fb.setAttribute("data-fbp", pi + ":" + i); fb.hidden = false; }
    [].forEach.call($("res").querySelectorAll(".pstep"), function (li) { li.classList.toggle("on", +li.getAttribute("data-i") === i); });
    var cur = $("res").querySelector('.pstep[data-i="' + i + '"]'); if (cur) { var r = cur.getBoundingClientRect(), hh = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--hdrh"), 10) || 96) + 12; if (r.top < hh || r.bottom > window.innerHeight - 20) { jumpTo(window.scrollY + r.top - hh - (window.innerWidth < 980 ? 250 : 0)); } }
    updateSections();
  }
  function nextStep() {
    if (PL.pi < 0) { return; }
    var p = D.paths[PL.pi], k = pKey(PL.pi, PL.i), d = pDone(); if (!d[k]) { d[k] = 1; pSave(d); }
    var li = $("res").querySelector('.pstep[data-i="' + PL.i + '"]');
    if (li) { li.classList.add("done"); li.querySelector(".pnode").textContent = "✓"; var mk = li.querySelector(".pmark"); mk.setAttribute("aria-pressed", "true"); mk.textContent = "ฟังแล้ว"; }
    var n = pCount(PL.pi); $("pcnt").textContent = "ฟังแล้ว " + n + " จาก " + p.steps.length; $("pfill").style.width = (100 * n / p.steps.length) + "%"; updateSections();
    if (PL.i + 1 < p.steps.length) { playStep(PL.pi, PL.i + 1, p.steps[PL.i + 1].short ? "s" : ""); }
    else { setShortMode(false); $("pbox").innerHTML = '<div class="pend"><b>จบเส้นทางนี้แล้ว</b><span>กลับไปดูรายการ หรือเลือกเส้นทางอื่นต่อก็ได้</span><div class="pend-b"><button type="button" class="btn btn-go" data-phide="1">กลับไปรายการ</button>' + ((FBK.url && INT_LABEL) ? '<button type="button" class="pbtn pint" data-fbint="1">' + esc(INT_LABEL) + "</button>" : "") + "</div></div>"; $("pnext").hidden = true; var pv1 = $("pprev"); if (pv1) { pv1.hidden = true; } $("pnowk").textContent = "ฟังครบแล้ว " + p.steps.length + " ข้อ"; [].forEach.call($("res").querySelectorAll(".pstep.on"), function (x) { x.classList.remove("on"); }); PL = { pi: -1, i: -1 }; markPlaying(false); updateSections(); }
  }
  function guestCard(g, gi) {
    REG["g" + gi] = { k: "ans", id: g.id, sec: g.sec, q: g.q || g.name, title: "เรื่องของ " + g.name, summary: g.bg || "" };
    return '<article class="gcard"><h4>' + esc(g.name) + "</h4>" + (g.bg ? '<p class="g-bg">' + esc(g.bg) + "</p>" : "") + (g.q ? '<p class="g-q">“' + esc(g.q) + "”</p>" : "") +
      '<button type="button" class="btn btn-line" data-gplay="' + gi + '">' + PLAY + " ฟังเรื่องของเขา ตั้งแต่นาทีที่ " + fmtClock(g.sec) + "</button></article>";
  }
  function viewGuests() {
    var gs = D.guests || [];
    setView('<div class="rhead"><h2>เรื่องราวจากผู้ร่วมทาง</h2>' + clearBtn() + '</div><p class="rn">คนเหล่านี้เคยอยู่ในจุดที่คุณอาจกำลังอยู่ และยินยอมให้เล่าเรื่องของตัวเอง ฟังได้ตามสบาย ไม่มีข้อใดที่ต้องเห็นด้วย</p>' +
      (gs.length ? '<div class="gcards">' + gs.map(guestCard).join("") + "</div>" : '<p class="rn">ยังไม่มีเรื่องราวให้แสดง</p>'));
    document.title = "เรื่องราวจากผู้ร่วมทาง | ARIF SALAFI"; toTop();
  }
  function playGuest(gi) {
    var g = (D.guests || [])[gi]; if (!g) { return; }
    if (!$("pbox")) { openPlayer(REG["g" + gi]); return; }   // หน้าอื่นที่ไม่มีตัวเล่นข้างเส้นทาง ใช้หน้าต่างเล่น
    showPlayer(); PL = { pi: -1, i: -1 }; PG.guest = true; markPlaying(true);
    setShortMode(false); $("pbox").innerHTML = ytEmbed({ id: g.id, sec: g.sec, q: g.q || g.name });
    $("pnowk").textContent = "กำลังฟังเรื่องของ " + g.name; $("pnowq").textContent = g.q || g.bg || "";
    var yt = $("pyt"); yt.href = "https://www.youtube.com/watch?v=" + g.id + (g.sec ? "&t=" + g.sec + "s" : ""); yt.hidden = false;
    $("pnext").hidden = true; var fb = $("pfb"); if (fb) { fb.hidden = true; }
    [].forEach.call($("res").querySelectorAll(".pstep.on"), function (x) { x.classList.remove("on"); }); updateSections();
  }
  /* ---------------- เรื่องเล่า: เส้นทางแบบเลื่อนอ่าน มีข้อความ มีวิดีโอแทรก และโหมดนั่งฟังสบาย ๆ ----------------
     ข้อความเล่าเรื่องมาจากแท็บ เรื่องเล่า (ไม่บังคับ) ชื่อบทและคลิปมาจากแท็บ เส้นทาง (ช่วง = บท) */
  var ST = { pi: -1, playing: null, ch: 0 };
  var HUES = ["150deg", "0deg", "28deg", "-42deg", "92deg"];
  function tr(x) { return String(x == null ? "" : x).trim(); }
  function par(x) { return "<p>" + esc(x).replace(/\n+/g, "</p><p>") + "</p>"; }
  function pathTail(pi, p) {
    return (function () { var gl = (D.guests || []).map(function (g, gi) { return { g: g, gi: gi }; }).filter(function (x) { return x.g.pathList.indexOf(p.title) >= 0; });
        return gl.length ? '<section class="pguests"><h3>ฟังเรื่องของคนที่เคยอยู่ตรงนี้</h3><p>ผู้ร่วมทางที่ยินยอมให้เล่าเรื่องของตัวเอง ฟังเมื่อพร้อม ไม่ต้องเห็นด้วยกับทุกอย่าง</p><div class="gcards">' + gl.map(function (x) { return guestCard(x.g, x.gi); }).join("") + '</div><p class="pg-all"><a href="#guests">เรื่องราวจากผู้ร่วมทางทั้งหมด →</a></p></section>' : ""; })() +
      (p.series && p.series.length ? '<section class="pser"><h3>อยากเรียนต่อเป็นชุด</h3><p>ซีรีส์ที่เข้ากับเส้นทางนี้ เปิดเพลย์ลิสต์ดูต่อเนื่องบน YouTube</p><div class="pser-l">' + p.series.map(function (x) {
        var lv = x.level === 1 ? "เหมาะกับคนเพิ่งเริ่ม" : x.level === 3 ? "เจาะลึก" : "พอมีพื้นฐาน", meta = esc((x.count ? x.count + " · " : "") + lv + (x.tag ? " · " + x.tag : "")), body = "<b>" + esc(x.title) + "</b><span>" + meta + (x.soon ? " · ลิงก์เพลย์ลิสต์กำลังจะมา" : "") + "</span>";
        return x.soon ? '<div class="pser-i">' + body + "</div>" : '<a class="pser-i" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + body + " <i aria-hidden=\"true\">↗</i></a>";
      }).join("") + "</div></section>" : "") +
      '<section class="pmore"><h3>อยากเดินต่อทางไหนอีก</h3><div class="chips">' + D.paths.filter(function (x, j) { return j !== pi && x.door; }).map(function (x) { return '<a class="chip" href="#path=' + encodeURIComponent(x.title) + '">' + esc(x.title) + "</a>"; }).join("") + "</div></section>";
  }
  function stModel(pi) {
    var p = D.paths[pi], chs = [], intro = [];
    p.steps.forEach(function (s, i) {
      var g = s.group || (chs.length ? chs[chs.length - 1].name : ""), last = chs[chs.length - 1];
      if (!last || last.name !== g) { last = { name: g, steps: [], texts: [], quotes: [] }; chs.push(last); }
      last.steps.push({ s: s, i: i });
    });
    (D.story || []).filter(function (r) { return r.pathName === p.title; }).forEach(function (r) {
      var kind = tr(r.kind), c = null;
      if (kind === "เปิดเรื่อง" || !tr(r.ch)) { intro.push(r.text); return; }
      chs.forEach(function (x) { if (x.name === tr(r.ch)) { c = x; } });
      if (!c) { return; }
      (kind === "คำพูดเด่น" ? c.quotes : c.texts).push(r.text);
    });
    return { p: p, pi: pi, chs: chs, intro: intro };
  }
  function stDurLabel(s, sh) {
    if (sh) { return "คลิปสั้น · ประมาณ 1 นาที"; }
    return s.end > s.sec ? "ประมาณ " + Math.max(1, Math.round((s.end - s.sec) / 60)) + " นาที" : "ตั้งแต่นาทีที่ " + fmtClock(s.sec);
  }
  function stCard(pi, it, bgn) {
    var s = it.s, i = it.i, sh = !!(s.only || s.short), seen = !!pDone()[pKey(pi, i)], title = s.q.replace(/^คำถาม: /, "");
    var poster = '<div class="st-poster" role="button" tabindex="0" data-stplay="' + pi + ":" + i + ":" + (sh ? "s" : "") + '" aria-label="เล่นคลิป: ' + esc(title) + '"><img class="pimg" alt="" loading="lazy" src="' + ART_BASE + "bg-ch" + bgn + '.webp"><span class="st-play">' + PLAY + '</span><div class="st-ov"><span class="st-dur">' + stDurLabel(s, sh) + (seen ? " · ฟังแล้ว ✓" : "") + '</span><div class="st-ttl">' + esc(title) + "</div></div></div>";
    var cap = descHtml(s) + (s.short && !s.only ? '<button type="button" class="st-full" data-stplay="' + pi + ":" + i + ':">ฟังช่วงเต็ม ตั้งแต่นาทีที่ ' + fmtClock(s.sec) + "</button>" : "") + (FBK.url ? '<button type="button" class="st-rep" data-fbp="' + pi + ":" + i + '">⚑ แจ้งปัญหา</button>' : "");
    return '<figure class="st-card ' + (sh ? "v" : "w") + '" data-i="' + i + '">' + poster + "<figcaption>" + cap + "</figcaption></figure>";
  }
  function viewStory(title) {
    var pi = -1; (D.paths || []).forEach(function (p, i) { if (p.title === title) { pi = i; } });
    PL = { pi: -1, i: -1 }; ST.playing = null;
    if (pi < 0) { return viewPath(title); }
    setHdrH();
    var m = stModel(pi), p = m.p, tn = 0; D.paths.forEach(function (x, j) { if (j < pi && x.door) { tn++; } }); tn = p.door ? tn % 5 : 0;
    var total = p.steps.length, nch = m.chs.length, d = pDone(), seen = pCount(pi), firstNew = -1;
    m.chs.forEach(function (c, k) { c.steps.forEach(function (it) { if (firstNew < 0 && !d[pKey(pi, it.i)]) { firstNew = k; } }); });
    var introP = m.intro.length ? m.intro : (p.desc ? [p.desc] : []);
    var sub = introP[0] ? par(introP[0]) : "<p>เรื่องเล่า " + nch + " บท ไม่ต้องเห็นด้วยกับทุกอย่าง หยุดตรงไหนก็ได้ จะนั่งฟังเฉย ๆ หรืออ่านเองก็ได้</p>";
    var h = '<article class="st" id="st" data-pi="' + pi + '" style="--tint:var(--dt' + tn + ");--hue:" + HUES[tn] + '">' +
      '<section class="st-open"><div class="st-art" aria-hidden="true"><picture><source media="(max-width:859px)" srcset="' + ART_BASE + 'scene-hero-mobile.webp"><img src="' + ART_BASE + 'scene-hero.webp" alt=""></picture></div><div class="st-in">' +
      '<div class="st-top">' + clearBtn() + '</div><div class="st-k">' + (p.door ? "ประตูที่ " + (tn + 1) + " · " : "") + 'เรื่องเล่า</div><h1>' + esc(p.title) + '</h1><div class="st-sub">' + sub + introP.slice(1).map(par).join("") + "</div>" +
      '<div class="st-chips"><span>' + nch + " บท</span><span>" + total + " คลิป</span><span>ประมาณ " + pathMinutes(p) + ' นาที</span></div>' +
      '<div class="st-cta"><button type="button" class="st-p" data-stlb="' + pi + '">' + PLAY + 'นั่งฟังสบาย ๆ</button><button type="button" class="st-s" data-stread="0">อ่านเอง ↓</button>' + (seen > 0 && firstNew > 0 ? '<button type="button" class="st-s" data-stread="' + firstNew + '">ต่อจากที่ค้าง · บทที่ ' + (firstNew + 1) + "</button>" : "") + "</div></div></section>" +
      '<div class="st-body">' + m.chs.map(function (c, k) {
        var nm = c.name || "คลิปในเรื่องนี้", bgn = k % 5 + 1, rail = c.steps.length >= 4;
        return '<section class="st-ch" id="sc' + k + '" data-t="' + esc(nm) + '" style="--bgimg:url(' + ART_BASE + "bg-ch" + bgn + '.webp)"><div class="st-w"><div class="st-h rv"><span class="st-n">' + pad(k + 1) + "</span><h2>" + esc(nm) + "</h2></div>" +
          (c.texts.length ? '<div class="st-read rv">' + c.texts.map(par).join("") + "</div>" : (EDIT ? '<p class="pdesc pdesc-empty">เขียนข้อความเล่าเรื่องของบทนี้ที่ชีต เรื่องเล่า · เส้นทาง “' + esc(p.title) + "” · ช่วง “" + esc(nm) + "” · ชนิด ข้อความ</p>" : "")) +
          '<div class="st-cl' + (rail ? " rail" : "") + ' rv">' + c.steps.map(function (it) { return stCard(pi, it, bgn); }).join("") + "</div>" +
          c.quotes.map(function (q) { return '<blockquote class="st-pq rv">' + esc(q) + "</blockquote>"; }).join("") + "</div></section>";
      }).join("") + "</div>";
    var nxt = null; D.paths.forEach(function (x, j) { if (!nxt && j > pi && x.door) { nxt = x; } }); if (!nxt) { D.paths.forEach(function (x, j) { if (!nxt && j !== pi && x.door) { nxt = x; } }); }
    h += '<section class="st-end"><div class="st-art" aria-hidden="true"><img src="' + ART_BASE + 'scene-end.webp" alt=""></div><div class="st-in c"><div class="st-k">ถึงตรงนี้แล้ว</div><h2>คุณอยู่ตรงไหนตอนนี้?</h2><p class="st-sub">ไม่ต้องตอบในใจให้ครบ เลือกทางที่รู้สึกว่าใช่ที่สุดตอนนี้ได้เลย</p><div class="st-next">' +
      (nxt ? '<a href="#path=' + encodeURIComponent(nxt.title) + '"><small>ไปต่อ</small><b>' + esc(nxt.title) + "</b><span>เรื่องเล่าอีกเรื่อง</span></a>" : "") +
      (FBK.url ? '<a href="#" data-fbask="1"><small>ยังมีข้อสงสัย</small><b>ฝากคำถามไว้ให้ทีม</b><span>ถ้าที่นี่ยังไม่ตอบ บอกได้เลย</span></a>' : "") +
      (FBK.url && INT_LABEL ? '<a href="#" data-fbint="1"><small>เมื่อพร้อม</small><b>' + esc(INT_LABEL) + '</b><span>ไม่รีบ ไม่กดดัน และไม่ต้องบอกว่านับถืออะไร</span></a>' : "") +
      '</div><p class="st-safe">ความคืบหน้าถูกจดไว้ในเครื่องของคุณเท่านั้น ไม่ส่งไปที่ใด</p></div></section>' +
      '<div class="st-tail">' + pathTail(pi, p) + '<p class="st-list"><a href="#list=' + encodeURIComponent(p.title) + '">ดูแบบรายการข้อ (แบบเดิม)</a></p></div>' +
      '<nav class="st-dots" id="stDots" aria-label="บทในเรื่องนี้">' + m.chs.map(function (c, k) { return '<a href="#sc' + k + '" data-k="' + k + '" aria-label="บทที่ ' + (k + 1) + ": " + esc(c.name || "คลิป") + '"><span>' + (k + 1) + " · " + esc(c.name || "คลิป") + "</span></a>"; }).join("") + "</nav></article>";
    setView(h);
    document.title = p.title + " | ARIF SALAFI"; ST.pi = pi; stInit(); toTop();
    if (AUTO && AUTO.title === p.title) { var au = AUTO; AUTO = null; if (au.i >= 0) { lxOpen(pi, au.i); } }
  }
  function stInit() {
    var root = $("st"); if (!root) { return; }
    var els = [].slice.call(root.querySelectorAll(".rv"));
    if ("IntersectionObserver" in window && !reduceMotion()) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .1, rootMargin: "0px 0px -6% 0px" });
      els.forEach(function (el) { io.observe(el); });
    } else { els.forEach(function (el) { el.classList.add("in"); }); }
    stScroll();
  }
  function stScroll() {
    var root = $("st"); if (!root) { return; }
    var mid = window.innerHeight * .45, cur = -1, end = $("st").querySelector(".st-end"), atEnd = end && end.getBoundingClientRect().top < mid;
    [].forEach.call(root.querySelectorAll(".st-ch"), function (s, k) { if (s.getBoundingClientRect().top < mid) { cur = k; } });
    [].forEach.call(root.querySelectorAll(".st-dots a"), function (a, k) { a.classList.toggle("on", !atEnd && k === cur); });
    var dots = root.querySelector(".st-dots"); if (dots) { dots.classList.toggle("show", cur >= 0 && !atEnd); }
  }
  var stTick = false; window.addEventListener("scroll", function () { if (!stTick && $("st")) { stTick = true; requestAnimationFrame(function () { stTick = false; stScroll(); }); } }, { passive: true });
  function stStop() {
    var pl = ST.playing; if (!pl) { return; }
    pl.el.innerHTML = pl.html; pl.el.classList.remove("on"); var card = pl.el.closest(".st-card"); if (card) { card.classList.remove("full"); } ST.playing = null;
  }
  function stPlay(btn) {
    var parts = btn.getAttribute("data-stplay").split(":"), pi = +parts[0], i = +parts[1], mode = parts[2], p = D.paths[pi], s = p && p.steps[i]; if (!s) { return; }
    var card = btn.closest(".st-card"), poster = card.querySelector(".st-poster"); if (ST.playing && ST.playing.el === poster) { stStop(); }
    stStop();
    var sh = mode === "s" && s.short; ST.playing = { el: poster, html: poster.innerHTML };
    poster.classList.add("on"); card.classList.toggle("full", !sh); poster.innerHTML = ytEmbed(sh ? { id: s.short, sec: 0, end: 0, q: s.q } : s);
    var d = pDone(), k = pKey(pi, i); if (!d[k]) { d[k] = 1; pSave(d); }
    ST.playing.html = ST.playing.html.replace(/<span class="st-dur">([^<]*?)(?: · ฟังแล้ว ✓)?<\/span>/, '<span class="st-dur">$1 · ฟังแล้ว ✓</span>');
  }
  /* โหมดนั่งฟังสบาย ๆ: เล่นต่อเนื่องทีละจังหวะ ข้อความรอผู้ชมแตะเอง คลิปจบแล้วหยุดสักครู่แล้วไปต่อ ไม่มีแถบนับเวลา */
  var LX = { el: null, B: [], i: 0, paused: false, last: 0, t: 0, dur: Infinity, raf: 0, open: false, auto: true, m: null, ended: false, endT: 0 };
  var LX_PAUSE = 3200;
  function lxBeats(m) {
    var B = [{ t: "title" }];
    m.chs.forEach(function (c, k) {
      B.push({ t: "ch", c: k });
      c.texts.forEach(function (x) { B.push({ t: "text", x: x, c: k }); });
      c.steps.forEach(function (it) { B.push(it.s.only || it.s.short ? { t: "clip", c: k, i: it.i, mode: "s" } : { t: "opt", c: k, i: it.i }); });
      c.quotes.forEach(function (x) { B.push({ t: "text", x: x, c: k, q: 1 }); });
    });
    B.push({ t: "end" }); return B;
  }
  function lxBuild() {
    if (LX.el) { return LX.el; }
    var d = document.createElement("div"); d.className = "lbx"; d.id = "lbx"; d.hidden = true; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "โหมดนั่งฟังสบาย ๆ");
    d.innerHTML = '<div class="lbx-art" id="lbxArt" aria-hidden="true"></div><div class="lbx-scrim"></div>' +
      '<div class="lbx-top"><div class="lbx-dots" id="lbxDots" aria-hidden="true"></div><div class="lbx-row"><span class="lbx-ch" id="lbxCh"></span><button type="button" class="lbx-x on" id="lbxAuto" aria-pressed="true">เดินต่อเองหลังคลิปจบ: เปิด</button><button type="button" class="lbx-x" id="lbxRead">อ่านเอง</button><button type="button" class="lbx-x" id="lbxClose" aria-label="ปิด">✕</button></div></div>' +
      '<div class="lbx-zl" id="lbxZl"></div><div class="lbx-zr" id="lbxZr"></div><div class="lbx-stage" id="lbxStage"></div>' +
      '<div class="lbx-ctl"><button type="button" id="lbxPrev" aria-label="ย้อนกลับ">◀</button><button type="button" class="big" id="lbxPlay" aria-label="หยุดชั่วคราว">❚❚</button><button type="button" id="lbxNext" aria-label="ข้าม">▶</button></div><div class="lbx-hint">แตะหรือ Space ไปต่อ · ← → ย้อน/ข้าม · Esc ปิด</div>';
    document.body.appendChild(d); LX.el = d;
    $("lbxClose").addEventListener("click", function () { lxClose(); });
    $("lbxRead").addEventListener("click", lxToRead);
    $("lbxPlay").addEventListener("click", function () { lxPause(!LX.paused); });
    $("lbxNext").addEventListener("click", function () { lxGo(LX.i + 1); });
    $("lbxPrev").addEventListener("click", function () { lxGo(LX.i - 1); });
    $("lbxZl").addEventListener("click", function () { lxGo(LX.i - 1); });
    $("lbxZr").addEventListener("click", function () { lxGo(LX.i + 1); });
    $("lbxAuto").addEventListener("click", function () { LX.auto = !LX.auto; this.setAttribute("aria-pressed", LX.auto); this.classList.toggle("on", LX.auto); this.textContent = "เดินต่อเองหลังคลิปจบ: " + (LX.auto ? "เปิด" : "ปิด"); });
    $("lbxStage").addEventListener("click", function (e) {
      var a = e.target.closest("[data-lxact]");
      if (!a) { var t = LX.B[LX.i] && LX.B[LX.i].t; if (t === "text" || t === "title") { lxGo(LX.i + 1); } return; }
      e.preventDefault(); var k = a.getAttribute("data-lxact"), b = LX.B[LX.i];
      if (k === "skip") { lxGo(LX.i + 1); } else if (k === "long") { LX.B.splice(LX.i, 1, { t: "clip", c: b.c, i: b.i, mode: "" }); lxRender(); } else if (k === "close") { lxClose(); } else if (k === "read") { lxToRead(); }
    });
    document.addEventListener("keydown", function (e) {
      if (!LX.open) { return; }
      var t = LX.B[LX.i] && LX.B[LX.i].t;
      if (e.key === "Escape") { e.preventDefault(); lxClose(); } else if (e.key === "ArrowRight") { e.preventDefault(); lxGo(LX.i + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); lxGo(LX.i - 1); }
      else if ((e.key === " " || e.key === "Enter") && !(e.target && e.target.closest && e.target.closest("button,a"))) { e.preventDefault(); if (t === "text" || t === "title") { lxGo(LX.i + 1); } else if (e.key === " ") { lxPause(!LX.paused); } }
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden && LX.open) { lxPause(true); } });
    window.addEventListener("message", function (e) {
      if (!LX.open || !/youtube/.test(e.origin)) { return; }
      var dd = e.data; if (typeof dd === "string") { try { dd = JSON.parse(dd); } catch (x) { return; } } if (!dd) { return; }
      var s = dd.event === "onStateChange" ? dd.info : (dd.event === "infoDelivery" && dd.info ? dd.info.playerState : undefined);
      if (s === 0) { lxEnded(); }
    });
    return d;
  }
  function lxPost(func) { var f = $("lbxFrame"); if (f && f.contentWindow) { try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: "" }), "*"); } catch (e) {} } }
  function lxPause(v) { LX.paused = v; LX.last = performance.now(); $("lbxPlay").textContent = v ? "▶" : "❚❚"; $("lbxPlay").setAttribute("aria-label", v ? "เล่นต่อ" : "หยุดชั่วคราว"); LX.el.classList.toggle("paused", v); var t = LX.B[LX.i] && LX.B[LX.i].t; if (t === "clip") { lxPost(v ? "pauseVideo" : "playVideo"); } }
  function lxMark(i) { var b = LX.B[i]; if (!b || b.t !== "clip") { return; } var d = pDone(), k = pKey(LX.m.pi, b.i); if (!d[k]) { d[k] = 1; pSave(d); } }
  function lxEnded() { var b = LX.B[LX.i]; if (!b || b.t !== "clip" || LX.ended) { return; } LX.ended = true; LX.endT = 0; lxMark(LX.i); var vp = $("lbxStage").querySelector(".vp"); if (vp) { vp.classList.add("done"); } }
  function lxRender() {
    var b = LX.B[LX.i], m = LX.m, p = m.p, c = b.c, h = "", nm = c >= 0 && m.chs[c] ? (m.chs[c].name || "คลิปในเรื่องนี้") : "", s = b.i != null ? p.steps[b.i] : null, title = s ? s.q.replace(/^คำถาม: /, "") : "";
    LX.ended = false; LX.endT = 0;
    if (b.t === "title") { h = '<div class="lbx-beat lbx-title"><span class="k">เรื่องเล่า</span><h2>' + esc(p.title) + "</h2><p>เอนหลังแล้วฟังได้เลย ข้อความรอให้คุณอ่านจบแล้วแตะเอง ไม่ต้องรีบ ไม่ต้องเห็นด้วยกับทุกอย่าง</p></div>"; }
    else if (b.t === "ch") { h = '<div class="lbx-beat lbx-chb"><span class="n">' + pad(c + 1) + "</span><h3>" + esc(nm) + "</h3></div>"; }
    else if (b.t === "text") { h = '<div class="lbx-beat lbx-text' + (b.q ? " q" : "") + '"><p>' + esc(b.x).replace(/\n+/g, "<br>") + '</p><span class="cue2">แตะเพื่ออ่านต่อ</span></div>'; }
    else if (b.t === "clip") {
      var sh = b.mode === "s" && s.short, item = sh ? { id: s.short, sec: 0, end: 0 } : s, src = "https://www.youtube-nocookie.com/embed/" + esc(item.id) + "?autoplay=1&rel=0&playsinline=1&enablejsapi=1" + (location.protocol.indexOf("http") === 0 ? "&origin=" + encodeURIComponent(location.origin) : "") + (item.sec ? "&start=" + item.sec : "") + (item.end > item.sec ? "&end=" + item.end : "");
      h = '<div class="lbx-beat lbx-vid"><div class="vt"><span class="k">บทที่ ' + (c + 1) + " จาก " + m.chs.length + " · " + esc(nm) + "</span><h3>" + esc(title) + "</h3>" + (s.sum ? "<p>" + esc(s.sum) + "</p>" : "") + '</div><div class="vp' + (sh ? "" : " w") + '"><iframe id="lbxFrame" src="' + src + '" title="' + esc(title) + '" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><span class="ended">จบคลิปแล้ว · ไปต่อสักครู่ หรือกดข้ามได้</span></div></div>';
    }
    else if (b.t === "opt") {
      h = '<div class="lbx-beat lbx-opt"><span class="k">ช่วงยาว · ฟังหรือข้ามก็ได้</span><h3>' + esc(title) + "</h3>" + (s.sum ? "<p>" + esc(s.sum) + "</p>" : "") + '<p class="m">' + stDurLabel(s, false) + '</p><div class="row"><button type="button" class="lbx-b p" data-lxact="long">' + PLAY + ' ฟังเลย</button><button type="button" class="lbx-b" data-lxact="skip">ข้ามไป</button></div></div>';
    }
    else { h = '<div class="lbx-beat lbx-end"><span class="k">ถึงตรงนี้แล้ว</span><h3>คุณอยู่ตรงไหนตอนนี้?</h3><div class="st-next"><a href="#" data-lxact="read"><small>อยากอ่านเอง</small><b>กลับไปอ่านทั้งเรื่อง</b><span>เลื่อนอ่านตามจังหวะของคุณ</span></a><a href="#" data-lxact="close"><small>เสร็จแล้ว</small><b>ปิดโหมดนั่งฟัง</b><span>เลือกเรื่องอื่นต่อได้จากหน้านี้</span></a></div></div>'; }
    $("lbxStage").innerHTML = h;
    var fr = $("lbxFrame"); if (fr) { fr.addEventListener("load", function () { try { fr.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch (e) {} }); }
    LX.dur = b.t === "title" ? 5200 : b.t === "ch" ? 3200 : Infinity; LX.t = 0; LX.last = performance.now();
    var k = b.t === "end" ? m.chs.length + 1 : (c < 0 || c == null ? 0 : c + 1), ims = $("lbxArt").children; [].forEach.call(ims, function (el, j) { el.classList.toggle("on", j === (b.t === "title" ? 0 : b.t === "end" ? ims.length - 1 : 1 + (c % 5))); });
    $("lbxCh").textContent = c >= 0 && b.t !== "title" && b.t !== "end" ? "บทที่ " + (c + 1) + " จาก " + m.chs.length + " · " + nm : (b.t === "end" ? "จบเรื่อง" : "เริ่มเรื่อง");
    [].forEach.call($("lbxDots").children, function (el, j) { el.className = b.t === "end" || j < c ? "done" : (j === c ? "cur" : ""); });
    $("lbxPlay").textContent = LX.paused ? "▶" : "❚❚";
  }
  function lxTick(now) {
    if (!LX.open) { return; } LX.raf = requestAnimationFrame(lxTick); var dt = now - LX.last; LX.last = now;
    if (LX.paused) { return; }
    var b = LX.B[LX.i]; LX.t += dt;
    if (b.t === "clip") { if (LX.ended) { LX.endT += dt; if (LX.auto && LX.endT >= LX_PAUSE) { lxGo(LX.i + 1); } } }
    else if (isFinite(LX.dur) && LX.t >= LX.dur) { lxGo(LX.i + 1); }
  }
  function lxGo(i) {
    if (!LX.open) { return; } var cur = LX.B[LX.i]; if (cur && cur.t === "clip" && (LX.ended || LX.t > 8000)) { lxMark(LX.i); }
    if (i < 0) { i = 0; } if (i >= LX.B.length) { i = LX.B.length - 1; } LX.i = i; lxRender();
  }
  function lxOpen(pi, startStep) {
    var m = stModel(pi); LX.m = m; LX.B = lxBeats(m); LX.i = 0; LX.paused = false; LX.open = true;
    lxBuild(); var art = $("lbxArt"); art.innerHTML = [ART_BASE + "scene-hero.webp"].concat(m.chs.map(function (c, k) { return ART_BASE + "bg-ch" + (k % 5 + 1) + ".webp"; })).concat([ART_BASE + "scene-end.webp"]).map(function (u) { return '<img alt="" src="' + u + '">'; }).join("");
    var nb = Math.max(m.chs.length, 1); $("lbxDots").innerHTML = m.chs.map(function () { return "<i></i>"; }).join("");
    if (startStep != null && startStep > 0) { for (var j = 0; j < LX.B.length; j++) { if (LX.B[j].i === startStep) { LX.i = j; break; } } }
    LX.el.hidden = false; document.documentElement.classList.add("lbx-open"); $("lbxPlay").textContent = "❚❚"; lxRender();
    cancelAnimationFrame(LX.raf); LX.last = performance.now(); LX.raf = requestAnimationFrame(lxTick); $("lbxPlay").focus({ preventScroll: true });
  }
  function lxClose() { if (!LX.open) { return; } LX.open = false; cancelAnimationFrame(LX.raf); if ($("lbxStage")) { $("lbxStage").innerHTML = ""; } LX.el.hidden = true; document.documentElement.classList.remove("lbx-open"); var st = $("st"); if (st) { stScroll(); } }
  function lxToRead() { var b = LX.B[LX.i], c = b ? b.c : -1; lxClose(); var el = c >= 0 ? $("sc" + c) : null; if (el) { jumpTo(el.getBoundingClientRect().top + window.scrollY - 76); } else { var st = $("st"); if (st) { toTop(); } } }
  /* ---------------- บทความ: หน้ารวม หน้าอ่าน และบล็อกบนหน้าแรก ----------------
     ข้อมูลมาจากแท็บ บทความ ในชีต (หัวข้อ · หมวด · สรุป · เนื้อหา · วันที่ · ผู้เขียน · รหัสวิดีโอ · เวลาเริ่ม · ภาพปก · แสดง) */
  var ART = { cur: null };
  function hashStr(s) { var h = 0, i; s = String(s); for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }
  function artPlain(t) { return String(t).replace(/^#{2,3}\s+/gm, "").replace(/^>\s?/gm, "").replace(/^[-•]\s+/gm, "").replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim(); }
  function artDate(d) { var t = Date.parse(d); if (isNaN(t)) { return tr(d); } try { return new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return tr(d); } }
  /* ---- ธีมบทความสไตล์นิตยสาร (VII) ---------------------------------------------
     รูปปก: จับคู่จากชื่อหัวข้อกับ article-covers.js (ไฟล์ภาพอยู่ที่ images/covers/) ถ้าช่อง ภาพปก ในชีตเป็นลิงก์ https หรือ images/... จะใช้ตามชีตก่อน
     ธีม: ตั้ง ART_THEME ใน config.js เป็น "light" (กระดาษขาว) หรือ "dark" (พื้นดำเข้ากับเว็บ) */
  var COVER_DIR = String(C.ART_COVER_DIR || "images/covers/");
  var VT = C.ART_THEME === "dark" ? " vi-dark" : "";
  var VI = { tab: "latest", list: [] };
  var BUL = /^(?:\uD83D\uDCCD|\u2705|\uD83D\uDC49|\u2022|\u25AA|\u27A1|\uD83D\uDD39|\uD83D\uDD38)\uFE0F?\s*/;
  function artKey(t) { return String(t || "").replace(/[\s\u201C\u201D"'\u2018\u2019.]/g, ""); }
  function artClean(v) { v = tr(v); return /^\[merged\]/i.test(v) ? "" : v; }   // ค่า "[merged] ..." ที่ติดมากับเซลล์รวม ถือว่าว่าง
  function artImg(r, used) {
    var own = safeUrl(r.img), k = artKey(r.title), list = (window.ARTICLE_COVERS || {})[k] || [], t = Date.parse(r.date), ymds = [], i, hit = null;
    if (/^(https?:\/\/|images\/)/i.test(own)) { return { img: own, d: "" }; }
    var fn = tr(r.img); if (/^[\w\-. ()]+\.(?:jpe?g|png|webp|gif|avif)$/i.test(fn)) { return { img: COVER_DIR + encodeURIComponent(fn), d: "" }; }   // ชื่อไฟล์ เช่น cover_001.jpg อยู่ใน images/covers/
    if (!isNaN(t)) { var d = new Date(t); ymds = [d.toISOString().slice(0, 10), d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())]; }
    for (i = 0; i < list.length && hit === null; i++) { if (!used[k + "|" + i] && ymds.indexOf(list[i].d) >= 0) { hit = i; } }
    for (i = 0; i < list.length && hit === null; i++) { if (!used[k + "|" + i]) { hit = i; } }
    if (hit === null) { return { img: "", d: "" }; }
    used[k + "|" + hit] = 1;
    return { img: list[hit].f ? COVER_DIR + list[hit].f : "", d: list[hit].d || "" };
  }
  function artCut(s, n) {
    s = String(s); if (s.length <= n) { return s; }
    var o = "";
    try { var it = new Intl.Segmenter("th", { granularity: "word" }).segment(s)[Symbol.iterator](), g; while (!(g = it.next()).done) { if ((o + g.value.segment).length > n) { break; } o += g.value.segment; } }
    catch (e) { o = s.slice(0, n); }
    return o.replace(/\s+$/, "") + "…";
  }
  function artLead(body, title, n) {
    var parts = [], first = true;
    String(body).replace(/\r/g, "").split("\n").forEach(function (ln) {
      ln = ln.trim(); if (!ln || /^[.\u00B7]+$/.test(ln)) { return; }
      if (first) { first = false; if (artKey(ln) === artKey(title)) { return; } }
      parts.push(ln.replace(BUL, ""));
    });
    return artCut(artPlain(parts.join(" ")), n || 170);
  }
  function artAutoCat(a) {
    var text = norm(a.title + " " + a.body), tt = norm(a.title), best = "", top = 0;
    (D.autoRules || []).forEach(function (rule) {
      var sc = 0; (rule.kw || []).forEach(function (k) { if (k) { if (tt.indexOf(k) >= 0) { sc += 3; } sc += text.split(k).length - 1; } });
      if (sc > top) { top = sc; best = rule.p; }
    });
    return best || "บทความ";
  }
  // เนื้อหา: บรรทัดเดียวคือหนึ่งย่อหน้า (แบบเดิม) แต่ถ้าเนื้อหามีบรรทัดที่เป็นจุดเดี่ยว ๆ (โพสต์ที่ดึงมาจากเฟซบุ๊ก) จะใช้จุดนั้นเป็นตัวแบ่งย่อหน้า รวมบรรทัดที่ติดกันเป็นย่อหน้าเดียว และตัดบรรทัดแรกที่ซ้ำกับหัวข้อ
  function artBody(txt, title) {
    var raw = String(txt).replace(/\r/g, ""), fb = /^[ \t]*[.\u00B7][ \t]*$/m.test(raw), L = raw.split("\n"), out = [], i = 0, l, cur = [], first = true;
    function inl(s) { s = esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); return s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'); }
    function flush() { if (cur.length) { out.push("<p>" + inl(cur.join(" ")) + "</p>"); cur = []; } }
    while (i < L.length) {
      l = L[i].trim();
      if (fb && first && l) { first = false; if (artKey(l) === artKey(title)) { i++; continue; } }
      if (!l || (fb && /^[.\u00B7]+$/.test(l))) { flush(); i++; continue; }
      if (/^###\s+/.test(l)) { flush(); out.push("<h3>" + inl(l.replace(/^###\s+/, "")) + "</h3>"); i++; }
      else if (/^##\s+/.test(l)) { flush(); out.push("<h2>" + inl(l.replace(/^##\s+/, "")) + "</h2>"); i++; }
      else if (/^>\s?/.test(l)) { flush(); var q = []; while (i < L.length && /^>\s?/.test(L[i].trim())) { q.push(L[i].trim().replace(/^>\s?/, "")); i++; } out.push("<blockquote>" + inl(q.join(" ")) + "</blockquote>"); }
      else if (/^[-•]\s+/.test(l)) { flush(); var it = []; while (i < L.length && /^[-•]\s+/.test(L[i].trim())) { it.push("<li>" + inl(L[i].trim().replace(/^[-•]\s+/, "")) + "</li>"); i++; } out.push("<ul>" + it.join("") + "</ul>"); }
      else if (fb && BUL.test(l)) { flush(); out.push('<p class="b">' + inl(l.replace(BUL, "")) + "</p>"); i++; }
      else if (fb) { cur.push(l); i++; }
      else { out.push("<p>" + inl(l) + "</p>"); i++; }
    }
    flush(); return out.join("");
  }
  /* รูปปกเป็นโปสเตอร์แนวตั้งที่มีตัวอักษรอยู่ในรูป จึงไม่ครอบตัดและไม่ลดสี ถ้าไม่มีรูปจะขึ้นกล่องดำพร้อมหัวข้อ */
  document.addEventListener("load", function (e) {
    var i = e.target; if (!i || !i.classList || !i.classList.contains("vi-img") || !i.naturalHeight) { return; }
    if (i.parentNode.classList.contains("vi-cv") && Math.abs(i.naturalWidth / i.naturalHeight - 0.8) > 0.06) { i.classList.add("fit"); }
  }, true);
  document.addEventListener("error", function (e) {
    var i = e.target; if (!i || !i.classList || !i.classList.contains("vi-img")) { return; }
    var p = i.parentNode; if (p.classList.contains("vi-cv") || p.classList.contains("vi-stage")) { p.classList.add("vi-noimg"); } else { p.removeChild(i); }
  }, true);
  function viPh(a) { return '<span class="vi-ph"><span>' + esc(a.title) + "</span></span>"; }
  function viCover(a) {
    return '<span class="vi-cv' + (a.img ? "" : " vi-noimg") + '">' + (a.img ? '<img class="vi-img" src="' + esc(a.img) + '" alt="" loading="lazy">' : "") + viPh(a) + "</span>";
  }
  function viStage(a) {
    return '<span class="vi-stage' + (a.img ? "" : " vi-noimg") + '">' + (a.img ? '<img class="vi-img vi-bg" src="' + esc(a.img) + '" alt=""><img class="vi-img vi-main" src="' + esc(a.img) + '" alt="' + esc(a.title) + '">' : "") + viPh(a) + "</span>";
  }
  function viHref(a) { return "#article=" + encodeURIComponent(a.key); }
  function viChip(a) { return '<span class="vi-chip">' + (a.vid ? "วิดีโอ" : "บทความ") + "</span>"; }
  function viMeta(a) { return '<p class="vi-meta">' + (a.dateTxt ? "<span>" + esc(a.dateTxt) + "</span>" : "") + (a.by ? "<span>โดย " + esc(a.by) + "</span>" : "") + "<span>อ่านประมาณ " + a.read + " นาที</span></p>"; }
  function artCard(a) {
    return '<article class="vi-card"><a class="vi-cvl" href="' + viHref(a) + '" tabindex="-1" aria-hidden="true">' + viCover(a) + "</a>" +
      "<h3>" + viChip(a) + '<a href="' + viHref(a) + '">' + esc(a.title) + "</a></h3>" + viMeta(a) +
      '<p class="vi-ex">' + esc(a.sum || a.lead) + '</p><a class="vi-go" href="' + viHref(a) + '">อ่านต่อ ›</a></article>';
  }
  function drawArtHome() {
    var s = $("artSec"); if (!s) { return; }
    var L = D.articles || []; s.hidden = !L.length;
    if (L.length) { var g = $("artHome"); g.className = "vii vi-paper vi-grid vi-home" + VT; g.innerHTML = L.slice(0, 4).map(artCard).join(""); }
  }
  function viHeroInner() {
    var L = VI.list; if (!L.length) { return ""; }
    var a = L[0]; if (VI.tab === "long") { L.forEach(function (x) { if (x.len > a.len) { a = x; } }); }
    return '<a class="vi-hl" href="' + viHref(a) + '" tabindex="-1" aria-hidden="true">' + viStage(a) + "</a><div>" +
      '<div class="vi-tabs" role="group" aria-label="เลือกบทความเด่น"><button type="button" data-vitab="latest" aria-pressed="' + (VI.tab !== "long") + '">ล่าสุด</button><button type="button" data-vitab="long" aria-pressed="' + (VI.tab === "long") + '">อ่านยาวที่สุด</button></div>' +
      '<h2 class="vi-t"><a href="' + viHref(a) + '">' + esc(a.title) + "</a></h2>" + viMeta(a) + viChip(a) +
      '<p class="vi-ex">' + esc(a.sum || a.lead) + '</p><a class="vi-go" href="' + viHref(a) + '">อ่านต่อ ›</a>' +
      '<p class="vi-by"><b>หมวด</b><a href="#articles=' + encodeURIComponent(a.cat) + '">' + esc(a.cat) + "</a></p></div>";
  }
  function viMore() {
    var g = $("viGrid"), b = $("viMore"); if (!g) { return; }
    g.insertAdjacentHTML("beforeend", VI.list.slice(g.children.length, g.children.length + 12).map(artCard).join(""));
    var left = VI.list.length - g.children.length;
    if (b) { if (left > 0) { b.textContent = "แสดงเพิ่ม (เหลืออีก " + left.toLocaleString("th-TH") + ")"; } else { b.parentNode.removeChild(b); } }
  }
  document.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.closest) { return; }
    var b = t.closest("[data-vitab]");
    if (b) { VI.tab = b.getAttribute("data-vitab"); var hx = $("viHero"); if (hx) { hx.innerHTML = viHeroInner(); } return; }
    if (t.closest("[data-vimore]")) { viMore(); }
  });
  function viewArticles(cat) {
    var L = D.articles || [], cats = [], cnt = {}; L.forEach(function (a) { if (cats.indexOf(a.cat) < 0) { cats.push(a.cat); } cnt[a.cat] = (cnt[a.cat] || 0) + 1; });
    cat = cat || ""; var list = cat ? L.filter(function (a) { return a.cat === cat; }) : L;
    VI.list = list; VI.tab = "latest";
    var chips = cats.length > 1 ? '<nav class="vi-filters" aria-label="กรองตามหมวด"><a href="#articles"' + (cat ? "" : ' aria-current="true"') + ">ทั้งหมด <span>" + L.length + "</span></a>" +
      cats.map(function (c) { return '<a href="#articles=' + encodeURIComponent(c) + '"' + (cat === c ? ' aria-current="true"' : "") + ">" + esc(c) + " <span>" + cnt[c] + "</span></a>"; }).join("") + "</nav>" : "";
    var body = list.length ?
      '<section class="vi-hero" id="viHero">' + viHeroInner() + "</section>" +
      '<section class="vi-sec"><div class="vi-top"><h2 class="vi-h">' + esc(cat || "บทความทั้งหมด") + "</h2>" + chips + "</div>" +
      '<div class="vi-grid" id="viGrid">' + list.slice(0, 12).map(artCard).join("") + "</div>" +
      (list.length > 12 ? '<button type="button" class="vi-btn" id="viMore" data-vimore="1">แสดงเพิ่ม (เหลืออีก ' + (list.length - 12).toLocaleString("th-TH") + ")</button>" : "") + "</section>"
      : '<div class="emp">ยังไม่มีบทความ ทีมกำลังเรียบเรียง ระหว่างนี้ลองค้น <a href="/answers/">คำตอบจากทุกคลิป</a>' + (EDIT ? "<br>(โหมดทีม: เพิ่มบทความที่แท็บ บทความ ในชีต)" : "") + "</div>";
    setView('<div class="rhead"><h2>บทความ <span>' + L.length.toLocaleString("th-TH") + " เรื่อง</span></h2>" + clearBtn() + "</div>" +
      '<p class="rn">อ่านต่อได้ทุกที่ เรียบเรียงจากคลิปและงานเขียนของคุณอารีฟ ไม่ต้องดูวิดีโอก็อ่านเข้าใจได้ และมีคลิปต้นฉบับให้ฟังต่อเมื่อพร้อม</p>' +
      '<div class="vii vi-paper' + VT + '">' + body + "</div>");
    document.title = (cat ? cat + " · " : "") + "บทความ | ARIF SALAFI"; toTop();
  }
  function viewArticle(title) {
    var L = D.articles || [], a = null, ai = -1; L.forEach(function (x, k) { if (x.key === title) { a = x; ai = k; } });
    if (!a) { setView('<div class="rhead"><h2>ไม่พบบทความนี้</h2>' + clearBtn() + '</div><p class="rn">บทความอาจถูกย้ายหรือยังไม่เปิดแสดง <a href="#articles">ดูบทความทั้งหมด</a></p>'); toTop(); return; }
    ART.cur = a;
    var n = 1 + hashStr(a.title) % 5, rel = L.filter(function (x) { return x !== a && x.cat === a.cat; }); L.forEach(function (x) { if (x !== a && rel.indexOf(x) < 0 && rel.length < 5) { rel.push(x); } }); rel = rel.slice(0, 5);
    var newer = L[ai - 1], older = L[ai + 1];
    var vid = a.vid ? '<section class="artc-v"><h3>ฟังต้นฉบับจากคลิป</h3><figure class="st-card w"><div class="st-poster" role="button" tabindex="0" data-artplay="1" aria-label="เล่นคลิปต้นฉบับ"><img class="pimg" alt="" src="' + ART_BASE + "bg-ch" + n + '.webp"><span class="st-play">' + PLAY + '</span><div class="st-ov"><span class="st-dur">' + (a.sec ? "ตั้งแต่นาทีที่ " + fmtClock(a.sec) : "คลิปต้นฉบับ") + '</span><div class="st-ttl">' + esc(a.title) + "</div></div></div></figure></section>" : "";
    setView('<div class="artc-top"><a class="btn btn-line" href="#articles">← บทความทั้งหมด</a>' + clearBtn() + "</div>" +
      '<article class="vii vi-paper vi-art' + VT + '"><p class="vi-crumb"><a href="#articles">บทความ</a> › <a href="#articles=' + encodeURIComponent(a.cat) + '">' + esc(a.cat) + "</a></p>" +
      '<div class="vi-head"><div>' + viChip(a) + "<h1>" + esc(a.title) + "</h1>" + viMeta(a) + "</div>" + (a.img ? '<img class="vi-img vi-poster" alt="' + esc(a.title) + '" src="' + esc(a.img) + '">' : "") + "</div>" +
      '<div class="vi-cols"><div><div class="vi-prose">' + artBody(a.body, a.title) + "</div>" + vid +
      '<div class="artc-share"><button type="button" class="btn btn-line" data-artshare="1">แชร์บทความนี้</button><span class="artc-note" id="artNote" role="status"></span></div>' +
      '<nav class="vi-pn" aria-label="บทความถัดไป">' + (older ? '<a href="' + viHref(older) + '"><small>‹ บทความที่เก่ากว่า</small><b>' + esc(artCut(older.title, 80)) + "</b></a>" : "<span></span>") +
      (newer ? '<a class="r" href="' + viHref(newer) + '"><small>บทความที่ใหม่กว่า ›</small><b>' + esc(artCut(newer.title, 80)) + "</b></a>" : "<span></span>") + "</nav></div>" +
      '<aside class="vi-side">' + (a.by ? "<h4>ผู้เขียน</h4><p>" + esc(a.by) + "</p>" : "") + (rel.length ? "<h4>อ่านต่อ</h4><ul>" + rel.map(function (x) { return '<li><a href="' + viHref(x) + '">' + esc(artCut(x.title, 70)) + "<small>" + esc(x.cat) + "</small></a></li>"; }).join("") + "</ul>" : "") + "</aside></div></article>");
    document.title = a.title + " | ARIF SALAFI"; var md = document.querySelector('meta[name="description"]'); if (md) { md.setAttribute("content", a.sum || a.lead); } toTop();
  }
  function artPlay(btn) { var a = ART.cur; if (!a || !a.vid) { return; } btn.classList.add("on"); btn.innerHTML = ytEmbed({ id: a.vid, sec: a.sec, end: 0, q: a.title }); }
  function artShare() {
    var a = ART.cur; if (!a) { return; } var url = String(C.SITE_URL || location.origin).replace(/\/+$/, "") + "/#article=" + encodeURIComponent(a.key), note = $("artNote");
    if (navigator.share) { navigator.share({ title: a.title, text: a.sum || "", url: url }).catch(function () {}); return; }
    var done = function () { if (note) { note.textContent = "คัดลอกลิงก์แล้ว ✓"; } };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done, function () { if (note) { note.textContent = url; } }); } else if (note) { note.textContent = url; }
  }
  /* เมนูมือถือ ปุ่มรับข่าวฟรี (เลื่อนทันที ไม่เวียนหัว) และปุ่มกลับขึ้นบน */
  function menuSet(open) { var mb = $("menuBtn"), mn = $("mnav"); if (!mb || !mn) { return; } mn.hidden = !open; mb.setAttribute("aria-expanded", open ? "true" : "false"); document.documentElement.classList.toggle("menu-open", !!open); }
  (function () {
    var mb = $("menuBtn"), mn = $("mnav"); if (!mb || !mn) { return; }
    var here = location.pathname.replace(/\/+$/, "") || "/"; [].forEach.call(mn.querySelectorAll("a"), function (x) { var h = x.getAttribute("href"); if (h && h.charAt(0) === "/" && h.replace(/\/+$/, "") === here) { x.classList.add("on"); } });
    mb.addEventListener("click", function () { menuSet(mn.hidden); });
    mn.addEventListener("click", function (e) { var a = e.target.closest("a"); if (a) { menuSet(false); } });
    document.addEventListener("click", function (e) { if (!mn.hidden && !e.target.closest("#mnav,#menuBtn")) { menuSet(false); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !mn.hidden) { menuSet(false); mb.focus(); } });
    window.addEventListener("resize", function () { if (window.innerWidth > 1100) { menuSet(false); } });
  })();
  function newsJump() {
    if (!$("res").hidden) { goHome(); }
    setTimeout(function () { var n = $("news"); if (n) { jumpTo(n.getBoundingClientRect().top + window.scrollY - 84); } try { history.replaceState(null, "", "/#news"); } catch (e) {} }, 60);
  }
  (function () {
    var b = document.createElement("button"); b.type = "button"; b.id = "toTop"; b.className = "totop"; b.hidden = true; b.setAttribute("aria-label", "กลับขึ้นบน"); b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(b); b.addEventListener("click", function () { jumpTo(0); });
    var tk = false; window.addEventListener("scroll", function () { if (tk) { return; } tk = true; requestAnimationFrame(function () { tk = false; var show = window.scrollY > 1600 && !document.documentElement.classList.contains("lbx-open") && !document.documentElement.classList.contains("dd-open") && !document.documentElement.classList.contains("theater-open"); if (b.hidden === show) { b.hidden = !show; } }); }, { passive: true });
  })();
  function togglePath(btn) {
    var parts = btn.getAttribute("data-pmark").split(":"), pi = +parts[0], i = +parts[1], k = pKey(pi, i), d = pDone();
    if (d[k]) { delete d[k]; } else { d[k] = 1; } pSave(d);
    var on = !!d[k], li = btn.closest(".pstep"), p = D.paths[pi], n = pCount(pi);
    li.classList.toggle("done", on); btn.setAttribute("aria-pressed", on); btn.textContent = on ? "ฟังแล้ว" : "ทำเครื่องหมายว่าฟังแล้ว"; li.querySelector(".pnode").textContent = on ? "✓" : (i + 1);
    $("pcnt").textContent = "ฟังแล้ว " + n + " จาก " + p.steps.length; $("pfill").style.width = (100 * n / p.steps.length) + "%"; updateSections();
  }
  var PUBLIC_ROUTES = {
    "/articles/": { title: "บทความ | ARIF SALAFI", description: "บทความจาก Arif Salafi เรียบเรียงจากคลิปและงานเขียน เรื่องศาสนา ปรัชญา และวิทยาศาสตร์" },
    "/": { title: "ARIF SALAFI · คลังคำตอบเรื่องศาสนา ปรัชญา วิทยาศาสตร์", description: "ค้นหาคำตอบจากทุกตอน ทุกคลิป ทุกเล่ม ของ Arif Salafi เรื่องศาสนา ปรัชญา และวิทยาศาสตร์ ดูจริงที่ YouTube" },
    "/answers/": { title: "คำถามที่ตอบแล้ว | ARIF SALAFI", description: "รวมคำถามที่คุณอารีฟตอบแล้ว ค้นหาและเปิดคลิปตรงช่วงเวลาที่ตอบได้ทันที" },
    "/episodes/": { title: "ตอนทั้งหมด | ARIF SALAFI", description: "เลือกดูตอนและบทสนทนาทั้งหมดจากรายการของ Arif Salafi พร้อมลิงก์ไปดูต่อบน YouTube" },
    "/shorts/": { title: "คลิปสั้นถามตอบ | ARIF SALAFI", description: "คลิปสั้นถามตอบจาก Arif Salafi แยกตามหมวดหมู่ แชร์หัวข้อที่สนใจให้เพื่อนได้" },
    "/series/": { title: "ซีรีส์ทั้งหมด | ARIF SALAFI", description: "สำรวจซีรีส์ของ Arif Salafi เลือกหัวข้อและเปิดเพลย์ลิสต์ที่สนใจ" },
    "/books/": { title: "หนังสือ | ARIF SALAFI", description: "หนังสือของ Arif Salafi พร้อมข้อมูลหมวดหมู่และลิงก์สำหรับอ่านหรือเลือกซื้อ" }
  };
  function updateRouteMeta(path) {
    var meta = PUBLIC_ROUTES[path] || PUBLIC_ROUTES["/"], origin = String(C.SITE_URL || "https://arifsalafi.netlify.app").replace(/\/+$/, ""), canonical = origin + path;
    document.title = meta.title;
    function setMeta(selector, attr, value) { var el = document.querySelector(selector); if (el) { el.setAttribute(attr, value); } }
    setMeta('meta[name="description"]', "content", meta.description);
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[name="twitter:title"]', "content", meta.title);
    setMeta('meta[name="twitter:description"]', "content", meta.description);
    setMeta('link[rel="canonical"]', "href", canonical);
  }
  function viewAllSeries() {
    var list = D.series.slice();
    setView('<div class="rhead"><h2>ซีรีส์ทั้งหมด <span>' + list.length + '</span></h2>' + clearBtn() + '</div><p class="rn">เลือกหัวข้อที่สนใจ แล้วเปิดเพลย์ลิสต์เพื่อเรียนรู้ต่อ</p><div class="sgrid">' + list.map(function (s) { return srCard(s).replace('<li style="display:flex">', "<div>").replace("</li>", "</div>"); }).join("") + '</div>'); toTop();
  }
  function viewAllBooks() {
    var list = D.books.slice();
    setView('<div class="rhead"><h2>หนังสือทั้งหมด <span>' + list.length + '</span></h2>' + clearBtn() + '</div><p class="rn">หนังสือของอารีฟ เรียงตามข้อมูลในคลัง</p><div class="bgrid">' + (list.length ? list.map(bkCard).join("").replace(/<li>/g, "<div>").replace(/<\/li>/g, "</div>") : '<div class="emp">ยังไม่มีรายการหนังสือ</div>') + '</div>'); toTop();
  }
  setTimeout(function () { document.documentElement.classList.remove("view-wait"); }, 9000);
  function route() {
    var path = location.pathname.replace(/\/+/g, "/"); if (path.length > 1 && path.slice(-1) !== "/") { path += "/"; }
    updateRouteMeta(path);
    if (!/^#door=/.test(location.hash)) { closeDoor(true); }
    if (LX.open) { lxClose(); }
    var hv0 = /^#(clips|program=|all=ep|answers|door=|guests|path=|list=|q=|articles|article=)/.test(decodeURIComponent(location.hash || ""));   // ถ้ามีเส้นทางใน hash (เช่น หมวดคลิปสั้น) ให้ใช้ตาม ไม่ถูกหน้าเริ่มต้นของหน้านั้นทับตอนโหลดตรงหรือกดรีเฟรช
    if (PUBLIC_ROUTES[path] && !hv0) {
      var routePage = path.replace(/^\//, "").replace(/\/$/, "");
      if (routePage === "answers") { ANS_FAM = ""; return viewAnswers(""); }
      if (routePage === "episodes") { return viewAllEps(); }
      if (routePage === "shorts") { return viewClips("", 1); }
      if (routePage === "series") { return viewAllSeries(); }
      if (routePage === "books") { return viewAllBooks(); }
      if (routePage === "articles") { return viewArticles(""); }
      if (!location.hash) { setView(""); return; }
    }
    var raw = (location.hash || "").replace(/^#/, ""), h = decodeURIComponent(raw), m;
    // หมวดมีเครื่องหมาย & ในชื่อ (เช่น เทววิทยา & ศาสนา) จึงอ่านจากค่าที่ยังไม่ถอดรหัส แล้วแยกเลขหน้าด้วย &p=
    if ((m = /^clips(?:=(.*?))?(?:&p=(\d+))?$/.exec(raw))) { return viewClips(m[1] ? decodeURIComponent(m[1]) : "", m[2] ? +m[2] : 1); }
    if ((m = /^program=(.+)$/.exec(h))) { return viewProgram(m[1]); }
    if (h === "all=ep") { return viewAllEps(); }
    if (h === "answers") { ANS_FAM = ""; return viewAnswers(""); }
    if ((m = /^door=(.+)$/.exec(h))) { if ($("home").hidden) { setView(""); } return openDoor(m[1]); }
    if (h === "guests") { return viewGuests(); }
    if ((m = /^articles(?:=(.*))?$/.exec(h))) { return viewArticles(m[1] || ""); }
    if ((m = /^article=(.+)$/.exec(h))) { return viewArticle(m[1]); }
    if ((m = /^list=(.+)$/.exec(h))) { return viewPath(m[1]); }
    if ((m = /^path=(.+)$/.exec(h))) { return viewStory(m[1]); }
    if ((m = /^q=(.*)$/.exec(h))) { return openSearch(m[1]); }
    setView("");
  }
  function viewProgram(name) {
    var list = D.eps.filter(function (e) { return e.programs.indexOf(name) >= 0; }).sort(function (a, b) { return b.num - a.num; });
    var p = D.programs.filter(function (x) { return x.name === name; })[0], pl = p && safeUrl(p.pl);
    setView('<div class="rhead"><h2>' + esc(name) + ' <span>' + list.length + " ตอน</span></h2><div class=\"ctl\">" + (pl ? '<a class="btn btn-yt" href="' + esc(pl) + '" target="_blank" rel="noopener">เปิดเพลย์ลิสต์บน YouTube ↗</a>' : "") + clearBtn() + "</div></div>" +
      (p && p.desc ? '<p class="rn">' + esc(p.desc) + "</p>" : "") + '<div class="egrid">' + (list.length ? list.map(function (e, i) { return epCard(e, "p" + i).replace("<li>", "<div>").replace("</li>", "</div>"); }).join("") : '<div class="emp">ยังไม่มีตอนของรายการนี้ในตาราง</div>') + "</div>");
    toTop();
  }
  /* หน้ารวมตอน: แยกเป็นหมวด = แต่ละรายการ (ON LIFE TIME ฯลฯ) และซีรีส์แยกตามเสาหลัก เป็นแถวเลื่อนด้านข้าง
     กดชิปหรือ "ดูทั้งหมด" เพื่อดูเฉพาะหมวดนั้นเป็นตารางเต็ม */
  var EC_GROUP = "", EC_RAIL = 12;
  function epSort(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.num - a.num); }
  function epGroups() {
    var gs = [], pillarOf = {}, byPillar = {}, order = [];
    D.programs.forEach(function (p) {
      var L = D.eps.filter(function (e) { return e.programs.indexOf(p.name) >= 0; }).sort(epSort);
      if (L.length) { gs.push({ key: "p:" + p.name, title: p.name, kind: "รายการ", list: L }); }
    });
    D.series.forEach(function (sr) { pillarOf[sr.title] = sr.pillar || ""; });
    D.sep.forEach(function (e) { var pl = pillarOf[e.series] || "ซีรีส์อื่น ๆ"; if (!byPillar[pl]) { byPillar[pl] = []; order.push(pl); } byPillar[pl].push(e); });
    order.sort(function (a, b) { return byPillar[b].length - byPillar[a].length; });
    order.forEach(function (pl) { gs.push({ key: "c:" + pl, title: pl, kind: "ซีรีส์", list: byPillar[pl].sort(epSort) }); });
    return gs;
  }
  function viewAllEps(group) {
    EC_GROUP = group || "";
    var gs = epGroups(), total = D.eps.length + D.sep.length, cur = null;
    gs.forEach(function (g) { if (g.key === EC_GROUP) { cur = g; } });
    if (!cur) { EC_GROUP = ""; }
    var chips = '<div class="pill-row"><button type="button" class="chip" data-ec="" aria-pressed="' + (!cur) + '">ทุกหมวด</button>' +
      gs.map(function (g) { return '<button type="button" class="chip" data-ec="' + esc(g.key) + '" aria-pressed="' + (cur === g) + '">' + esc(g.title) + " <span>" + g.list.length.toLocaleString("th-TH") + "</span></button>"; }).join("") + "</div>";
    var body = "";
    if (cur) {
      body = '<div class="egrid">' + cur.list.map(function (e, i) { return epCard(e, "a" + i).replace("<li>", "<div>").replace("</li>", "</div>"); }).join("") + "</div>";
    } else {
      gs.forEach(function (g, gi) {
        body += '<div class="crow"><div class="crow-h"><div class="ctxt"><span class="cn">' + g.kind + " · " + g.list.length.toLocaleString("th-TH") + ' ตอน</span><h3>' + esc(g.title) + '</h3></div><span class="crow-act"><button type="button" class="lk" data-ec="' + esc(g.key) + '">ดูทั้งหมด →</button></span></div><div class="car rgc">' +
          car(g.list.slice(0, EC_RAIL).map(function (e, i) { return epCard(e, "g" + gi + "_" + i); }).join(""), "erow") + "</div></div>";
      });
    }
    setView('<div class="rhead"><h2>' + (cur ? esc(cur.title) : "ทุกตอน") + " <span>" + (cur ? cur.list.length : total).toLocaleString("th-TH") + (cur ? " ตอน" : "") + "</span></h2>" + clearBtn() + "</div>" + chips + body);
    toTop();
  }
  /* หน้าคำตอบ: จัดกลุ่มตามหัวข้อ (ค่าเริ่มต้น) หรือตามคลิป เป็นแถวเลื่อนด้านข้าง
     เลือกหัวข้อ/คลิปแล้วขึ้นเป็นตารางเต็ม */
  var ANS_TOPIC = "", ANS_CLIP = "", ANS_GROUP = "topic", ANS_SHOW = 60, ANS_RAIL = 12, ANS_FAM = "";
  var ANS_LAST = ["รายการและเบื้องหลัง", "อื่น ๆ", "อื่นๆ"];   // หัวข้อที่ไม่ใช่เนื้อหาความรู้ ไว้ท้ายสุด
  function ansRail(title, n, lead, list, kp, topic, thumbId, ico) {
    return '<div class="crow"><div class="crow-h' + (thumbId ? " has-th" : "") + '">' + (thumbId ? '<div class="cthumb">' + ytImg(thumbId, "") + "</div>" : (ico ? '<span class="cico">' + ico + "</span>" : "")) +
      '<div class="ctxt"><span class="cn">' + n.toLocaleString("th-TH") + ' คำตอบ</span><h3>' + title + '</h3></div><span class="crow-act">' + lead + '</span></div><div class="car rgc">' +
      car(list.slice(0, ANS_RAIL).map(function (a, i) { return "<li>" + ansCard(a, kp + i, topic) + "</li>"; }).join(""), "arow") + "</div></div>";
  }
  function viewAnswers(topic, more, clip) {
    if (!more) { ANS_SHOW = 60; }
    ANS_TOPIC = topic || ""; ANS_CLIP = clip || (more ? ANS_CLIP : "");
    var topics = [], counts = {};
    D.answers.forEach(function (a) { a.tl.forEach(function (t) { if (topics.indexOf(t) < 0) { topics.push(t); counts[t] = 0; } counts[t]++; }); });
    topics.sort(function (x, y) { var lx = ANS_LAST.indexOf(x) >= 0, ly = ANS_LAST.indexOf(y) >= 0; if (lx !== ly) { return lx ? 1 : -1; } return counts[y] - counts[x]; });
    var grid = !!(ANS_TOPIC || ANS_CLIP);
    var list = D.answers.filter(function (a) { return (!ANS_TOPIC || a.tl.indexOf(ANS_TOPIC) >= 0) && (!ANS_CLIP || a.id === ANS_CLIP); });
    var clipName = ""; if (ANS_CLIP && list.length) { clipName = list[0].srcTitle || ""; }
    var fams = famBuild(topics), famNow = null;
    if (ANS_TOPIC) { fams.forEach(function (f) { if (f.topics.indexOf(ANS_TOPIC) >= 0) { ANS_FAM = f.name; } }); }
    fams.forEach(function (f) { f.n = D.answers.filter(function (a) { return a.tl.some(function (t) { return f.topics.indexOf(t) >= 0; }); }).length; if (f.name === ANS_FAM) { famNow = f; } });
    if (!famNow) { ANS_FAM = ""; }
    var showNav = topics.length && (ANS_GROUP === "topic" || grid);
    var famTabs = showNav ? '<div class="fam-row" role="group" aria-label="กลุ่มหัวข้อ"><button type="button" class="fam" data-fm="" aria-pressed="' + (!ANS_FAM) + '">ทุกกลุ่ม <span>' + D.answers.length.toLocaleString("th-TH") + "</span></button>" +
      fams.map(function (f) { return '<button type="button" class="fam" data-fm="' + esc(f.name) + '" aria-pressed="' + (ANS_FAM === f.name) + '">' + f.icon + esc(f.name) + " <span>" + f.n.toLocaleString("th-TH") + "</span></button>"; }).join("") + "</div>" : "";
    var chips = (showNav && famNow) ? '<div class="pill-row"><button type="button" class="chip" data-at="" aria-pressed="' + (!ANS_TOPIC) + '">ทุกหัวข้อในกลุ่มนี้</button>' +
      famNow.topics.map(function (t) { return '<button type="button" class="chip" data-at="' + esc(t) + '" aria-pressed="' + (ANS_TOPIC === t) + '">' + esc(t) + " <span>" + counts[t].toLocaleString("th-TH") + "</span></button>"; }).join("") + "</div>" : "";
    var icoOf = function (t) { var r = ""; fams.forEach(function (f) { if (f.topics.indexOf(t) >= 0) { r = f.icon; } }); return r; };
    var clipChip = ANS_CLIP ? '<div class="pill-row"><button type="button" class="chip" data-at="" aria-label="ล้างตัวกรองคลิป">✕ คลิป: ' + esc(clipName || ANS_CLIP) + "</button></div>" : "";
    var seg = grid ? "" : '<div class="atools"><span class="atools-l">จัดกลุ่มตาม</span><div class="seg" role="group" aria-label="จัดกลุ่มตาม">' +
      '<button type="button" data-ag="topic" aria-pressed="' + (ANS_GROUP === "topic") + '">หัวข้อ</button><button type="button" data-ag="clip" aria-pressed="' + (ANS_GROUP === "clip") + '">คลิป</button></div></div>';
    var body = "";
    if (!D.answers.length) {
      body = '<div class="emp">ยังไม่มีคำถามที่ตอบแล้วในตาราง</div>';
    } else if (grid) {
      body = '<div class="agrid">' + (list.length ? list.slice(0, ANS_SHOW).map(function (a, i) { return ansCard(a, "v" + i, ANS_TOPIC); }).join("") : '<div class="emp">ไม่พบคำตอบ</div>') + "</div>" +
        (list.length > ANS_SHOW ? '<div class="more"><button class="btn btn-line" type="button" id="ansMore">แสดงเพิ่ม (เหลืออีก ' + (list.length - ANS_SHOW).toLocaleString("th-TH") + " ข้อ)</button></div>" : "");
    } else if (ANS_GROUP === "clip") {
      var byClip = {}, order = [];
      D.answers.forEach(function (a) { if (!byClip[a.id]) { byClip[a.id] = []; order.push(a.id); } byClip[a.id].push(a); });
      order.sort(function (x, y) { return byClip[y].length - byClip[x].length; });
      order.forEach(function (id, gi) {
        var L = byClip[id].slice().sort(function (x, y) { return x.sec - y.sec; });
        var lead = '<a class="lk" href="https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '" target="_blank" rel="noopener">' + YT + "ดูทั้งคลิป ↗</a>" +
          (L.length > ANS_RAIL ? '<button type="button" class="lk" data-ac="' + esc(id) + '">ดูทั้งหมด ' + L.length.toLocaleString("th-TH") + " →</button>" : "");
        body += ansRail(esc(L[0].srcTitle || id), L.length, lead, L, "c" + gi + "_", "", id);
      });
    } else {
      (famNow ? famNow.topics : topics).forEach(function (t, gi) {
        var L = D.answers.filter(function (a) { return a.tl.indexOf(t) >= 0; });
        body += ansRail(esc(t), L.length, '<button type="button" class="lk" data-at="' + esc(t) + '">ดูทั้งหมดในหัวข้อนี้ →</button>', L, "t" + gi + "_", t, "", icoOf(t));
      });
    }
    setView('<div class="rhead"><h2>คำถามที่ตอบแล้ว <span>' + list.length.toLocaleString("th-TH") + " ข้อ</span></h2>" + clearBtn() + "</div>" +
      '<p class="rn">กดแล้วเล่นตั้งแต่นาทีที่ตอบ หรือพิมพ์ค้นด้านบนได้ทุกหน้า</p>' + seg + clipChip + famTabs + chips + body);
    if (!more) { toTop(); }
  }
  var PAGE = 24;
  function byHot(a, b) { var ra = a.hotRank || 999, rb = b.hotRank || 999; if (ra !== rb) { return ra - rb; } return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }
  function catOf(s) { return s.cat || "อื่นๆ"; }
  function viewClips(cat, page) {
    var all = D.shorts.slice().sort(byHot), cats = [];
    all.forEach(function (s) { var c = catOf(s); if (cats.indexOf(c) < 0) { cats.push(c); } });
    var order = D.pillars.filter(function (p) { return cats.indexOf(p) >= 0; }).concat(cats.filter(function (c) { return D.pillars.indexOf(c) < 0; }));
    var chips = '<div class="pill-row"><a class="chip" href="#clips"' + (cat === "" ? ' aria-current="true"' : "") + '>แถวต่อหมวด</a><a class="chip" href="#clips=all"' + (cat === "all" ? ' aria-current="true"' : "") + '>ตารางทั้งหมด</a>' +
      order.map(function (c) { return '<a class="chip" href="#clips=' + encodeURIComponent(c) + '"' + (cat === c ? ' aria-current="true"' : "") + ">" + esc(c) + "</a>"; }).join("") + "</div>";
    var head = function (n, label) { return '<div class="rhead"><h2>' + esc(label) + " <span>" + n.toLocaleString("th-TH") + " คลิป</span></h2>" + clearBtn() + "</div>"; };
    if (!cat) {
      var html = head(all.length, "คลิปสั้นทั้งหมด") + chips;
      order.forEach(function (c, ci) {
        var list = all.filter(function (s) { return catOf(s) === c; });
        html += '<div class="crow"><div class="crow-h"><h3>' + esc(c) + ' <span>' + list.length.toLocaleString("th-TH") + ' คลิป</span></h3><a href="#clips=' + encodeURIComponent(c) + '">ดูทั้งหมดในหมวด →</a></div><div class="car rgc">' +
          car(list.slice(0, 12).map(function (s, i) { return shCard(s, "c" + ci + "_" + i); }).join("")) + "</div></div>";
      });
      setView(html); toTop(); return;
    }
    var list = cat === "all" ? all : all.filter(function (s) { return catOf(s) === cat; });
    var pages = Math.max(1, Math.ceil(list.length / PAGE)); page = Math.min(Math.max(1, page || 1), pages);
    var slice = list.slice((page - 1) * PAGE, page * PAGE), base = "#clips=" + encodeURIComponent(cat);
    var pager = "";
    if (pages > 1) {
      var nums = [], i;
      for (i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - page) <= 2) { nums.push(i); } else if (nums[nums.length - 1] !== "…") { nums.push("…"); } }
      pager = '<nav class="pager" aria-label="เลือกหน้า">' + (page > 1 ? '<a href="' + base + "&p=" + (page - 1) + '">‹ ก่อนหน้า</a>' : "") +
        nums.map(function (n) { return n === "…" ? "<span>…</span>" : '<a href="' + base + "&p=" + n + '"' + (n === page ? ' aria-current="page"' : "") + ">" + n + "</a>"; }).join("") +
        (page < pages ? '<a href="' + base + "&p=" + (page + 1) + '">ถัดไป ›</a>' : "") + "</nav>";
    }
    setView(head(list.length, cat === "all" ? "คลิปสั้นทั้งหมด" : cat) + chips + '<p class="rn">หน้า ' + page + " จาก " + pages + " · หน้าละ " + PAGE + " คลิป</p><div class=\"sgrid2\">" +
      slice.map(function (s, i) { return shCard(s, "g" + i).replace("<li>", "<div>").replace("</li>", "</div>"); }).join("") + "</div>" + pager);
    toTop();
  }
  function goHome() { var path = location.pathname.replace(/\/$/, "") || "/"; if (path !== "/" || location.hash) { history.replaceState(null, "", "/" + location.search); } setView(""); updateRouteMeta("/"); }

  /* ---------------- ตัวเล่นวิดีโอ (เริ่มตามนาทีได้) ---------------- */
  var vm = $("vm"), resumeSearchOnPlayerClose = false;
  function openPlayer(item) {
    var id = item.id || ytId(item.url), start = item.k === "ans" ? (item.sec || 0) : 0;
    var tall = item.k === "short" || (item.k === "ans" && D.shortIds[id]);
    var yt = tall ? "https://www.youtube.com/shorts/" + id : "https://www.youtube.com/watch?v=" + id + (start ? "&t=" + start + "s" : "");
    if (!id || location.protocol === "file:") { if (id) { window.open(yt, "_blank", "noopener"); } return; }
    $("vmT").textContent = (item.title || item.q || "") + (start ? " · เริ่มที่ " + fmtClock(start) : "");
    $("vmBox").className = "vm-box " + (tall ? "tall" : "wide");
    $("vmBox").innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(id) + "?autoplay=1&rel=0&playsinline=1" + (start ? "&start=" + start : "") + '" title="' + esc(item.title || item.q || "วิดีโอ") + '" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    $("vmYt").href = yt;
    FBK.cur = { kind: item.k === "ans" ? "คำตอบ" : (item.k || ""), title: item.title || item.q || "", vid: id, sec: start, src: "" }; fbPlayerBtn();
    var sm = $("vmSum"), txt = item.summary || ""; sm.hidden = !txt; sm.textContent = txt;
    if (!vm.open) { vm.showModal(); }
  }
  function closePlayer() { if (vm.open) { vm.close(); } }
  vm.addEventListener("close", function () { $("vmBox").innerHTML = ""; $("vmSum").hidden = true; if (resumeSearchOnPlayerClose) { resumeSearchOnPlayerClose = false; if (!sr.open) { sr.showModal(); } setTimeout(function () { qi.focus(); }, 30); } });
  vm.addEventListener("click", function (e) { if (e.target === vm) { closePlayer(); } });
  $("vmX").onclick = closePlayer; $("vmClose").onclick = closePlayer;

  /* ---------------- ฟีดแบ็กจากผู้ใช้: แจ้งปัญหา / ฝากคำถาม ----------------
     ส่งเข้าตารางของทีมผ่าน Apps Script (ตั้ง FEEDBACK_URL ใน config.js) ถ้าไม่ตั้ง ปุ่มทั้งหมดจะไม่แสดง
     ไม่เก็บคำค้นอัตโนมัติ ส่งเฉพาะเมื่อผู้ใช้กดส่งเอง */
  var FBK = { url: safeUrl(C.FEEDBACK_URL) || "", dlg: null, ctx: null, t0: 0, cur: null, mode: "" }, FBK_KEY = "arif.fb";
  var INT_LABEL = C.INTEREST_LABEL === undefined ? "สนใจรับอิสลาม" : String(C.INTEREST_LABEL).trim();   // ข้อความบนปุ่ม ตั้งเป็น "" เพื่อซ่อนปุ่ม
  var INT_TYPES = [["สนใจรับอิสลาม", "สนใจรับอิสลาม อยากให้ทีมติดต่อกลับ"], ["อยากคุยก่อน", "ยังไม่แน่ใจ อยากคุยก่อน"]];
  var INT_NOTE = "ไม่ต้องรีบตัดสินใจ และไม่มีใครกดดัน ฝากช่องทางติดต่อไว้ ทีมจะติดต่อกลับเมื่อสะดวก (อาจใช้เวลาหลายวัน) ไม่ว่าคุณจะตัดสินใจอย่างไร";
  function fbRecent() { try { var l = JSON.parse(localStorage.getItem(FBK_KEY) || "[]"); return (Array.isArray(l) ? l : []).filter(function (t) { return typeof t === "number" && Date.now() - t < 3600000; }); } catch (e) { return []; } }
  function fbRateOk() { return fbRecent().length < 5; }
  function fbRateAdd() { try { var l = fbRecent(); l.push(Date.now()); localStorage.setItem(FBK_KEY, JSON.stringify(l)); } catch (e) {} }
  function fbCtxOf(it) { var ref = (it && it.ref) || {}; return { kind: (it && it.k) || "", title: (it && it.t) || "", vid: ref.id || "", sec: Math.floor(+ref.sec) || 0, src: ref.srcTitle || "" }; }
  function fbRowBtn(i) { return FBK.url ? '<button type="button" class="rr-fb" data-fb="' + i + '">⚑ แจ้งปัญหา</button>' : ""; }
  function fbPlayerBtn() {
    if (!FBK.url || $("vmFb")) { return; }
    var f = vm.querySelector(".vm-f"); if (!f) { return; }
    var b = document.createElement("button"); b.type = "button"; b.id = "vmFb"; b.className = "vm-sup vm-fb"; b.setAttribute("data-fbplayer", "1"); b.textContent = "⚑ แจ้งปัญหาคลิปนี้";
    f.appendChild(b);
  }
  var FB_TYPES = [["เวลาไม่ตรง", "ไทม์สแตมป์ไม่ตรง"], ["เปิดผิดคลิป", "เปิดผิดคลิป"], ["ข้อมูลผิด", "ข้อมูลผิด/สรุปไม่ถูก"], ["ขอคำถามใหม่", "อยากให้ตอบคำถามที่ยังไม่มี"], ["อื่นๆ", "อื่น ๆ"]];
  function fbBuild() {
    if (FBK.dlg) { return FBK.dlg; }
    var d = document.createElement("dialog"); d.className = "vm fbd"; d.id = "fbd"; d.setAttribute("aria-labelledby", "fbT");
    d.innerHTML = '<div class="vm-h"><h3 id="fbT">แจ้งปัญหา / ฝากคำถาม</h3><button class="vm-x" type="button" data-fbclose="1" aria-label="ปิด">✕</button></div>' +
      '<form class="fb-form" id="fbForm" novalidate><p class="fb-ctx" id="fbCtx"></p>' +
      '<fieldset class="fb-types"><legend class="fb-sr">ประเภท</legend><div id="fbTypes"></div></fieldset>' +
      '<label class="fb-l" for="fbMsg" id="fbMsgL">รายละเอียด <span id="fbReq"></span></label><textarea id="fbMsg" maxlength="500" rows="4"></textarea>' +
      '<label class="fb-l" for="fbContact" id="fbContactL">ช่องทางติดต่อ (ไม่บังคับ ใส่เมื่ออยากให้แจ้งผลกลับ)</label><input id="fbContact" type="text" maxlength="120" autocomplete="off">' +
      '<label class="fb-ok" id="fbOkL" hidden><input type="checkbox" id="fbOk"><span id="fbOkT"></span></label>' +
      '<input type="text" id="fbHp" tabindex="-1" autocomplete="off" aria-hidden="true" class="fb-hp">' +
      '<p class="fb-note" id="fbNote">ไม่ต้องใส่ข้อมูลส่วนตัว ข้อความถูกบันทึกในตารางของทีมเพื่อตรวจแก้ ดู <a href="privacy.html">นโยบายความเป็นส่วนตัว</a></p>' +
      '<p class="fb-status" id="fbStatus" role="status" aria-live="polite"></p>' +
      '<div class="fb-f"><button class="btn btn-go" type="submit" id="fbSend">ส่ง</button><button class="btn btn-line" type="button" data-fbclose="1">ปิด</button></div></form>';
    document.body.appendChild(d); FBK.dlg = d;
    d.addEventListener("click", function (e) { if (e.target === d) { fbClose(); } });
    d.querySelector("#fbForm").addEventListener("submit", function (e) { e.preventDefault(); fbSubmit(); });
    d.querySelector("#fbTypes").addEventListener("change", fbHint);
    return d;
  }
  function fbClose() { var d = FBK.dlg; if (!d) { return; } try { d.close(); } catch (e) { d.removeAttribute("open"); } }
  function fbType() { var c = FBK.dlg.querySelector('input[name="fbType"]:checked'); return c ? c.value : ""; }
  function fbHint() {
    var t = fbType(), intr = FBK.mode === "interest";
    if (intr) { FBK.dlg.querySelector("#fbReq").textContent = "(ไม่บังคับ)"; FBK.dlg.querySelector("#fbMsg").placeholder = "เช่น อยากรู้ขั้นตอน หรืออยากถามอะไรก่อน"; return; }
    var need = t === "ขอคำถามใหม่" || t === "ข้อมูลผิด" || t === "อื่นๆ", m = FBK.dlg.querySelector("#fbMsg");
    FBK.dlg.querySelector("#fbReq").textContent = need ? "(จำเป็น)" : "(ไม่บังคับ เพราะระบบแนบคลิปและเวลาให้แล้ว)";
    m.placeholder = t === "ขอคำถามใหม่" ? "พิมพ์คำถามที่อยากให้ตอบ เช่น ..." : t === "เวลาไม่ตรง" ? "เช่น ควรเริ่มที่นาทีไหน (ไม่ใส่ก็ได้)" : "บอกสั้น ๆ ว่าเจออะไร";
  }
  function fbOpen(ctx, mode) {
    var d = fbBuild(); FBK.ctx = ctx || {}; FBK.t0 = Date.now(); FBK.mode = mode || "";
    var intr = mode === "interest", ask = mode === "ask", types = intr ? INT_TYPES : ask ? FB_TYPES.filter(function (x) { return x[0] === "ขอคำถามใหม่" || x[0] === "อื่นๆ"; }) : FB_TYPES.filter(function (x) { return x[0] !== "ขอคำถามใหม่"; });
    var def = intr ? INT_TYPES[0][0] : ask ? "ขอคำถามใหม่" : (FBK.ctx.sec ? "เวลาไม่ตรง" : "ข้อมูลผิด");
    d.querySelector("#fbTypes").innerHTML = types.map(function (x) { return '<label class="fb-t"><input type="radio" name="fbType" value="' + esc(x[0]) + '"' + (x[0] === def ? " checked" : "") + "><span>" + esc(x[1]) + "</span></label>"; }).join("");
    d.querySelector("#fbT").textContent = intr ? "สนใจรับอิสลาม หรืออยากคุยต่อ" : ask ? "ฝากคำถามไว้ให้ทีม" : "แจ้งปัญหา";
    d.querySelector("#fbMsgL").firstChild.textContent = intr ? "อยากให้ทีมช่วยเรื่องอะไร " : "รายละเอียด ";
    d.querySelector("#fbContactL").textContent = intr ? "ช่องทางติดต่อ (จำเป็น) เช่น LINE ID หรืออีเมล" : "ช่องทางติดต่อ (ไม่บังคับ ใส่เมื่ออยากให้แจ้งผลกลับ)";
    d.querySelector("#fbNote").innerHTML = intr ? 'ข้อมูลนี้ถึงทีมงานเท่านั้น เก็บในไฟล์ส่วนตัว ไม่แสดงต่อสาธารณะ ลบได้เมื่อคุณขอ ดู <a href="privacy.html">นโยบายความเป็นส่วนตัว</a>' : 'ไม่ต้องใส่ข้อมูลส่วนตัว ข้อความถูกบันทึกในตารางของทีมเพื่อตรวจแก้ ดู <a href="privacy.html">นโยบายความเป็นส่วนตัว</a>';
    d.querySelector("#fbOkL").hidden = !intr; d.querySelector("#fbOk").checked = false; d.querySelector("#fbOkT").textContent = " ผมยินยอมให้ทีมเก็บช่องทางติดต่อและข้อความนี้ เพื่อติดต่อกลับเท่านั้น (เรื่องความเชื่อเป็นข้อมูลอ่อนไหว)";
    d.querySelector("#fbCtx").innerHTML = intr ? esc(INT_NOTE) : ask ? (FBK.ctx.query ? "ค้นหา: <b>" + esc(FBK.ctx.query) + "</b>" : "") : "<b>" + esc(FBK.ctx.title || "") + "</b>" + (FBK.ctx.sec ? " · เริ่มที่ " + fmtClock(FBK.ctx.sec) : "");
    d.querySelector("#fbMsg").value = ask ? (FBK.ctx.query || "") : ""; d.querySelector("#fbContact").value = ""; d.querySelector("#fbHp").value = "";
    d.querySelector("#fbStatus").textContent = ""; d.querySelector("#fbSend").disabled = false; d.querySelector("#fbForm").hidden = false;
    d.querySelectorAll("label.fb-l, textarea, input#fbContact, .fb-note, .fb-f").forEach(function (n) { n.hidden = false; }); d.querySelector("#fbOkL").hidden = !intr;
    fbHint();
    try { d.showModal(); } catch (e) { d.setAttribute("open", ""); }
    setTimeout(function () { var m = d.querySelector("#fbMsg"); if (m) { m.focus(); } }, 30);
  }
  function fbSubmit() {
    var d = FBK.dlg, st = d.querySelector("#fbStatus"), type = fbType(), msg = d.querySelector("#fbMsg").value.trim(), contact = d.querySelector("#fbContact").value.trim();
    if (!type) { st.textContent = "เลือกประเภทก่อนนะครับ"; return; }
    if (FBK.mode === "interest") {
      if (contact.length < 3) { st.textContent = "ใส่ช่องทางติดต่อด้วยนะครับ ไม่งั้นทีมติดต่อกลับไม่ได้"; d.querySelector("#fbContact").focus(); return; }
      if (!d.querySelector("#fbOk").checked) { st.textContent = "กรุณาติ๊กยินยอมก่อนส่งนะครับ"; return; }
    }
    if ((type === "ขอคำถามใหม่" || type === "ข้อมูลผิด" || type === "อื่นๆ") && msg.length < 4) { st.textContent = "ช่วยพิมพ์รายละเอียดสั้น ๆ หน่อยครับ"; d.querySelector("#fbMsg").focus(); return; }
    if (!fbRateOk()) { st.textContent = "ส่งบ่อยเกินไป ลองใหม่ภายหลังนะครับ"; return; }
    var done = function () { d.querySelector("#fbForm").hidden = true; d.querySelector("#fbCtx").textContent = ""; d.querySelector("#fbT").textContent = "ขอบคุณครับ"; st.textContent = ""; d.querySelector("#fbTypes").innerHTML = '<p class="fb-thanks">' + (FBK.mode === "interest" ? "ทีมได้รับแล้ว จะติดต่อกลับเมื่อสะดวก ไม่ต้องรีบ และไม่ผูกมัดใด ๆ" : "ทีมได้รับแล้ว จะตรวจและแก้ไขเมื่อมีเวลา") + '</p><button class="btn btn-line" type="button" data-fbclose="1">ปิด</button>'; d.querySelector("#fbForm").hidden = false; d.querySelector("#fbForm").querySelectorAll("label.fb-l, textarea, input#fbContact, .fb-note, .fb-f, .fb-ok").forEach(function (n) { n.hidden = true; }); };
    if (d.querySelector("#fbHp").value) { done(); return; }   // บอตกรอกช่องลวง: ทำเป็นสำเร็จ แต่ไม่ส่ง
    d.querySelector("#fbSend").disabled = true; st.textContent = "กำลังส่ง…";
    var x = FBK.ctx || {}, body = JSON.stringify({ type: type, message: msg, contact: contact, title: x.title || "", vid: x.vid || "", sec: x.sec || 0, src: x.src || "", kind: x.kind || "", q: x.query || "", page: location.pathname, el: Date.now() - FBK.t0, hp: "" });
    fetch(FBK.url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body }).then(function () { fbRateAdd(); done(); }).catch(function () { st.textContent = "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะครับ"; d.querySelector("#fbSend").disabled = false; });
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-fb],[data-fbask],[data-fbplayer],[data-fbclose],[data-fbp],[data-fbint]") : null; if (!t) { return; }
    if (t.hasAttribute("data-fbclose")) { fbClose(); return; }
    e.preventDefault(); e.stopPropagation();
    if (t.hasAttribute("data-fb")) { var it = SR.rows[+t.getAttribute("data-fb")]; if (it) { fbOpen(fbCtxOf(it), "report"); } return; }
    if (t.hasAttribute("data-fbint")) { var cs = PL.pi >= 0 ? D.paths[PL.pi].steps[PL.i] : null; fbOpen({ kind: "เส้นทาง", title: cs ? cs.q : "", vid: cs ? cs.id : "", sec: cs ? cs.sec : 0 }, "interest"); return; }
    if (t.hasAttribute("data-fbp")) { var pp = t.getAttribute("data-fbp").split(":"), pth = D.paths[+pp[0]], st = pth && pth.steps[+pp[1]]; if (st) { fbOpen({ kind: "เส้นทาง", title: st.q, vid: st.id, sec: st.sec, src: pth.title }, "report"); } return; }
    if (t.hasAttribute("data-fbplayer")) { fbOpen(FBK.cur || {}, "report"); return; }
    if (t.hasAttribute("data-fbask")) { fbOpen({ query: qi.value.trim() }, "ask"); }
  }, true);

  /* ---------------- ค้นหาเต็มจอ: คำพ้อง + แก้คำอังกฤษสะกดผิด + จับคู่ประโยคแบบคำใกล้เคียง (ไม่ใช้ AI) ---------------- */
  var sr = $("sr"), qi = $("q"), SR = { pil: "", kind: "", sort: "relevance", rows: [], lim: {}, lq: "", lk: "" };
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
  /* ค้นในเนื้อหาอีบุ๊ก: ดัชนีข้อความจาก PDF (data/books-index.json) โหลดตอนเปิดช่องค้นหา
     เทียบแบบตัดช่องว่าง สระบน-ล่าง วรรณยุกต์ ออกทั้งสองฝั่ง เพราะ PDF มักสกัดข้อความได้เพี้ยนเล็กน้อย */
  var BK = { items: null, loading: false }, BK_SKIP = /[\s\u200b-\u200d\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
  function bkMap(text) {
    text = String(text || ""); var out = "", map = [], i, ch;
    for (i = 0; i < text.length; i++) { ch = text.charAt(i).toLowerCase(); if (BK_SKIP.test(ch)) { continue; } if (ch === "\u0E33") { ch = "\u0E32"; } out += ch; map.push(i); }
    return { s: out, map: map };
  }
  function bkNorm(s) { return bkMap(s).s; }
  function bkHas(it, v) { if (!it.nb) { return false; } var nv = bkNorm(v); return nv.length >= 3 && it.nb.indexOf(nv) >= 0; }
  function bkSnippet(it, vars) {
    var text = it.ref.text, nm = it.nbm, best = -1, bl = 0;
    vars.forEach(function (v) { var nv = bkNorm(v); if (nv.length < 3) { return; } var i = nm.s.indexOf(nv); if (i >= 0 && (best < 0 || nv.length > bl)) { best = i; bl = nv.length; } });
    if (best < 0) { return esc(text.slice(0, 150)) + "…"; }
    var a = nm.map[best], b = nm.map[best + bl - 1] + 1, from = Math.max(0, a - 70), to = Math.min(text.length, b + 120);
    return (from > 0 ? "…" : "") + esc(text.slice(from, a)) + "<mark>" + esc(text.slice(a, b)) + "</mark>" + esc(text.slice(b, to)) + (to < text.length ? "…" : "");
  }

  /* ค้นในบทพูด/สคริปต์ YouTube (data/transcripts-index.json) โหลดอัตโนมัติตอนเปิดช่องค้นหา */
  var TR = { items: null, loading: false };
  function loadTranscriptIdx() {
    if (TR.items || TR.loading || !window.fetch) { return; }
    TR.loading = true;
    fetchTranscriptsSharded().then(function (r) { if (!r.ok) { throw new Error("http"); } return r.json(); }).then(function (j) {
      var items = [];
      (j.videos || []).forEach(function (v) {
        (v.segments || []).forEach(function (seg) {
          var sec = Number(seg.t || 0);
          var txt = String(seg.txt || "").trim();
          if (!txt) { return; }
          var m = bkMap(txt);
          items.push({
            k: "บทพูดในคลิป",
            t: v.title,
            qs: [],
            sub: "เริ่มที่ " + fmtClock(sec) + " — " + txt,
            extra: txt,
            p: "",
            ref: { k: "ans", id: v.id, sec: sec, t: String(sec), srcTitle: v.title, title: v.title, q: v.title, sum: txt, summary: txt, date: v.date || "" },
            act: "play",
            nb: m.s,
            nbm: m
          });
        });
      });
      TR.items = items; TR.loading = false;
      if (sr.open && qi.value.trim()) { renderSearch(qi.value); }
    }).catch(function () { TR.items = []; TR.loading = false; });
  }

  function loadBookIdx() {
    if (BK.items || BK.loading || !window.fetch) { return; }
    BK.loading = true;
    fetch("data/books-index.json").then(function (r) { if (!r.ok) { throw new Error("http"); } return r.json(); }).then(function (j) {
      var items = [];
      (j.books || []).forEach(function (b) {
        (b.x || []).forEach(function (c) {
          var m = bkMap(c[1]);
          items.push({ k: "อีบุ๊ก", t: b.t + " · หน้า " + c[0], qs: [], sub: "", extra: "", p: "", ref: { url: b.u, text: c[1], cover: b.c, book: b.t, page: c[0] }, act: "url", nb: m.s, nbm: m });
        });
      });
      BK.items = items; BK.loading = false;
      if (sr.open && qi.value.trim()) { renderSearch(qi.value); }
    }).catch(function () { BK.items = []; BK.loading = false; });
  }
  function lev(a, b) { var m = a.length, n = b.length, d = [], i, j; for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 1; j <= n; j++) { d[0][j] = j; } for (i = 1; i <= m; i++) { for (j = 1; j <= n; j++) { d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) { d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); } } } return d[m][n]; }
  function grams(s) { s = norm(s).replace(/[^\u0E00-\u0E7Fa-z0-9]/g, ""); var o = {}, n = 0; for (var i = 0; i < s.length - 1; i++) { var g = s.substr(i, 2); if (!o[g]) { o[g] = 1; n++; } } return { o: o, n: n }; }
  function dice(a, b) { var A = grams(a), B = grams(b), h = 0; if (!A.n || !B.n) { return 0; } Object.keys(A.o).forEach(function (g) { if (B.o[g]) { h++; } }); return 2 * h / (A.n + B.n); }
  function groupsOf(q) {
    return norm(q).split(" ").filter(Boolean).map(function (t) {
      var set = [t];
      D.syn.forEach(function (g) {
        if (g.indexOf(t) >= 0 || (t.length >= 3 && g.some(function (w) { return w.length >= 3 && (w.indexOf(t) >= 0 || t.indexOf(w) >= 0); }))) { g.forEach(function (w) { if (set.indexOf(w) < 0) { set.push(w); } }); }
      });
      return set;
    });
  }
  var TYPO = {}, ORIG = {};
  function has(h, v) {
    if (h.indexOf(v) >= 0) { return true; }
    if (/^[a-z0-9]{5,}$/.test(v)) { var ws = h.split(/[^a-z0-9]+/); for (var i = 0; i < ws.length; i++) { if (ws[i].length >= 4 && Math.abs(ws[i].length - v.length) <= 1 && lev(ws[i], v) <= 1) { if (ORIG[v]) { TYPO[v] = ws[i]; } return true; } } }
    return false;
  }
  function firstSent(t) { t = String(t || "").trim(); var m = /^(.{20,110}?[.!?。]|.{1,110})(\s|$)/.exec(t); return (m ? m[1] : t.slice(0, 110)).trim() + (t.length > 110 && !/[.!?。]$/.test(m ? m[1] : "") ? "…" : ""); }
  function autoTags(it) {
    if (it._autoTags) { return it._autoTags; }
    var ref = it.ref || {}, text = norm([it.t, (it.qs || []).join(" "), it.sub, it.extra, ref.topics, ref.tags, ref.cat, ref.pillar].join(" "));
    var tags = [], seen = {};
    function add(tag) { tag = String(tag || "").trim(); if (tag && !seen[tag]) { seen[tag] = 1; tags.push(tag); } }
    add(it.p);
    (D.autoRules || []).forEach(function (rule) {
      if ((rule.kw || []).some(function (keyword) { return keyword && text.indexOf(keyword) >= 0; })) { add(rule.p); }
    });
    it._autoTags = tags; return tags;
  }
  function allItems() { var _k = D.answers.length + ":" + (BK.items ? BK.items.length : 0) + ":" + (TR.items ? TR.items.length : 0); if (allItems._k === _k && allItems._c) { return allItems._c; } var _k = D.answers.length + ":" + (BK.items ? BK.items.length : 0) + ":" + (TR.items ? TR.items.length : 0); if (allItems._k === _k && allItems._c) { return allItems._c; }
    var A = [];
    D.answers.forEach(function (a) { A.push({ k: "คำตอบ", t: a.q, qs: [], sub: "เริ่มที่ " + fmtClock(a.sec) + (a.srcTitle ? " · " + a.srcTitle : "") + (a.sum ? " — " + firstSent(a.sum) : ""), extra: a.topics + " " + a.sum, p: "", ref: a, act: "play" }); });
    D.eps.forEach(function (e) { A.push({ k: "ตอน", t: e.title, qs: e.qs, sub: e.program + (e.num ? " ตอนที่ " + e.num : "") + (e.summary ? " — " + firstSent(e.summary) : ""), extra: e.topics + " " + e.summary, p: "", ref: e, act: "play" }); });
    D.shorts.forEach(function (s) { A.push({ k: "คลิปสั้น", t: s.q, qs: s.qs, sub: "คลิปสั้น" + (s.cat ? " · " + s.cat : "") + (s.summary ? " — " + firstSent(s.summary) : ""), extra: s.tags + " " + s.summary, p: s.cat, ref: s, act: s.id ? "play" : "" }); });
    D.sep.forEach(function (e) { A.push({ k: "ตอนในซีรีส์", t: e.title, qs: [], sub: e.series, extra: "", p: "", ref: e, act: "play" }); });
    D.series.forEach(function (s) { A.push({ k: "ซีรีส์", t: s.title, qs: [], sub: [s.count, s.pillar].filter(Boolean).join(" · "), extra: s.tag + " " + s.topics, p: s.pillar, ref: s, act: s.url ? "url" : "" }); });
    D.books.forEach(function (b) { A.push({ k: "หนังสือ", t: b.title, qs: [], sub: b.status || b.cat, extra: b.topics + " " + b.sub, p: "", ref: b, act: b.url ? "url" : "" }); });
    D.lib.forEach(function (b) { A.push({ k: "ห้องสมุด", t: b.t, qs: [], sub: (b.a || "") + (b.c ? " · " + b.c : ""), extra: b.tags, p: "", ref: b, act: "lib" }); });
    (BK.items || []).forEach(function (it) { A.push(it); });
    (TR.items || []).forEach(function (it) { A.push(it); });
    A.forEach(autoTags); allItems._k = _k; allItems._c = A; allItems._k = _k; allItems._c = A; return A;
  }
  var ORDER = ["คำตอบ", "บทพูดในคลิป", "ตอน", "คลิปสั้น", "ตอนในซีรีส์", "ซีรีส์", "หนังสือ", "อีบุ๊ก", "ห้องสมุด"], LABEL = { "คำตอบ": "คำตอบในคลิป", "บทพูดในคลิป": "บทพูดในคลิป (YouTube)", "อีบุ๊ก": "ในเนื้อหาอีบุ๊ก" };
  function hl(text, vars) {
    var low = String(text).toLowerCase(), best = null;
    vars.forEach(function (v) { var i = v ? low.indexOf(v) : -1; if (i >= 0 && (!best || v.length > best.l)) { best = { i: i, l: v.length }; } });
    if (!best) { return esc(text); }
    return esc(text.slice(0, best.i)) + "<mark>" + esc(text.slice(best.i, best.i + best.l)) + "</mark>" + esc(text.slice(best.i + best.l));
  }
  function matchesPillar(it) {
    if (!SR.pil) { return true; }
    return autoTags(it).some(function (tag) { return norm(tag) === norm(SR.pil); });
  }
  function hasAnswerTime(it) { var raw = it && it.ref ? String(it.ref.t || "").trim() : ""; var valid = /^\d{1,6}$/.test(raw) || /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.test(raw); return it && (it.k === "คำตอบ" || it.k === "บทพูดในคลิป") && it.ref && valid && isFinite(+it.ref.sec) && +it.ref.sec >= 0; }
  function dateRank(it) { var raw = it && it.ref ? it.ref.date : "", n = raw ? Date.parse(raw) : 0; return isFinite(n) ? n : 0; }
  function runSearch(q) {
    TYPO = {}; ORIG = {}; norm(q).split(" ").forEach(function (w) { ORIG[w] = 1; });
    var G = groupsOf(q), flat = [].concat.apply([], G), res = [], usedSyn = false, fuzzy = false, ALL = allItems().filter(function (it) { return matchesPillar(it) && (!SR.kind || (SR.kind === "คำตอบ" ? it.k === "คำตอบ" : SR.kind === "ตอน" ? it.k === "ตอน" || it.k === "ตอนในซีรีส์" : it.k === SR.kind)); });
    ALL.forEach(function (it) {
      if (it._hayAll === undefined) { it._hayT = norm(it.t); it._hayQ = norm(it.qs.join(" | ")); it._hayAll = it._hayT + " " + it._hayQ + " " + norm(it.sub) + " " + norm(it.extra); } var hayT = it._hayT, hayQ = it._hayQ, hayAll = it._hayAll, score = 0, ok = true, viaSyn = false;
      for (var gi = 0; gi < G.length; gi++) {
        var g = G[gi], hit = false;
        for (var vi = 0; vi < g.length; vi++) { if (has(hayAll, g[vi]) || bkHas(it, g[vi])) { hit = true; if (vi > 0) { viaSyn = true; } if (has(hayT, g[vi])) { score += 3; } if (has(hayQ, g[vi])) { score += 4; } if (it.nb) { score += Math.min(3, it.nb.split(bkNorm(g[vi])).length - 1) * 0.5; } break; } }
        if (!hit) { ok = false; break; }
      }
      var phrase = norm(q);   // ตรงทั้งวลีที่พิมพ์ = ขึ้นก่อน (เช่น "หมายเลข 8" ขึ้นก่อน "หมายเลข 48")
      if (ok) { if (viaSyn) { usedSyn = true; } res.push({ it: it, score: score + (it.k === "คำตอบ" ? 2 : 0) + (phrase.length >= 3 && hayT.indexOf(phrase) >= 0 ? 6 : 0) + (hayT === phrase ? 4 : 0), qHit: "" }); }
    });
    if (!res.length && norm(q).length >= 5) {
      ALL.forEach(function (it) { if (it.k === "อีบุ๊ก") { return; } var best = dice(q, it.t), bq = ""; it.qs.forEach(function (s) { var d = dice(q, s); if (d > best) { best = d; bq = s; } }); if (best >= 0.3) { res.push({ it: it, score: best * 10, qHit: bq }); } });
      fuzzy = res.length > 0;
    }
    res.sort(function (a, b) { return SR.sort === "newest" ? (dateRank(b.it) - dateRank(a.it) || b.score - a.score) : b.score - a.score; });
    return { res: res, flat: flat, usedSyn: usedSyn, fuzzy: fuzzy, G: G, typo: TYPO };
  }
  function matchedQ(it, vars, fz) { if (fz) { return fz; } var best = ""; it.qs.forEach(function (s) { var l = s.toLowerCase(); if (!best && vars.some(function (v) { return v && l.indexOf(v) >= 0; })) { best = s; } }); return best; }
  /* v6: คำถามยอดนิยม (ปักหมุด > ประโยคที่เป็นคำถาม) และคำค้นล่าสุดในเครื่องผู้ใช้ */
  var QRE = /[?？]|ไหม|ทำไม|อะไร|อย่างไร|ยังไง|ใคร|เมื่อไหร่|ที่ไหน|หรือไม่|หรือเปล่า/, RS_KEY = "arif.recent";
  function popularQs() {
    var seen = {}, out = [];
    function add(t, a) { t = String(t || "").trim(); if (!t || seen[t] || out.length >= 7) { return; } seen[t] = 1; out.push({ t: t, a: a }); }
    D.answers.filter(function (a) { return a.pinned; }).forEach(function (a) { add(a.q, a); });
    D.answers.filter(function (a) { return QRE.test(a.q); }).forEach(function (a) { add(a.q, a); });
    if (out.length < 4) { D.answers.forEach(function (a) { add(a.q, a); }); }
    if (!out.length) { D.shorts.forEach(function (x) { add(x.q); }); }
    return out;
  }
  function recentGet() { try { var v = JSON.parse(localStorage.getItem(RS_KEY) || "[]"); return Array.isArray(v) ? v.filter(function (x) { return typeof x === "string"; }).slice(0, 6) : []; } catch (e) { return []; } }
  function recentAdd(q) { q = String(q || "").trim(); if (q.length < 2) { return; } try { var l = recentGet().filter(function (x) { return x !== q; }); l.unshift(q); localStorage.setItem(RS_KEY, JSON.stringify(l.slice(0, 6))); } catch (e) {} }
  function renderSearch(q) {
    var cq = $("srClearQ"); if (cq) { cq.hidden = !qi.value; }
    if (String(q).trim().length >= 2) { loadBookIdx(); loadTranscriptIdx(); }
    var body = $("srb"); q = q.trim(); SR.rows = [];
    if (!q) {
      var pop = popularQs(), recent = recentGet();
      var topics = (C.POPULAR_TOPICS && C.POPULAR_TOPICS.length ? C.POPULAR_TOPICS : split(D.S["หัวข้อยอดนิยม"]));
      body.innerHTML = (recent.length ? '<div class="sr-h">ค้นหาล่าสุด <button type="button" class="sr-clear" data-rclear>ล้าง</button></div><div class="sr-chips">' + recent.map(function (t) { return '<button class="chip" type="button" data-sq="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>" : "") +
        (pop.length ? '<div class="sr-h">คำถามที่คนถามบ่อย</div>' + pop.map(function (x) { return '<button class="sr-q" type="button" data-sq="' + esc(x.t) + '"><i>↗</i>' + esc(x.t) + "</button>"; }).join("") : "") +
        (topics.length ? '<div class="sr-h">หรือเลือกหัวข้อ</div><div class="sr-chips">' + topics.map(function (t) { return '<button class="chip" type="button" data-sq="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>" : "") +
        '<p class="sr-note">พิมพ์เป็นประโยคก็ได้ ระบบจับคำและความคล้ายให้ ไม่ต้องรู้ชื่อคลิป</p>';
      return;
    }
    var r = runSearch(q), groups = {}, html = "";
    r.res.forEach(function (x) { (groups[x.it.k] = groups[x.it.k] || []).push(x); });
    if (q !== SR.lq || SR.kind !== SR.lk) { SR.lim = {}; SR.lq = q; SR.lk = SR.kind; }
    var selectedKind = SR.kind; SR.kind = ""; var allMatches = selectedKind ? runSearch(q).res : r.res; SR.kind = selectedKind;
    var countGroups = {}; allMatches.forEach(function (x) { (countGroups[x.it.k] = countGroups[x.it.k] || []).push(x); });
    var total = allMatches.length, typeCounts = { "": total, "คำตอบ": (countGroups["คำตอบ"] || []).length, "บทพูดในคลิป": (countGroups["บทพูดในคลิป"] || []).length, "ตอน": (countGroups["ตอน"] || []).length + (countGroups["ตอนในซีรีส์"] || []).length, "คลิปสั้น": (countGroups["คลิปสั้น"] || []).length, "ซีรีส์": (countGroups["ซีรีส์"] || []).length, "หนังสือ": (countGroups["หนังสือ"] || []).length, "อีบุ๊ก": (countGroups["อีบุ๊ก"] || []).length };
    var typeTabs = [["","ทั้งหมด"],["คำตอบ","คำตอบในคลิป"],["บทพูดในคลิป","บทพูดในคลิป"],["ตอน","ตอน"],["คลิปสั้น","คลิปสั้น"],["ซีรีส์","ซีรีส์"],["หนังสือ","หนังสือ"],["อีบุ๊ก","ในอีบุ๊ก"]].filter(function (x) { return x[0] === "" || typeCounts[x[0]] > 0; });
    html += '<div class="sr-results-head"><strong>พบ ' + total.toLocaleString("th-TH") + ' รายการสำหรับ <span>“' + esc(q) + '”</span></strong><button type="button" class="sr-clear" data-clear-search>ล้างตัวกรอง</button></div>';
    html += '<div class="sr-types" role="group" aria-label="กรองตามชนิดเนื้อหา">' + typeTabs.map(function (x) { return '<button type="button" class="sr-type" data-sk="' + esc(x[0]) + '" aria-pressed="' + (SR.kind === x[0]) + '">' + esc(x[1]) + ' <span>' + typeCounts[x[0]].toLocaleString("th-TH") + '</span></button>'; }).join("") + '</div>';
    var tk = Object.keys(r.typo); if (tk.length) { html += '<p class="sr-note">แก้คำสะกดให้: ' + esc(tk[0]) + " → " + esc(r.typo[tk[0]]) + "</p>"; }
    if (r.usedSyn) { var g0 = r.G.filter(function (g) { return g.length > 1; })[0]; if (g0) { var alt = g0.slice(1).filter(function (w, i, a) { return a.indexOf(w) === i && w !== g0[0]; }).slice(0, 4); if (alt.length) { html += '<p class="sr-note">รวมคำใกล้เคียงให้แล้ว: ' + esc(alt.join(" · ")) + "</p>"; } } }
    if (r.fuzzy) { html += '<p class="sr-note">ไม่เจอคำตรงๆ แสดงรายการที่ข้อความใกล้เคียงที่สุด</p>'; }
    if (total > 30 && !SR.pil) {
      var cnt = {}; allMatches.slice(0, 500).forEach(function (x) { autoTags(x.it).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
      var topTags = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 4);
      if (topTags.length > 1) { html += '<div class="sr-refine"><span>ผลเยอะ ลองดูเฉพาะหมวด</span>' + topTags.map(function (t) { return '<button type="button" class="chip" data-rf="' + esc(t) + '">' + esc(t) + " <span>" + cnt[t].toLocaleString("th-TH") + "</span></button>"; }).join("") + "</div>"; }
    }
    var _srShown = 0; ORDER.forEach(function (k) {
      var L = groups[k]; if (!L) { return; }
      if (!SR.kind) { html += '<div class="sr-h">' + esc(LABEL[k] || k) + ' <span class="c">' + L.length + "</span></div>"; }
      if (k === "อีบุ๊ก") { html += '<p class="sr-note">ข้อความสกัดจากไฟล์ PDF อาจมีตัวสะกดเพี้ยนเล็กน้อย กดเพื่อเปิดอีบุ๊กฉบับเต็ม (ดูตามเลขหน้าที่ระบุ)</p>'; }
      var lim = Math.min(SR.lim[k] || (SR.kind ? 30 : 8), Math.max(0, 50 - _srShown)); if (!lim) { return; } _srShown += Math.min(L.length, lim);
      L.slice(0, lim).forEach(function (x) {
        var qh = matchedQ(x.it, r.flat, x.qHit), i = SR.rows.push(x.it) - 1;
        var thumb = x.it.ref && x.it.ref.id ? ytImg(x.it.ref.id, "rr-thumb") : '<span class="rr-thumb rr-thumb-empty" aria-hidden="true">' + (k === "หนังสือ" || k === "อีบุ๊ก" ? "▤" : "▶") + '</span>';
        var detail = k === "บทพูดในคลิป" ? ("[" + fmtClock(x.it.ref.sec) + "] “" + x.it.ref.sum + "”") : (qh ? "คลิปนี้ตอบ: " + qh : (x.it.ref && x.it.ref.sec ? (x.it.ref.srcTitle ? "จากตอน " + x.it.ref.srcTitle + " · " : "") + "เริ่มที่ " + fmtClock(x.it.ref.sec) : x.it.sub || ""));
        var tagsHtml = autoTags(x.it).slice(0, 3).map(function (tag) { return '<span title="หมวดที่ระบบใช้ในการค้นหา">' + esc(tag) + '</span>'; }).join("");
        var timeLink = hasAnswerTime(x.it) ? '<a class="rr-go rr-time" href="https://www.youtube.com/watch?v=' + encodeURIComponent(x.it.ref.id) + '&amp;t=' + Math.floor(+x.it.ref.sec) + 's" target="_blank" rel="noopener noreferrer" aria-label="ดูคำตอบ เริ่มที่ ' + esc(fmtClock(+x.it.ref.sec)) + '"><span aria-hidden="true">▶</span> ดูคำตอบตรงเวลา <time>' + esc(fmtClock(+x.it.ref.sec)) + '</time></a>' : '<button class="rr-go" type="button" data-ri="' + i + '">' + (x.it.act === "play" ? (k === "คลิปสั้น" ? "ดูคลิปสั้น" : "ดูตอน") : x.it.act === "url" ? (k === "อีบุ๊ก" ? "เปิดอีบุ๊ก ↗" : "เปิดลิงก์ ↗") : "ดูต่อ ↗") + '</button>';
        html += '<article class="rr"><button class="rr-main" type="button" data-ri="' + i + '" aria-label="เปิด ' + esc(x.it.t) + '">' + thumb + '<span class="rr-copy"><span class="pl' + (k === "คลิปสั้น" ? " s" : (k === "คำตอบ" || k === "บทพูดในคลิป" ? " a" : "")) + '">' + esc(k === "คำตอบ" ? "▶ คำตอบในคลิป" : (k === "บทพูดในคลิป" ? "🎙 บทพูดในคลิป" : k)) + "</span><b>" + hl(x.it.t, r.flat) + "</b><small>" + (k === "อีบุ๊ก" ? bkSnippet(x.it, r.flat) : hl(detail, r.flat)) + '</small>' + (tagsHtml ? '<span class="rr-tags" aria-label="หมวดหมู่">' + tagsHtml + '</span>' : '') + '</span></button><span class="rr-side">' + timeLink + fbRowBtn(i) + '</span></article>';
      });
      if (L.length > lim) { html += '<div class="sr-morewrap"><button type="button" class="chip sr-more" data-more="' + esc(k) + '">แสดงเพิ่ม (เหลืออีก ' + (L.length - lim).toLocaleString("th-TH") + " รายการ)</button></div>"; }
    });
    if (FBK.url && r.res.length) { html += '<p class="sr-ask">ไม่เจอที่ต้องการ? <button type="button" class="lk" data-fbask="1">ฝากคำถามไว้ให้ทีม</button></p>'; }
    if (!r.res.length) { html += '<div class="sr-empty"><b>ยังไม่พบรายการที่ตรงกับ “' + esc(q) + '”</b><p>ลองใช้คำสั้นลง ตรวจการสะกด หรือเลือกหัวข้อใกล้เคียง</p><div class="sr-chips"><button class="chip" type="button" data-sq="พระเจ้า">พระเจ้า</button><button class="chip" type="button" data-sq="ชีวิต">ชีวิต</button><button class="chip" type="button" data-sq="เสรีภาพ">เสรีภาพ</button></div>' + (FBK.url ? '<p><button type="button" class="btn btn-line" data-fbask="1">ฝากคำถามนี้ไว้ให้ทีม</button></p>' : "") + '</div>'; }
    body.innerHTML = html;
  }
  function renderCats() {
    var cats = D.pillars; $("srCats").hidden = !cats.length;
    $("srCats").innerHTML = cats.length ? '<button type="button" class="chip" data-sc="" aria-pressed="' + (!SR.pil) + '">ทุกหมวด</button>' + cats.map(function (c) { return '<button type="button" class="chip" data-sc="' + esc(c) + '" aria-pressed="' + (SR.pil === c) + '">' + esc(c) + "</button>"; }).join("") : "";
    var sel = $("srCategory"); if (sel) { sel.innerHTML = '<option value="">ทุกหมวดหมู่</option>' + cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join(""); sel.value = SR.pil; }
    if ($("srSort")) { $("srSort").value = SR.sort; }
    var count = (SR.pil ? 1 : 0) + (SR.sort !== "relevance" ? 1 : 0);
    $("srAdvancedCount").hidden = !count; $("srAdvancedCount").textContent = count || "";
  }
  function openSearch(v) {
    if (!sr.open) { sr.showModal(); }
    loadBookIdx(); loadTranscriptIdx();
    if (typeof v === "string") { qi.value = v; }
    renderCats(); renderSearch(qi.value);
    setTimeout(function () { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); }, 30);
  }
  function chooseResult(it) {
    if (it.act === "play") { resumeSearchOnPlayerClose = sr.open; sr.close(); openPlayer(it.ref); }
    else { sr.close(); if (it.act === "url") { var u = safeUrl(it.ref.url); if (u) { window.open(u, "_blank", "noopener"); } } else if (it.act === "lib") { location.href = "library/?book=" + encodeURIComponent(it.ref.id); } }
  }
  var _srT; qi.addEventListener("input", function () { clearTimeout(_srT); _srT = setTimeout(function () { renderSearch(qi.value); }, 250); });
  qi.addEventListener("keydown", function (e) { if (e.key === "Enter") { recentAdd(qi.value); } });
  if ($("srClearQ")) { $("srClearQ").addEventListener("click", function () { qi.value = ""; SR.kind = ""; renderSearch(""); qi.focus(); }); }
  $("srAdvancedToggle").addEventListener("click", function () {
    var panel = $("srAdvancedPanel"), open = panel.hidden;
    panel.hidden = !open; $("srAdvancedToggle").setAttribute("aria-expanded", String(open));
  });
  $("srCategory").addEventListener("change", function () { SR.pil = this.value; renderCats(); renderSearch(qi.value); });
  $("srSort").addEventListener("change", function () { SR.sort = this.value; renderCats(); renderSearch(qi.value); });
  $("srAdvancedReset").addEventListener("click", function () { SR.pil = ""; SR.sort = "relevance"; renderCats(); renderSearch(qi.value); });
  $("srb").addEventListener("click", function (e) {
    var tab = e.target.closest("[data-sk]"), clear = e.target.closest("[data-clear-search]"), suggestion = e.target.closest("[data-sq]"), rf = e.target.closest("[data-rf]"), rc = e.target.closest("[data-rclear]");
    if (e.target.closest(".rr-go,.rr-main")) { recentAdd(qi.value); }
    var more = e.target.closest("[data-more]");
    if (more) { var mk = more.getAttribute("data-more"); SR.lim[mk] = (SR.lim[mk] || (SR.kind ? 30 : 8)) + 20; var bd = $("srb"), st = bd ? bd.scrollTop : 0; renderSearch(qi.value); if (bd) { bd.scrollTop = st; } return; }
    if (rf) { SR.pil = rf.getAttribute("data-rf"); renderCats(); renderSearch(qi.value); }
    else if (rc) { try { localStorage.removeItem(RS_KEY); } catch (er) {} renderSearch(""); }
    else if (tab) { SR.kind = tab.getAttribute("data-sk"); renderSearch(qi.value); }
    else if (clear) { SR.kind = ""; SR.pil = ""; SR.sort = "relevance"; renderCats(); renderSearch(qi.value); }
    else if (suggestion) { qi.value = suggestion.getAttribute("data-sq"); SR.kind = ""; renderSearch(qi.value); qi.focus(); }
  });
  qi.addEventListener("keydown", function (e) { if (e.key === "Escape") { sr.close(); } else if (e.key === "Enter") { e.preventDefault(); var first = sr.querySelector(".rr-main"); if (first) { first.click(); } } });
  $("srx").addEventListener("click", function () { sr.close(); });
  sr.addEventListener("click", function (e) { if (e.target === sr) { sr.close(); } });
  sr.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") { return; }
    var items = [].slice.call(sr.querySelectorAll(".rr-main,.rr-go,.sr-q,.sr-chips .chip")), cur = items.indexOf(document.activeElement), n;
    if (!items.length) { return; } e.preventDefault();
    if (e.key === "ArrowDown") { n = cur < 0 ? 0 : Math.min(cur + 1, items.length - 1); } else { n = cur <= 0 ? -1 : cur - 1; }
    if (n < 0) { qi.focus(); } else { items[n].focus(); }
  });
  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if ((e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag) && !sr.open && !vm.open) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); openSearch(); }
  });

  /* ---------------- สมัครรับข่าวด้วยบัญชี Google ---------------- */
  var GIS = { loading: null };
  function loadGIS() {
    if (window.google && google.accounts && google.accounts.oauth2) { return Promise.resolve(); }
    if (GIS.loading) { return GIS.loading; }
    GIS.loading = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = res; s.onerror = function () { GIS.loading = null; rej(new Error("gis")); }; document.head.appendChild(s); });
    return GIS.loading;
  }
  function subReady() { return !!(C.GOOGLE_CLIENT_ID && C.SUBSCRIBE_ENDPOINT); }
  function subDone(msg) { var b = $("subB"); b.disabled = true; b.querySelector(".lbl").textContent = "สมัครแล้ว ขอบคุณครับ"; var n = $("subNote"); n.hidden = !msg; n.textContent = msg || ""; try { localStorage.setItem("rk_sub", "1"); } catch (e) {} }
  function startSubscribe() {
    var n = $("subNote"), b = $("subB");
    if (!subReady()) { n.hidden = false; n.textContent = "ระบบสมัครรับข่าวจะเปิดเร็ว ๆ นี้"; return; }
    n.hidden = false; n.textContent = "กำลังเปิดหน้าต่าง Google…"; b.disabled = true;
    loadGIS().then(function () {
      var tc = google.accounts.oauth2.initTokenClient({
        client_id: C.GOOGLE_CLIENT_ID, scope: "openid email profile",
        callback: function (resp) {
          if (!resp || resp.error || !resp.access_token) { b.disabled = false; n.textContent = "ยังไม่ได้สมัคร ลองกดอีกครั้งได้เลย"; return; }
          n.textContent = "กำลังบันทึก…";
          var body = JSON.stringify({ action: "subscribe", token: resp.access_token });
          fetch(C.SUBSCRIBE_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body, redirect: "follow" })
            .then(function (r) { return r.text(); })
            .then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} if (j && j.ok) { subDone(j.dup ? "คุณสมัครไว้แล้ว ขอบคุณที่ติดตามครับ" : "สมัครเรียบร้อย ขอบคุณที่ติดตามครับ"); } else { b.disabled = false; n.textContent = "บันทึกไม่สำเร็จ ลองอีกครั้ง หรือติดต่อทางเพจ"; } })
            .catch(function () { fetch(C.SUBSCRIBE_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body }).then(function () { subDone("ส่งข้อมูลแล้ว ขอบคุณที่ติดตามครับ"); }).catch(function () { b.disabled = false; n.textContent = "ส่งข้อมูลไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"; }); });
        },
        error_callback: function () { b.disabled = false; n.textContent = "หน้าต่าง Google ถูกปิดหรือถูกบล็อก ลองกดอีกครั้ง"; }
      });
      tc.requestAccessToken({ prompt: "" });
    }).catch(function () { b.disabled = false; n.textContent = "เชื่อมต่อ Google ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"; });
  }

  /* ---------------- ตัวรับเหตุการณ์ ---------------- */
  function wire() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      var pm = t.closest("[data-pmark]"); if (pm) { togglePath(pm); return; }
      if (t.closest("[data-ddclose]")) { e.preventDefault(); closeDoor(false, true); return; }
      var dds = t.closest("[data-ddstart]"); if (dds) { var dd0 = D.paths[DD.pi]; AUTO = dd0 && +dds.getAttribute("data-ddstart") >= 0 ? { title: dd0.title, i: +dds.getAttribute("data-ddstart") } : null; return; }
      var nwl = t.closest('a[href="#news"], a.m-news'); if (nwl && (!$("home").hidden || !$("res").hidden)) { e.preventDefault(); newsJump(); return; }
      var apl = t.closest("[data-artplay]"); if (apl && !apl.classList.contains("on")) { e.preventDefault(); artPlay(apl); return; }
      if (t.closest("[data-artshare]")) { e.preventDefault(); artShare(); return; }
      var stp = t.closest("[data-stplay]"); if (stp) { e.preventDefault(); stPlay(stp); return; }
      var stl = t.closest("[data-stlb]"); if (stl) { e.preventDefault(); lxOpen(+stl.getAttribute("data-stlb"), 0); return; }
      var str = t.closest("[data-stread]"); if (str) { e.preventDefault(); var sk = $("sc" + str.getAttribute("data-stread")); if (sk) { jumpTo(sk.getBoundingClientRect().top + window.scrollY - 76); } return; }
      if (t.closest("[data-phide]")) { hidePlayer(); return; }
      if (t.closest("[data-pshow]")) { showPlayer(); if (LAST) { var lp = LAST; LAST = null; playStep(lp.pi, lp.i, lp.mode); } applyFocus(); return; }
      if (t.closest("[data-pfocus]")) { FOCUS = !FOCUS; try { localStorage.setItem("arif.theater", FOCUS ? "1" : "0"); } catch (e) {} applyFocus(); return; }
      if (t.closest("[data-pprev]")) { prevStep(); return; }
      if (e.target === $("res").querySelector(".pdim") || e.target.classList.contains("pdim")) { if (document.documentElement.classList.contains("theater-open")) { hidePlayer(); } return; }
      var sgq = t.closest("[data-gseg]"); if (sgq) { var gh = $("res").querySelector('.pgroup[data-g="' + sgq.getAttribute("data-gseg") + '"]'); if (gh) { jumpTo(window.scrollY + gh.getBoundingClientRect().top - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--hdrh"), 10) || 96) - 16 - (window.innerWidth < 980 ? 250 : 0)); } return; }
      var gq = t.closest("[data-gplay]"); if (gq) { playGuest(+gq.getAttribute("data-gplay")); return; }
      var pq = t.closest("[data-pplay]"); if (pq) { var qa = pq.getAttribute("data-pplay").split(":"); playStep(+qa[0], +qa[1], qa[2] === "s" ? "s" : ""); return; }
      if (t.closest("[data-pnext]")) { nextStep(); return; }
      if (t.closest("#clr")) { goHome(); return; }
      if (t.closest("[data-open-search]")) { e.preventDefault(); openSearch(); return; }
      var ri = t.closest("[data-ri]"); if (ri) { var it = SR.rows[+ri.getAttribute("data-ri")]; if (it) { chooseResult(it); } return; }
      var sq = t.closest("[data-sq]"); if (sq) { var v = sq.getAttribute("data-sq"); SR.kind = ""; SR.pil = ""; SR.sort = "relevance"; qi.value = v; renderCats(); renderSearch(v); if (!sr.open) { sr.showModal(); } qi.focus(); return; }
      var sc = t.closest("[data-sc]"); if (sc) { SR.pil = sc.getAttribute("data-sc"); renderCats(); renderSearch(qi.value); return; }
      var hq = t.closest("[data-q]"); if (hq) { openSearch(hq.getAttribute("data-q")); return; }
      var pl = t.closest("[data-play]"); if (pl) { var item = REG[pl.getAttribute("data-play")]; if (item) { if (item.k === "short" && !item.id && !item.url) { return; } openPlayer(item); } return; }
      var ec = t.closest("[data-ec]"); if (ec) { viewAllEps(ec.getAttribute("data-ec")); return; }
      var fm = t.closest("[data-fm]"); if (fm) { ANS_FAM = fm.getAttribute("data-fm"); viewAnswers(""); return; }
      var ag = t.closest("[data-ag]"); if (ag) { ANS_GROUP = ag.getAttribute("data-ag"); viewAnswers(""); return; }
      var ac = t.closest("[data-ac]"); if (ac) { viewAnswers("", false, ac.getAttribute("data-ac")); return; }
      var at = t.closest("[data-at]"); if (at) { viewAnswers(at.getAttribute("data-at")); return; }
      if (t.closest("#ansMore")) { ANS_SHOW += 60; viewAnswers(ANS_TOPIC, true); return; }
      var sp = t.closest("[data-sp]"); if (sp) { SHPIL = sp.getAttribute("data-sp"); drawHome(); return; }
      var srp = t.closest("[data-srp]"); if (srp) { SRPIL = srp.getAttribute("data-srp"); srAll = false; drawHome(); return; }
      if (t.closest("#srMore")) { srAll = true; drawHome(); return; }
      if (t.closest("#shAll")) { return; }
      var hm = t.closest("[data-home]"); if (hm && !$("res").hidden) { goHome(); }
    });
    $("subB").addEventListener("click", startSubscribe);
    try { if (localStorage.getItem("rk_sub") === "1") { subDone(""); } } catch (e) {}
    var pre = function () { if (subReady()) { loadGIS().catch(function () {}); } };
    $("subB").addEventListener("pointerenter", pre, { once: true }); $("subB").addEventListener("focus", pre, { once: true });
    if (window.IntersectionObserver) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { pre(); io.disconnect(); } }, { rootMargin: "500px 0px" }); io.observe($("news")); }
    window.addEventListener("hashchange", route);
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { var big = $("hxBig"), ticking = false; window.addEventListener("scroll", function () { if (ticking) { return; } ticking = true; requestAnimationFrame(function () { big.style.setProperty("translate", "0 " + (Math.min(window.scrollY, 700) * 0.18).toFixed(1) + "px"); ticking = false; }); }, { passive: true }); }
  }

  /* ---------------- ห้องสมุด (ค้นข้าม) ---------------- */
  function loadLibrary() {
    var u = LIB ? safeUrl(C.LIBRARY_CATALOG_URL) : ""; if (!u) { return; }
    fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) { throw new Error("x"); } return r.json(); }).then(function (d) {
      var list = (d.books || d || []).map(function (b) {
        var cv = safeUrl(b.cover); if (cv && !/^https?:/.test(cv) && cv.indexOf("library/") !== 0) { cv = "library/" + cv.replace(/^\.?\//, ""); }
        return { id: b.id, t: String(b.t || "").split(/[:(（]/)[0].trim() || b.t, a: b.a || "", c: b.c || "", tags: (b.tags || []).join(" "), img: cv };
      });
      D.lib = list; if ($("libN")) { $("libN").textContent = list.length.toLocaleString("th-TH"); }
      var sl = $("stLib"); if (sl) { sl.hidden = false; sl.querySelector("b").textContent = list.length.toLocaleString("th-TH"); }
      var withImg = list.filter(function (b) { return b.img; }).slice(0, 5);
      if ($("lstack")) { $("lstack").innerHTML = withImg.map(function (b) { return '<img alt="" loading="lazy" src="' + esc(b.img) + '">'; }).join(""); }
      if (sr.open) { renderSearch(qi.value); }
    }).catch(function () { });
  }

  /* ---------------- เริ่มทำงาน ---------------- */
  loadAll().then(function (res) {
    build(res.raw); drawHome(); wire(); route(); loadLibrary();
  }).catch(function () { build(FB); drawHome(); wire(); route(); });
})();
