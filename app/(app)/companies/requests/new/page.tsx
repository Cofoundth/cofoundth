import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { NewAskForm } from "./NewAskForm";

export default async function NewAskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("type, onboarded, company_name")
    .eq("id", user!.id)
    .single();

  // Only companies can post asks
  if (me?.type !== "company" || !me?.onboarded) {
    redirect("/companies/requests");
  }

  const locale = await getLocale();
  const isTH = locale === "th";

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/companies/requests"
        className="text-sm text-ink-muted hover:text-navy mb-6 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        {isTH ? "กลับไปบอร์ด" : "Back to board"}
      </Link>

      <div className="mb-10 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          {isTH ? "บอร์ดความร่วมมือ B2B" : "Partnership board"}
        </div>
        <h1 className="text-4xl mb-2">
          {isTH ? "โพสต์คำขอความร่วมมือ" : "Post a partnership ask"}
        </h1>
        <p className="text-ink">
          {isTH
            ? `บอกว่า ${me?.company_name ?? "บริษัทคุณ"} กำลังหาพาร์ตเนอร์แบบไหน บริษัทอื่นจะเห็นและติดต่อกลับด้วยข้อเสนอ`
            : `Describe the partner ${me?.company_name ?? "your company"} needs. Other companies will see it and respond with offers.`}
        </p>
      </div>

      <NewAskForm locale={locale} />
    </div>
  );
}
