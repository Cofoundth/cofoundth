"use client";

// The product form: Add product (/products/new) and Edit (/products/<id>/edit)
// are the same fields with the same rules. Adding goes through
// createProductAction, editing through updateProductAction (both in
// lib/post-actions.ts, both re-checking every rule below); what this file adds
// is that the maker hears about a problem BEFORE the round trip, next to the
// field it is about.
//
// EDITING starts every field at the product's current value, and the
// screenshot strip at the screenshots it already has (components/
// ScreenshotPicker.tsx says how kept and new ones are sent). It saves in
// place: the product keeps its page, its ratings and its comments.
//
// The fields are the product record as the deck reads it: a name (the card
// link's accessible name and the title on its page), a description (the card's
// main text), one category, where it runs (one or more platforms), the link
// the card opens, and optional screenshots (the first is the cover). Saved as
// the same forum_posts row a Show & tell always was — kind 'show_and_tell',
// the category as its one tag, the platforms in their own column (0080).

import { useActionState, useState } from "react";
import { Check, Send } from "lucide-react";
import {
  createProductAction,
  updateProductAction,
  type PostFormState,
} from "@/lib/post-actions";
import {
  CATEGORY_LABEL,
  MAX_PRODUCT_BLURB,
  MAX_PRODUCT_NAME,
  MIN_PRODUCT_IMAGES,
  PLATFORM_LABEL,
  PRODUCT_CATEGORIES,
  PRODUCT_FORM_PLATFORMS,
  isMobileProductPlatform,
  productPath,
  type ProductCategory,
  type ProductFormPlatform,
  type ProductPlatform,
} from "@/lib/post-types";
import {
  STORE_LINK_LABEL,
  STORE_LINK_REQUIRED,
  STORE_PLATFORMS,
  productStoreLink,
  storePlatformOf,
  validateProductLinks,
  type PhonePlatform,
} from "@/lib/product-store-links";
import { webUrl } from "@/lib/web-url";
import { useT } from "@/lib/i18n-client";
import { ScreenshotPicker, useScreenshots } from "@/components/ScreenshotPicker";
import {
  Button,
  Input,
  LinkButton,
  Textarea,
  ToggleChip,
} from "@/components/ui";

const INITIAL: PostFormState = null;

/** A product as the edit page hands it over: its id and current values. */
export type EditableProduct = {
  id: string;
  title: string;
  content: string;
  link: string;
  iosStoreUrl?: string | null;
  androidStoreUrl?: string | null;
  category: ProductCategory | null;
  platforms: ProductPlatform[];
  /** Its screenshots, cover first. */
  images: string[];
  /** A moderator hid it: saving changes it, but does not put it on the deck. */
  hidden: boolean;
};

function availabilityOf(product?: EditableProduct) {
  const platforms = product?.platforms ?? [];
  const primary = webUrl(product?.link);
  const mobileOnly = platforms.every(isMobileProductPlatform);
  const storeLinks = { ios: product?.iosStoreUrl ?? "", android: product?.androidStoreUrl ?? "" };

  // Older mobile products stored the only app store link as their Try link.
  if (mobileOnly && primary && !storeLinks.ios && !storeLinks.android) {
    const store = storePlatformOf(primary);
    if (store) {
      primary.protocol = "https:";
      const link = productStoreLink(primary.href, store);
      if (link) {
        return {
          platforms: platforms.length ? platforms : [store],
          storeLinks: { ...storeLinks, [store]: link.href },
          link: "",
        };
      }
    }
  }

  const usesStoreAsPrimary = mobileOnly && !!primary && STORE_PLATFORMS.some(
    (store) => primary.href === storeLinks[store],
  );
  return { platforms, storeLinks, link: usesStoreAsPrimary ? "" : product?.link ?? "" };
}

export function ProductForm({
  product,
}: {
  /** The product to edit. Absent: a new product. */
  product?: EditableProduct;
}) {
  const tr = useT();
  const editing = product !== undefined;
  const [state, formAction, isPending] = useActionState<
    PostFormState,
    FormData
  >(
    editing ? updateProductAction.bind(null, product.id) : createProductAction,
    INITIAL,
  );

  // CONTROLLED, all of them. Two reasons, both about not losing what the maker
  // typed: the counters and the link check need the live value, and a form
  // `action` resets its UNCONTROLLED fields when the action settles — which
  // here is only ever a refusal (success redirects), so an uncontrolled field
  // would be wiped exactly when the maker has to fix one of them.
  const [name, setName] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.content ?? "");
  const initialAvailability = availabilityOf(product);
  const [link, setLink] = useState(initialAvailability.link);
  // Shown once the maker has left the field, not on the first keystroke of
  // "https://".
  const [linkTouched, setLinkTouched] = useState(false);
  const [category, setCategory] = useState<ProductCategory | null>(
    product?.category ?? null,
  );
  const [platforms, setPlatforms] = useState<ProductPlatform[]>(
    initialAvailability.platforms,
  );
  const [storeLinks, setStoreLinks] = useState(initialAvailability.storeLinks);
  const [storeTouched, setStoreTouched] = useState<Partial<Record<PhonePlatform, boolean>>>({});
  const [inStores, setInStores] = useState(!!(storeLinks.ios || storeLinks.android));
  const shots = useScreenshots(product?.images);
  const mobileSelected = platforms.some(isMobileProductPlatform);
  const showStoreFields = mobileSelected && inStores;
  const needsPrimaryLink = platforms.some((platform) => !isMobileProductPlatform(platform));

  function togglePlatform(platform: ProductFormPlatform) {
    const matches = platform === "mobile" ? isMobileProductPlatform : (p: ProductPlatform) => p === "web";
    setPlatforms((prev) => prev.some(matches) ? prev.filter((p) => !matches(p)) : [...prev, platform]);
  }

  const linkValidation = validateProductLinks({
    link,
    requiresTryLink: needsPrimaryLink,
    inStores: showStoreFields,
    ...storeLinks,
  });
  const linkError = linkTouched && linkValidation.field === "link" ? tr(linkValidation.error) : undefined;

  // The form's own action. The actions read the screenshots with
  // getAll("images"), so they go in as repeated entries, in the strip's order;
  // an edit also sends the ones it keeps as `keep`, which come first. The
  // picker's own <input> has no name, so nothing else under either name is in
  // the FormData to begin with.
  function submit(formData: FormData) {
    for (const url of shots.kept) formData.append("keep", url);
    for (const file of shots.files) formData.append("images", file);
    formAction(formData);
  }

  // The category is chips, not an input, so the browser cannot enforce it — a
  // hidden field is barred from constraint validation. Gating the button is the
  // enforcement, and the "Pick one" note beside the label is what makes a
  // disabled button legible. `preparing` is NOT cosmetic: the screenshots are
  // only in `shots.files` once the downscaler has finished, so a submit
  // mid-resize would send the product without them.
  const blocked =
    isPending ||
    shots.preparing ||
    shots.shots.length < MIN_PRODUCT_IMAGES ||
    !category ||
    platforms.length === 0 ||
    !name.trim() ||
    !description.trim() ||
    "error" in linkValidation;

  return (
    <form action={submit} className="space-y-6">
      <Input
        id="product-name"
        name="title"
        type="text"
        required
        maxLength={MAX_PRODUCT_NAME}
        label={tr("Product name")}
        // Not on the deck card's face (only the images, the description, the
        // rating and the comment count are): the name is the card link's
        // accessible name and the title on its page. See MAX_PRODUCT_NAME.
        hint={
          <span className="text-xs text-ink-muted tabular-nums">
            {name.length}/{MAX_PRODUCT_NAME}
          </span>
        }
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
      />

      <Textarea
        id="product-description"
        name="content"
        required
        rows={4}
        maxLength={MAX_PRODUCT_BLURB}
        label={tr("Description")}
        // The deck card clamps it (three lines on a phone; MAX_PRODUCT_BLURB
        // says what that means in characters), so the counter is the honest
        // guide.
        hint={
          <span className="text-xs text-ink-muted tabular-nums">
            {description.length}/{MAX_PRODUCT_BLURB}
          </span>
        }
        placeholder={tr("What is it, and who is it for?")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          {/* The app's form-FIELD label idiom, not <Eyebrow>. */}
          <span
            id="product-category-label"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
          >
            {tr("Category")}
          </span>
          {!category && (
            <span className="text-xs text-ink-muted">{tr("Pick one")}</span>
          )}
        </div>
        <div
          role="group"
          aria-labelledby="product-category-label"
          className="flex flex-wrap items-center gap-2"
        >
          {PRODUCT_CATEGORIES.map((c) => (
            <ToggleChip
              key={c}
              selected={category === c}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {tr(CATEGORY_LABEL[c])}
            </ToggleChip>
          ))}
        </div>
        {/* The slug ships, never the label: it is stored as the row's one tag
            and the shelf's filter matches on it. */}
        <input type="hidden" name="category" value={category ?? ""} />
      </div>

      {/* Web and Mobile can both apply. Older platform declarations survive an edit. */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span
            id="product-platforms-label"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
          >
            {tr("Runs on")}
          </span>
          {platforms.length === 0 && (
            <span className="text-xs text-ink-muted">
              {tr("Pick all that apply")}
            </span>
          )}
        </div>
        <div
          role="group"
          aria-labelledby="product-platforms-label"
          className="flex flex-wrap items-center gap-2"
        >
          {PRODUCT_FORM_PLATFORMS.map((p) => (
            <ToggleChip
              key={p}
              selected={p === "mobile" ? mobileSelected : platforms.includes(p)}
              size="sm"
              onClick={() => togglePlatform(p)}
            >
              {tr(PLATFORM_LABEL[p])}
            </ToggleChip>
          ))}
        </div>
        {platforms.map((p) => (
          <input key={p} type="hidden" name="platforms" value={p} />
        ))}
        {mobileSelected && (
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="in_stores"
              checked={inStores}
              onChange={(event) => setInStores(event.target.checked)}
              className="size-4 shrink-0 accent-navy"
            />
            {tr("In app stores")}
          </label>
        )}
        {showStoreFields && (
          <fieldset aria-describedby="product-store-hint" className="mt-3 grid gap-3">
            <legend className="sr-only">{tr("App store links")}</legend>
            <p id="product-store-hint" className="text-sm text-ink-muted">
              {tr(STORE_LINK_REQUIRED)}
            </p>
            {STORE_PLATFORMS.map((store) => (
              <Input
                key={store}
                id={`product-${store}-store-url`}
                name={`${store}_store_url`}
                type="url"
                inputMode="url"
                label={tr(STORE_LINK_LABEL[store])}
                placeholder={store === "ios" ? "https://apps.apple.com/…" : "https://play.google.com/…"}
                error={storeTouched[store] && linkValidation.field === store ? tr(linkValidation.error) : undefined}
                value={storeLinks[store]}
                onChange={(event) => setStoreLinks({ ...storeLinks, [store]: event.target.value })}
                onBlur={() => setStoreTouched({ ...storeTouched, [store]: true })}
              />
            ))}
          </fieldset>
        )}
      </div>

      <Input
        id="product-link"
        name="link_url"
        type="url"
        inputMode="url"
        required={needsPrimaryLink || !showStoreFields}
        placeholder="https://"
        label={tr("Link to try it")}
        hint={!needsPrimaryLink && showStoreFields ? tr("Optional") : undefined}
        error={linkError}
        value={link}
        onChange={(e) => setLink(e.target.value)}
        onBlur={() => setLinkTouched(true)}
        autoComplete="url"
      />

      <ScreenshotPicker shots={shots} id="product-screenshots" />

      {state?.error && (
        // Server actions return English literals; the CLIENT translates them,
        // and every refusal createProductAction can return has its Thai.
        <p className="text-sm text-danger-ink" role="alert">
          {tr(state.error)}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          {editing
            ? product.hidden
              ? tr(
                  "Changes show on its page. It stays off the deck while a moderator has it hidden.",
                )
              : tr(
                  "Changes show on the deck and on its page. Nothing is posted to the community feed.",
                )
            : tr(
                "It goes on the deck and gets its own page. Nothing is posted to the community feed.",
              )}
        </p>
        {editing ? (
          // Two buttons, so on a phone they stack, Save on top and full width
          // (side by side at 263px, "บันทึกการเปลี่ยนแปลง" broke onto two
          // lines); side by side again from `sm`.
          <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <LinkButton
              href={productPath(product.id)}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {tr("Cancel")}
            </LinkButton>
            <Button
              type="submit"
              disabled={blocked}
              className="w-full whitespace-nowrap sm:w-auto"
            >
              <Check className="h-4 w-4" strokeWidth={1.5} />
              {isPending ? tr("Saving…") : tr("Save changes")}
            </Button>
          </div>
        ) : (
          <Button type="submit" disabled={blocked} className="shrink-0">
            <Send className="h-4 w-4" strokeWidth={1.5} />
            {isPending ? tr("Adding…") : tr("Add to the shelf")}
          </Button>
        )}
      </div>
    </form>
  );
}
