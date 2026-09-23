// Cofoundee — Terms of Service, both locales. Data only; see ./types.ts for
// the block shape, the inline-markup contract and why the ids are typed.
//
// NOTE ON THE FOOTNOTE: this document is bilingual from Sep 2026 (there was no
// Thai text before), so it now carries the same governing-language rule the
// Privacy Policy already had — the Thai governs once finalised. Edit the pair
// together; a Thai clause softer than its English sibling is a legal defect.
// The Code of Conduct is also bilingual and binding (§9) but carries no
// footnote at all by design — whether the same rule belongs there, and where,
// is a counsel question, not a drive-by edit.
//
// NOTE ON §2: the definition of "the Service" was widened in Sep 2026 to match
// the Code of Conduct's rewrite and the community-first positioning. It used
// to name co-founder matching only, while §6 already licensed forum posts and
// the Privacy Policy already processed them.
//
// NOTE ON §7 vs §13: the English used to promise 30 days' notice before paid
// features (§7) and 14 days for any material change to the Terms (§13). If
// paid features arrive *via* a Terms change — the likely path — the two clocks
// disagreed. Both now read 30 days: where two promises conflict, the one that
// binds is the longer.

import { defineLegalContent } from "./types";

export const terms = defineLegalContent({
  ids: [
    "acceptance",
    "the-service",
    "eligibility",
    "your-account",
    "acceptable-use",
    "your-content",
    "free-service",
    "connections-and-outcomes",
    "termination",
    "disclaimers",
    "limitation-of-liability",
    "governing-law",
    "changes",
    "contact",
  ],

  en: {
    title: "Terms of Service",
    eyebrow: "Legal",
    updated: "Last updated: September 2026 · Effective immediately",
    sections: [
      {
        id: "acceptance",
        heading: "1. Acceptance",
        blocks: [
          {
            type: "p",
            text: "Cofoundee (the “Service”) is operated by Cofoundee Co., Ltd. By accessing or using the Service, you agree to these Terms of Service. If you do not agree, do not use the Service.",
          },
        ],
      },
      {
        id: "the-service",
        heading: "2. The Service",
        blocks: [
          {
            type: "p",
            text: "Cofoundee is a community platform for founders in Thailand. It hosts a forum and a founder directory, supports introductions between companies, and connects entrepreneurs with prospective co-founders based on complementary skills, intent, and industry. The Service facilitates introductions; it does not employ, manage, or vouch for any user.",
          },
        ],
      },
      {
        id: "eligibility",
        heading: "3. Eligibility",
        blocks: [
          {
            type: "p",
            text: "You must be at least 18 years old to use the Service. You must provide accurate information about yourself, your skills, and your ventures. Impersonation, fake profiles, and misrepresentation (including fake credentials or experience) are grounds for immediate termination.",
          },
        ],
      },
      {
        id: "your-account",
        heading: "4. Your account",
        blocks: [
          { type: "p", text: "You are responsible for:" },
          {
            type: "list",
            items: [
              "Maintaining the confidentiality of your login credentials",
              "All activity that occurs under your account",
              "Notifying us immediately of any unauthorized access",
            ],
          },
        ],
      },
      {
        id: "acceptable-use",
        heading: "5. Acceptable use",
        blocks: [
          { type: "p", text: "You may not:" },
          {
            type: "list",
            items: [
              "Harass, threaten, defraud, or solicit money from other users under false pretenses",
              "Use the Service to recruit for unrelated services, MLMs, or schemes",
              "Spam, scrape, or mass-message other users",
              "Post content that is illegal, hateful, sexually explicit, or violates IP rights",
              "Circumvent rate limits, abuse the Express Interest flow, or attempt to reverse-engineer matching",
              "Reuse the Service to power competing platforms",
            ],
          },
          {
            type: "p",
            text: "Violations may result in immediate suspension and, where serious, permanent ban and disclosure to law enforcement.",
          },
        ],
      },
      {
        id: "your-content",
        heading: "6. Content you provide",
        blocks: [
          {
            type: "p",
            text: "You retain ownership of the content you post (profile, pitch, messages, forum posts). By posting, you grant Cofoundee a non-exclusive, worldwide license to display, store, and process that content as required to operate the Service.",
          },
          {
            type: "p",
            text: "We may remove content that violates these Terms or our [Code of Conduct](/code-of-conduct).",
          },
        ],
      },
      {
        id: "free-service",
        heading: "7. Free service, no payment in Phase 1",
        blocks: [
          {
            type: "p",
            text: "Phase 1 of the Service is provided free of charge. Paid features may be introduced in future phases with at least 30 days’ notice and a clear separation between free and paid functionality.",
          },
        ],
      },
      {
        id: "connections-and-outcomes",
        heading: "8. Connections, deals, and outcomes",
        blocks: [
          {
            type: "p",
            text: "**Cofoundee is not a party to any deal between users.** We do not vouch for, guarantee, or assume responsibility for any co-founder relationship, partnership, equity arrangement, or investment that may result from connections made through the Service. Conduct your own due diligence. Engage qualified legal counsel before signing co-founder agreements.",
          },
        ],
      },
      {
        id: "termination",
        heading: "9. Termination",
        blocks: [
          {
            type: "p",
            text: "You may delete your account at any time from your profile settings. We may suspend or terminate accounts that violate these Terms, our Code of Conduct, or applicable law. On termination, your data is handled per the [Privacy Policy](/privacy).",
          },
        ],
      },
      {
        id: "disclaimers",
        heading: "10. Disclaimers",
        blocks: [
          {
            type: "p",
            text: "The Service is provided “as is” without warranties of any kind. We do not warrant that the Service will be uninterrupted or error-free, and we do not warrant that any match will result in a successful partnership.",
          },
        ],
      },
      {
        id: "limitation-of-liability",
        heading: "11. Limitation of liability",
        blocks: [
          {
            type: "p",
            text: "To the maximum extent permitted by Thai law, Cofoundee’s total liability arising from your use of the Service is limited to the amount you have paid us in the past 12 months (which, in Phase 1, is zero).",
          },
        ],
      },
      {
        id: "governing-law",
        heading: "12. Governing law",
        blocks: [
          {
            type: "p",
            text: "These Terms are governed by the laws of Thailand. Any disputes will be resolved in the courts of Bangkok.",
          },
        ],
      },
      {
        id: "changes",
        heading: "13. Changes to these Terms",
        blocks: [
          {
            type: "p",
            text: "We may update these Terms from time to time. Material changes will be announced at least 30 days in advance via email and a banner on the Service. Continued use after the effective date constitutes acceptance.",
          },
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        blocks: [
          {
            type: "p",
            text: "[chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co)",
          },
        ],
      },
    ],
    footnote:
      "This document is a starting point and will be reviewed by qualified Thai legal counsel before public launch. Translations are provided for convenience; the Thai-language version will be authoritative once finalized.",
  },

  th: {
    title: "เงื่อนไขการใช้งาน",
    eyebrow: "กฎหมาย",
    updated: "อัปเดตล่าสุด: กันยายน 2026 · มีผลบังคับใช้ทันที",
    sections: [
      {
        id: "acceptance",
        heading: "1. การยอมรับเงื่อนไข",
        blocks: [
          {
            type: "p",
            text: "Cofoundee (ต่อไปนี้เรียกว่า “บริการ”) ดำเนินการโดยบริษัท โคฟาวดี้ จำกัด การเข้าถึงหรือใช้บริการถือว่าคุณยอมรับเงื่อนไขการใช้งานฉบับนี้ หากคุณไม่ยอมรับ กรุณาอย่าใช้บริการ",
          },
        ],
      },
      {
        id: "the-service",
        heading: "2. บริการของเรา",
        blocks: [
          {
            type: "p",
            text: "Cofoundee คือแพลตฟอร์มชุมชนสำหรับ founder ในประเทศไทย ประกอบด้วยฟอรัม ไดเรกทอรี founder การเชื่อมบริษัทเข้ากับบริษัท และการเชื่อมผู้ประกอบการเข้ากับผู้ที่อาจมาเป็น co-founder โดยดูจากทักษะที่เสริมกัน เป้าหมาย และอุตสาหกรรม บริการนี้ทำหน้าที่แนะนำให้ได้รู้จักกันเท่านั้น เราไม่ได้จ้างงาน ไม่ได้กำกับดูแล และไม่ได้รับรองผู้ใช้คนใด",
          },
        ],
      },
      {
        id: "eligibility",
        heading: "3. คุณสมบัติของผู้ใช้",
        blocks: [
          {
            type: "p",
            text: "คุณต้องมีอายุอย่างน้อย 18 ปีจึงจะใช้บริการได้ และต้องให้ข้อมูลที่ถูกต้องตามจริงเกี่ยวกับตัวคุณ ทักษะของคุณ และธุรกิจของคุณ การแอบอ้างเป็นบุคคลอื่น การสร้างโปรไฟล์ปลอม และการให้ข้อมูลอันเป็นเท็จ (รวมถึงคุณวุฒิหรือประสบการณ์ที่ไม่เป็นความจริง) เป็นเหตุให้ยุติการใช้งานได้ทันที",
          },
        ],
      },
      {
        id: "your-account",
        heading: "4. บัญชีของคุณ",
        blocks: [
          { type: "p", text: "คุณมีหน้าที่รับผิดชอบในเรื่องต่อไปนี้" },
          {
            type: "list",
            items: [
              "การเก็บรักษาข้อมูลเข้าสู่ระบบของคุณไว้เป็นความลับ",
              "กิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ",
              "การแจ้งให้เราทราบทันทีเมื่อมีการเข้าถึงบัญชีโดยไม่ได้รับอนุญาต",
            ],
          },
        ],
      },
      {
        id: "acceptable-use",
        heading: "5. การใช้งานที่ยอมรับได้",
        blocks: [
          { type: "p", text: "คุณต้องไม่" },
          {
            type: "list",
            items: [
              "คุกคาม ข่มขู่ ฉ้อโกง หรือหลอกขอเงินจากผู้ใช้คนอื่นโดยอ้างเหตุอันเป็นเท็จ",
              "ใช้บริการเพื่อชักชวนคนเข้าสู่บริการอื่นที่ไม่เกี่ยวข้อง ธุรกิจแบบ MLM หรือแผนการในลักษณะเดียวกัน",
              "ส่งสแปม ดึงข้อมูล (scrape) หรือส่งข้อความหาผู้ใช้จำนวนมาก",
              "โพสต์เนื้อหาที่ผิดกฎหมาย สร้างความเกลียดชัง มีเนื้อหาทางเพศอย่างโจ่งแจ้ง หรือละเมิดสิทธิ์ในทรัพย์สินทางปัญญา",
              "หลบเลี่ยงการจำกัดอัตราการใช้งาน (rate limit) ใช้ฟีเจอร์แสดงความสนใจในทางที่ผิด หรือพยายามเจาะวิธีการทำงานของระบบจับคู่ (reverse-engineer)",
              "นำบริการไปใช้เป็นฐานให้แพลตฟอร์มที่แข่งขันกับเรา",
            ],
          },
          {
            type: "p",
            text: "การฝ่าฝืนอาจทำให้บัญชีถูกระงับทันที และในกรณีร้ายแรง อาจถูกแบนถาวรและถูกเปิดเผยข้อมูลต่อเจ้าหน้าที่ผู้บังคับใช้กฎหมาย",
          },
        ],
      },
      {
        id: "your-content",
        heading: "6. เนื้อหาที่คุณโพสต์",
        blocks: [
          {
            type: "p",
            text: "คุณยังคงเป็นเจ้าของเนื้อหาที่คุณโพสต์ (โปรไฟล์ pitch ข้อความ และโพสต์ในฟอรัม) เมื่อคุณโพสต์ คุณให้สิทธิ์แก่ Cofoundee แบบไม่ผูกขาดและครอบคลุมทั่วโลก ในการแสดง จัดเก็บ และประมวลผลเนื้อหานั้นเท่าที่จำเป็นต่อการให้บริการ",
          },
          {
            type: "p",
            text: "เราอาจลบเนื้อหาที่ละเมิดเงื่อนไขฉบับนี้หรือ[จรรยาบรรณ](/code-of-conduct)ของเรา",
          },
        ],
      },
      {
        id: "free-service",
        heading: "7. บริการฟรี ไม่มีการเก็บเงินในเฟส 1",
        blocks: [
          {
            type: "p",
            text: "บริการในเฟส 1 ให้ใช้งานฟรี ฟีเจอร์แบบเสียเงินอาจเปิดตัวในเฟสถัดไป โดยจะแจ้งล่วงหน้าอย่างน้อย 30 วัน และแบ่งแยกให้ชัดเจนว่าส่วนไหนใช้ฟรีและส่วนไหนต้องจ่ายเงิน",
          },
        ],
      },
      {
        id: "connections-and-outcomes",
        heading: "8. การเชื่อมต่อ ดีล และผลลัพธ์",
        blocks: [
          {
            type: "p",
            text: "**Cofoundee ไม่ใช่คู่สัญญาในดีลใดๆ ระหว่างผู้ใช้** เราไม่รับรอง ไม่รับประกัน และไม่รับผิดชอบต่อความสัมพันธ์แบบ co-founder ความร่วมมือ ข้อตกลงเรื่อง equity หรือการลงทุนใดๆ ที่อาจเกิดขึ้นจากการเชื่อมต่อผ่านบริการนี้ กรุณาตรวจสอบข้อมูลด้วยตัวคุณเอง (due diligence) และปรึกษาทนายความที่มีคุณสมบัติเหมาะสมก่อนเซ็นสัญญา co-founder",
          },
        ],
      },
      {
        id: "termination",
        heading: "9. การยุติการใช้งาน",
        blocks: [
          {
            type: "p",
            text: "คุณลบบัญชีของคุณเองได้ทุกเมื่อจากหน้าตั้งค่าโปรไฟล์ เราอาจระงับหรือยุติบัญชีที่ละเมิดเงื่อนไขฉบับนี้ จรรยาบรรณของเรา หรือกฎหมายที่เกี่ยวข้อง เมื่อบัญชียุติลง ข้อมูลของคุณจะถูกจัดการตาม[นโยบายความเป็นส่วนตัว](/privacy)",
          },
        ],
      },
      {
        id: "disclaimers",
        heading: "10. การปฏิเสธการรับประกัน",
        blocks: [
          {
            type: "p",
            text: "บริการนี้ให้ตามสภาพที่เป็นอยู่ (“as is”) โดยไม่มีการรับประกันใดๆ ทั้งสิ้น เราไม่รับประกันว่าบริการจะใช้งานได้ต่อเนื่องโดยไม่สะดุดหรือปราศจากข้อผิดพลาด และไม่รับประกันว่าการจับคู่ใดๆ จะนำไปสู่ความร่วมมือที่ประสบความสำเร็จ",
          },
        ],
      },
      {
        id: "limitation-of-liability",
        heading: "11. ขอบเขตความรับผิด",
        blocks: [
          {
            type: "p",
            text: "ภายใต้ขอบเขตสูงสุดที่กฎหมายไทยอนุญาต ความรับผิดทั้งหมดของ Cofoundee ที่เกิดจากการที่คุณใช้บริการ จำกัดอยู่ที่จำนวนเงินที่คุณได้ชำระให้เราในช่วง 12 เดือนที่ผ่านมา (ซึ่งในเฟส 1 เท่ากับศูนย์)",
          },
        ],
      },
      {
        id: "governing-law",
        heading: "12. กฎหมายที่ใช้บังคับ",
        blocks: [
          {
            type: "p",
            text: "เงื่อนไขฉบับนี้อยู่ภายใต้บังคับของกฎหมายไทย ข้อพิพาทใดๆ จะระงับที่ศาลในกรุงเทพมหานคร",
          },
        ],
      },
      {
        id: "changes",
        heading: "13. การเปลี่ยนแปลงเงื่อนไขนี้",
        blocks: [
          {
            type: "p",
            text: "เราอาจปรับปรุงเงื่อนไขฉบับนี้เป็นครั้งคราว หากมีการเปลี่ยนแปลงในสาระสำคัญ เราจะแจ้งล่วงหน้าอย่างน้อย 30 วัน ทางอีเมลและแบนเนอร์บนบริการ การใช้บริการต่อไปหลังวันที่การเปลี่ยนแปลงมีผลบังคับใช้ ถือว่าคุณยอมรับการเปลี่ยนแปลงนั้น",
          },
        ],
      },
      {
        id: "contact",
        heading: "ติดต่อ",
        blocks: [
          {
            type: "p",
            text: "[chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co)",
          },
        ],
      },
    ],
    footnote:
      "เอกสารฉบับนี้เป็นเพียงจุดเริ่มต้น และจะผ่านการตรวจทานโดยที่ปรึกษากฎหมายไทยที่มีคุณสมบัติเหมาะสมก่อนเปิดตัวสู่สาธารณะ คำแปลจัดทำขึ้นเพื่อความสะดวกในการอ่าน และเมื่อจัดทำฉบับสมบูรณ์แล้ว ให้ถือฉบับภาษาไทยเป็นฉบับที่มีผลบังคับ",
  },
});
