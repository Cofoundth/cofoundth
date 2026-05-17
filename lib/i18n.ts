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

export const TH: Record<string, string> = {
  // Marketing nav / footer
  "How it works": "วิธีการใช้งาน",
  Insights: "บทความ",
  Legal: "เอกสารทางกฎหมาย",
  Events: "กิจกรรม",
  "Sign in": "เข้าสู่ระบบ",
  "Join Cofoundee": "เข้าร่วม Cofoundee",
  "Est. 2026 · Bangkok": "ก่อตั้ง 2026 · กรุงเทพ",
  Platform: "แพลตฟอร์ม",
  Resources: "ทรัพยากร",
  Company: "บริษัท",
  Contact: "ติดต่อ",
  "Create profile": "สร้างโปรไฟล์",
  "Privacy (PDPA)": "ความเป็นส่วนตัว (PDPA)",
  Terms: "เงื่อนไข",
  "Code of Conduct": "จรรยาบรรณ",
  "Built by founders, for founders.":
    "สร้างโดยผู้ก่อตั้ง เพื่อผู้ก่อตั้ง",
  "The platform for Thailand’s founders to find their co-founder.":
    "แพลตฟอร์มสำหรับผู้ก่อตั้งในไทยเพื่อหาผู้ร่วมก่อตั้ง",
  "Legal templates": "เอกสารทางกฎหมาย",

  // Landing — hero
  "Find the missing piece": "ค้นหาชิ้นส่วนที่ขาดหายไป",
  "The right co-founder is the difference.":
    "ผู้ร่วมก่อตั้งที่ใช่คือความแตกต่าง",
  "Cofoundee matches Thai entrepreneurs based on complementary skills, intent, and industry — not random swipes. Built for serious founders looking for the right partner to build with.":
    "Cofoundee จับคู่ผู้ประกอบการไทยตามทักษะที่เสริมกัน เจตนา และอุตสาหกรรม — ไม่ใช่การปัดแบบสุ่ม สร้างขึ้นเพื่อผู้ก่อตั้งที่จริงจังในการหาพาร์ทเนอร์ที่ใช่",
  "Create your profile": "สร้างโปรไฟล์ของคุณ",
  "Browse founders": "ดูผู้ก่อตั้ง",
  "Free to join": "เข้าร่วมฟรี",
  "Verified profiles": "โปรไฟล์ที่ยืนยันแล้ว",
  "Mutual interest required": "ต้องการความสนใจร่วมกัน",
  "Example match": "ตัวอย่างการจับคู่",
  Complementary: "เสริมกัน",

  // Landing — Three founder types
  "Three kinds of founders. One platform that matches them.":
    "ผู้ก่อตั้งสามแบบ หนึ่งแพลตฟอร์มที่จับคู่พวกเขา",
  "I have an idea": "ฉันมีไอเดีย",
  "Idea-Haver": "ผู้มีไอเดีย",
  "You have a clear vision and need someone with complementary skills to execute it with you.":
    "คุณมีวิสัยทัศน์ที่ชัดเจนและต้องการคนที่มีทักษะเสริมเพื่อร่วมลงมือทำกับคุณ",
  "I have skills": "ฉันมีทักษะ",
  "Skill-Bringer": "ผู้นำทักษะมา",
  "You can build, sell, or design — but want to join someone else’s vision rather than start your own.":
    "คุณสามารถสร้าง ขาย หรือออกแบบ — แต่อยากเข้าร่วมวิสัยทัศน์ของคนอื่นมากกว่าเริ่มต้นเอง",
  "Let’s figure it out": "มาคิดด้วยกัน",
  Explorer: "นักสำรวจ",
  "You’re open to brainstorming and finding the right opportunity together with a partner.":
    "คุณเปิดรับการระดมความคิดและหาโอกาสที่ใช่ร่วมกับพาร์ทเนอร์",

  // Landing — Process
  "The process": "ขั้นตอน",
  "Considered. Mutual. Serious.": "พิจารณา · ร่วมกัน · จริงจัง",
  "Declare what you are, what you bring, and what you need.":
    "ประกาศว่าคุณเป็นใคร นำอะไรมา และต้องการอะไร",
  "Browse directory": "ดูไดเรกทอรี",
  "Filter by role, industry, and intent. Read full pitches.":
    "กรองตามบทบาท อุตสาหกรรม และเจตนา อ่านการนำเสนอแบบเต็ม",
  "Express interest": "แสดงความสนใจ",
  "Send a thoughtful note. No spam, no swipes.":
    "ส่งข้อความที่รอบคอบ ไม่มีสแปม ไม่มีการปัด",
  "Mutual unlock": "ปลดล็อกร่วมกัน",
  "When both express interest, messaging opens.":
    "เมื่อทั้งสองฝ่ายแสดงความสนใจ การส่งข้อความก็เปิดใช้งาน",

  // Landing — testimonial
  "I had the idea, the customers, and the runway. What I didn’t have was a technical co-founder I could trust. Cofoundee matched me with someone whose skills, values, and ambition perfectly complemented mine. Six months later, we’re building together.":
    "ผมมีไอเดีย ลูกค้า และเงินทุน สิ่งที่ขาดคือผู้ร่วมก่อตั้งสายเทคนิคที่ไว้ใจได้ Cofoundee จับคู่ผมกับคนที่มีทักษะ ค่านิยม และความทะเยอทะยานที่เสริมกับผมอย่างสมบูรณ์ หกเดือนต่อมา เรากำลังสร้างมันด้วยกัน",
  "Co-founder, FlexPay Thailand": "ผู้ร่วมก่อตั้ง FlexPay Thailand",

  // Landing — CTA
  "Your missing piece is on the platform.":
    "ชิ้นส่วนที่ขาดหายไปของคุณอยู่บนแพลตฟอร์มแล้ว",
  "Join Thailand’s most serious community of founders looking to build together. Free during our launch phase.":
    "เข้าร่วมชุมชนผู้ก่อตั้งที่จริงจังที่สุดในไทยที่กำลังมองหาคนสร้างด้วยกัน ฟรีในช่วงเปิดตัว",
  "Create your profile — Free": "สร้างโปรไฟล์ของคุณ — ฟรี",

  // Auth pages
  "Welcome back": "ยินดีต้อนรับกลับมา",
  "Continue building with your co-founder community.":
    "ทำงานต่อกับชุมชนผู้ร่วมก่อตั้งของคุณ",
  "Phase I · Free for all founders": "เฟส 1 · ฟรีสำหรับผู้ก่อตั้งทุกคน",
  "Join Thailand’s most serious community of co-founders.":
    "เข้าร่วมชุมชนผู้ร่วมก่อตั้งที่จริงจังที่สุดในไทย",
  Email: "อีเมล",
  Password: "รหัสผ่าน",
  "Full name": "ชื่อ-นามสกุล",
  "Forgot?": "ลืม?",
  "Sign in with Email": "เข้าสู่ระบบด้วยอีเมล",
  "Create your account": "สร้างบัญชีของคุณ",
  "Continue with Google": "ดำเนินการต่อด้วย Google",
  "Continue with LinkedIn": "ดำเนินการต่อด้วย LinkedIn",
  or: "หรือ",
  "New to Cofoundee?": "ใหม่กับ Cofoundee?",
  "Already on Cofoundee?": "มีบัญชี Cofoundee แล้ว?",
  "By continuing, you agree to our Terms and acknowledge our PDPA privacy policy.":
    "เมื่อดำเนินการต่อ คุณยอมรับเงื่อนไขและรับทราบนโยบายความเป็นส่วนตัว PDPA ของเรา",
  "PDPA compliant": "เป็นไปตาม PDPA",
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
