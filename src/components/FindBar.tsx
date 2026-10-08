// src/components/FindBar.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFindInPage } from "@/hooks/useFindInPage";

/**
 * Self-contained in-page "Cmd+F" find overlay. Renders nothing until the
 * `useFindInPage` hook (Todo 2) reports `isOpen`, and owns no state of its
 * own beyond the autofocus ref below - all find behavior (keyboard capture,
 * match counting, highlight application, navigation) lives in the hook so
 * this component is purely presentational and takes zero props (per the
 * plan's Todo 3: `DynastyWrapper` mounts it as `<FindBar />`).
 */
const FindBar: React.FC = () => {
  const { isOpen, query, setQuery, matchCount, activeIndex, next, prev, close } =
    useFindInPage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus the query input the moment the bar opens, so the user can
  // start typing immediately after Cmd+F without an extra click. Re-runs
  // only on `isOpen` transitions (not on every keystroke) since that's the
  // only time focus needs to be (re)claimed.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  /**
   * Wires Enter/Shift+Enter navigation directly on the find input itself
   * rather than via a second global `keydown` listener (which the hook
   * deliberately does NOT register - it only owns the Cmd+F-open and
   * Escape-close listeners). Scoping this to the input's own `onKeyDown`
   * means Enter only steps through matches while focus is actually in the
   * find bar - a global listener would also fire while focus is elsewhere
   * on the page (e.g. a table's own Enter-to-edit handler), which is not
   * what a per-input keybinding should do. `preventDefault()` on both
   * branches stops the keypress from also submitting/bubbling into any
   * ancestor form on the page.
   */
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") {
      return;
    }
    e.preventDefault();
    if (e.shiftKey) {
      prev();
    } else {
      next();
    }
  };

  // Match-count label only makes sense once the user has typed something -
  // an empty query has no "0 of 0" / "No results" state worth showing.
  const showMatchLabel = query.length > 0;
  const matchLabel =
    matchCount === 0 ? "No results" : `${activeIndex + 1} of ${matchCount}`;

  return (
    /* FindBar overlay container — fixed below Navigation's z-50 bar, mirrors
       Navigation.tsx:92's light/dark backdrop-blur overlay convention */
    <div className="fixed top-16 right-4 z-[60] flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg rounded-md px-3 py-2">
      {/* Query input — bound to hook state, autofocused on open, Enter/Shift+Enter wired here */}
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder="Find on page..."
        className="h-8 w-40 sm:w-56"
        aria-label="Find on page"
      />

      {/* Match-count label — "No results" or "X of Y", hidden until a query exists */}
      {showMatchLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {matchLabel}
        </span>
      )}

      {/* Prev/next match navigation — disabled (not just keyboard-inert) when there's nothing to navigate to, per Metis gap #8 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={prev}
        disabled={matchCount === 0}
        aria-label="Previous match"
        title="Previous match (Shift+Enter)"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={next}
        disabled={matchCount === 0}
        aria-label="Next match"
        title="Next match (Enter)"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      {/* Close button — the hook's own Escape listener handles the keyboard path; this is the only place we wire close() directly */}
      <Button
        variant="ghost"
        size="icon"
        onClick={close}
        aria-label="Close find bar"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default FindBar;
