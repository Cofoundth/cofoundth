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
    // Every meetup notification lands on the meetup itself. That is also
    // where the HOST's Requests list lives (MeetupJoinControls renders it on
    // the detail page), so "someone requested a spot" deep-links to the place
    // the host answers it.
    case "meetup_rsvp":
    case "meetup_request":
    case "meetup_request_approved":
    case "meetup_request_declined":
    case "meetup_invite":
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
    case "meetup_request":
      return tr("{name} requested a spot at your meetup")
        .replace("{name}", name)
        .concat(n.data?.title ? ` · ${n.data.title}` : "");
    case "meetup_invite":
      return tr("{name} invited you to a meetup")
        .replace("{name}", name)
        .concat(n.data?.title ? ` · ${n.data.title}` : "");
    // These two name the MEETUP rather than the host: what the reader wants
    // to know is which door opened, not who turned the handle.
    case "meetup_request_approved":
      return tr("Your request to join {title} was approved").replace(
        "{title}",
        n.data?.title || tr("the meetup"),
      );
    case "meetup_request_declined":
      return tr("Your request to join {title} was declined").replace(
        "{title}",
        n.data?.title || tr("the meetup"),
      );
    default:
      return "";
  }
}
