// Notification presentation — one mapping for the bell AND the /notifications
// page, so a notification deep-links and reads identically wherever it shows.
// Client- and server-safe: no hooks, no directives; the translator comes in
// as an argument (tr from useT() on the client, a t(en, locale) closure on
// the server).
//
// A PRODUCT IS NOT A POST, even though it is stored as one (a forum_posts row
// with kind 'show_and_tell'). A comment or a mention on one says "your
// product" and opens the product's page, /products/<id>. The kind is written
// into `data.post_kind` when the notification is created — by the comment
// trigger (migration 0081) and by notifyMentions (lib/post-actions.ts) — so
// this stays a pure mapping with no read. A row from before 0081 has no
// `post_kind` and reads as a post; its link still works, because
// /community/<id> sends a product on to /products/<id>.

export type NotifLike = {
  type: string;
  entityId: string | null;
  data: {
    actor_name?: string;
    post_title?: string;
    /** forum_posts.kind of the thread a comment / mention is on. */
    post_kind?: string;
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

/** A comment or mention on a product rather than on a community post. */
function onProduct(n: NotifLike): boolean {
  return n.data?.post_kind === "show_and_tell";
}

export function notifHref(n: NotifLike): string {
  switch (n.type) {
    case "profile_view":
      return n.actor ? `/profile/${n.actor.slug ?? n.actor.id}` : "/notifications";
    case "comment":
    case "mention":
      if (onProduct(n))
        return n.entityId ? `/products/${n.entityId}#comments` : "/products";
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
    // No dashboard any more (2026-11-12): an unknown kind opens the list it
    // came from.
    default:
      return "/notifications";
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
      return tr(
        onProduct(n)
          ? "{name} commented on your product"
          : "{name} commented on your post",
      ).replace("{name}", name);
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
