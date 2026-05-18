// Cofoundee — minimal cookie-based i18n.
//
// Locale is stored in the `locale` cookie ("en" | "th"). The `t()` helper
// looks up English copy in the Thai dictionary; if missing it falls back
// to the English string. Translate incrementally — every untranslated
// string still renders fine.

import { cookies } from "next/headers";

export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}

// Thai translations — refined for natural professional tone.
// Reviewed against PDPA / Thai SaaS conventions. Native speakers welcome to
// refine further; missing strings auto-fall-back to English.
export const TH: Record<string, string> = {
  // ─── Marketing nav / footer ───────────────────────────────────────
  "How it works": "วิธีใช้งาน",
  Insights: "บทความ",
  Legal: "กฎหมาย",
  Events: "กิจกรรม",
  "Sign in": "เข้าสู่ระบบ",
  "Join Cofoundee": "สมัครใช้งาน Cofoundee",
  "Est. 2026 · Bangkok": "ก่อตั้งปี 2026 · กรุงเทพฯ",
  Platform: "แพลตฟอร์ม",
  Resources: "แหล่งข้อมูล",
  Company: "บริษัท",
  Contact: "ติดต่อเรา",
  "Create profile": "สร้างโปรไฟล์",
  "Privacy (PDPA)": "ความเป็นส่วนตัว (PDPA)",
  Terms: "ข้อกำหนด",
  "Code of Conduct": "จรรยาบรรณ",
  Chat: "แชท",
  Dashboard: "แดชบอร์ด",
  Browse: "ค้นหา",
  Interests: "ความสนใจ",
  Community: "ชุมชน",
  "Sign out": "ออกจากระบบ",
  "Built by founders, for founders.":
    "สร้างโดยผู้ก่อตั้ง เพื่อผู้ก่อตั้ง",
  "The platform for Thailand’s founders to find their co-founder.":
    "แพลตฟอร์มสำหรับผู้ก่อตั้งชาวไทย เพื่อค้นหาผู้ร่วมก่อตั้งที่ใช่",
  "Legal templates": "เอกสารกฎหมาย",

  // ─── Landing — hero ───────────────────────────────────────────────
  "Find the missing piece": "ค้นหาชิ้นส่วนที่ยังขาดหาย",
  "The right co-founder is the difference.":
    "ผู้ร่วมก่อตั้งที่ใช่ คือคำตอบ",
  "Cofoundee matches Thai entrepreneurs based on complementary skills, intent, and industry — not random swipes. Built for serious founders looking for the right partner to build with.":
    "Cofoundee จับคู่ผู้ประกอบการชาวไทยจากทักษะที่ส่งเสริมกัน เป้าหมาย และอุตสาหกรรม — ไม่ใช่การปัดสุ่มเหมือนแอปอื่น สร้างขึ้นสำหรับผู้ก่อตั้งที่จริงจัง เพื่อค้นหาพาร์ตเนอร์ที่ใช่ในการร่วมสร้างธุรกิจ",
  "Create your profile": "สร้างโปรไฟล์",
  "Browse founders": "ดูผู้ก่อตั้งทั้งหมด",
  "Free to join": "เข้าร่วมฟรี",
  "Verified profiles": "โปรไฟล์ที่ได้รับการยืนยัน",
  "Mutual interest required": "ต้องสนใจซึ่งกันและกัน",
  "Example match": "ตัวอย่างการจับคู่",
  Complementary: "ส่งเสริมกัน",

  // ─── Landing — Three founder types ────────────────────────────────
  "Three kinds of founders. One platform that matches them.":
    "ผู้ก่อตั้งสามรูปแบบ บนแพลตฟอร์มเดียวที่จับคู่ให้พวกเขามาเจอกัน",
  "I have an idea": "ฉันมีไอเดีย",
  "Idea-Haver": "เจ้าของไอเดีย",
  "You have a clear vision and need someone with complementary skills to execute it with you.":
    "คุณมีวิสัยทัศน์ที่ชัดเจน และมองหาคนที่มีทักษะส่งเสริมกัน มาร่วมลงมือทำกับคุณ",
  "I have skills": "ฉันมีทักษะ",
  "Skill-Bringer": "เจ้าของทักษะ",
  "You can build, sell, or design — but want to join someone else’s vision rather than start your own.":
    "คุณสร้างได้ ขายเป็น หรือออกแบบเก่ง แต่อยากเข้าร่วมวิสัยทัศน์ของคนอื่นมากกว่าเริ่มต้นเอง",
  "Let’s figure it out": "มาคิดด้วยกัน",
  Explorer: "ผู้สำรวจ",
  "You’re open to brainstorming and finding the right opportunity together with a partner.":
    "คุณพร้อมระดมความคิดและร่วมค้นหาโอกาสที่ใช่ไปกับพาร์ตเนอร์ที่ดี",

  // ─── Landing — Process ────────────────────────────────────────────
  "The process": "ขั้นตอนการใช้งาน",
  "Considered. Mutual. Serious.":
    "พิจารณารอบคอบ · ตอบรับร่วมกัน · จริงจังในทุกขั้นตอน",
  "Declare what you are, what you bring, and what you need.":
    "บอกว่าคุณเป็นใคร นำอะไรมา และมองหาอะไร",
  "Browse directory": "ดูไดเรกทอรี",
  "Filter by role, industry, and intent. Read full pitches.":
    "กรองตามบทบาท อุตสาหกรรม และเป้าหมาย อ่านการนำเสนอแบบเต็ม",
  "Express interest": "แสดงความสนใจ",
  "Send a thoughtful note. No spam, no swipes.":
    "ส่งข้อความที่ผ่านการคิดมาดี ไม่มีสแปม ไม่มีการปัดสุ่ม",
  "Mutual unlock": "เปิดการสนทนา",
  "When both express interest, messaging opens.":
    "เมื่อทั้งสองฝ่ายแสดงความสนใจ ระบบจะเปิดให้ส่งข้อความถึงกัน",

  // ─── Landing — Testimonial ────────────────────────────────────────
  "I had the idea, the customers, and the runway. What I didn’t have was a technical co-founder I could trust. Cofoundee matched me with someone whose skills, values, and ambition perfectly complemented mine. Six months later, we’re building together.":
    "ผมมีทั้งไอเดีย มีลูกค้า และทุนพร้อมพอตัว สิ่งเดียวที่ขาดคือผู้ร่วมก่อตั้งสายเทคนิคที่เชื่อใจกันได้ Cofoundee จับคู่ผมกับคนที่ทักษะ ค่านิยม และความทะเยอทะยานเข้ากันได้พอดี หกเดือนผ่านไป เรากำลังสร้างมันด้วยกัน",
  "Co-founder, FlexPay Thailand": "ผู้ร่วมก่อตั้ง FlexPay Thailand",

  // ─── Landing — CTA ────────────────────────────────────────────────
  "Your missing piece is on the platform.":
    "ชิ้นส่วนที่คุณตามหา อยู่บนแพลตฟอร์มของเรา",
  "Join Thailand’s most serious community of founders looking to build together. Free during our launch phase.":
    "เข้าร่วมชุมชนผู้ก่อตั้งที่จริงจังที่สุดในไทย ที่กำลังมองหาคนสร้างธุรกิจไปด้วยกัน ใช้งานฟรีในช่วงเปิดตัว",
  "Create your profile — Free": "สร้างโปรไฟล์ฟรี",

  // ─── Auth pages ───────────────────────────────────────────────────
  "Welcome back": "ยินดีต้อนรับกลับ",
  "Continue building with your co-founder community.":
    "สานต่อการเดินทางกับชุมชนผู้ร่วมก่อตั้งของคุณ",
  "Phase I · Free for all founders":
    "เฟส 1 · ฟรีสำหรับผู้ก่อตั้งทุกคน",
  "Join Thailand’s most serious community of co-founders.":
    "เข้าร่วมชุมชนผู้ร่วมก่อตั้งที่จริงจังที่สุดในไทย",
  Email: "อีเมล",
  Password: "รหัสผ่าน",
  "Full name": "ชื่อ-นามสกุล",
  "Forgot?": "ลืมรหัส?",
  "Sign in with Email": "เข้าสู่ระบบด้วยอีเมล",
  "Create your account": "สร้างบัญชี",
  "Continue with Google": "เข้าสู่ระบบด้วย Google",
  "Continue with LinkedIn": "เข้าสู่ระบบด้วย LinkedIn",
  or: "หรือ",
  "New to Cofoundee?": "ยังไม่มีบัญชี Cofoundee?",
  "Already on Cofoundee?": "มีบัญชีอยู่แล้ว?",
  "By continuing, you agree to our Terms and acknowledge our PDPA privacy policy.":
    "เมื่อดำเนินการต่อ คุณยอมรับข้อกำหนดและรับทราบนโยบายความเป็นส่วนตัว (PDPA) ของเรา",
  "PDPA compliant": "ปฏิบัติตาม PDPA",
};

export async function tServer(en: string): Promise<string> {
  const locale = await getLocale();
  if (locale === "en") return en;
  return TH[en] ?? en;
}

export function t(en: string, locale: Locale): string {
  if (locale === "en") return en;
  return TH[en] ?? en;
}
