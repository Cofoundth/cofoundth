// Cofoundee — i18n dictionary + pure t() helper. CLIENT-SAFE.
//
// Anything that touches `next/headers` (cookies) lives in `i18n-server.ts`
// so this module doesn't drag server APIs into the client bundle.
//
// Translation philosophy: NOT word-for-word translation of English.
// Each Thai string is rewritten as native Thai marketing copy — what a
// Thai brand would actually write here, not what an English string would
// become if translated. Key conventions:
//   - Drop `ของ` where compound nouns work ("ของไทย" → "ไทย")
//   - Use "มา" for invitations ("สร้างด้วยกัน" → "มาสร้างด้วยกัน")
//   - Keep English loanwords Thai founders actually use: founder, co-founder,
//     pitch, startup, MVP, B2B, VC, angel, Complement Score
//   - Brand bylines, dates, location marks stay English in Thai mode

export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const TH: Record<string, string> = {
  // ─── Marketing nav / footer ───────────────────────────────────────
  "How it works": "วิธีใช้งาน",
  Insights: "บทความ",
  Legal: "กฎหมาย",
  Events: "อีเวนต์",
  "Sign in": "เข้าสู่ระบบ",
  "Join Cofoundee": "สมัครเลย",
  // Brand byline stays English — Thai startups keep these marks in English
  // (TechSauce, Builk, Lazada all do).
  "Est. 2026 · Bangkok": "Est. 2026 · Bangkok",
  Platform: "แพลตฟอร์ม",
  Resources: "แหล่งข้อมูล",
  Company: "บริษัท",
  Contact: "ติดต่อ",
  "Create profile": "สร้างโปรไฟล์",
  "Privacy (PDPA)": "ความเป็นส่วนตัว (PDPA)",
  Terms: "เงื่อนไข",
  "Code of Conduct": "จรรยาบรรณ",
  Chat: "แชต",
  Dashboard: "หน้าหลัก",
  Browse: "ค้นหา",
  Founders: "Founder",
  Interests: "ความสนใจ",
  Community: "ชุมชน",
  Admin: "แอดมิน",
  "Sign out": "ออกจากระบบ",
  "Your profile": "โปรไฟล์",
  "Built by founders, for founders.": "โดย founder เพื่อ founder",
  "The platform for Thailand’s founders to find their co-founder.":
    "ชุมชน ที่ปรึกษา และคู่หูธุรกิจ ของ startup ไทย",
  "Legal templates": "เทมเพลตเอกสารกฎหมาย",

  // ─── Landing — hero ───────────────────────────────────────────────
  "Thailand's startup community": "ชุมชน startup ไทย",
  "Where Thai startups build together.": "สร้าง startup ไทย ไปด้วยกัน",
  "Cofoundee is the bridge for Thailand's startup ecosystem — a community where founders meet, companies find partners, and investors and advisors come to you when the time is right.":
    "Cofoundee คือสะพานเชื่อมวงการ startup ไทย — ที่ที่ founder ได้เจอกัน บริษัทเจอพาร์ตเนอร์ และนักลงทุนกับที่ปรึกษามาหาคุณเอง เมื่อถึงเวลา",
  "Join the community": "เข้าร่วมเลย",
  "Browse founders": "ดู founder",
  "Free forever": "ฟรีตลอด",
  "Verified profiles": "โปรไฟล์ยืนยันแล้ว",
  "Built for Thailand": "สร้างเพื่อคนไทย",
  "What's inside": "มีอะไรในนี้",
  "Daily founder conversations": "บทสนทนาของ founder ทุกวัน",
  "Community forum, content, weekly events":
    "ฟอรัม บทความ และอีเวนต์รายสัปดาห์",
  "Bridge to partners + capital": "สะพานสู่พาร์ตเนอร์และเงินทุน",
  "B2B network, legal/finance advisors, investor intros":
    "เครือข่าย B2B ที่ปรึกษากฎหมาย/การเงิน และการแนะนำนักลงทุน",
  "Co-founder matching": "หา co-founder",
  "Cherry on top — find complementary partners when you're ready":
    "ของแถม — เจอ co-founder ที่ใช่ เมื่อพร้อม",

  // ─── Landing — Pillars ────────────────────────────────────────────
  "What we do": "เราทำอะไร",
  "Everything a Thai startup needs — in one place.":
    "ทุกอย่างที่ startup ไทยต้องการ ในที่เดียว",
  "Built in the order that actually works: community first, then partnerships and capital come on top.":
    "สร้างตามลำดับที่เวิร์กจริง: ชุมชนมาก่อน แล้วพาร์ตเนอร์กับเงินทุนค่อยตามมา",
  "Where Thai founders meet": "ที่ที่ founder ไทยมาเจอกัน",
  "Forum, content, and events for serious Thai startup builders. Ask questions, share what you're shipping, and meet the people who'll shape your journey.":
    "ฟอรัม บทความ และอีเวนต์ สำหรับคนที่จริงจังกับ startup ไทย ถามได้ แชร์ได้ และเจอคนที่จะเปลี่ยนเส้นทางของคุณ",
  "B2B Network": "เครือข่าย B2B",
  "Companies finding companies": "บริษัทเจอบริษัท",
  "Startups partner with startups — vendors, integrations, distribution, co-marketing. Browse company profiles, see capabilities, start the conversation.":
    "Startup จับมือกัน — vendor, integration, จัดจำหน่าย, co-marketing ดูโปรไฟล์บริษัท เช็กความสามารถ แล้วเริ่มคุยเลย",
  "Advisor Partners": "พาร์ตเนอร์ที่ปรึกษา",
  "Legal + finance, on demand": "กฎหมาย + การเงิน เมื่อต้องการ",
  "Partnered with vetted Thai law firms and accountants. Get advice on incorporation, contracts, fundraising structure — without paying for a full retainer.":
    "ร่วมมือกับสำนักงานกฎหมายและนักบัญชีไทยที่คัดมาแล้ว ขอคำแนะนำเรื่องจดบริษัท สัญญา โครงสร้างระดมทุน — โดยไม่ต้องจ้างประจำ",
  "Capital Bridge": "สะพานสู่เงินทุน",
  "Warm intros to investors": "แนะนำนักลงทุนแบบอุ่น ไม่ใช่ cold call",
  "Not cold algorithmic matching. Once you're active in the community, we make warm introductions to angel networks and VCs that fit your stage.":
    "ไม่ใช่ algorithm สุ่มจับคู่ พอคุณ active ในชุมชน เราจะแนะนำคุณกับ angel และ VC ที่เหมาะกับช่วงของคุณ",
  Live: "เปิดแล้ว",
  "Coming soon": "เร็วๆ นี้",

  // ─── Landing — Process ────────────────────────────────────────────
  "The process": "ขั้นตอน",
  "Considered. Mutual. Serious.": "คิดมาดี · สนใจร่วมกัน · จริงจัง",
  "Trust first. Everything else follows.":
    "ความเชื่อใจมาก่อน ที่เหลือตามมาเอง",
  "Free. Build your profile, see who's here, follow the conversations.":
    "ฟรี สร้างโปรไฟล์ ดูว่ามีใครอยู่บ้าง ตามอ่านบทสนทนา",
  "Contribute + connect": "มีส่วนร่วม + เชื่อมต่อ",
  "Post, comment, attend events. Get known for what you build.":
    "โพสต์ คอมเมนต์ เข้าอีเวนต์ ให้คนรู้จักคุณจากสิ่งที่คุณสร้าง",
  "Find what you need": "หาสิ่งที่ต้องการ",
  "B2B partners, co-founders, advisors, investors — unlocked by trust.":
    "พาร์ตเนอร์ B2B, co-founder, ที่ปรึกษา, นักลงทุน — ปลดล็อกด้วยความเชื่อใจ",
  "Grow together": "เติบโตไปด้วยกัน",
  "The whole ecosystem compounds. Your network is the platform.":
    "ทั้งระบบนิเวศต่อยอดกันเอง เครือข่ายของคุณ = แพลตฟอร์ม",
  "Declare what you are, what you bring, and what you need.":
    "บอกว่าคุณเป็นใคร มีอะไรมานำเสนอ และกำลังหาอะไร",
  "Browse directory": "ดูไดเรกทอรี",
  "Filter by role, industry, and intent. Read full pitches.":
    "กรองตามบทบาท อุตสาหกรรม และเป้าหมาย อ่าน pitch แบบเต็ม",
  "Express interest": "แสดงความสนใจ",
  "Send a thoughtful note. No spam, no swipes.":
    "ส่งข้อความที่คิดมาดี ไม่มีสแปม ไม่มีปัดเล่น",
  "Mutual unlock": "ปลดล็อกร่วมกัน",
  "When both express interest, messaging opens.":
    "พอสนใจตรงกัน ระบบจะเปิดให้คุยเลย",

  // ─── Landing — Testimonial ────────────────────────────────────────
  "I joined for the community, stayed for the conversations, and ended up finding our first enterprise customer through someone I met in the forum. That's the kind of compounding you don't get from cold outreach.":
    "ผมเข้ามาเพราะชุมชน อยู่ต่อเพราะการสนทนา แล้วสุดท้ายก็ได้ลูกค้า enterprise รายแรกผ่านคนที่เจอในฟอรัม นี่คือการต่อยอดที่ cold outreach ให้ไม่ได้",
  "Co-founder, FlexPay Thailand": "Co-founder, FlexPay Thailand",

  // ─── Landing — CTA ────────────────────────────────────────────────
  "Your missing piece is on the platform.":
    "คนที่คุณตามหา อยู่ที่นี่",
  "The Thai startup ecosystem — built together.":
    "วงการ startup ไทย — สร้างไปด้วยกัน",
  "Join the community of serious Thai founders. Free, forever — because trust takes years and we're playing the long game.":
    "เข้าร่วมชุมชน founder ไทยที่จริงจัง ฟรีตลอด — เพราะความเชื่อใจใช้เวลาเป็นปี และเราเล่นเกมยาว",
  "Join the community — Free": "เข้าร่วมเลย — ฟรี",
  "Create your profile — Free": "สร้างโปรไฟล์ฟรี",

  // ─── Auth pages ───────────────────────────────────────────────────
  "Welcome back": "ยินดีต้อนรับกลับ",
  "Continue building with your co-founder community.":
    "กลับมาสร้างต่อกับชุมชน co-founder ของคุณ",
  "Phase I · Free for all founders":
    "เฟส 1 · ฟรีสำหรับทุกคน",
  "Join Thailand’s most serious community of co-founders.":
    "เข้าร่วมชุมชน founder ที่จริงจังที่สุดในไทย",
  Email: "อีเมล",
  Password: "รหัสผ่าน",
  "Confirm password": "ยืนยันรหัสผ่าน",
  "Full name": "ชื่อ-นามสกุล",
  "Forgot?": "ลืมรหัส?",
  "Sign in with Email": "เข้าสู่ระบบด้วยอีเมล",
  "Create your account": "สร้างบัญชี",
  "Continue with Google": "เข้าสู่ระบบด้วย Google",
  "Continue with LinkedIn": "เข้าสู่ระบบด้วย LinkedIn",
  or: "หรือ",
  "New to Cofoundee?": "ยังไม่มีบัญชี?",
  "Already on Cofoundee?": "มีบัญชีอยู่แล้ว?",
  "By continuing, you agree to our Terms and acknowledge our PDPA privacy policy.":
    "เมื่อสมัคร คุณยอมรับเงื่อนไขและรับทราบนโยบายความเป็นส่วนตัว (PDPA) ของเรา",
  "PDPA compliant": "เป็นไปตาม PDPA",
  Continue: "ต่อไป",
  "Creating account…": "กำลังสร้างบัญชี…",
  "Signing in…": "กำลังเข้าสู่ระบบ…",
  "8+ characters.": "อย่างน้อย 8 ตัวอักษร",
  "At least 8 characters": "อย่างน้อย 8 ตัวอักษร",
  "Contains a letter": "มีตัวอักษร",
  "Contains a number": "มีตัวเลข",
  "Passwords match": "รหัสตรงกัน",
  "Passwords don’t match": "รหัสไม่ตรงกัน",
  "Check your email": "เช็กอีเมลของคุณ",
  "We sent a confirmation link to": "เราส่งลิงก์ยืนยันไปที่",
  "Click it to activate your account.": "คลิกลิงก์เพื่อเปิดใช้บัญชี",
  "Didn’t arrive? Check your spam folder. The link expires in 24 hours.":
    "ไม่เจอ? ลองดูในสแปม ลิงก์หมดอายุใน 24 ชั่วโมง",

  // ─── Dashboard ───────────────────────────────────────────────────
  "Good morning": "อรุณสวัสดิ์",
  "Good afternoon": "สวัสดีตอนบ่าย",
  "Good evening": "สวัสดีตอนเย็น",
  "Working late": "ทำงานดึกอีกแล้ว",
  "Burning the midnight oil": "ทำยันเช้าเลย",
  "Hello,": "สวัสดี,",
  "Finish your profile to start receiving interest from co-founders.":
    "ทำโปรไฟล์ให้เสร็จ เพื่อเริ่มรับความสนใจจาก co-founder",
  "founder(s) expressed interest in you. Take a look —":
    "คน สนใจคุณอยู่ ลองดู —",
  "your inbox": "กล่องข้อความ",
  "mutual match(es) so far. Keep the conversations going.":
    "แมตช์ คุยกันต่อเลย",
  "Browse the directory and express interest in founders whose profiles complement yours.":
    "ดูไดเรกทอรีและแสดงความสนใจใน founder ที่โปรไฟล์เสริมกับคุณ",
  "Finish your founder profile": "ทำโปรไฟล์ founder ให้เสร็จ",
  "Declare what you are, what you bring, and what you’re looking for. The more your profile says, the better the matches.":
    "บอกว่าคุณเป็นใคร นำเสนออะไร และหาอะไรอยู่ ยิ่งโปรไฟล์ชัด ยิ่งแมตช์แม่น",
  "Start onboarding": "เริ่มเลย",
  "Interests received": "ความสนใจที่ได้รับ",
  "Mutual matches": "แมตช์",
  "Profile views": "คนดูโปรไฟล์",
  "Founder directory": "ไดเรกทอรี founder",
  "Filter by role, industry, and stage. Read full pitches before you express interest.":
    "กรองตามบทบาท อุตสาหกรรม และช่วง อ่าน pitch แบบเต็มก่อนแสดงความสนใจ",
  "Open directory": "เปิดไดเรกทอรี",
  "Update your pitch": "อัปเดต pitch",
  "Refine your pitch and details. Better signal — better matches.":
    "ปรับ pitch และรายละเอียดให้ดีขึ้น สัญญาณดี = แมตช์แม่น",
  "Edit profile": "แก้ไขโปรไฟล์",

  // ─── Browse / directory ──────────────────────────────────────────
  "The directory": "ไดเรกทอรี",
  "Clear all filters": "ล้างตัวกรอง",
  "complete your profile for complement scores":
    "ทำโปรไฟล์ให้เสร็จ เพื่อดู complement score",
  founders: "founder",
  "A 0–100 score measuring how well two founders fit:":
    "คะแนน 0–100 บอกว่า founder สองคนเข้ากันได้แค่ไหน:",
  "Higher = better starting point for a conversation.":
    "ยิ่งสูง = ยิ่งเป็นจุดเริ่มต้นที่ดีของการคุย",
  "About the Complement Score": "เกี่ยวกับ Complement Score",
  "role complementarity 40%": "บทบาทเสริมกัน 40%",
  "intent 30%": "เป้าหมาย 30%",
  "industry 15%": "อุตสาหกรรม 15%",
  "stage 10%": "ช่วง 10%",
  "location + commitment 5%": "พื้นที่ + ความทุ่มเท 5%",
  Search: "ค้นหา",
  "Name or keyword": "ชื่อหรือคีย์เวิร์ด",
  "Profile type": "ประเภทโปรไฟล์",
  All: "ทั้งหมด",
  Individuals: "บุคคล",
  Companies: "บริษัท",
  "Looking for (Role)": "กำลังหา (บทบาท)",
  Industry: "อุตสาหกรรม",
  Stage: "ช่วง",
  Commitment: "ความทุ่มเท",
  "No matches yet": "ยังไม่มีผลลัพธ์",
  "Try widening your filters, or check back as more founders onboard.":
    "ลองขยายตัวกรอง หรือกลับมาดูใหม่เมื่อมี founder เข้าเพิ่ม",
  Complement: "Complement",
  "View profile": "ดูโปรไฟล์",
  "Verified founder": "Founder ที่ยืนยันแล้ว",

  // ─── Roles / Intent / Stage / Commitment labels ──────────────────
  Technical: "Technical",
  Business: "Business",
  Product: "Product",
  Marketing: "การตลาด",
  Finance: "การเงิน",
  "Domain Expert": "ผู้เชี่ยวชาญเฉพาะด้าน",
  "Has an idea": "มีไอเดียอยู่",
  "Open to ideas": "เปิดรับไอเดีย",
  Exploring: "กำลังสำรวจ",
  "Building MVP": "กำลังสร้าง MVP",
  "Have traction": "มี traction แล้ว",
  Raising: "กำลังระดมทุน",
  "Full-time": "เต็มเวลา",
  "Part-time": "พาร์ตไทม์",
  "Side project": "งานเสริม",
  "3 months": "3 เดือน",
  "6 months": "6 เดือน",
  "12 months": "12 เดือน",
  "18+ months": "18+ เดือน",
  "First-time founder": "Founder ครั้งแรก",
  "1–2 ventures": "เคยทำมา 1–2 ครั้ง",
  "3+ ventures": "เคยทำมา 3+ ครั้ง",

  // ─── Onboarding ──────────────────────────────────────────────────
  "Profile photo": "รูปโปรไฟล์",
  Role: "บทบาท",
  Context: "บริบท",
  Conviction: "ความมุ่งมั่น",
  Pitch: "Pitch",
  "Joining as…": "เข้าร่วมในฐานะ…",
  Individual: "บุคคล",
  "Company name": "ชื่อบริษัท",
  "Company role…": "บทบาทบริษัท…",
  "I am…": "ฉันคือ…",
  "We’re bringing…": "เรานำเสนอ…",
  "I’m bringing…": "ฉันนำเสนอ…",
  "I have a clear vision and need someone to execute it with me.":
    "มีวิสัยทัศน์ชัดเจน หาคนมาร่วมลงมือทำ",
  "I can build, sell, or design — open to joining a strong vision.":
    "สร้างได้ ขายเก่ง หรือดีไซน์เจ๋ง เปิดรับการเข้าร่วมวิสัยทัศน์ที่แข็งแกร่ง",
  "I want to brainstorm and find the right opportunity with a partner.":
    "อยากระดมไอเดียและค้นหาโอกาสที่ใช่ ไปกับคู่หู",
  "Let's explore": "ค้นหาไปด้วยกัน",
  "I’m looking for… (select all that apply)":
    "ฉันกำลังหา… (เลือกได้หลายข้อ)",
  "Industry focus (select all that apply)":
    "อุตสาหกรรมที่สนใจ (เลือกได้หลายข้อ)",
  "Your stage": "ช่วงของคุณ",
  "Location (optional)": "พื้นที่ (ไม่บังคับ)",
  "Bangkok, Chiang Mai, Remote, etc.": "กรุงเทพฯ เชียงใหม่ Remote ฯลฯ",
  "Commitment level": "ระดับความทุ่มเท",
  "Financial runway": "ทุนสำรอง (runway)",
  "Founder experience": "ประสบการณ์ founder",
  "The pitch (200–500 chars, required)":
    "Pitch (200–500 ตัวอักษร, บังคับ)",
  "Idea-havers: describe your idea. Skill-bringers: describe what you offer. Explorers: describe your interests.":
    "เจ้าของไอเดีย: บอกไอเดีย ผู้เชี่ยวชาญ: บอกสิ่งที่นำเสนอ ผู้ค้นหา: บอกความสนใจ",
  "Why this, why now (optional)": "ทำไมเรื่องนี้ ทำไมตอนนี้ (ไม่บังคับ)",
  "What drew you to this problem? Why is now the right time?":
    "อะไรทำให้คุณสนใจปัญหานี้? ทำไมตอนนี้คือเวลาที่ใช่?",
  "Skills (comma-separated, optional)":
    "ทักษะ (คั่นด้วยจุลภาค, ไม่บังคับ)",
  "Capabilities (comma-separated, optional)":
    "ความสามารถของบริษัท (คั่นด้วยจุลภาค, ไม่บังคับ)",
  "What your company offers to potential partners. Used by other companies to find you.":
    "สิ่งที่บริษัทคุณนำเสนอให้พาร์ตเนอร์ ใช้เพื่อให้บริษัทอื่นเจอคุณ",
  Back: "กลับ",
  "Complete profile": "เสร็จสิ้น",
  "Saving…": "กำลังบันทึก…",
  "Pick your role": "เลือกบทบาท",
  "Pick what you’re bringing": "เลือกสิ่งที่นำเสนอ",
  "Pick at least one role to look for": "เลือกอย่างน้อย 1 บทบาทที่หา",
  "Pick at least one industry": "เลือกอย่างน้อย 1 อุตสาหกรรม",
  "Pick your stage": "เลือกช่วงของคุณ",
  "Pick commitment level": "เลือกระดับความทุ่มเท",
  "Pick runway": "เลือก runway",
  "Pick founder experience": "เลือกประสบการณ์ founder",
  "Pitch must be 500 chars or less": "Pitch ต้องไม่เกิน 500 ตัวอักษร",
  "Step {n} of IV": "ขั้นที่ {n} จาก IV",

  // ─── Profile detail ──────────────────────────────────────────────
  "Back to directory": "กลับไปไดเรกทอรี",
  "The Pitch": "Pitch",
  "Why this, why now": "ทำไมเรื่องนี้ ทำไมตอนนี้",
  Skills: "ทักษะ",
  Capabilities: "ความสามารถ",
  "Looking for:": "กำลังหา:",
  "Capabilities:": "ความสามารถ:",
  "Skills & expertise": "ทักษะและความเชี่ยวชาญ",
  "Complement Score": "Complement Score",
  "This is your own profile.": "นี่คือโปรไฟล์ของคุณเอง",
  "Founder facts": "ข้อมูล founder",
  "Represented by": "ตัวแทนโดย",
  "Express interest in this founder": "แสดงความสนใจใน founder คนนี้",
  "Your note (optional)": "ข้อความจากคุณ (ไม่บังคับ)",
  "What caught your eye? What would a first chat cover?":
    "อะไรที่ทำให้คุณสนใจ? คุยกันครั้งแรกอยากคุยเรื่องอะไร?",
  "Send interest": "ส่ง",
  "Sending…": "กำลังส่ง…",
  "Interest sent": "ส่งแล้ว",
  "You’ll be notified when they respond.": "ระบบจะแจ้งเมื่ออีกฝ่ายตอบกลับ",
  "Report this profile": "รายงานโปรไฟล์นี้",
  "Why are you reporting?": "เหตุผลที่รายงาน",
  "Send report": "ส่งรายงาน",
  "Report sent": "ส่งรายงานแล้ว",

  // ─── Interests ───────────────────────────────────────────────────
  "Express Interest": "แสดงความสนใจ",
  "When interest is mutual, messaging unlocks automatically.":
    "พอสนใจตรงกัน ระบบเปิดให้คุยอัตโนมัติ",
  Received: "ได้รับ",
  Sent: "ส่งแล้ว",
  "No one has expressed interest yet. Make sure your profile is complete.":
    "ยังไม่มีใครแสดงความสนใจ ลองเช็กว่าโปรไฟล์ครบหรือยัง",
  "You haven't expressed interest in anyone yet. Browse the directory.":
    "คุณยังไม่ได้แสดงความสนใจในใคร ลองดูไดเรกทอรี",
  "Open conversation": "เปิดแชต",
  Waiting: "รอตอบกลับ",
  Mutual: "ตรงกัน",
  "Founders who expressed interest in you": "Founder ที่สนใจคุณ",
  "Express interest back to unlock messaging":
    "แสดงความสนใจกลับเพื่อเปิดแชต",
  "No interests yet": "ยังไม่มีความสนใจ",
  "When other founders express interest in your profile, they’ll show up here.":
    "เมื่อมี founder คนอื่นแสดงความสนใจในโปรไฟล์ของคุณ จะปรากฏที่นี่",
  Accept: "ตอบรับ",
  Decline: "ปฏิเสธ",

  // ─── Matches / Messages ──────────────────────────────────────────
  "Mutual interest": "ความสนใจร่วมกัน",
  "match(es) so far · messaging is unlocked.": "แมตช์ · เปิดให้คุยได้แล้ว",
  "Mutual interest creates a match. Browse the directory, express interest in founders whose profiles align, and matches will appear here when they reciprocate.":
    "สนใจตรงกัน = แมตช์ ดูไดเรกทอรี แสดงความสนใจใน founder ที่ตรงกับคุณ แมตช์จะมาเองเมื่ออีกฝ่ายตอบรับ",
  "All matches": "แมตช์ทั้งหมด",
  "Mutual interest unlocked": "ปลดล็อกความสนใจร่วมกันแล้ว",
  "You both expressed interest. This is the start of your conversation — be specific, be considered.":
    "ทั้งสองฝ่ายสนใจกัน นี่คือจุดเริ่มของการคุย — เจาะจง คิดมาดี",
  "First-call questions": "คำถามสำหรับการคุยครั้งแรก",
  "What problem are you most excited to solve right now?":
    "ปัญหาอะไรที่คุณอยากแก้มากที่สุดตอนนี้?",
  "What does your ideal co-founder look like?":
    "Co-founder ในอุดมคติของคุณเป็นแบบไหน?",
  "What have you tried that didn’t work?":
    "เคยลองอะไรแล้วไม่ได้ผลบ้าง?",
  "Write a message…": "พิมพ์ข้อความ…",
  Send: "ส่ง",
  "Enter to send · Shift+Enter for new line":
    "Enter เพื่อส่ง · Shift+Enter ขึ้นบรรทัดใหม่",
  new: "ใหม่",
  "No matches yet ": "ยังไม่มีแมตช์",
  "Browse the directory and express interest in founders who fit.":
    "ดูไดเรกทอรีและแสดงความสนใจใน founder ที่ใช่",
  "Browse the directory": "ดูไดเรกทอรี",

  // ─── Community ───────────────────────────────────────────────────
  "The community": "ชุมชน",
  "Ask, share, and learn from other Thai founders.":
    "ถาม แชร์ และเรียนรู้จาก founder ไทยคนอื่น",
  "New post": "โพสต์ใหม่",
  "Nothing here yet": "ยังไม่มีโพสต์",
  "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.":
    "เริ่มเป็นคนแรกเลย แชร์สิ่งที่กำลังสร้าง ขอ feedback หรือแค่มาทักทายก็ได้",
  "Write the first post": "เขียนโพสต์แรก",
  "Back to community": "กลับสู่ชุมชน",
  Title: "หัวข้อ",
  Content: "เนื้อหา",
  "Ask a question, share a milestone, request feedback…":
    "ถามคำถาม แชร์ความสำเร็จ ขอ feedback…",
  "Markdown welcome. Be specific — better questions get better answers.":
    "รองรับ Markdown ยิ่งเจาะจง ยิ่งได้คำตอบดี",
  "Publish post": "เผยแพร่",
  "Publishing…": "กำลังเผยแพร่…",
  Comments: "ความคิดเห็น",
  "No comments yet. Be the first.": "ยังไม่มีความคิดเห็น เป็นคนแรกเลย",
  "Add your comment…": "เพิ่มความคิดเห็น…",
  Comment: "ส่ง",
  "Posting…": "กำลังส่ง…",
  Like: "ถูกใจ",
  Unlike: "เลิกถูกใจ",

  // ─── Insights / blog ──────────────────────────────────────────────
  "Founder guides & perspectives": "บทความและมุมมองสำหรับ founder",
  "Practical writing on co-founder selection, team building, and building serious startups in Thailand.":
    "บทความเชิงปฏิบัติ เรื่องการเลือก co-founder การสร้างทีม และการสร้าง startup อย่างจริงจังในไทย",
  "Read insight": "อ่านบทความ",
  "All insights": "บทความทั้งหมด",
  "min read": "นาทีอ่าน",
  "Join Cofoundee · Free": "สมัคร Cofoundee · ฟรี",
  "No insights yet — check back soon.":
    "ยังไม่มีบทความ กลับมาดูใหม่อีกครั้ง",

  // ─── Admin · insights editor ──────────────────────────────────────
  "New insight": "เพิ่มบทความใหม่",
  "Edit insight": "แก้ไขบทความ",
  Drafts: "ฉบับร่าง",
  Published: "เผยแพร่แล้ว",
  Draft: "ฉบับร่าง",
  Slug: "Slug (URL)",
  Excerpt: "เกริ่นนำ",
  Category: "หมวดหมู่",
  Body: "เนื้อหา",
  "Save draft": "บันทึกฉบับร่าง",
  Publish: "เผยแพร่",
  Unpublish: "ยกเลิกการเผยแพร่",
  Delete: "ลบ",
  Edit: "แก้ไข",
  "Reading time (minutes)": "เวลาอ่าน (นาที)",
  "Locale (en or th)": "ภาษา (en หรือ th)",
  "Markdown supported — paragraphs separated by blank lines, **bold** for emphasis.":
    "รองรับ Markdown — ขึ้นย่อหน้าใหม่ด้วยการเว้นบรรทัด ใช้ **ตัวหนา** เน้นข้อความ",
};

export function t(en: string, locale: Locale): string {
  if (locale === "en") return en;
  return TH[en] ?? en;
}
