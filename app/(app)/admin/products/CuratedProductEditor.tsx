"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { ChevronDown, FileSpreadsheet, Plus } from "lucide-react";
import { Button, Card, Input, LinkButton, Textarea } from "@/components/ui";
import {
  EMPTY_CURATED_PRODUCT,
  MAX_CURATED_MAKER_NAME,
  MAX_CURATED_PRODUCTS,
  MAX_PRODUCT_WORKBOOK_BYTES,
  PRODUCT_IMPORT_COLUMNS,
  readCuratedProductRows,
  validateCuratedProduct,
  type CuratedProductColumn,
  type CuratedProductInput,
} from "@/lib/curated-products";
import { useT } from "@/lib/i18n-client";
import { CATEGORY_LABEL, MAX_PRODUCT_BLURB, MAX_PRODUCT_NAME, PRODUCT_CATEGORIES, productPath } from "@/lib/post-types";
import { publishCuratedProducts } from "./actions";

type Draft = { id: string; input: CuratedProductInput; openInitially: boolean };
type Published = { id: string; title: string };

const PLATFORM_CHOICES = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "web,mobile", label: "Web and mobile" },
] as const;

const TEXT_FIELDS = [
  { column: "name", label: "Product name", maxLength: MAX_PRODUCT_NAME },
  { column: "maker", label: "Original maker (optional)", maxLength: MAX_CURATED_MAKER_NAME },
  { column: "link", label: "Link to try the product" },
  { column: "ios", label: "iOS App Store link" },
  { column: "android", label: "Google Play link" },
] as const;

export function CuratedProductEditor() {
  const tr = useT();
  const upload = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [published, setPublished] = useState<Published[]>([]);
  const [importError, setImportError] = useState<string>();
  const [publishError, setPublishError] = useState<string>();
  const [reading, setReading] = useState(false);
  const [publishing, startPublishing] = useTransition();
  const busy = reading || publishing;
  const previews = drafts.map((draft) => ({ ...draft, error: validateCuratedProduct(draft.input).error }));
  const invalid = previews.filter((draft) => draft.error).length;
  const full = drafts.length >= MAX_CURATED_PRODUCTS;

  function updateDraft(id: string, column: CuratedProductColumn, value: string) {
    setDrafts((current) => current.map((draft) =>
      draft.id === id ? { ...draft, input: { ...draft.input, [column]: value } } : draft,
    ));
  }

  function addDraft() {
    setDrafts((current) => [
      ...current,
      { id: crypto.randomUUID(), input: { ...EMPTY_CURATED_PRODUCT }, openInitially: true },
    ]);
  }

  async function importWorkbook(file: File) {
    setImportError(undefined);
    if (!/\.xlsx$/i.test(file.name) || file.size > MAX_PRODUCT_WORKBOOK_BYTES) {
      setImportError("Choose an Excel .xlsx file up to 2 MB.");
      return;
    }
    setReading(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const result = readCuratedProductRows(await readSheet(file));
      if (!result.rows) {
        setImportError(result.error);
      } else if (drafts.length + result.rows.length > MAX_CURATED_PRODUCTS) {
        setImportError("Review up to 50 products at a time.");
      } else {
        setDrafts((current) => [
          ...current,
          ...result.rows.map((input, index) => ({
            id: crypto.randomUUID(),
            input,
            openInitially: index === 0,
          })),
        ]);
      }
    } catch {
      setImportError("Couldn't read this workbook. Check the .xlsx file and try again.");
    } finally {
      setReading(false);
    }
  }

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || invalid || !drafts.length) return;
    setPublishError(undefined);
    startPublishing(async () => {
      try {
        const result = await publishCuratedProducts(drafts.map(({ id, input }) => ({ id, input })));
        if (!result.published) {
          setPublishError(result.error);
          return;
        }
        setPublished(result.published);
        setDrafts([]);
      } catch {
        setPublishError("Publication could not be confirmed. Retry the same preview.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card padding="responsive" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy || full} onClick={addDraft}>
            <Plus className="size-4" aria-hidden="true" />
            {tr("Add a product")}
          </Button>
          <Button type="button" variant="secondary" disabled={busy || full} onClick={() => upload.current?.click()}>
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            {tr("Import from Excel")}
          </Button>
          <input
            ref={upload}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void importWorkbook(file);
            }}
          />
        </div>
        <details className="text-sm text-ink-muted">
          <summary className="w-fit cursor-pointer py-2 font-medium text-ink">{tr("Excel format")}</summary>
          <div className="space-y-2">
            <p>{tr("Use the first worksheet, one product per row. Start with these column names.")}</p>
            <p className="wrap-anywhere rounded-xl bg-cream p-3 font-mono text-xs text-ink">
              {PRODUCT_IMPORT_COLUMNS.join(", ")}
            </p>
            <p>{tr("Fill in name, description, category, platforms, and a link people can use. For mobile-only apps, an app store link is enough.")}</p>
            <p>{tr("Categories")}{": "}{PRODUCT_CATEGORIES.join(", ")}.</p>
            <p>{tr("Use web, mobile, or web,mobile for platforms. Separate screenshot URLs with |.")}</p>
            <p>{tr("Choose an Excel .xlsx file up to 2 MB.")}</p>
          </div>
        </details>
        {reading && <p role="status" className="text-sm text-ink-muted">{tr("Reading Excel file…")}</p>}
        {full && <p role="status" className="text-sm text-ink-muted">{tr("Review up to 50 products at a time.")}</p>}
        {importError && <p role="alert" className="text-sm text-danger-ink">{tr(importError)}</p>}
      </Card>

      {published.length > 0 && (
        <Card padding="responsive">
          <h2 role="status" className="mb-3 text-xl">
            {tr("Published {n} products").replace("{n}", String(published.length))}
          </h2>
          <ul className="space-y-2 text-sm">
            {published.map(({ id, title }) => (
              <li key={id}>
                <LinkButton href={productPath(id)} variant="ghost" size="sm" className="wrap-anywhere text-left">
                  {title}
                </LinkButton>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {previews.length > 0 && (
        <form onSubmit={publish} noValidate>
          <h2 className="mb-2 text-xl">{tr("Review before publishing")}</h2>
          <p className="mb-4 text-sm text-ink-muted">
            {tr("Open a row to edit it. Confirm when the list is ready to go live.")}
          </p>
          <fieldset disabled={busy} className="min-w-0 space-y-3">
            {previews.map((draft, index) => (
              <DraftRow
                key={draft.id}
                draft={draft}
                index={index}
                onChange={(column, value) => updateDraft(draft.id, column, value)}
                onRemove={() => setDrafts((current) => current.filter((row) => row.id !== draft.id))}
              />
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <p aria-live="polite" className="text-sm text-ink-muted">
                {invalid
                  ? tr("Fix {n} rows before publishing.").replace("{n}", String(invalid))
                  : tr("{n} ready to publish").replace("{n}", String(drafts.length))}
              </p>
              <Button type="submit" disabled={invalid > 0}>
                {publishing ? tr("Publishing…") : tr("Confirm and publish")}
              </Button>
            </div>
            {publishError && <p role="alert" className="text-sm text-danger-ink">{tr(publishError)}</p>}
          </fieldset>
        </form>
      )}
    </div>
  );
}

function DraftRow({
  draft,
  index,
  onChange,
  onRemove,
}: {
  draft: Draft & { error?: string };
  index: number;
  onChange: (column: CuratedProductColumn, value: string) => void;
  onRemove: () => void;
}) {
  const tr = useT();
  const { input } = draft;
  const categoryKnown = PRODUCT_CATEGORIES.some((category) => category === input.category);
  const platformKnown = PLATFORM_CHOICES.some(({ value }) => value === input.platforms);
  const selectClass = "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink";
  return (
    <Card padding="none">
      <details open={draft.openInitially} className="group">
        <summary className="flex min-w-0 cursor-pointer items-start gap-3 rounded-3xl px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="wrap-anywhere font-medium text-ink">
              {input.name.trim() || tr("Product {n}").replace("{n}", String(index + 1))}
            </p>
            {draft.error ? (
              <p className="mt-1 text-sm text-danger-ink">{tr(draft.error)}</p>
            ) : input.description && (
              <p className="mt-1 line-clamp-2 wrap-anywhere text-sm text-ink-muted">{input.description}</p>
            )}
          </div>
          <ChevronDown className="mt-1 size-4 shrink-0 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-4 border-t border-line p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.slice(0, 2).map((field) => (
              <Input
                key={field.column}
                id={`${draft.id}-${field.column}`}
                label={tr(field.label)}
                value={input[field.column]}
                maxLength={"maxLength" in field ? field.maxLength : undefined}
                onChange={(event) => onChange(field.column, event.target.value)}
              />
            ))}
          </div>
          <Textarea
            id={`${draft.id}-description`}
            label={tr("Description")}
            hint={`${input.description.length}/${MAX_PRODUCT_BLURB}`}
            maxLength={MAX_PRODUCT_BLURB}
            rows={3}
            value={input.description}
            onChange={(event) => onChange("description", event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-xs text-ink-muted">
              <span className="block">{tr("Category")}</span>
              <select className={selectClass} value={input.category} onChange={(event) => onChange("category", event.target.value)}>
                {!categoryKnown && <option value={input.category}>{input.category || tr("Select…")}</option>}
                {PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{tr(CATEGORY_LABEL[category])}</option>)}
              </select>
            </label>
            <label className="block space-y-2 text-xs text-ink-muted">
              <span className="block">{tr("Runs on")}</span>
              <select className={selectClass} value={input.platforms} onChange={(event) => onChange("platforms", event.target.value)}>
                {!platformKnown && <option value={input.platforms}>{input.platforms || tr("Select…")}</option>}
                {PLATFORM_CHOICES.map(({ value, label }) => <option key={value} value={value}>{tr(label)}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.slice(2).map((field) => (
              <Input
                key={field.column}
                id={`${draft.id}-${field.column}`}
                label={tr(field.label)}
                type="url"
                placeholder="https://…"
                containerClassName={field.column === "link" ? "sm:col-span-2" : undefined}
                value={input[field.column]}
                onChange={(event) => onChange(field.column, event.target.value)}
              />
            ))}
          </div>
          <Textarea
            id={`${draft.id}-screenshots`}
            label={tr("Screenshot links (optional)")}
            placeholder={tr("One HTTPS link per line")}
            rows={2}
            value={input.screenshots}
            onChange={(event) => onChange("screenshots", event.target.value)}
          />
          <Button type="button" variant="secondary" size="sm" onClick={onRemove}>
            {tr("Remove row")}
          </Button>
        </div>
      </details>
    </Card>
  );
}
