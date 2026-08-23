import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { fetchOrgMessagesAction } from "../../chat-actions";
import { OrgChatThread } from "./OrgChatThread";
import { OrgChatComposer } from "./OrgChatComposer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function OrgChatPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) notFound();

  // Which of the viewer's companies is connected to this one?
  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);
  const myOrgIds = (memberships ?? []).map((m) => m.org_id as string);
  if (myOrgIds.length === 0) redirect(`/orgs/${slug}`);

  const admin = createAdminClient();
  const { data: conns } = await admin
    .from("org_connections")
    .select("id, status, requester_org, target_org")
    .or(`requester_org.eq.${org.id},target_org.eq.${org.id}`);
  const conn = (conns ?? []).find((c) => {
    const other =
      c.requester_org === org.id ? c.target_org : c.requester_org;
    return c.status === "accepted" && myOrgIds.includes(other as string);
  });
  if (!conn) redirect(`/orgs/${slug}`);

  const connectionId = conn.id as string;
  const messages = await fetchOrgMessagesAction(connectionId);

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-4rem)] lg:h-dvh flex flex-col">
      <header className="border-b border-line bg-white px-6 py-4">
        <Link
          href={`/orgs/${slug}`}
          className="text-xs text-ink-muted hover:text-navy mb-2 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3 h-3" /> {await tServer("Back to company")}
        </Link>
        <div className="font-serif text-xl text-navy">
          {org.name as string}
        </div>
        <div className="text-xs text-ink-muted">
          {await tServer("Company chat")}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-cream px-6 py-6">
        <OrgChatThread
          connectionId={connectionId}
          currentUserId={user.id}
          initialMessages={messages}
          emptyText={await tServer(
            "No messages yet. Say hello and align on the deal.",
          )}
        />
      </div>

      <OrgChatComposer connectionId={connectionId} />
    </div>
  );
}
