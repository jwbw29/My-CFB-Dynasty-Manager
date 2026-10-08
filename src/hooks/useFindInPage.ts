// src/hooks/useFindInPage.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  applyFindHighlights,
  clearFindHighlights,
  getActiveMatchElement,
} from "@/utils/findInPage";

/**
 * CSS selector covering BOTH Radix dialog primitives used in this app:
 * `[role="dialog"]` for the plain `Dialog` (e.g. Add/Edit Player forms) and
 * `[role="alertdialog"]` for `AlertDialog` (e.g. Roster's "Reset Roster to
 * Default?" and Navigation's "Return to Main Menu?" confirmations).
 *
 * WHY both are required (not just `[role="dialog"]`): the original plan
 * draft only guarded against the plain `Dialog` primitive. Plan gap-analysis
 * (.omo/plans/cmdf-page-search.md, Todo 2 "What to do") caught that 10 files
 * in this repo import `@/components/ui/alert-dialog` - a visually/semantically
 * distinct Radix primitive that renders `role="alertdialog"`, not
 * `role="dialog"`. Without this second selector, pressing Cmd+F while an
 * `AlertDialog` confirmation (e.g. "Reset Roster to Default?") is open would
 * have opened the find bar on top of it, stacking an unrelated overlay over
 * a destructive-action confirmation - exactly what the Scope's "never stacks
 * on top of modals" requirement forbids.
 */
const ANY_DIALOG_OPEN_SELECTOR = '[role="dialog"], [role="alertdialog"]';

/**
 * Return shape of {@link useFindInPage}, exposed for the (Todo 3) `FindBar`
 * UI component to consume.
 */
interface UseFindInPageResult {
  isOpen: boolean;
  query: string;
  setQuery: (query: string) => void;
  matchCount: number;
  activeIndex: number;
  next: () => void;
  prev: () => void;
  close: () => void;
}

/**
 * Drives the app's in-page "Cmd+F" find feature: global keyboard capture,
 * match-count/active-index state, and highlight application, scoped to a
 * single container element (`scopeSelector`).
 *
 * This hook owns ALL behavior but renders no UI itself - the Todo 3
 * `FindBar` component is the visual layer that calls this hook and renders
 * its state. Keeping the keyboard-capture/highlight logic here (rather than
 * in the component) means the global `keydown` listener exists exactly once
 * per mount, independent of whether/how the UI re-renders.
 *
 * @param scopeSelector - CSS selector for the element whose text is
 *   searched. Defaults to `#main-content`, the id the Todo 4 `DynastyWrapper`
 *   edit adds specifically for this hook to target (not the bare `main` tag
 *   selector, since a future nested `<main>` would otherwise be ambiguous).
 */
export function useFindInPage(
  scopeSelector: string = "#main-content"
): UseFindInPageResult {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const pathname = usePathname();

  /**
   * Closes the find bar and fully resets its state: clears the registered
   * CSS highlights (so nothing stays painted on the page behind the closed
   * bar), empties the query, and resets the active match pointer. Called by
   * the Escape handler, by the close button (via the returned value), and
   * on route navigation.
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
    clearFindHighlights();
  }, []);

  /**
   * Advances to the next match with wrap-around. Guards `matchCount === 0`
   * BEFORE computing anything - per the plan's Metis gap #8, `x % 0`
   * evaluates to `NaN` in JS, which would otherwise flow into
   * `getActiveMatchElement`'s `activeIndex` lookup and call
   * `.scrollIntoView()` on `null`. The guard skips the modulo arithmetic
   * entirely rather than merely skipping the scroll, so `activeIndex` never
   * becomes `NaN` in state.
   */
  const next = useCallback(() => {
    if (matchCount === 0) {
      return;
    }
    setActiveIndex((prevIndex) => (prevIndex + 1) % matchCount);
  }, [matchCount]);

  /** Mirrors {@link next} for the reverse direction; same zero-match guard. */
  const prev = useCallback(() => {
    if (matchCount === 0) {
      return;
    }
    setActiveIndex((prevIndex) => (prevIndex - 1 + matchCount) % matchCount);
  }, [matchCount]);

  // --- Global Cmd+F / Ctrl+F capture (mount-only listener) ---
  // Attached once for the hook's lifetime; the dialog-guard check below is
  // re-evaluated on EVERY keypress (not cached at mount/effect-setup time)
  // because dialogs open and close dynamically throughout a session - a
  // mount-time snapshot of "is a dialog open" would go stale the first time
  // the user opened any modal after this effect ran.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isFindShortcut =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f";
      if (!isFindShortcut) {
        return;
      }
      // Re-queried on every keypress - see rationale above the effect.
      const isAnyDialogOpen =
        document.querySelector(ANY_DIALOG_OPEN_SELECTOR) !== null;
      if (isAnyDialogOpen) {
        return;
      }
      // Prevent the OS/browser's native find-in-page from firing alongside
      // this app's own find bar.
      e.preventDefault();
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Escape-to-close (only wired while open) ---
  // Scoped to `isOpen` so this listener has zero footprint on any other
  // page/state while the find bar is closed - it attaches the moment
  // `isOpen` flips true and detaches the moment it flips false or on
  // unmount, per the plan's "zero side effects while closed" requirement.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, close]);

  // --- Highlight application + active-match scroll ---
  // Re-runs whenever the query text, open state, or active match pointer
  // changes. Relies on Todo 1's `scroll-padding-top` CSS rule to keep the
  // scrolled-to match clear of the app's fixed headers, so no manual scroll
  // offset math is needed here.
  useEffect(() => {
    if (!isOpen || query.trim() === "") {
      clearFindHighlights();
      setMatchCount(0);
      return;
    }

    const scopeElement = document.querySelector<HTMLElement>(scopeSelector);
    if (!scopeElement) {
      // Scope container not mounted yet (e.g. hook rendered before Todo 4's
      // `#main-content` wrapper exists in the tree) - nothing to search.
      setMatchCount(0);
      return;
    }

    const count = applyFindHighlights(scopeElement, query, activeIndex);
    setMatchCount(count);

    if (count > 0) {
      const activeElement = getActiveMatchElement(
        scopeElement,
        query,
        activeIndex
      );
      activeElement?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [query, isOpen, activeIndex, scopeSelector]);

  // --- Route-change auto-close ---
  // Navigating to a different page should always clear/close the bar - a
  // query or active highlight carried over from the previous route would be
  // meaningless (and `collectMatchRanges` would be searching stale text
  // anyway once the new page's content replaces it).
  useEffect(() => {
    close();
    // Intentionally re-runs only on pathname change; `close` is a stable
    // useCallback, so omitting it from the deps array is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return {
    isOpen,
    query,
    setQuery,
    matchCount,
    activeIndex,
    next,
    prev,
    close,
  };
}
