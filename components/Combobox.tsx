"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type ComboboxProps = {
  /** The list of suggestions. */
  options: string[];
  /** Current committed value (controlled). */
  value: string;
  /** Called when the value is committed (select, Enter, or blur). */
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  /** When set, a hidden input is rendered so the value submits with a form. */
  name?: string;
  /** Allow values not present in `options` (free text). Defaults to true. */
  allowCustom?: boolean;
  /** Class applied to the text input. Defaults to the app's input style. */
  className?: string;
  /** Shown when the query matches no options. */
  emptyText?: string;
};

const DEFAULT_INPUT_CLS =
  "w-full border border-line bg-white px-4 py-3 text-ink focus:border-navy focus:outline-none";

export default function Combobox({
  options,
  value,
  onChange,
  placeholder,
  id,
  name,
  allowCustom = true,
  className,
  emptyText = "No matches",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  // The editable text while the menu is open. When closed, the input shows the
  // committed `value` directly, so no effect is needed to keep them in sync.
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reactId = useId();
  const listId = `${id ?? reactId}-listbox`;

  const q = query.trim().toLowerCase();
  // When the query still equals the committed value, the user is browsing
  // (just opened the menu) — show the whole list rather than self-filtering.
  const browsing = query === value;
  const filtered = useMemo(
    () =>
      browsing || !q
        ? options
        : options.filter((o) => o.toLowerCase().includes(q)),
    [options, q, browsing],
  );

  // Clamp the highlight into range at read time rather than via an effect.
  const activeIndex = filtered.length
    ? Math.min(Math.max(active, 0), filtered.length - 1)
    : -1;

  // Scroll the highlighted option into view (DOM side effect only).
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, value]);

  function openMenu() {
    setQuery(value);
    setActive(0);
    setOpen(true);
  }

  function commit(option: string) {
    onChange(option);
    setOpen(false);
  }

  // Close the menu, committing typed text when free text is allowed.
  function close() {
    if (allowCustom) onChange(query.trim());
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return openMenu();
      setActive(Math.min(activeIndex + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openMenu();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const choice =
        filtered[activeIndex] ?? (allowCustom ? query.trim() : undefined);
      if (choice != null && choice !== "") commit(choice);
      else setOpen(false);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      if (open) close();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={open ? query : value}
        placeholder={placeholder}
        // `pr-10` (appended last) reserves room for the chevron and overrides
        // any `px-*` in a caller-supplied className.
        className={`${className ?? DEFAULT_INPUT_CLS} pr-10`}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={openMenu}
        onKeyDown={onKeyDown}
      />
      <ChevronDown
        aria-hidden
        onMouseDown={(e) => {
          // Toggle without stealing focus, then refocus the input on open.
          e.preventDefault();
          if (open) setOpen(false);
          else {
            openMenu();
            inputRef.current?.focus();
          }
        }}
        className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />

      {name && <input type="hidden" name={name} value={value} />}

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-line bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-ink-muted">{emptyText}</li>
          ) : (
            filtered.map((option, i) => {
              const selected = option === value;
              const isActive = i === activeIndex;
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    // Prevent the input from blurring before the click lands.
                    e.preventDefault();
                    commit(option);
                  }}
                  className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm ${
                    isActive ? "bg-cream text-navy" : "text-ink"
                  }`}
                >
                  <span>{option}</span>
                  {selected && (
                    <Check aria-hidden className="h-4 w-4 shrink-0 text-gold" />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
