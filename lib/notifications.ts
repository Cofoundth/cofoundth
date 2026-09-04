// Notification presentation — one mapping for the bell AND the /notifications
// page, so a notification deep-links and reads identically wherever it shows.
// Client- and server-safe: no hooks, no directives; the translator comes in
// as an argument (tr from useT() on the client, a t(en, locale) closure on
// the server).

export type NotifLike = {
  type: string;
  entityId: string | null;
  data: {
    actor_name?: string;
    post_title?: string;
    slug?: string;
    title?: string;
  } | null;
  actor: {
    id: string;
    slug: string | null;
    full_name: string | null;
    photo_url: string | null;
  } | null;
};

export function notifHref(n: NotifLike): string {
  switch (n.type) {
    case "profile_view":
      return n.actor ? `/profile/${n.actor.slug ?? n.actor.id}` : "/dashboard";
    case "comment":
    case "mention":
      return n.entityId ? `/community/${n.entityId}` : "/community";
    case "message":
      return n.entityId ? `/messages/${n.entityId}` : "/matches";
    case "interest":
    case "match":
      return "/matches";
    case "deal_proposed":
      return n.data?.slug ? `/orgs/${n.data.slug}` : "/orgs";
    case "funding_proposed":
      return n.entityId ? `/funding/${n.entityId}` : "/funding";
    case "meetup_rsvp":
      return n.data?.slug ? `/meetups/${n.data.slug}` : "/meetups";
    default:
      return "/dashboard";
  }
}

export function notifText(
  n: NotifLike,
  tr: (en: string) => string,
): string {
  const name = n.actor?.full_name || n.data?.actor_name || tr("Someone");
  switch (n.type) {
    case "profile_view":
      return tr("{name} viewed your profile").replace("{name}", name);
    case "comment":
      return tr("{name} commented on your post").replace("{name}", name);
    case "mention":
      return tr("{name} mentioned you in a comment").replace("{name}", name);
    case "interest":
      return tr("{name} is interested in connecting").replace("{name}", name);
    case "match":
      return tr("You and {name} are now connected").replace("{name}", name);
    case "message":
      return tr("{name} sent you a message").replace("{name}", name);
    case "deal_proposed":
      return tr("{name} proposed a partnership deal").replace(
        "{name}",
        n.data?.actor_name || tr("A company"),
      );
    case "funding_proposed":
      return tr("{name} sent a funding proposal").replace("{name}", name);
    case "meetup_rsvp":
      return tr("{name} is going to your meetup")
        .replace("{name}", name)
        .concat(n.data?.title ? ` · ${n.data.title}` : "");
    default:
      return "";
  }
}
