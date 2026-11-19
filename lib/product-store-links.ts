import { webUrl } from "./web-url";
import { LINK_TOO_LONG, MAX_LINK_LENGTH } from "./write-limits";

export type PhonePlatform = "ios" | "android";

export const STORE_PLATFORMS = ["ios", "android"] as const;

export const STORE_LABEL = { ios: "App Store", android: "Google Play" } as const;
export const STORE_LINK_LABEL = { ios: "iOS App Store link", android: "Google Play link" } as const;
export const STORE_LINK_ERROR = {
  ios: "Enter a valid iOS App Store link.",
  android: "Enter a valid Google Play link.",
} as const;

export function isMacAppStore(link: URL): boolean {
  return (
    (link.hostname === "apps.apple.com" || link.hostname === "itunes.apple.com") &&
    link.searchParams.get("mt") === "12"
  );
}

/** The mobile store identified by the parsed domain of a product's link. */
export function storePlatformOf(link: URL): PhonePlatform | null {
  if (isMacAppStore(link)) return null;
  if (["apps.apple.com", "itunes.apple.com", "testflight.apple.com"].includes(link.hostname)) return "ios";
  return link.hostname === "play.google.com" ? "android" : null;
}

/** Dedicated store fields accept HTTPS links to the corresponding platform. */
export function productStoreLink(raw: string | null | undefined, platform: PhonePlatform): URL | null {
  if (!raw || !/^https:\/\//i.test(raw) || raw.length > MAX_LINK_LENGTH) return null;
  const link = webUrl(raw);
  return link && link.href.length <= MAX_LINK_LENGTH && !link.username && !link.password && !link.port && storePlatformOf(link) === platform
    ? link
    : null;
}

export const STORE_LINK_REQUIRED = "Add at least one app store link.";

export function validateProductLinks({
  link,
  requiresTryLink,
  inStores,
  ios,
  android,
}: {
  link: string;
  requiresTryLink: boolean;
  inStores: boolean;
  ios: string;
  android: string;
}) {
  const tryLink = link.trim();
  const iosInput = inStores ? ios.trim() : "";
  const androidInput = inStores ? android.trim() : "";
  const iosStoreUrl = productStoreLink(iosInput, "ios")?.href ?? null;
  const androidStoreUrl = productStoreLink(androidInput, "android")?.href ?? null;

  if (inStores && !iosInput && !androidInput)
    return { error: STORE_LINK_REQUIRED, field: "stores" } as const;
  if (iosInput && !iosStoreUrl) return { error: STORE_LINK_ERROR.ios, field: "ios" } as const;
  if (androidInput && !androidStoreUrl) return { error: STORE_LINK_ERROR.android, field: "android" } as const;
  if (tryLink.length > MAX_LINK_LENGTH)
    return { error: LINK_TOO_LONG, field: "link" } as const;
  if (tryLink && (!/^https?:\/\/.+/.test(tryLink) || !webUrl(tryLink)))
    return { error: "Link must start with http:// or https://", field: "link" } as const;
  const linkUrl = tryLink || (!requiresTryLink && (iosStoreUrl ?? androidStoreUrl));
  if (!linkUrl)
    return { error: "Add a link so people can try it.", field: "link" } as const;

  return { linkUrl, iosStoreUrl, androidStoreUrl };
}
