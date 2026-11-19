"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  LayoutGrid,
  Package,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import {
  ADD_PRODUCT_PATH,
  LIKED_PRODUCTS_PATH,
  MY_PRODUCTS_PATH,
  isEditProductPath,
} from "@/lib/roles";
import { RAIL_TIP, type SidebarLink } from "@/lib/sidebar";
import { cn } from "@/components/ui";

const ICONS: Record<string, LucideIcon> = {
  "/products": LayoutGrid,
  [LIKED_PRODUCTS_PATH]: Heart,
  [MY_PRODUCTS_PATH]: PackageCheck,
};

function activeDestination(pathname: string) {
  if (pathname === LIKED_PRODUCTS_PATH) return LIKED_PRODUCTS_PATH;
  if (
    pathname === MY_PRODUCTS_PATH ||
    pathname === ADD_PRODUCT_PATH ||
    isEditProductPath(pathname)
  ) {
    return MY_PRODUCTS_PATH;
  }
  if (pathname === "/products" || pathname.startsWith("/products/")) {
    return "/products";
  }
  return null;
}

type ProductLinksProps = {
  links: SidebarLink[];
  pathname: string;
  destination: string | null;
  onNavigate?: () => void;
};

function ProductNavLinks({
  links,
  pathname,
  destination,
  onNavigate,
  mobile = false,
}: ProductLinksProps & { mobile?: boolean }) {
  return links.map((link) => {
    const Icon = ICONS[link.href] ?? Package;
    const selected = destination === link.href;
    return (
      <li key={link.href}>
        <Link
          href={link.href}
          prefetch={false}
          onClick={onNavigate}
          aria-current={selected ? (pathname === link.href ? "page" : "location") : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
            mobile ? "min-h-11" : "min-h-9",
            selected ? "bg-gold font-medium text-navy" : "text-ink hover:bg-cream",
          )}
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="min-w-0 py-1">{link.label}</span>
        </Link>
      </li>
    );
  });
}

function CollapsedProductNav({
  label,
  active,
  ...linkProps
}: ProductLinksProps & { label: string; active: boolean }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!open || !trigger || !menu) return;

    // Fixed positioning lets the submenu extend past the scrolling rail.
    const edge = 8;
    const anchor = trigger.getBoundingClientRect().top;
    const bottomLimit = window.innerHeight - menu.offsetHeight - edge;
    menu.style.top = `${Math.max(edge, Math.min(anchor, bottomLimit))}px`;

    function close() {
      setOpen(false);
    }
    function closeOutside(event: Event) {
      if (event.target instanceof Node && !groupRef.current?.contains(event.target)) {
        close();
      }
    }
    const observer = new ResizeObserver(() => {
      // The compact trigger disappears when the rail expands or opens as a drawer.
      if (!trigger.getClientRects().length) close();
    });
    observer.observe(trigger);
    const nav = trigger.closest("nav");
    nav?.addEventListener("scroll", close);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      observer.disconnect();
      nav?.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);

  function closeAndFocus() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  return (
    <div
      ref={groupRef}
      className="hidden rail-collapsed:block"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          closeAndFocus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          setOpen(!open);
        }}
        className={cn(
          "group/rail relative flex h-9 w-10 items-center rounded-lg pl-2.5 transition-colors",
          active ? "bg-gold text-navy" : "text-ink hover:bg-cream",
          open && !active && "bg-cream",
        )}
      >
        <Package className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <ChevronRight className="size-2.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span aria-hidden="true" className={cn(RAIL_TIP, open && "hidden")}>{label}</span>
      </button>
      <ul
        ref={menuRef}
        id={menuId}
        hidden={!open}
        className="fixed left-18 z-50 w-52 max-h-[calc(100dvh-1rem)] space-y-1 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-lg"
      >
        <ProductNavLinks {...linkProps} onNavigate={closeAndFocus} />
      </ul>
    </div>
  );
}

export function ProductNavGroup({
  label,
  tag,
  links,
  pathname,
  mobile = false,
  onNavigate,
}: {
  label: string;
  tag?: string;
  links: SidebarLink[];
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const menuId = useId();
  const destination = activeDestination(pathname);
  const active = links.some((link) => link.href === destination);
  const [override, setOverride] = useState<{ pathname: string; open: boolean }>();
  const open = override?.pathname === pathname ? override.open : active;
  const linkProps = { links, pathname, destination };

  return (
    <>
      <div className={mobile ? "border-b border-line/60" : "rail-collapsed:hidden"}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOverride({ pathname, open: !open })}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg text-left text-sm transition-colors",
            mobile ? "py-3.5" : "h-9 px-2.5 tracking-wide",
            !open && active ? "bg-gold font-medium text-navy" : "text-ink hover:bg-cream",
          )}
        >
          <Package className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate py-1">{label}</span>
          {tag && (
            <span className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-navy",
              !open && active ? "bg-white" : "bg-gold",
            )}>
              {tag}
            </span>
          )}
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        <ul id={menuId} hidden={!open} className="mb-1 ml-5 mt-1 space-y-1 border-l border-line pl-2">
          <ProductNavLinks {...linkProps} mobile={mobile} onNavigate={onNavigate} />
        </ul>
      </div>
      {!mobile && <CollapsedProductNav key={pathname} {...linkProps} label={label} active={active} />}
    </>
  );
}
