/* ===== ตั้งค่าเว็บ (แก้เฉพาะไฟล์นี้) ===== */
window.SITE_CONFIG = {
  SHEET_ID: "https://docs.google.com/spreadsheets/d/1AB1sWLWqibN9v04hAGat8QVPxFT2LUURQ0kE9z5XnVM/edit?gid=1291046652#gid=1291046652",            // ลิงก์หรือรหัสของ Google Sheet ข้อมูลเว็บ (แท็บรายการ ตอน ซีรีส์ ฯลฯ) ว่าง = ใช้ข้อมูลสำรองในเว็บ
  LIBRARY_CATALOG_URL: "https://script.google.com/macros/s/AKfycbx_QXCzTTMofIzZkwpQLw4ENcq5V8xQi-1T5WgJCu0oAQCQN3ezW-1lSUAZMTDe9w1b/exec?action=books", // ใช้ค้นหาหนังสือห้องสมุดจากหน้าแรก ว่าง = ไม่ค้นห้องสมุด
  GOOGLE_CLIENT_ID: "",    // OAuth Client ID (ชนิด Web) ของปุ่มสมัครรับข่าว ว่าง = ปุ่มยังไม่ทำงาน
  SUBSCRIBE_ENDPOINT: "",  // ลิงก์ Web app ของ Subscribe.gs (ชีตส่วนตัวแยกต่างหาก)
  PROMPTPAY_ID: "",        // เบอร์มือถือที่ผูก PromptPay (แนะนำ ไม่ใช้เลขบัตรประชาชน) ว่าง = ยังไม่แสดง
  DONATE_BTC: "",          // ที่อยู่ Bitcoin on-chain (เฉพาะที่อยู่ ห้ามใส่ seed phrase หรือ private key)
  DONATE_LN: "afraididron98@walletofsatoshi.com", // ที่อยู่ Lightning เช่น ชื่อ@โดเมน
  LN_QR_IMG: "images/qr-lightning.png",             // รูป QR ของ Lightning (ว่าง = ให้เว็บสร้างเอง)
  PROMPTPAY_QR_IMG: "images/qr-promptpay.jpg",      // รูป Thai QR Payment ของ PromptPay (ว่าง = สร้างจาก PROMPTPAY_ID)
  SHOW_LIBRARY: false,     // true = เปิดส่วนห้องสมุด (ต้องวางโฟลเดอร์ library/ กลับมา) ปิดไว้ก่อนตามที่ตกลง
  CONTACT_URL: "https://www.facebook.com/profile.php?id=100094394411121", // เพจ Facebook ห้องสมุด
  TOPIC_FAMILIES: [ // กลุ่มหัวข้อบนหน้าคำตอบ (icon: moon / scale / atom / book / users / mic) หัวข้อที่ไม่อยู่ในกลุ่มใดจะไปอยู่กลุ่มสุดท้ายเอง
    { name: "ศาสนาและความเชื่อ", icon: "moon", topics: ["อิสลามและหลักศรัทธา", "หลักปฏิบัติและข้อวินิจฉัยอิสลาม", "การรับอิสลามและมุสลิมใหม่", "ศาสนาเปรียบเทียบ", "วัฒนธรรมและความเชื่อพื้นบ้าน"] },
    { name: "พิสูจน์พระเจ้าและเหตุผล", icon: "scale", topics: ["การพิสูจน์พระเจ้า", "ปรัชญาและตรรกศาสตร์"] },
    { name: "วิทยาศาสตร์", icon: "atom", topics: ["วิวัฒนาการและต้นกำเนิดชีวิต", "วิทยาศาสตร์และจักรวาล", "สุขภาพและการแพทย์"] },
    { name: "คัมภีร์และประวัติศาสตร์", icon: "book", topics: ["อัลกุรอานและคัมภีร์", "ประวัติศาสตร์และบุคคลสำคัญ"] },
    { name: "ชีวิตและสังคม", icon: "users", topics: ["จริยธรรมและสังคม", "พัฒนาตนเองและการใช้ชีวิต", "ครอบครัวและความสัมพันธ์", "การเงินและธุรกิจฮาลาล", "เสรีภาพและสิทธิมนุษยชน", "การเมืองและสถานการณ์โลก", "สื่อ เทคโนโลยี และวัฒนธรรมร่วมสมัย"] },
    { name: "รายการและอื่น ๆ", icon: "mic", topics: ["รายการและเบื้องหลัง", "อื่น ๆ"] }
  ],
  SOCIAL: {        // ลิงก์โซเชียลสำรอง ใช้เมื่อชีตแท็บ "ตั้งค่า" ไม่มีลิงก์ (ถ้าชีตมีค่า ชีตมาก่อน)
    youtube: "https://www.youtube.com/@ArifSalafi",
    facebook: "https://www.facebook.com/arifdawahsalafi",
    instagram: "https://www.instagram.com/arifdawahsalafiofficial/",
    tiktok: "https://www.tiktok.com/@arifdawahsalafiofficial"
  },
  PRIVACY: {       // ข้อความในหน้านโยบายความเป็นส่วนตัว กรอกที่นี่ที่เดียว (ช่องที่ว่างจะแสดงเป็นกรอบประสีแดงในหน้านั้น)
    controller: "อารีฟ ซาลาฟี",    // ชื่อ-นามสกุลหรือชื่อองค์กรของผู้ดูแลเว็บ (ผู้ควบคุมข้อมูล)
    contact: "https://www.facebook.com/arifdawahsalafi",       // อีเมล หรือลิงก์เพจ Facebook ที่ตอบจริง (ถ้าเป็นลิงก์ จะกดได้ในหน้านโยบาย)
    host: "Netlify",   // ผู้ให้บริการโฮสต์ของเว็บ (เปลี่ยนถ้าย้ายเว็บ)
    reviewed: false    // เปลี่ยนเป็น true เมื่อผู้รู้เรื่อง PDPA ตรวจแล้ว จะซ่อนข้อความ "ฉบับร่าง"
  },
  PLEDGE: [],  // ปิดไว้ เพราะซ้ำกับข้อความใต้หัวข้อหน้าแรก ใส่ข้อความเป็นบรรทัด ๆ ได้ถ้าอยากเปิดกลับมา เช่น PLEDGE: ["ข้อความที่ 1", "ข้อความที่ 2"]
  ART_THEME: "dark",   // ธีมหน้าบทความแบบนิตยสาร: "light" = กระดาษขาว (ค่าเริ่มต้น) / "dark" = พื้นดำเข้ากับเว็บ
  ART_COVER_DIR: "images/covers/",   // โฟลเดอร์รูปปกบทความ (จับคู่ตามหัวข้อด้วย article-covers.js หรือพิมพ์ชื่อไฟล์ในช่อง ภาพปก ของชีต)
  SITE_URL: "https://arifsalafi.netlify.app",  // โดเมนหลักของเว็บ ใช้เป็น canonical และลิงก์แชร์ (แก้ให้ตรงกับโดเมนจริง)
  INTEREST_LABEL: "สนใจรับอิสลาม",  // ข้อความบนปุ่มในตัวเล่น กดแล้วเปิดแบบฟอร์มฝากช่องทางติดต่อ (ต้องตั้ง FEEDBACK_URL ก่อน ไม่งั้นปุ่มไม่ขึ้น) ตั้งเป็น "" เพื่อซ่อนปุ่ม
  FEEDBACK_URL: "",  // ลิงก์ Web app ของ Apps Script (ไฟล์ Feedback.gs) ลงท้ายด้วย /exec ถ้าว่าง เว็บจะไม่แสดงปุ่ม แจ้งปัญหา / ฝากคำถาม
  POPULAR_TOPICS: ["วิวัฒนาการ","พระเจ้า","DNA","เสรีภาพ","คัมภีร์","รับอิสลาม","การเงิน"]
};
