// Cofoundee — Privacy Policy, both locales. Data only; see ./types.ts for the
// block shape, the inline-markup contract and why the ids are typed.
//
// ⚠️ The Thai is the operative text once this document is finalised — the
// footnote says so ("ให้ถือฉบับภาษาไทยเป็นฉบับที่มีผลบังคับ"). A Thai clause that is
// vaguer or softer than its English sibling is therefore a legal defect, not a
// copy nit. Edit the pair together, always.

import { defineLegalContent } from "./types";

export const privacy = defineLegalContent({
  ids: [
    "overview",
    "data-we-collect",
    "how-we-use-it",
    "who-can-see-your-data",
    "how-long-we-keep-it",
    "your-rights-under-pdpa",
    "cookies",
    "data-security",
    "contact",
  ],

  en: {
    title: "Privacy Policy",
    eyebrow: "Legal · PDPA compliant",
    updated: "Last updated: September 2026 · Effective immediately",
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "p",
            text: "Cofoundee Co., Ltd. (“we”, “our”) operates cofoundee.co (the “Service”). This Privacy Policy describes what personal data we collect, how we use it, and the rights you have under Thailand’s Personal Data Protection Act B.E. 2562 (“PDPA”).",
          },
        ],
      },
      {
        id: "data-we-collect",
        heading: "Data we collect",
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: "Account data",
                desc: "Full name, email address, password (hashed), photo, LinkedIn URL.",
              },
              {
                term: "Profile data",
                desc: "Role, intent, skills, industries, stage, commitment level, financial runway, founder experience, pitch text, location.",
              },
              {
                term: "Activity data",
                desc: "Interests expressed, matches formed, messages sent, profile views, forum posts, reports submitted.",
              },
              {
                term: "Technical data",
                desc: "IP address, browser type, device type, session timestamps. Used for security and abuse prevention.",
              },
            ],
          },
        ],
      },
      {
        id: "how-we-use-it",
        heading: "How we use it",
        blocks: [
          {
            type: "list",
            items: [
              "To run the matching service (filter, score, surface profiles)",
              "To send transactional emails (sign-in, match alerts, messages)",
              "To prevent abuse and respond to reports",
              "To improve the platform via aggregated, anonymized analytics",
            ],
          },
          {
            type: "p",
            text: "We do not sell your data to third parties. We do not use it for advertising.",
          },
        ],
      },
      {
        id: "who-can-see-your-data",
        heading: "Who can see your data",
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: "Other authenticated users",
                desc: "Can see your profile (name, role, pitch, etc.) when they browse the founder directory. They cannot see your email unless you have a mutual match.",
              },
              {
                term: "Cofoundee staff",
                desc: "Can access data for support, abuse review, and infrastructure operations.",
              },
              {
                term: "Service providers",
                desc: "The vendors we use (Supabase, Vercel, Resend, Google) process data under their own privacy policies. We choose vendors with PDPA-compatible practices.",
              },
            ],
          },
        ],
      },
      {
        id: "how-long-we-keep-it",
        heading: "How long we keep it",
        blocks: [
          {
            type: "p",
            text: "Active accounts: indefinitely while your account exists. Deleted accounts: removed within 30 days, except where retention is required for legal or regulatory reasons.",
          },
        ],
      },
      {
        id: "your-rights-under-pdpa",
        heading: "Your rights under PDPA",
        blocks: [
          { type: "p", text: "You have the right to:" },
          {
            type: "list",
            items: [
              "Access the personal data we hold about you",
              "Correct inaccurate or incomplete data",
              "Request deletion of your data",
              "Object to certain types of processing",
              "Withdraw consent (where processing is consent-based)",
              "Data portability (export your data in a usable format)",
              "File a complaint with Thailand’s Office of the Personal Data Protection Committee (PDPC)",
            ],
          },
          {
            type: "p",
            text: "To exercise any of these rights, email [chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co). We respond within 30 days.",
          },
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          {
            type: "p",
            text: "We use essential cookies for authentication, session management, and remembering your language preference. We don’t use third-party tracking or advertising cookies.",
          },
        ],
      },
      {
        id: "data-security",
        heading: "Data security",
        blocks: [
          {
            type: "p",
            text: "All data is encrypted in transit (TLS 1.3) and at rest. Passwords are hashed with bcrypt. Production access is restricted to a small engineering team with audit logging. In the event of a data breach affecting your data, we will notify you and the PDPC within 72 hours where required.",
          },
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        blocks: [
          { type: "p", text: "Cofoundee Co., Ltd." },
          { type: "p", text: "Bangkok, Thailand" },
          {
            type: "p",
            text: "[chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co)",
          },
        ],
      },
    ],
    footnote:
      "This policy will be reviewed and refined by qualified legal counsel before public launch. Translations are provided for convenience; the Thai-language version will be authoritative once finalized.",
  },

  th: {
    title: "นโยบายความเป็นส่วนตัว",
    eyebrow: "กฎหมาย · เป็นไปตาม PDPA",
    updated: "อัปเดตล่าสุด: กันยายน 2026 · มีผลบังคับใช้ทันที",
    sections: [
      {
        id: "overview",
        heading: "ภาพรวม",
        blocks: [
          {
            type: "p",
            text: "บริษัท โคฟาวดี้ จำกัด (“เรา”) เป็นผู้ให้บริการ cofoundee.co (“บริการ”) นโยบายความเป็นส่วนตัวฉบับนี้อธิบายว่าเราเก็บข้อมูลส่วนบุคคลอะไร นำไปใช้อย่างไร และคุณมีสิทธิอะไรบ้างภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (“PDPA”) ของประเทศไทย",
          },
        ],
      },
      {
        id: "data-we-collect",
        heading: "ข้อมูลที่เราเก็บ",
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: "ข้อมูลบัญชี",
                desc: "ชื่อ-นามสกุล อีเมล รหัสผ่าน (จัดเก็บเป็นค่า hash) รูปภาพ และลิงก์ LinkedIn",
              },
              {
                term: "ข้อมูลโปรไฟล์",
                desc: "บทบาท เป้าหมาย (intent) ทักษะ อุตสาหกรรม ช่วง (stage) ระดับความทุ่มเท ทุนสำรอง (runway) ประสบการณ์ founder ข้อความ pitch และที่ตั้ง",
              },
              {
                term: "ข้อมูลการใช้งาน",
                desc: "ความสนใจที่คุณแสดงไว้ การจับคู่ที่เกิดขึ้น ข้อความที่ส่ง การเข้าชมโปรไฟล์ โพสต์ในฟอรัม และรายงานที่ส่งเข้ามา",
              },
              {
                term: "ข้อมูลทางเทคนิค",
                desc: "IP address ประเภทเบราว์เซอร์ ประเภทอุปกรณ์ และเวลาของแต่ละเซสชัน ใช้เพื่อความปลอดภัยและป้องกันการใช้งานในทางที่ผิด",
              },
            ],
          },
        ],
      },
      {
        id: "how-we-use-it",
        heading: "เราใช้ข้อมูลอย่างไร",
        blocks: [
          {
            type: "list",
            items: [
              "เพื่อให้ระบบจับคู่ทำงานได้ (กรอง ให้คะแนน และแสดงโปรไฟล์)",
              "เพื่อส่งอีเมลที่เกี่ยวข้องกับการใช้งาน (การเข้าสู่ระบบ การแจ้งเตือนเมื่อจับคู่ และข้อความ)",
              "เพื่อป้องกันการใช้งานในทางที่ผิด และดำเนินการกับรายงานที่ได้รับ",
              "เพื่อพัฒนาแพลตฟอร์ม โดยใช้ข้อมูลสถิติแบบรวมที่ไม่ระบุตัวตน",
            ],
          },
          {
            type: "p",
            text: "เราไม่ขายข้อมูลของคุณให้บุคคลที่สาม และไม่นำข้อมูลของคุณไปใช้เพื่อการโฆษณา",
          },
        ],
      },
      {
        id: "who-can-see-your-data",
        heading: "ใครเห็นข้อมูลของคุณได้บ้าง",
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: "ผู้ใช้รายอื่นที่เข้าสู่ระบบแล้ว",
                desc: "เห็นโปรไฟล์ของคุณ (ชื่อ บทบาท pitch ฯลฯ) เมื่อเปิดดูในไดเรกทอรี founder แต่จะไม่เห็นอีเมลของคุณ เว้นแต่คุณกับเขาจะสนใจตรงกันจนเกิดการจับคู่",
              },
              {
                term: "ทีมงาน Cofoundee",
                desc: "เข้าถึงข้อมูลได้เพื่อการซัพพอร์ต การตรวจสอบการใช้งานในทางที่ผิด และการดูแลระบบ",
              },
              {
                term: "ผู้ให้บริการที่เราใช้",
                desc: "Supabase, Vercel, Resend และ Google ประมวลผลข้อมูลภายใต้นโยบายความเป็นส่วนตัวของแต่ละราย เราเลือกผู้ให้บริการที่มีแนวปฏิบัติสอดคล้องกับ PDPA",
              },
            ],
          },
        ],
      },
      {
        id: "how-long-we-keep-it",
        heading: "เราเก็บข้อมูลไว้นานแค่ไหน",
        blocks: [
          {
            type: "p",
            text: "ถ้าบัญชีของคุณยังใช้งานอยู่ เราจะเก็บข้อมูลไว้ตราบเท่าที่บัญชีนั้นยังมีอยู่ ถ้าคุณลบบัญชี เราจะลบข้อมูลออกภายใน 30 วัน ยกเว้นส่วนที่กฎหมายหรือกฎระเบียบกำหนดให้ต้องเก็บไว้",
          },
        ],
      },
      {
        id: "your-rights-under-pdpa",
        heading: "สิทธิของคุณภายใต้ PDPA",
        blocks: [
          { type: "p", text: "คุณมีสิทธิดังนี้" },
          {
            type: "list",
            items: [
              "เข้าถึงข้อมูลส่วนบุคคลที่เราเก็บไว้เกี่ยวกับคุณ",
              "แก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่ครบถ้วน",
              "ขอให้ลบข้อมูลของคุณ",
              "คัดค้านการประมวลผลข้อมูลบางประเภท",
              "ถอนความยินยอม (ในกรณีที่การประมวลผลอาศัยความยินยอม)",
              "ขอให้โอนย้ายข้อมูล (ส่งออกข้อมูลของคุณในรูปแบบที่นำไปใช้ต่อได้)",
              "ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (PDPC) ของประเทศไทย",
            ],
          },
          {
            type: "p",
            text: "หากต้องการใช้สิทธิใดสิทธิหนึ่งข้างต้น ส่งอีเมลมาที่ [chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co) เราจะตอบกลับภายใน 30 วัน",
          },
        ],
      },
      {
        id: "cookies",
        heading: "คุกกี้",
        blocks: [
          {
            type: "p",
            text: "เราใช้คุกกี้ที่จำเป็นต่อการทำงาน สำหรับการยืนยันตัวตน การจัดการเซสชัน และการจดจำภาษาที่คุณเลือกไว้ เราไม่ใช้คุกกี้เพื่อการติดตามหรือโฆษณาจากบุคคลที่สาม",
          },
        ],
      },
      {
        id: "data-security",
        heading: "ความปลอดภัยของข้อมูล",
        blocks: [
          {
            type: "p",
            text: "ข้อมูลทั้งหมดถูกเข้ารหัสทั้งระหว่างการส่ง (TLS 1.3) และขณะจัดเก็บ รหัสผ่านผ่านการ hash ด้วย bcrypt การเข้าถึงระบบ production จำกัดไว้เฉพาะทีมวิศวกรกลุ่มเล็ก และมีการบันทึก log การเข้าถึงไว้ตรวจสอบ หากเกิดเหตุข้อมูลรั่วไหลที่กระทบข้อมูลของคุณ เราจะแจ้งคุณและ PDPC ภายใน 72 ชั่วโมง ในกรณีที่กฎหมายกำหนดให้ต้องแจ้ง",
          },
        ],
      },
      {
        id: "contact",
        heading: "ติดต่อเรา",
        blocks: [
          { type: "p", text: "บริษัท โคฟาวดี้ จำกัด" },
          { type: "p", text: "กรุงเทพมหานคร ประเทศไทย" },
          {
            type: "p",
            text: "[chayanonr@cofoundee.co](mailto:chayanonr@cofoundee.co)",
          },
        ],
      },
    ],
    footnote:
      "นโยบายฉบับนี้จะได้รับการตรวจทานและปรับปรุงโดยที่ปรึกษากฎหมายที่มีคุณสมบัติ ก่อนเปิดให้บริการต่อสาธารณะ คำแปลจัดทำขึ้นเพื่อความสะดวกในการอ่าน และเมื่อจัดทำฉบับสมบูรณ์แล้ว ให้ถือฉบับภาษาไทยเป็นฉบับที่มีผลบังคับ",
  },
});
