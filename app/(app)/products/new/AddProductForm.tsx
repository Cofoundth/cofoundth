"use client";

// The Add product form. Everything it writes goes through ONE server action,
// createProductAction (lib/post-actions.ts), which re-checks every rule below;
// what this file adds is that the maker hears about a problem BEFORE the
// round trip, next to the field it is about.
//
// The fields are the product record as the deck reads it: a name (the card
// link's accessible name and the title on its page), a description (the card's
// main text), one category, where it runs (one or more platforms), the link
// the card opens, and optional screenshots (the first is the cover). Saved as
// the same forum_posts row a Show & tell always was — kind 'show_and_tell',
// the category as its one tag, the platforms in their own column (0080).

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import {
  createProductAction,
  type PostFormState,
} from "@/lib/post-actions";
import {
  CATEGORY_LABEL,
  MAX_PRODUCT_BLURB,
  MAX_PRODUCT_NAME,
  PLATFORM_LABEL,
  PRODUCT_CATEGORIES,
  PRODUCT_PLATFORMS,
  type ProductCategory,
  type ProductPlatform,
} from "@/lib/post-types";
import { webUrl } from "@/lib/web-url";
import { useT } from "@/lib/i18n-client";
import { ScreenshotPicker, useScreenshots } from "@/components/ScreenshotPicker";
import { Button, Input, Textarea, ToggleChip } from "@/components/ui";

const INITIAL: PostFormState = null;

/** The same two tests createProductAction runs, so the field can say so first. */
function linkProblem(raw: string): boolean {
  const value = raw.trim();
  return value.length > 0 && (!/^https?:\/\/.+/.test(value) || !webUrl(value));
}

export function AddProductForm() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    PostFormState,
    FormData
  >(createProductAction, INITIAL);

  // CONTROLLED, all of them. Two reasons, both about not losing what the maker
  // typed: the counters and the link check need the live value, and a form
  // `action` resets its UNCONTROLLED fields when the action settles — which
  // here is only ever a refusal (success redirects), so an uncontrolled field
  // would be wiped exactly when the maker has to fix one of them.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  // Shown once the maker has left the field, not on the first keystroke of
  // "https://".
  const [linkTouched, setLinkTouched] = useState(false);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  // "Runs on" (0080): several at once, kept in PRODUCT_PLATFORMS order.
  const [platforms, setPlatforms] = useState<ProductPlatform[]>([]);
  const shots = useScreenshots();

  function togglePlatform(p: ProductPlatform) {
    setPlatforms((prev) =>
      PRODUCT_PLATFORMS.filter((x) =>
        x === p ? !prev.includes(p) : prev.includes(x),
      ),
    );
  }

  const badLink = linkProblem(link);
  const linkError =
    badLink && linkTouched
      ? tr("Link must start with http:// or https://")
      : undefined;

  // The form's own action. createProductAction reads the screenshots with
  // getAll("images"), so they go in as repeated entries, in the strip's order:
  // the first is the cover. The picker's own <input> has no name, so nothing
  // else under that name is in the FormData to begin with.
  function submit(formData: FormData) {
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
    !category ||
    platforms.length === 0 ||
    !name.trim() ||
    !description.trim() ||
    !link.trim() ||
    badLink;

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

      {/* WHERE IT RUNS (0080, the owner's call 2026-11-12). Chips like the
          category, but several may be on: plenty of products are a website AND
          an app. Required for the same reason the category is gated on the
          button (a hidden input cannot be `required`): a phone-only answer is
          what lets the deck give a computer a code to scan instead of a store
          page. Slugs ship as repeated `platforms` entries. */}
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
          {PRODUCT_PLATFORMS.map((p) => (
            <ToggleChip
              key={p}
              selected={platforms.includes(p)}
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
      </div>

      <Input
        id="product-link"
        name="link_url"
        type="url"
        inputMode="url"
        required
        placeholder="https://"
        label={tr("Link to try it")}
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
          {tr(
            "It goes on the deck and gets its own page. Nothing is posted to the community feed.",
          )}
        </p>
        <Button type="submit" disabled={blocked} className="shrink-0">
          <Send className="h-4 w-4" strokeWidth={1.5} />
          {isPending ? tr("Adding…") : tr("Add to the shelf")}
        </Button>
      </div>
    </form>
  );
}
