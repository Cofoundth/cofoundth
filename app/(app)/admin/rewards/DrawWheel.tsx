"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import type { drawMonthlyWinner } from "@/lib/admin-actions";
import { Button } from "@/components/ui";

// The monthly draw as a wheel (the founder's call, 2026-11-17).
//
// THE WHEEL IS THE SHOW, NOT THE DRAW. Pressing Spin calls `draw`
// (drawMonthlyWinner, lib/admin-actions.ts), which recomputes who qualifies,
// picks the winner with a cryptographic random index and saves it ONCE
// (monthly_draws, 0087/0088) — all on the server, before anything moves. The wheel then animates to land on the name the
// server picked, built from the pool the server actually drew from (which can
// differ from the names this page was rendered with, if a comment went away in
// between). Nothing the browser does can change who wins.
//
// No spoilers: the winner is shown only when the wheel stops, and the action
// does not revalidate this page (both pages are force-dynamic, so nothing is
// stale) — a refresh mid-spin would put the result on screen early. Once the
// wheel stops, router.refresh() brings in the stored result. The page keeps
// this component in the same place before and after, so that refresh updates
// it instead of remounting it (which would snap the wheel and drop focus).

export type WheelEntrant = { id: string; name: string };

/** The spin, and how long past it to stop waiting for the browser's
 *  transitionend (a tab in the background can hold it back). */
const SPIN_MS = 5500;

/** Up to this many people, every wedge carries a name. Past it a wedge is too
 *  thin near the hub for a name at the 12px floor on a phone (CLAUDE.md), so
 *  the wedges go plain and the name passing the pointer is read out under the
 *  wheel instead. */
const NAMES_ON_WEDGES = 12;

const R = 96; // the wheel's radius; the viewBox is 200 across
const LABEL_OUTER = 88; // a name ends here, by the rim, and runs inward…
const LABEL_INNER = 22; // …to no nearer the hub than this
const HUB = 13;

function graphemes(s: string): string[] {
  if (typeof Intl.Segmenter === "function")
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s),
      (x) => x.segment,
    );
  return [...s];
}

/** A surname's initial. Thai takes the first CONSONANT, as Thai
 *  abbreviations do (ใจดี -> จ., โรงเรียน -> รร.): a leading vowel is written
 *  first but is not the initial, and marks above or below are dropped. */
function initial(word: string): string {
  const g = graphemes(word);
  const first = g.find((x) => !/^[เ-ไ]$/.test(x)) ?? g[0];
  return /^[ก-ฮ]/.test(first) ? first[0] : first;
}

/** "Somchai Example" -> "Somchai E.", "สมชาย ใจดี" -> "สมชาย จ.", cut to
 *  `max` characters (a Thai consonant with its vowel and tone marks counts as
 *  one, and is never split). */
function wheelLabel(name: string, max: number): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  const label = parts.length > 1 ? `${parts[0]} ${initial(parts[1])}.` : parts[0];
  const g = graphemes(label);
  return g.length > max ? `${g.slice(0, max - 1).join("").trimEnd()}…` : label;
}

/** The turn that puts the middle of wedge `i` of `n` under the pointer. */
function restingAngle(i: number, n: number): number {
  return (360 - (i + 0.5) * (360 / n)) % 360;
}

/** Where a drawn month's wheel rests: on its stored winner, or at the start,
 *  naming nobody, when the winner's account has been deleted since. */
function restOn(entrants: WheelEntrant[], winnerId: string | null) {
  const i = winnerId ? entrants.findIndex((e) => e.id === winnerId) : -1;
  return {
    winner: i >= 0 ? entrants[i] : null,
    rotation: i >= 0 ? restingAngle(i, entrants.length) : 0,
  };
}

/** The wedge under the pointer once the wheel has turned `deg` clockwise. */
function wedgeAt(deg: number, n: number): number {
  const top = ((-deg % 360) + 360) % 360;
  return Math.min(n - 1, Math.floor(top / (360 / n)));
}

/** Angles run clockwise from twelve o'clock. */
function point(angle: number, r: number): string {
  const rad = (angle * Math.PI) / 180;
  return `${(r * Math.sin(rad)).toFixed(3)} ${(-r * Math.cos(rad)).toFixed(3)}`;
}

function wedgePath(i: number, n: number): string {
  const seg = 360 / n;
  return `M 0 0 L ${point(i * seg, R)} A ${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${point((i + 1) * seg, R)} Z`;
}

type Fill = "navy" | "gold" | "soft";

/** Navy and tan, alternating. With an odd count the last wedge would sit
 *  between two navy ones, so it takes the soft tan. */
function fills(n: number): Fill[] {
  const out = Array.from({ length: n }, (_, i): Fill => (i % 2 ? "gold" : "navy"));
  if (n > 1 && n % 2) out[n - 1] = "soft";
  return out;
}

// design-ok: an SVG wedge FILL is a surface (the tan wedge), not text; the name
// on it is fill-ink (≈13:1), and on navy, fill-white.
const FILL: Record<Fill, string> = { navy: "fill-navy", gold: "fill-gold", soft: "fill-gold-soft" };
const INK: Record<Fill, string> = { navy: "fill-white", gold: "fill-ink", soft: "fill-ink" };

function Wheel({
  entrants,
  rotation,
  animate,
  turningRef,
  onStop,
}: {
  entrants: WheelEntrant[];
  rotation: number;
  animate: boolean;
  turningRef: React.RefObject<HTMLDivElement | null>;
  onStop: () => void;
}) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const n = entrants.length;
  const seg = 360 / n;
  const colours = useMemo(() => fills(n), [n]);
  const named = n <= NAMES_ON_WEDGES;
  // 11 units: 12.3px on the narrowest wheel (224px, a 320px phone less the
  // page gutter and card padding), 22px at full size — at or above the 12px
  // floor everywhere. A character is budgeted at 0.6em, the semibold average
  // with capitals.
  const fontSize = 11;
  const maxChars = Math.floor((LABEL_OUTER - LABEL_INNER) / (0.6 * fontSize));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[400px]">
      {/* The pointer: fixed, at twelve o'clock, outside the turning part. */}
      <svg
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        width="28"
        height="26"
        viewBox="0 0 28 26"
        aria-hidden="true"
      >
        <polygon points="14,25 2,2 26,2" className="fill-navy stroke-white" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {/* Clipped to its circle: a turned square's corners reach √2 times as
          far, which scrolled the page sideways mid-spin on a narrow screen. */}
      <div className="h-full w-full overflow-hidden rounded-full">
        <div
          ref={turningRef}
          className="h-full w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: animate
              ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.18, 1)`
              : "none",
          }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === "transform") onStop();
          }}
        >
          <svg viewBox="-100 -100 200 200" className="h-full w-full" aria-hidden="true">
            {named && n > 1 && (
              <defs>
                {/* Each name is clipped to its own wedge: a long one is cut
                    short, never drawn across a neighbour. */}
                {entrants.map((e, i) => (
                  <clipPath key={e.id} id={`${uid}-${i}`}>
                    <path d={wedgePath(i, n)} />
                  </clipPath>
                ))}
              </defs>
            )}
            {n === 1 ? (
              <circle r={R} className={FILL[colours[0]]} />
            ) : (
              entrants.map((e, i) => (
                <path
                  key={e.id}
                  d={wedgePath(i, n)}
                  className={`${FILL[colours[i]]} stroke-navy`}
                  strokeWidth={0.75}
                  strokeLinejoin="round"
                />
              ))
            )}
            {named &&
              entrants.map((e, i) => (
                <g key={e.id} clipPath={n > 1 ? `url(#${uid}-${i})` : undefined}>
                  <text
                    transform={`rotate(${(i + 0.5) * seg - 90}) translate(${LABEL_OUTER} 0)`}
                    textAnchor="end"
                    dominantBaseline="central"
                    fontSize={fontSize}
                    className={`${INK[colours[i]]} font-semibold`}
                  >
                    {wheelLabel(e.name, maxChars)}
                  </text>
                </g>
              ))}
            <circle r={R} className="fill-none stroke-navy" strokeWidth={1.5} />
            <circle r={HUB} className="fill-white stroke-navy" strokeWidth={1.5} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function DrawWheel({
  month,
  entrants,
  result,
  draw,
  unavailable = false,
}: {
  month: string;
  /** In wheel order — sorted by id, the order the server indexes into. */
  entrants: WheelEntrant[];
  /** Set once the month is drawn. `winnerId` is null when the winner's
   *  account has been deleted since (monthly_draws.winner_id is ON DELETE SET
   *  NULL, 0087); the wheel then rests at the start and names nobody. */
  result: { winnerId: string | null; line: string } | null;
  /** The server action that draws and saves the winner: drawMonthlyWinner,
   *  passed in by the page rather than imported, so a dev preview can hand
   *  the wheel a stand-in that touches nothing. */
  draw: typeof drawMonthlyWinner;
  /** The page couldn't read this month (see the early return below). */
  unavailable?: boolean;
}) {
  const tr = useT();
  const router = useRouter();
  const questionId = useId();
  const [pool, setPool] = useState(entrants);
  const [winner, setWinner] = useState(() => restOn(entrants, result?.winnerId ?? null).winner);
  const [rotation, setRotation] = useState(
    () => restOn(entrants, result?.winnerId ?? null).rotation,
  );
  const [animate, setAnimate] = useState(false);
  const [phase, setPhase] = useState<"idle" | "confirm" | "spinning" | "done">(
    result ? "done" : "idle",
  );
  const [passing, setPassing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takenUp, setTakenUp] = useState(false);
  const [pending, start] = useTransition();

  // A refresh can bring news this wheel didn't make: the month drawn
  // meanwhile (by another admin, or by an earlier press whose answer was
  // lost — the next press hears "already drawn" and the error path below
  // refreshes), or a changed list of names, or a failed read. Taken up only
  // while nothing is turning: during and after this wheel's own spin, the
  // spin is what stays on screen.
  // (React's "adjust state when a prop changes": compared by value, during
  // render.)
  const sent = `${result ? `${result.winnerId}|${result.line}` : ""}#${entrants
    .map((e) => `${e.id}:${e.name}`)
    .join(",")}`;
  const [seen, setSeen] = useState(sent);
  if (sent !== seen) {
    setSeen(sent);
    if (phase === "idle" || phase === "confirm") {
      setPool(entrants);
      if (result) {
        const rest = restOn(entrants, result.winnerId);
        setWinner(rest.winner);
        setRotation(rest.rotation);
        setPhase("done");
        setError(null);
        setTakenUp(true);
      }
    }
  }

  const turningRef = useRef<HTMLDivElement>(null);
  const stopped = useRef(true);

  // Focus follows the swaps, as in the Report button: into the confirmation,
  // back to "Spin the wheel" on Cancel or an error, and onto the status line
  // from the moment the wheel starts until it names the winner.
  const askRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const backToAsk = useRef(false);
  const spunHere = useRef(false);
  useEffect(() => {
    if (phase === "confirm") confirmRef.current?.focus();
    else if (phase === "spinning" || (phase === "done" && (spunHere.current || takenUp)))
      statusRef.current?.focus();
    else if (phase === "idle" && backToAsk.current) {
      backToAsk.current = false;
      askRef.current?.focus();
    }
  }, [phase, takenUp]);

  // Plain wedges: read the turning wheel each frame for the name under the
  // pointer.
  const plain = pool.length > NAMES_ON_WEDGES;
  useEffect(() => {
    if (phase !== "spinning" || !plain) return;
    let frame = 0;
    const tick = () => {
      const el = turningRef.current;
      if (el) {
        const t = getComputedStyle(el).transform;
        const m = new DOMMatrixReadOnly(t === "none" ? undefined : t);
        setPassing(pool[wedgeAt((Math.atan2(m.b, m.a) * 180) / Math.PI, pool.length)].name);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, plain, pool]);

  // Once per spin, whichever comes first: the transition's end or the
  // fallback below.
  const finish = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    setAnimate(false);
    setPhase("done");
    // The stored result — after the stop, so nothing gives the winner away.
    router.refresh();
  }, [router]);

  // The fallback behind transitionend, which a tab in the background can
  // hold back. Cleared when the spin ends, or when the wheel goes away
  // mid-spin (a month link clicked), so it never refreshes another page.
  useEffect(() => {
    if (phase !== "spinning") return;
    const t = window.setTimeout(finish, SPIN_MS + 1500);
    return () => window.clearTimeout(t);
  }, [phase, finish]);

  const spin = () => {
    // Outside the transition: inside it, React holds the update until the
    // whole round trip settles, and the old error would sit under "Spin".
    setError(null);
    start(async () => {
      const res = await draw(month).catch(() => ({
        error: "Couldn’t save the draw. Try again.",
        drawn: false,
      }));
      if ("error" in res) {
        setError(res.error);
        backToAsk.current = true;
        setPhase("idle");
        // Drawn already — by another admin, or by an earlier press whose
        // answer was lost: a refresh brings the stored result, which the
        // wheel then shows instead of Spin. Only then: the server has just
        // answered, so the refresh will too (a refresh whose fetch fails
        // becomes a full page load, the browser's offline page when the
        // network is down).
        if (res.drawn) router.refresh();
        return;
      }
      // The pool the server drew from, in its order; the winner is in it.
      const n = res.entrants.length;
      const i = res.entrants.findIndex((e) => e.id === res.winnerId);
      spunHere.current = true;
      setPool(res.entrants);
      setWinner(res.entrants[i]);
      // Six full turns, then into the winner's wedge — somewhere inside it,
      // not always dead centre.
      const jitter = (Math.random() - 0.5) * (360 / n) * 0.6;
      const target =
        rotation + 360 * 6 + ((restingAngle(i, n) - (rotation % 360) + 360) % 360) + jitter;
      stopped.current = false;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setRotation(target);
        finish();
        return;
      }
      setPhase("spinning");
      setAnimate(true);
      // Next frame, so the transition is in place before the turn changes.
      requestAnimationFrame(() => setRotation(target));
    });
  };

  // The page couldn't read this month: a wheel that has just landed keeps
  // its result (it came from the save itself); anything else shows nothing,
  // and above all no Spin, since the month may be drawn already.
  if (unavailable && phase !== "spinning" && phase !== "done") return null;

  return (
    <div className="space-y-5">
      <Wheel
        entrants={pool}
        rotation={rotation}
        animate={animate}
        turningRef={turningRef}
        onStop={finish}
      />

      <div className="space-y-3 text-center">
        {phase === "spinning" && plain && (
          <p aria-hidden="true" className="text-lg font-bold tracking-normal text-ink">
            {passing ?? " "}
          </p>
        )}
        {/* One status line, mounted throughout so a screen reader hears it
            change — "Spinning…", then the winner. */}
        <p
          ref={statusRef}
          tabIndex={-1}
          role="status"
          className={
            phase === "done"
              ? "text-lg font-bold tracking-normal text-ink"
              : phase === "spinning"
                ? "text-sm text-ink-muted"
                : "sr-only"
          }
        >
          {phase === "done"
            ? tr("Winner: {name}").replace("{name}", () => winner?.name ?? "—")
            : phase === "spinning"
              ? tr("Spinning…")
              : ""}
        </p>
        {phase === "done" && result && (
          <p className="text-sm text-ink-muted">{result.line}</p>
        )}
        {phase === "confirm" && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <p id={questionId} className="w-full text-sm text-ink">
              {tr("Spin the wheel now? The result is saved and can’t be spun again.")}
            </p>
            <Button
              ref={confirmRef}
              size="sm"
              onClick={spin}
              disabled={pending}
              aria-describedby={questionId}
            >
              <Gift className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              {pending ? tr("Spinning…") : tr("Spin")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                backToAsk.current = true;
                setPhase("idle");
              }}
            >
              {tr("Cancel")}
            </Button>
          </div>
        )}
        {phase === "idle" && (
          <Button
            ref={askRef}
            size="sm"
            onClick={() => {
              setError(null);
              setPhase("confirm");
            }}
          >
            <Gift className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {tr("Spin the wheel")}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-ink">
            {tr(error)}
          </p>
        )}
      </div>
    </div>
  );
}
