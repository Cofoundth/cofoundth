// Cofoundee — Code of Conduct, both locales. Data only; see ./types.ts for the
// block shape, the inline-markup contract and why the ids are typed.
//
// NO `footnote` HERE, ON PURPOSE. Privacy and Terms carry a counsel
// disclaimer; this document never has. Do not add one to "complete the set" —
// and if one is ever added, it goes into BOTH locales in the same edit.
//
// `our-mission` and the "Intent" expectation were rewritten in Sep 2026: both
// still said the product exists to help founders find co-founders, which is
// the pre-pivot positioning (CLAUDE.md: community-first, co-founder matching
// explicitly not the headline). The rewrite RELAXES the Intent rule — it no
// longer treats "networking-only" as misuse, because networking is now the
// product — and adds no new obligation anywhere.

import { defineLegalContent } from "./types";

export const codeOfConduct = defineLegalContent({
  ids: [
    "our-mission",
    "what-we-expect",
    "what-we-dont-tolerate",
    "reporting",
    "enforcement",
    "reputation",
    "acknowledgement",
  ],

  en: {
    title: "Code of Conduct",
    eyebrow: "Community",
    updated: "Last updated: September 2026",
    sections: [
      {
        id: "our-mission",
        heading: "Our mission",
        blocks: [
          {
            type: "p",
            text: "Cofoundee exists to build the community Thai founders lean on — somewhere to learn from each other, partner up, and, when the time is right, find a co-founder. Those relationships carry real weight: choosing a co-founder is one of the highest-stakes decisions an entrepreneur makes — closer to choosing a business marriage than picking a service provider. This Code of Conduct exists to protect that.",
          },
        ],
      },
      {
        id: "what-we-expect",
        heading: "What we expect",
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: "Honesty",
                desc: "Present yourself accurately. Real skills, real experience, real intent. No padded resumes, no fabricated traction.",
              },
              {
                term: "Respect",
                desc: "Treat every founder with professionalism, regardless of whether you’re interested in working with them. Decline gracefully when needed.",
              },
              {
                term: "Intent",
                desc: "Use the Service for what it is — a founder community, and the place to find a co-founder when you’re ready. Not for hiring, not for selling.",
              },
              {
                term: "Confidentiality",
                desc: "What is shared in private messages — ideas, traction numbers, personal context — stays private. Don’t screenshot and share without consent.",
              },
              {
                term: "Inclusion",
                desc: "Thai founders come from all walks. Welcome diversity of background, identity, experience level, and industry.",
              },
            ],
          },
        ],
      },
      {
        id: "what-we-dont-tolerate",
        heading: "What we don’t tolerate",
        blocks: [
          {
            type: "list",
            items: [
              "Harassment, intimidation, hate speech, or discrimination of any kind",
              "Sexual content, advances, or solicitation",
              "Misrepresentation: fake credentials, fake traction, identity fraud",
              "Spamming, mass-messaging, or bulk-soliciting",
              "Using the platform to pitch unrelated investments, MLMs, or schemes",
              "Doxxing, threats, or sharing personal information without consent",
              "Bypassing the matching flow to off-platform funnels (e.g., LINE OA spam)",
              "Recruiting employees, freelancers, or service providers under the guise of co-founder matching",
            ],
          },
        ],
      },
      {
        id: "reporting",
        heading: "Reporting",
        blocks: [
          {
            type: "p",
            text: "If a user violates this Code of Conduct, use the **Report profile** button on their profile. Reports are reviewed by Cofoundee staff. Include as much detail as possible — screenshots, message references, specific behavior.",
          },
          {
            type: "p",
            text: "For urgent issues (threats, ongoing harassment), email [chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co) directly. We respond within 24 hours.",
          },
        ],
      },
      {
        id: "enforcement",
        heading: "Enforcement",
        blocks: [
          {
            type: "p",
            text: "We take all reports seriously. Depending on severity, actions include:",
          },
          {
            type: "list",
            items: [
              "Private warning + behavior correction request",
              "Temporary suspension (24 hours to 30 days)",
              "Permanent ban with all data deleted",
              "In cases of fraud, threats, or criminal behavior: disclosure to law enforcement",
            ],
          },
          {
            type: "p",
            text: "We do not publicly name individual users in enforcement actions. Patterns across multiple reports may lead to escalation.",
          },
        ],
      },
      {
        id: "reputation",
        heading: "Reputation matters",
        blocks: [
          {
            type: "p",
            text: "Thailand’s startup ecosystem is small. How you treat people on Cofoundee will follow you outside it. Behave accordingly — not because we say so, but because reputation compounds.",
          },
        ],
      },
      {
        id: "acknowledgement",
        heading: "Acknowledgement",
        blocks: [
          {
            type: "p",
            text: "By using Cofoundee, you agree to abide by this Code of Conduct. Read it alongside the [Terms of Service](/terms) and the [Privacy Policy](/privacy).",
          },
        ],
      },
    ],
  },

  th: {
    title: "จรรยาบรรณ",
    eyebrow: "ชุมชน",
    updated: "อัปเดตล่าสุด: กันยายน 2026",
    sections: [
      {
        id: "our-mission",
        heading: "ภารกิจของเรา",
        blocks: [
          {
            type: "p",
            text: "Cofoundee มีอยู่เพื่อสร้างชุมชนที่ founder ไทยพึ่งพาได้ — ได้เรียนรู้จากกัน จับมือทำงานร่วมกัน และเมื่อถึงเวลา ก็หา co-founder ได้จากที่นี่ ความสัมพันธ์แบบนั้นมีเดิมพันจริง การเลือก co-founder เป็นหนึ่งในการตัดสินใจที่เดิมพันสูงที่สุดของคนทำธุรกิจ — ใกล้เคียงกับการเลือกคู่ชีวิตทางธุรกิจ มากกว่าการเลือกผู้ให้บริการสักราย จรรยาบรรณฉบับนี้มีไว้เพื่อปกป้องสิ่งนั้น",
          },
        ],
      },
      {
        id: "what-we-expect",
        heading: "สิ่งที่เราคาดหวัง",
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: "ความซื่อตรง",
                desc: "นำเสนอตัวเองตามจริง ทักษะจริง ประสบการณ์จริง เจตนาจริง ไม่มีเรซูเม่ที่ปั้นแต่ง ไม่มีตัวเลข traction ที่กุขึ้นมา",
              },
              {
                term: "ความเคารพ",
                desc: "ปฏิบัติกับ founder ทุกคนอย่างมืออาชีพ ไม่ว่าคุณจะสนใจร่วมงานกับเขาหรือไม่ก็ตาม เมื่อจำเป็นต้องปฏิเสธ ก็ปฏิเสธอย่างสุภาพ",
              },
              {
                term: "เจตนา",
                desc: "ใช้บริการนี้ตามสิ่งที่มันเป็น — ชุมชนของ founder และแหล่งหา co-founder เมื่อถึงเวลา ไม่ใช่เพื่อการจ้างงาน และไม่ใช่เพื่อขายของ",
              },
              {
                term: "การรักษาความลับ",
                desc: "สิ่งที่แชร์กันในข้อความส่วนตัว — ไอเดีย ตัวเลข traction บริบทส่วนตัว — ให้อยู่เป็นความลับ อย่าแคปหน้าจอไปแชร์ต่อโดยไม่ได้รับความยินยอม",
              },
              {
                term: "การเปิดรับทุกคน",
                desc: "founder ไทยมาจากหลากหลายเส้นทางชีวิต เปิดรับคนที่มีพื้นเพ ตัวตน ระดับประสบการณ์ และอุตสาหกรรมที่แตกต่างกัน",
              },
            ],
          },
        ],
      },
      {
        id: "what-we-dont-tolerate",
        heading: "สิ่งที่เรายอมรับไม่ได้",
        blocks: [
          {
            type: "list",
            items: [
              "การคุกคาม การข่มขู่ การใช้ถ้อยคำสร้างความเกลียดชัง หรือการเลือกปฏิบัติไม่ว่าในรูปแบบใด",
              "เนื้อหาทางเพศ การเข้าหาในเชิงชู้สาว หรือการชักชวนทางเพศ",
              "การบิดเบือนข้อมูล: วุฒิหรือประวัติปลอม ตัวเลข traction ปลอม การสวมรอยเป็นผู้อื่น",
              "การสแปม การส่งข้อความถึงคนจำนวนมากพร้อมกัน หรือการชักชวนและเสนอขายแบบหว่านแห",
              "การใช้แพลตฟอร์มเพื่อเสนอการลงทุนที่ไม่เกี่ยวข้อง ธุรกิจแบบ MLM หรือแผนการหาเงินในลักษณะเดียวกัน",
              "การเปิดเผยข้อมูลส่วนตัวของผู้อื่นเพื่อคุกคาม (doxxing) การข่มขู่ หรือการนำข้อมูลส่วนบุคคลไปเผยแพร่โดยไม่ได้รับความยินยอม",
              "การข้ามขั้นตอนการจับคู่เพื่อดึงคนออกไปยังช่องทางนอกแพลตฟอร์ม (เช่น การสแปมผ่าน LINE OA)",
              "การรับสมัครพนักงาน ฟรีแลนซ์ หรือผู้ให้บริการ โดยแอบอ้างว่าเป็นการหา co-founder",
            ],
          },
        ],
      },
      {
        id: "reporting",
        heading: "การรายงาน",
        blocks: [
          {
            type: "p",
            text: "ถ้าผู้ใช้คนไหนละเมิดจรรยาบรรณฉบับนี้ ให้กดปุ่ม **รายงานโปรไฟล์** บนหน้าโปรไฟล์ของเขา ทีมงาน Cofoundee จะเป็นผู้ตรวจสอบรายงานทุกฉบับ กรุณาใส่รายละเอียดให้มากที่สุดเท่าที่จะทำได้ — ภาพหน้าจอ ข้อความอ้างอิง และพฤติกรรมที่เกิดขึ้นอย่างเจาะจง",
          },
          {
            type: "p",
            text: "สำหรับเรื่องเร่งด่วน (การข่มขู่ หรือการคุกคามที่กำลังเกิดขึ้น) อีเมลมาที่ [chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co) ได้โดยตรง เราจะตอบกลับภายใน 24 ชั่วโมง",
          },
        ],
      },
      {
        id: "enforcement",
        heading: "การบังคับใช้",
        blocks: [
          {
            type: "p",
            text: "เราให้ความสำคัญกับทุกรายงานอย่างจริงจัง มาตรการที่ใช้จะขึ้นอยู่กับความร้ายแรงของเรื่อง ได้แก่",
          },
          {
            type: "list",
            items: [
              "การตักเตือนเป็นการส่วนตัว พร้อมขอให้แก้ไขพฤติกรรม",
              "การระงับบัญชีชั่วคราว (ตั้งแต่ 24 ชั่วโมง ถึง 30 วัน)",
              "การแบนถาวร พร้อมลบข้อมูลทั้งหมด",
              "กรณีฉ้อโกง ข่มขู่ หรือมีพฤติกรรมที่เข้าข่ายความผิดอาญา: การเปิดเผยข้อมูลต่อเจ้าหน้าที่ผู้บังคับใช้กฎหมาย",
            ],
          },
          {
            type: "p",
            text: "เราจะไม่เปิดเผยชื่อผู้ใช้รายบุคคลต่อสาธารณะเมื่อดำเนินมาตรการ แต่ถ้าหลายรายงานชี้ไปที่พฤติกรรมรูปแบบเดียวกัน เรื่องอาจถูกยกระดับขึ้น",
          },
        ],
      },
      {
        id: "reputation",
        heading: "ชื่อเสียงเป็นเรื่องสำคัญ",
        blocks: [
          {
            type: "p",
            text: "วงการ startup ไทยเป็นวงการเล็ก วิธีที่คุณปฏิบัติกับคนอื่นบน Cofoundee จะติดตัวคุณออกไปนอกแพลตฟอร์มด้วย วางตัวให้ดี — ไม่ใช่เพราะเราบอกให้ทำ แต่เพราะชื่อเสียงเป็นสิ่งที่ทบต้นไปเรื่อยๆ",
          },
        ],
      },
      {
        id: "acknowledgement",
        heading: "การยอมรับ",
        blocks: [
          {
            type: "p",
            text: "การใช้งาน Cofoundee ถือว่าคุณตกลงที่จะปฏิบัติตามจรรยาบรรณฉบับนี้ และให้อ่านควบคู่ไปกับ[เงื่อนไขการใช้งาน](/terms)และ[นโยบายความเป็นส่วนตัว](/privacy)",
          },
        ],
      },
    ],
  },
});
