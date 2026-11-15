/**
 * Subscribe.gs  —  รับรายชื่อผู้สมัครรับข่าวจากปุ่ม "สมัครรับข่าวฟรี" บนเว็บ
 * ใช้เป็นโปรเจกต์ Apps Script แยกใหม่ (script.google.com > โครงการใหม่) ไม่ปนกับสคริปต์ซิงก์ YouTube หรือสคริปต์ห้องสมุด
 * เก็บรายชื่อลงชีตส่วนตัวที่ไม่ได้แชร์ ห้ามเก็บในชีตข้อมูลเว็บ (ชีตนั้นแชร์แบบทุกคนที่มีลิงก์)
 * ขั้นตอนอยู่ในไฟล์ README-ตั้งค่า.md
 */

// 1) ใส่ค่าสองตัวนี้
var SHEET_ID  = 'ใส่ ID ของชีตส่วนตัวสำหรับเก็บรายชื่อ (ข้อความยาวๆ ระหว่าง /d/ กับ /edit ในลิงก์ชีต) ห้ามใช้ชีตข้อมูลเว็บ เพราะแชร์เป็นสาธารณะ';
var CLIENT_ID = 'ใส่ OAuth Client ID ตัวเดียวกับที่ใส่ใน index.html';

var TAB = 'Subscribers';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action !== 'subscribe' || !data.token) return out_({ ok: false, error: 'bad-request' });

    // ตรวจโทเค็นกับ Google: ต้องออกให้แอปของเราและอีเมลต้องยืนยันแล้ว
    var info = JSON.parse(UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(data.token),
      { muteHttpExceptions: true }).getContentText());
    if (!info || info.error_description || info.error) return out_({ ok: false, error: 'bad-token' });
    if (info.aud !== CLIENT_ID && info.azp !== CLIENT_ID) return out_({ ok: false, error: 'bad-client' });
    if (String(info.email_verified) !== 'true' || !info.email) return out_({ ok: false, error: 'bad-email' });

    var email = String(info.email).toLowerCase();
    var name = '';
    try {
      var ui = JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer ' + data.token }, muteHttpExceptions: true }).getContentText());
      name = ui.name || '';
    } catch (err) {}

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sh = tab_();
      var last = sh.getLastRow();
      if (last > 1) {
        var emails = sh.getRange(2, 2, last - 1, 1).getValues();
        for (var i = 0; i < emails.length; i++) {
          if (String(emails[i][0]).toLowerCase() === email) {
            sh.getRange(i + 2, 4).setValue('ใช้งาน'); // สมัครซ้ำ = กลับมารับข่าวอีกครั้ง
            return out_({ ok: true, dup: true });
          }
        }
      }
      sh.appendRow([new Date(), email, name, 'ใช้งาน']);
    } finally { lock.releaseLock(); }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: 'server' });
  }
}

function tab_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.appendRow(['เวลาที่สมัคร', 'อีเมล', 'ชื่อ', 'สถานะ']); // ยกเลิกรับข่าว: เปลี่ยนสถานะเป็น "ยกเลิก"
    sh.setFrozenRows(1);
  }
  return sh;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// รันฟังก์ชันนี้ 1 ครั้งจากตัวแก้ไข เพื่อให้ Google ขอสิทธิ์ (สเปรดชีต + เรียกเว็บภายนอก)
function setup() {
  tab_();
  UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/certs');
}
