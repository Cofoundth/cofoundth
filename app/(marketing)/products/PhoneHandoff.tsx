"use client";

// A phone app, opened from a computer: a code to scan instead of a store page.
//
// THE PROBLEM (the owner, 2026-11-12): "if you are a desktop user and it opens
// the App Store, it's bad UX". Pressing "Try" on a phone app from a laptop
// landed on an App Store page in a new tab, where there is nothing to try. So
// when the product only runs on a phone (`phones`, worked out on the server:
// ./product-view.ts storePlatformOf) and this device is NOT a phone or a
// tablet, "Try" opens this dialog instead: a QR code of the same link, which a
// phone's camera opens in one step, and a plain way to open the link here
// anyway.
//
// Decided at the moment of the press, in the browser, because only the browser
// knows what it is running on — never during render, so the server's markup
// and the first client render stay identical.
//
// The QR is drawn as ONE <path> from uqr's module matrix (a pure function, no
// DOM, no network): nothing third-party is fetched and no HTML string is
// injected. Navy on white with a quiet zone, so any phone camera reads it.

import {
  useContext,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ExternalLink } from "lucide-react";
import { encode } from "uqr";
import { useT } from "@/lib/i18n-client";
import { Button, Dialog, ToggleChip, buttonClasses } from "@/components/ui";
import { STORE_LABEL, STORE_PLATFORMS, type ProductStoreLinks } from "@/lib/product-store-links";
import {
  DeckProductTry,
  useProductPrompts,
  type DeckViewer,
  type ProductTry,
  type PromptProduct,
} from "./DeckPrompts";
import type { PhonePlatform } from "./product-view";

/** Every link out to a maker's site. ./product-view.ts says why each word. */
const LINK_REL = "noopener noreferrer nofollow";
const TRY_LINKS_ID = "product-try-links";

/** Focus the first try destination without adding a fragment-history entry
 * to the product dialog's URL. */
export function GoToProductLinks() {
  const tr = useT();
  return (
    <button
      type="button"
      className="text-sm text-navy underline underline-offset-4"
      onClick={() => document.getElementById(TRY_LINKS_ID)?.querySelector("a")?.focus()}
    >
      {tr("Go to product links")}
    </button>
  );
}

/** The phone OS this browser is running on, or null on anything else. */
function phoneOS(): PhonePlatform | null {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ asks for the desktop site and says "Macintosh"; a Mac has no
  // touch screen, an iPad does.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  // An Android tablet's Chrome asks for the desktop site by default and says
  // "X11; Linux": a finger as its main pointer gives it away, the same test
  // components/TouchHint.tsx uses. A Chromebook says "X11; CrOS".
  if (/X11; Linux/.test(ua) && window.matchMedia("(pointer: coarse)").matches) {
    return "android";
  }
  return null;
}

/**
 * Whether pressing "Try" here should show the code instead of opening the
 * link: the product only runs on a phone, and this is not one. A phone of the
 * other kind gets the link as before (a QR code on the screen you would scan it
 * with is no use), and a product that runs anywhere else always does.
 */
export function needsPhone(phones: readonly PhonePlatform[]): boolean {
  return phones.length > 0 && phoneOS() === null;
}

/** A plain primary click. A middle-click or a modifier is the reader asking
 *  the browser for a tab or a window, and gets one. */
function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * The product page's "Try it": an external link that works before hydration,
 * with a phone handoff when needed and a review prompt on return.
 */
type ExternalProductLinkProps = {
  href: string;
  host: string;
  name: string;
  phones: readonly PhonePlatform[];
  storeLinks: ProductStoreLinks;
  className?: string;
  children: ReactNode;
};

type TryDestination = { label: string; href: string; host: string; phones: readonly PhonePlatform[] };
type ProductTryLinksProps = {
  product: PromptProduct;
  viewer: DeckViewer;
  main: TryDestination | null;
  stores: readonly (TryDestination & { platform: PhonePlatform })[];
};

export function ProductTryLinks(props: ProductTryLinksProps) {
  const triedFromDetails = useContext(DeckProductTry);
  if (!triedFromDetails) {
    return <StandaloneTryLinks {...props} />;
  }
  return (
    <TryLinks {...props} tried={triedFromDetails} />
  );
}

function StandaloneTryLinks(props: ProductTryLinksProps) {
  const prompts = useProductPrompts({
    products: [props.product],
    viewer: props.viewer,
    standaloneProductId: props.product.id,
  });
  return (
    <>
      <TryLinks {...props} tried={prompts.tried} />
      {prompts.dialog}
    </>
  );
}

function TryLinks({ product, viewer, main, stores, tried }: ProductTryLinksProps & {
  tried: ProductTry;
}) {
  if (!main && stores.length === 0) return null;
  const storeLinks: ProductStoreLinks = Object.fromEntries(stores.map(({ platform, href }) => [platform, href]));

  function link(destination: TryDestination, key: string, variant: "primary" | "secondary") {
    return (
      <ExternalProductLink
        key={key}
        href={destination.href}
        host={destination.host}
        name={product.name}
        phones={destination.phones}
        storeLinks={storeLinks}
        className={buttonClasses({ variant, size: "lg", className: "w-full min-w-0 px-3" })}
        onTry={() => tried(product)}
        onReview={
          !viewer.signedIn || product.reviewable
            ? () => tried(product, { requestReview: true })
            : undefined
        }
      >
        {destination.label}
        <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      </ExternalProductLink>
    );
  }

  return (
    <div id={TRY_LINKS_ID} className="mt-6 grid gap-3">
      {main && link(main, "main", "primary")}
      {stores.length > 0 && (
        <div className={stores.length > 1 ? "grid gap-2 min-[400px]:grid-cols-2" : undefined}>
          {stores.map((store) => link(store, store.platform, main ? "secondary" : "primary"))}
        </div>
      )}
    </div>
  );
}

function ExternalProductLink({
  href,
  host,
  name,
  phones,
  storeLinks,
  className,
  children,
  onTry,
  onReview,
}: ExternalProductLinkProps & { onTry: () => void; onReview?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel={LINK_REL}
        aria-description={host}
        className={className}
        onClick={(event) => {
          if (isPlainClick(event) && needsPhone(phones)) {
            event.preventDefault();
            setOpen(true);
          } else {
            onTry();
          }
        }}
        onAuxClick={(event) => {
          if (event.button === 1) onTry();
        }}
      >
        {children}
      </a>
      {open && (
        <PhoneHandoffDialog
          name={name}
          href={href}
          host={host}
          phones={phones}
          storeLinks={storeLinks}
          onClose={() => setOpen(false)}
          onOpenHere={onTry}
          onReview={onReview}
        />
      )}
    </>
  );
}

const PHONE_NAME: Record<PhonePlatform, string> = {
  ios: "iPhone",
  android: "Android",
};

function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 2 });
    let d = "";
    qr.data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { size: qr.size, path: d };
  }, [value]);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="mx-auto h-48 w-48 rounded-xl bg-white"
    >
      <path d={path} className="fill-navy" />
    </svg>
  );
}

export function PhoneHandoffDialog({
  name,
  href,
  host,
  phones,
  storeLinks,
  onClose,
  onOpenHere,
  onReview,
}: {
  name: string;
  /** Already through webUrl() on the server. */
  href: string;
  host: string;
  phones: readonly PhonePlatform[];
  storeLinks?: ProductStoreLinks;
  onClose: () => void;
  /** The reader chose the link on this device after all. */
  onOpenHere?: () => void;
  /** The reader confirms they tried it on another device. */
  onReview?: () => void;
}) {
  const tr = useT();
  const canSwitchStore = !!(storeLinks?.ios && storeLinks.android);
  const [store, setStore] = useState<PhonePlatform>(() => href === storeLinks?.android ? "android" : "ios");
  const destination = canSwitchStore ? storeLinks?.[store] ?? href : href;
  const destinationHost = destination === href ? host : new URL(destination).hostname;
  const platforms =
    canSwitchStore ? PHONE_NAME[store] : phones.length > 1
      ? tr("{a} and {b}")
          .replace("{a}", PHONE_NAME[phones[0]])
          .replace("{b}", PHONE_NAME[phones[1]])
      : PHONE_NAME[phones[0]];
  function openHere() {
    onOpenHere?.();
    onClose();
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="phone-handoff-title"
      size="sm"
      closeButton="overlay"
      closeLabel={tr("Close")}
      panelClassName="text-center"
    >
      <h2 id="phone-handoff-title" className="text-lg font-bold tracking-normal">
        {tr("Open {name} on your phone").replace("{name}", name)}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        {tr(
          "It's an app for {platforms}. Scan this code with your phone's camera to open it.",
        ).replace("{platforms}", platforms)}
      </p>
      {canSwitchStore && (
        <div role="group" aria-label={tr("App store links")} className="mt-4 grid grid-cols-2 gap-2">
          {STORE_PLATFORMS.map((platform) => (
            <ToggleChip key={platform} selected={store === platform} onClick={() => setStore(platform)}>
              {tr(STORE_LABEL[platform])}
            </ToggleChip>
          ))}
        </div>
      )}
      <div className="mt-5">
        <QrCode
          value={destination}
          label={tr("QR code to open {name}").replace("{name}", name)}
        />
      </div>
      {onReview && (
        <Button
          fullWidth
          className="mt-5"
          onClick={() => {
            onClose();
            onReview();
          }}
        >
          {tr("I've tried it")}
        </Button>
      )}
      <a
        href={destination}
        target="_blank"
        rel={LINK_REL}
        onClick={openHere}
        onAuxClick={(event) => {
          if (event.button === 1) openHere();
        }}
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-navy"
      >
        {tr("Open {host} here instead").replace("{host}", destinationHost)}
        <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </a>
    </Dialog>
  );
}
