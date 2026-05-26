// Cofoundee — i18n dictionary + pure t() helper. CLIENT-SAFE.
//
// Anything that touches `next/headers` (cookies) lives in `i18n-server.ts`
// so this module doesn't drag server APIs into the client bundle.
//
// Thai voice — calibrated to TechSauce editorial / SCB corporate register:
//   - Professional but not bureaucratic
//   - `พบ` over `เจอ`, `สำรวจ` over `ดู`, `เหมาะสม` over `ที่ใช่` for business contexts
//   - `เครือข่าย` / `แพลตฟอร์ม`, not `บ้าน`
//   - Drop sentence-ending particles `เลย` / `สิ`
//   - Drop casual `มา + verb` invitations; prefer declarative
//   - Keep English loanwords: founder, co-founder, pitch, startup, MVP,
//     B2B, VC, angel, Complement Score, Markdown, feedback, traction, runway
//   - Brand bylines, dates, location marks stay English

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
  "Join Cofoundee": "สมัครสมาชิก",
  "Est. 2026 · Bangkok": "Est. 2026 · Bangkok",
  Platform: "แพลตฟอร์ม",
  Resources: "แหล่งข้อมูล",
  Company: "บริษัท",
  Contact: "ติดต่อ",
  "Create profile": "สร้างโปรไฟล์",
  "Privacy (PDPA)": "ความเป็นส่วนตัว (PDPA)",
  Terms: "เงื่อนไขการใช้งาน",
  "Code of Conduct": "จรรยาบรรณ",
  Chat: "แชต",
  Dashboard: "หน้าหลัก",
  Browse: "สำรวจ",
  Founders: "Founder",
  Interests: "ความสนใจ",
  Community: "ชุมชน",
  Admin: "ผู้ดูแลระบบ",
  "Sign out": "ออกจากระบบ",
  "Your profile": "โปรไฟล์ของคุณ",
  "Built by founders, for founders.": "พัฒนาโดย founder เพื่อ founder",
  "The platform for Thailand’s founders to find their co-founder.":
    "เครือข่าย ที่ปรึกษา และคู่หูธุรกิจ ของ startup ไทย",
  "Legal templates": "เทมเพลตเอกสารกฎหมาย",

  // ─── Landing — hero ───────────────────────────────────────────────
  "Thailand's startup community": "เครือข่าย founder ไทย",
  "Where Thai startups build together.": "วงการ startup ไทย ในที่เดียว",
  "Cofoundee is the bridge for Thailand's startup ecosystem — a community where founders meet, companies find partners, and investors and advisors come to you when the time is right.":
    "Cofoundee เชื่อม founder ไทย เข้ากับพาร์ตเนอร์ ที่ปรึกษา และนักลงทุน — เพื่อให้ทุกการเดินทางของ startup มีคนเดินด้วย",
  "Create your profile": "สร้างโปรไฟล์",
  "Join the community": "สร้างโปรไฟล์",
  "Browse founders": "สำรวจชุมชน",
  "Free forever": "ฟรีตลอดการใช้งาน",
  "Verified profiles": "โปรไฟล์ผ่านการยืนยัน",
  "Built for Thailand": "สำหรับวงการ startup ไทย",
  "What's inside": "ในแพลตฟอร์มมีอะไรบ้าง",
  "Daily founder conversations": "บทสนทนาของ founder ทุกวัน",
  "Community forum, content, weekly events":
    "ฟอรัม บทความ และอีเวนต์รายสัปดาห์",
  "Bridge to partners + capital": "เชื่อมสู่พาร์ตเนอร์และเงินทุน",
  "B2B network, legal/finance advisors, investor intros":
    "เครือข่าย B2B ที่ปรึกษากฎหมาย/การเงิน และการแนะนำนักลงทุน",
  "Co-founder matching": "ค้นหา co-founder",
  "Cherry on top — find complementary partners when you're ready":
    "ของแถม — พบ co-founder ที่เสริมกัน เมื่อพร้อม",

  // ─── Landing — Pillars ────────────────────────────────────────────
  "What we do": "บริการของเรา",
  "Everything a Thai startup needs — in one place.":
    "ทุกสิ่งที่ startup ไทยต้องการ — ในที่เดียว",
  "Built in the order that actually works: community first, then partnerships and capital come on top.":
    "สร้างตามลำดับที่ได้ผลจริง: ชุมชนต้องมาก่อน พาร์ตเนอร์และเงินทุนตามมาทีหลัง",
  "Where Thai founders meet": "พบ founder ไทยคนอื่น",
  "Forum, content, and events for serious Thai startup builders. Ask questions, share what you're shipping, and meet the people who'll shape your journey.":
    "ฟอรัม บทความ และอีเวนต์ สำหรับคนที่จริงจังกับ startup ไทย ตั้งคำถาม แบ่งปันงานที่กำลังสร้าง และพบกับผู้คนที่จะร่วมกำหนดเส้นทางของคุณ",
  "B2B Network": "เครือข่าย B2B",
  "Companies finding companies": "หาพาร์ตเนอร์ธุรกิจที่ใช่",
  "Startups partner with startups — vendors, integrations, distribution, co-marketing. Browse company profiles, see capabilities, start the conversation.":
    "Startup จับมือกัน — vendor, integration, การจัดจำหน่าย, co-marketing สำรวจโปรไฟล์บริษัท ตรวจสอบความสามารถ และเริ่มต้นการสนทนา",
  "Advisor Partners": "พาร์ตเนอร์ที่ปรึกษา",
  "Legal + finance, on demand": "กฎหมายและการเงิน เมื่อจำเป็น",
  "Partnered with vetted Thai law firms and accountants. Get advice on incorporation, contracts, fundraising structure — without paying for a full retainer.":
    "ร่วมมือกับสำนักงานกฎหมายและนักบัญชีไทยที่ผ่านการคัดสรร ขอคำแนะนำเรื่องการจดทะเบียนบริษัท สัญญา และโครงสร้างการระดมทุน — โดยไม่ต้องจ้างประจำ",
  "Capital Bridge": "เชื่อมต่อกับเงินทุน",
  "Warm intros to investors": "เชื่อมคุณกับนักลงทุนที่เหมาะสม",
  "Not cold algorithmic matching. Once you're active in the community, we make warm introductions to angel networks and VCs that fit your stage.":
    "ไม่ใช่การจับคู่ด้วย algorithm เมื่อคุณมีส่วนร่วมในชุมชน เราจะแนะนำคุณกับเครือข่าย angel และ VC ที่เหมาะกับช่วงของคุณ",
  Live: "เปิดใช้งานแล้ว",
  "Coming soon": "เร็วๆ นี้",

  // ─── Landing — Process ────────────────────────────────────────────
  "The process": "ขั้นตอน",
  "Considered. Mutual. Serious.":
    "ใคร่ครวญ · ตอบรับร่วมกัน · จริงจัง",
  "Trust first. Everything else follows.":
    "ความเชื่อมั่นมาก่อน ที่เหลือตามมาเอง",
  "Free. Build your profile, see who's here, follow the conversations.":
    "ฟรี สร้างโปรไฟล์ สำรวจว่ามีใครอยู่บ้าง ติดตามบทสนทนา",
  "Contribute + connect": "มีส่วนร่วมและเชื่อมต่อ",
  "Post, comment, attend events. Get known for what you build.":
    "โพสต์ แสดงความคิดเห็น ร่วมอีเวนต์ ให้ผู้คนรู้จักคุณจากสิ่งที่คุณสร้าง",
  "Find what you need": "พบสิ่งที่คุณต้องการ",
  "B2B partners, co-founders, advisors, investors — unlocked by trust.":
    "พาร์ตเนอร์ B2B, co-founder, ที่ปรึกษา และนักลงทุน — ปลดล็อกด้วยความเชื่อมั่น",
  "Grow together": "เติบโตไปด้วยกัน",
  "The whole ecosystem compounds. Your network is the platform.":
    "ทั้งระบบนิเวศต่อยอดกันเอง เครือข่ายของคุณคือแพลตฟอร์ม",
  "Declare what you are, what you bring, and what you need.":
    "บอกว่าคุณคือใคร นำเสนออะไร และกำลังหาอะไร",
  "Browse directory": "สำรวจไดเรกทอรี",
  "Filter by role, industry, and intent. Read full pitches.":
    "กรองตามบทบาท อุตสาหกรรม และเป้าหมาย พร้อมอ่าน pitch แบบเต็ม",
  "Express interest": "แสดงความสนใจ",
  "Send a thoughtful note. No spam, no swipes.":
    "ส่งข้อความที่ผ่านการไตร่ตรอง ไม่มีสแปม ไม่มีการปัดสุ่ม",
  "Mutual unlock": "ปลดล็อกร่วมกัน",
  "When both express interest, messaging opens.":
    "เมื่อความสนใจตรงกัน ระบบจะเปิดให้สนทนาได้",

  // ─── Landing — Testimonial ────────────────────────────────────────
  "I joined for the community, stayed for the conversations, and ended up finding our first enterprise customer through someone I met in the forum. That's the kind of compounding you don't get from cold outreach.":
    "ผมเข้ามาเพราะชุมชน อยู่ต่อเพราะบทสนทนา และในที่สุดก็ได้ลูกค้า enterprise รายแรกผ่านคนที่พบในฟอรัม นี่คือการต่อยอดที่ cold outreach ให้ไม่ได้",
  "Co-founder, FlexPay Thailand": "Co-founder, FlexPay Thailand",

  // ─── Landing — CTA ────────────────────────────────────────────────
  "Your missing piece is on the platform.":
    "คนที่คุณตามหา อยู่บนแพลตฟอร์มนี้",
  "The Thai startup ecosystem — built together.":
    "วงการ startup ไทย — เราสร้างไปด้วยกัน",
  "Join Thailand’s most serious community of founders looking to build together. Free during our launch phase.":
    "เข้าร่วมชุมชน founder ไทยที่จริงจังที่สุด มองหาคนสร้างธุรกิจไปด้วยกัน ใช้งานฟรีในช่วงเปิดตัว",
  "Join the community of serious Thai founders. Free, forever — because trust takes years and we're playing the long game.":
    "เข้าร่วมกับ founder ไทยที่จริงจัง ใช้งานฟรีตลอด เพราะเครือข่ายที่แข็งแกร่งต้องใช้เวลาสร้าง — เราเลือกที่จะเล่นเกมยาว",
  "Join the community — Free": "สมัครสมาชิก — ฟรี",
  "Create your profile — Free": "สร้างโปรไฟล์ฟรี",

  // ─── Auth pages ───────────────────────────────────────────────────
  "Welcome back": "ยินดีต้อนรับกลับ",
  "Continue building with your co-founder community.":
    "กลับมาสานต่อกับชุมชน co-founder ของคุณ",
  "Phase I · Free for all founders":
    "เฟส 1 · ฟรีสำหรับ founder ทุกคน",
  "Join Thailand’s most serious community of co-founders.":
    "เข้าร่วมชุมชน co-founder ที่จริงจังที่สุดในประเทศไทย",
  Email: "อีเมล",
  Password: "รหัสผ่าน",
  "Confirm password": "ยืนยันรหัสผ่าน",
  "Full name": "ชื่อ-นามสกุล",
  "Forgot?": "ลืมรหัสผ่าน?",
  "Sign in with Email": "เข้าสู่ระบบด้วยอีเมล",
  "Create your account": "สร้างบัญชี",
  "Continue with Google": "เข้าสู่ระบบด้วย Google",
  "Continue with LinkedIn": "เข้าสู่ระบบด้วย LinkedIn",
  or: "หรือ",
  "New to Cofoundee?": "ยังไม่มีบัญชี Cofoundee?",
  "Already on Cofoundee?": "มีบัญชีอยู่แล้ว?",
  "By continuing, you agree to our Terms and acknowledge our PDPA privacy policy.":
    "เมื่อดำเนินการต่อ คุณยอมรับเงื่อนไขการใช้งานและรับทราบนโยบายความเป็นส่วนตัว (PDPA) ของเรา",
  "PDPA compliant": "เป็นไปตาม PDPA",
  Continue: "ดำเนินการต่อ",
  "Creating account…": "กำลังสร้างบัญชี…",
  "Signing in…": "กำลังเข้าสู่ระบบ…",
  "8+ characters.": "อย่างน้อย 8 ตัวอักษร",
  "At least 8 characters": "อย่างน้อย 8 ตัวอักษร",
  "Contains a letter": "มีตัวอักษร",
  "Contains a number": "มีตัวเลข",
  "Passwords match": "รหัสผ่านตรงกัน",
  "Passwords don’t match": "รหัสผ่านไม่ตรงกัน",
  "Check your email": "ตรวจสอบอีเมลของคุณ",
  "We sent a confirmation link to": "เราได้ส่งลิงก์ยืนยันไปที่",
  "Click it to activate your account.": "คลิกลิงก์เพื่อเปิดใช้งานบัญชีของคุณ",
  "Didn’t arrive? Check your spam folder. The link expires in 24 hours.":
    "ไม่ได้รับอีเมล? โปรดตรวจสอบในโฟลเดอร์สแปม ลิงก์จะหมดอายุภายใน 24 ชั่วโมง",

  // ─── Dashboard ───────────────────────────────────────────────────
  "Good morning": "อรุณสวัสดิ์",
  "Good afternoon": "สวัสดีตอนบ่าย",
  "Good evening": "สวัสดีตอนเย็น",
  "Working late": "ทำงานดึก",
  "Burning the midnight oil": "ทำงานยันเช้า",
  "Hello,": "สวัสดี,",
  "Finish your profile to start receiving interest from co-founders.":
    "ทำโปรไฟล์ให้สมบูรณ์ เพื่อเริ่มรับความสนใจจาก co-founder",
  "founder(s) expressed interest in you. Take a look —":
    "founder แสดงความสนใจในตัวคุณ — ลองดู",
  "your inbox": "กล่องข้อความของคุณ",
  "mutual match(es) so far. Keep the conversations going.":
    "แมตช์ในตอนนี้ — สานต่อบทสนทนา",
  "Browse the directory and express interest in founders whose profiles complement yours.":
    "สำรวจไดเรกทอรีและแสดงความสนใจใน founder ที่โปรไฟล์เสริมกับคุณ",
  "Finish your founder profile": "ทำโปรไฟล์ founder ให้สมบูรณ์",
  "Declare what you are, what you bring, and what you’re looking for. The more your profile says, the better the matches.":
    "บอกว่าคุณคือใคร นำเสนออะไร และกำลังหาอะไร ยิ่งโปรไฟล์ละเอียด ยิ่งแมตช์แม่นยำ",
  "Start onboarding": "เริ่มต้น",
  "Interests received": "ความสนใจที่ได้รับ",
  "Mutual matches": "แมตช์ทั้งหมด",
  "Profile views": "ผู้เข้าชมโปรไฟล์",
  "Founder directory": "ไดเรกทอรี founder",
  "Filter by role, industry, and stage. Read full pitches before you express interest.":
    "กรองตามบทบาท อุตสาหกรรม และช่วง — อ่าน pitch แบบเต็มก่อนแสดงความสนใจ",
  "Open directory": "เปิดไดเรกทอรี",
  "Update your pitch": "อัปเดต pitch",
  "Refine your pitch and details. Better signal — better matches.":
    "ปรับ pitch และรายละเอียดให้ดีขึ้น — สัญญาณดีขึ้น แมตช์แม่นยำขึ้น",
  "Edit profile": "แก้ไขโปรไฟล์",

  // ─── Browse / directory ──────────────────────────────────────────
  "The directory": "ไดเรกทอรี",
  "Clear all filters": "ล้างตัวกรองทั้งหมด",
  "complete your profile for complement scores":
    "ทำโปรไฟล์ให้สมบูรณ์ เพื่อดู Complement Score",
  founders: "founder",
  "A 0–100 score measuring how well two founders fit:":
    "คะแนน 0–100 ที่บ่งบอกว่า founder สองคนเข้ากันได้แค่ไหน:",
  "Higher = better starting point for a conversation.":
    "ยิ่งสูง ยิ่งเป็นจุดเริ่มต้นที่ดีของการสนทนา",
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
    "ลองขยายตัวกรอง หรือกลับมาตรวจสอบใหม่ เมื่อมี founder เข้าร่วมเพิ่มขึ้น",
  Complement: "Complement",
  "View profile": "ดูโปรไฟล์",
  "Verified founder": "Founder ที่ผ่านการยืนยัน",

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
  "Side project": "โปรเจกต์ข้างเคียง",
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
  "Company role…": "บทบาทของบริษัท…",
  "I am…": "ฉันคือ…",
  "We’re bringing…": "เรานำเสนอ…",
  "I’m bringing…": "ฉันนำเสนอ…",
  "I have a clear vision and need someone to execute it with me.":
    "มีวิสัยทัศน์ที่ชัดเจน กำลังหาคนมาร่วมลงมือทำ",
  "I can build, sell, or design — open to joining a strong vision.":
    "สร้างได้ ขายเก่ง หรือออกแบบดี เปิดรับการเข้าร่วมวิสัยทัศน์ที่แข็งแกร่ง",
  "I want to brainstorm and find the right opportunity with a partner.":
    "ต้องการระดมไอเดียและค้นหาโอกาสที่เหมาะสม ร่วมกับคู่หู",
  "Let's explore": "ค้นหาร่วมกัน",
  "I’m looking for… (select all that apply)":
    "ฉันกำลังหา… (เลือกได้หลายข้อ)",
  "Industry focus (select all that apply)":
    "อุตสาหกรรมที่สนใจ (เลือกได้หลายข้อ)",
  "Your stage": "ช่วงของคุณ",
  "Location (optional)": "พื้นที่/เมือง (ไม่บังคับ)",
  "Bangkok, Chiang Mai, Remote, etc.": "กรุงเทพฯ เชียงใหม่ Remote ฯลฯ",
  "Commitment level": "ระดับความทุ่มเท",
  "Financial runway": "ทุนสำรอง (runway)",
  "Founder experience": "ประสบการณ์ founder",
  "The pitch (200–500 chars, required)":
    "Pitch (200–500 ตัวอักษร, บังคับ)",
  "Idea-havers: describe your idea. Skill-bringers: describe what you offer. Explorers: describe your interests.":
    "เจ้าของไอเดีย: อธิบายไอเดียของคุณ ผู้เชี่ยวชาญ: อธิบายสิ่งที่นำเสนอ ผู้ค้นหา: อธิบายความสนใจ",
  "Why this, why now (optional)": "ทำไมเรื่องนี้ ทำไมตอนนี้ (ไม่บังคับ)",
  "What drew you to this problem? Why is now the right time?":
    "อะไรที่ทำให้คุณสนใจปัญหานี้? เหตุใดตอนนี้คือเวลาที่เหมาะสม?",
  "Skills (comma-separated, optional)":
    "ทักษะ (คั่นด้วยจุลภาค, ไม่บังคับ)",
  "Capabilities (comma-separated, optional)":
    "ความสามารถของบริษัท (คั่นด้วยจุลภาค, ไม่บังคับ)",
  "What your company offers to potential partners. Used by other companies to find you.":
    "สิ่งที่บริษัทคุณนำเสนอให้พาร์ตเนอร์ ใช้เพื่อให้บริษัทอื่นค้นหาคุณเจอ",
  Back: "ย้อนกลับ",
  "Complete profile": "ยืนยันโปรไฟล์",
  "Saving…": "กำลังบันทึก…",
  "Pick your role": "เลือกบทบาทของคุณ",
  "Pick what you’re bringing": "เลือกสิ่งที่คุณนำเสนอ",
  "Pick at least one role to look for": "เลือกอย่างน้อย 1 บทบาทที่กำลังหา",
  "Pick at least one industry": "เลือกอย่างน้อย 1 อุตสาหกรรม",
  "Pick your stage": "เลือกช่วงของคุณ",
  "Pick commitment level": "เลือกระดับความทุ่มเท",
  "Pick runway": "เลือก runway",
  "Pick founder experience": "เลือกประสบการณ์ founder",
  "Pitch must be 500 chars or less": "Pitch ต้องไม่เกิน 500 ตัวอักษร",
  "Step {n} of IV": "ขั้นที่ {n} จาก IV",

  // ─── Profile detail ──────────────────────────────────────────────
  "Back to directory": "กลับสู่ไดเรกทอรี",
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
  "Represented by": "เป็นตัวแทนโดย",
  "Express interest in this founder": "แสดงความสนใจใน founder คนนี้",
  "Your note (optional)": "ข้อความจากคุณ (ไม่บังคับ)",
  "What caught your eye? What would a first chat cover?":
    "อะไรที่ทำให้คุณสนใจ? การสนทนาครั้งแรกอยากครอบคลุมเรื่องอะไร?",
  "Send interest": "ส่งความสนใจ",
  "Sending…": "กำลังส่ง…",
  "Interest sent": "ส่งความสนใจแล้ว",
  "You’ll be notified when they respond.":
    "ระบบจะแจ้งเตือนเมื่ออีกฝ่ายตอบกลับ",
  "Report this profile": "รายงานโปรไฟล์นี้",
  "Why are you reporting?": "เหตุผลในการรายงาน",
  "Send report": "ส่งรายงาน",
  "Report sent": "ส่งรายงานเรียบร้อย",

  // ─── Interests ───────────────────────────────────────────────────
  "Express Interest": "แสดงความสนใจ",
  "When interest is mutual, messaging unlocks automatically.":
    "เมื่อความสนใจตรงกัน ระบบจะเปิดให้สนทนาได้อัตโนมัติ",
  Received: "ได้รับ",
  Sent: "ส่งแล้ว",
  "No one has expressed interest yet. Make sure your profile is complete.":
    "ยังไม่มีใครแสดงความสนใจ — โปรดตรวจสอบว่าโปรไฟล์สมบูรณ์แล้ว",
  "You haven't expressed interest in anyone yet. Browse the directory.":
    "คุณยังไม่ได้แสดงความสนใจในใคร — ลองสำรวจไดเรกทอรี",
  "Open conversation": "เปิดการสนทนา",
  Waiting: "รอตอบกลับ",
  Mutual: "สนใจตรงกัน",
  "Founders who expressed interest in you": "Founder ที่สนใจในตัวคุณ",
  "Express interest back to unlock messaging":
    "แสดงความสนใจกลับเพื่อปลดล็อกการสนทนา",
  "No interests yet": "ยังไม่มีความสนใจ",
  "When other founders express interest in your profile, they’ll show up here.":
    "เมื่อ founder คนอื่นแสดงความสนใจในโปรไฟล์ของคุณ จะปรากฏที่นี่",
  Accept: "ตอบรับ",
  Decline: "ปฏิเสธ",

  // ─── Matches / Messages ──────────────────────────────────────────
  "Mutual interest": "ความสนใจร่วมกัน",
  "match(es) so far · messaging is unlocked.":
    "แมตช์ · เปิดให้สนทนาได้แล้ว",
  "Mutual interest creates a match. Browse the directory, express interest in founders whose profiles align, and matches will appear here when they reciprocate.":
    "เมื่อความสนใจตรงกัน จะกลายเป็นแมตช์ สำรวจไดเรกทอรี แสดงความสนใจใน founder ที่ตรงกับคุณ — แมตช์จะปรากฏที่นี่เมื่ออีกฝ่ายตอบรับ",
  "All matches": "แมตช์ทั้งหมด",
  "Mutual interest unlocked": "ปลดล็อกความสนใจร่วมกันแล้ว",
  "You both expressed interest. This is the start of your conversation — be specific, be considered.":
    "ทั้งสองฝ่ายแสดงความสนใจ นี่คือจุดเริ่มต้นของการสนทนา — เจาะจง คิดมาดี",
  "First-call questions": "คำถามสำหรับการสนทนาครั้งแรก",
  "What problem are you most excited to solve right now?":
    "ปัญหาใดที่คุณอยากแก้มากที่สุดในตอนนี้?",
  "What does your ideal co-founder look like?":
    "Co-founder ในอุดมคติของคุณเป็นอย่างไร?",
  "What have you tried that didn’t work?":
    "เคยลองอะไรมาแล้วบ้างที่ไม่ได้ผล?",
  "Write a message…": "พิมพ์ข้อความ…",
  Send: "ส่ง",
  "Enter to send · Shift+Enter for new line":
    "Enter เพื่อส่ง · Shift+Enter เพื่อขึ้นบรรทัดใหม่",
  new: "ใหม่",
  "No matches yet ": "ยังไม่มีแมตช์",
  "Browse the directory and express interest in founders who fit.":
    "สำรวจไดเรกทอรีและแสดงความสนใจใน founder ที่เหมาะสม",
  "Browse the directory": "สำรวจไดเรกทอรี",

  // ─── Community ───────────────────────────────────────────────────
  "The community": "ชุมชน",
  "Ask, share, and learn from other Thai founders.":
    "ตั้งคำถาม แบ่งปัน และเรียนรู้จาก founder ไทยคนอื่น",
  "New post": "โพสต์ใหม่",
  "Nothing here yet": "ยังไม่มีโพสต์",
  "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.":
    "เริ่มต้นเป็นคนแรก แบ่งปันสิ่งที่กำลังสร้าง ขอ feedback หรือเข้ามาทักทาย",
  "Write the first post": "เขียนโพสต์แรก",
  "Back to community": "กลับสู่ชุมชน",
  Title: "หัวข้อ",
  Content: "เนื้อหา",
  "Ask a question, share a milestone, request feedback…":
    "ตั้งคำถาม แบ่งปันความสำเร็จ ขอ feedback…",
  "Markdown welcome. Be specific — better questions get better answers.":
    "รองรับ Markdown — ยิ่งเจาะจง ยิ่งได้คำตอบที่ดี",
  "Publish post": "เผยแพร่โพสต์",
  "Publishing…": "กำลังเผยแพร่…",
  Comments: "ความคิดเห็น",
  "No comments yet. Be the first.":
    "ยังไม่มีความคิดเห็น — เริ่มเป็นคนแรก",
  "Add your comment…": "เพิ่มความคิดเห็น…",
  Comment: "ส่ง",
  "Posting…": "กำลังส่ง…",
  Like: "ถูกใจ",
  Unlike: "เลิกถูกใจ",

  // ─── Insights / blog ──────────────────────────────────────────────
  "Founder guides & perspectives": "บทความและมุมมองสำหรับ founder",
  "Practical writing on co-founder selection, team building, and building serious startups in Thailand.":
    "บทความเชิงปฏิบัติ ว่าด้วยการเลือก co-founder การสร้างทีม และการสร้าง startup อย่างจริงจังในประเทศไทย",
  "Read insight": "อ่านบทความ",
  "All insights": "บทความทั้งหมด",
  "min read": "นาทีในการอ่าน",
  "Join Cofoundee · Free": "สมัครสมาชิก Cofoundee · ฟรี",
  "No insights yet — check back soon.":
    "ยังไม่มีบทความ — โปรดกลับมาตรวจสอบอีกครั้ง",

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
  "Reading time (minutes)": "เวลาในการอ่าน (นาที)",
  "Locale (en or th)": "ภาษา (en หรือ th)",
  "Markdown supported — paragraphs separated by blank lines, **bold** for emphasis.":
    "รองรับ Markdown — ขึ้นย่อหน้าใหม่ด้วยการเว้นบรรทัด ใช้ **ตัวหนา** เพื่อเน้นข้อความ",
};

export function t(en: string, locale: Locale): string {
  if (locale === "en") return en;
  return TH[en] ?? en;
}
