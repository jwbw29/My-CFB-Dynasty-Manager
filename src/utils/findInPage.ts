/**
 * In-page "Cmd+F" match/highlight engine, built entirely on the browser's
 * CSS Custom Highlight API (`CSS.highlights`, `Highlight`, `Range`).
 *
 * WHY THE CSS CUSTOM HIGHLIGHT API (and not DOM text-node splitting):
 * The original design for this feature wrapped each match in a `<span>` by
 * splitting text nodes during traversal. Plan gap-analysis
 * (.omo/plans/cmdf-page-search.md, Todo 1 "Why this approach") flagged two
 * fatal problems with that: (1) mutating nodes mid-`TreeWalker` traversal
 * silently skips/miscounts matches, and (2) inserting DOM nodes into a
 * React-owned subtree (e.g. Roster's sortable `<TableRow>` tree, which
 * re-renders on every sort/filter) can throw an uncaught
 * `insertBefore`/`removeChild` reconciliation error the moment React
 * reconciles against DOM it didn't create - and this app has no top-level
 * error boundary to catch that, so it would white-screen the whole app.
 * The CSS Custom Highlight API sidesteps both risks completely: it paints
 * highlights by registering `Range` objects (which merely *point at*
 * existing text) in a global `CSS.highlights` registry. Zero nodes are
 * ever inserted or removed, so React is free to re-render highlighted
 * subtrees at any time - the highlights are just recomputed on the next
 * call, never crashed on.
 *
 * All exported functions here are pure DOM reads/registry writes; none of
 * them touch `innerHTML`, `appendChild`, `removeChild`, or any other
 * node-mutating API. See `collectMatchRanges` for the two-pass,
 * mutation-free traversal that makes this possible.
 */

/**
 * CSS selector matching elements whose *text content* must never be
 * collected as a match, per the plan's Scope "Must NOT have": form control
 * values (`input`/`textarea`), non-visible/non-prose nodes (`script`/
 * `style`), user-editable regions (`[contenteditable]`), and an explicit
 * opt-out escape hatch (`[data-find-ignore]`) for any future component that
 * wants to suppress find-in-page matching without code changes here.
 */
const FIND_IGNORE_SELECTOR =
  "input, textarea, script, style, [contenteditable], [data-find-ignore]";

/**
 * Feature-detects the CSS Custom Highlight API in the current runtime.
 *
 * WHY a runtime check instead of just calling the API directly: the plan's
 * Scope requires "graceful degradation" - this app also runs inside an
 * Electron-bundled Chromium (which has long supported this API) as well as
 * `npm run dev`'s plain browser target, but feature-detecting rather than
 * assuming support keeps every other function in this module safe to call
 * unconditionally even if a future runtime target lacks the API: callers
 * fall back to count-only behavior (see `applyFindHighlights`) instead of
 * throwing.
 */
export function isFindHighlightSupported(): boolean {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
  );
}

/**
 * Walks `root` and returns one `Range` per case-insensitive substring match
 * of `query`, in document order. Returns `[]` for an empty/whitespace-only
 * query (matches the plan's "no results for an empty search" behavior).
 *
 * MUTATION SAFETY (why this is two passes, not one): a single-pass
 * walk-and-build approach is tempting, but `document.createTreeWalker`'s
 * traversal is defined over the *live* DOM - if anything in this function
 * ever mutated the tree while the walker was mid-traversal (it currently
 * doesn't, but a future edit easily could), the walker's internal cursor
 * would silently skip or re-visit nodes. Separating "collect all
 * qualifying text nodes" (pass 1) from "build Ranges from that array"
 * (pass 2) means pass 2 operates on a plain, already-finalized JS array,
 * not a live tree walker - making it structurally impossible for this
 * function to ever reintroduce that class of bug, even under future
 * modification.
 */
export function collectMatchRanges(root: HTMLElement, query: string): Range[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery === "") {
    return [];
  }

  // --- Pass 1: collect every qualifying text node into a plain array ---
  // NodeFilter.SHOW_TEXT restricts the walker to text nodes; acceptNode
  // additionally rejects any text node whose nearest ancestor (or itself,
  // via `closest`) matches FIND_IGNORE_SELECTOR, so form values, scripts,
  // stylesheets, editable regions, and opt-out nodes never get matched.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const excluded = node.parentElement?.closest(FIND_IGNORE_SELECTOR);
      return excluded ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    // SHOW_TEXT guarantees `current` is a Text node; cast is safe here.
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  // --- Pass 2: build Ranges from the finalized array (no further traversal) ---
  const ranges: Range[] = [];
  const lowerQuery = trimmedQuery.toLowerCase();
  for (const node of textNodes) {
    const text = node.textContent ?? "";
    const lowerText = text.toLowerCase();
    let searchFrom = 0;
    // Loop to catch multiple non-overlapping occurrences within one text node
    // (e.g. searching "ss" inside "Mississippi" should yield 2 matches, not 1).
    let matchIndex = lowerText.indexOf(lowerQuery, searchFrom);
    while (matchIndex !== -1) {
      const range = document.createRange();
      range.setStart(node, matchIndex);
      range.setEnd(node, matchIndex + lowerQuery.length);
      ranges.push(range);
      searchFrom = matchIndex + lowerQuery.length;
      matchIndex = lowerText.indexOf(lowerQuery, searchFrom);
    }
  }

  return ranges;
}

/**
 * Computes matches for `query` within `root` and paints them via the CSS
 * Custom Highlight API, marking the match at `activeIndex` with a distinct
 * "active" highlight. Returns the total match count either way.
 *
 * WHY the `!isFindHighlightSupported()` early return exists: per the
 * plan's Scope "Graceful degradation" requirement, a runtime without the
 * Custom Highlight API must still be able to open the find bar, see an
 * accurate "X of Y" count, and navigate/scroll between matches - it just
 * can't visually paint them. Returning the count without touching
 * `CSS.highlights` (which may not exist at all) keeps this function safe
 * to call unconditionally from the (Todo 2) hook regardless of runtime.
 */
export function applyFindHighlights(
  root: HTMLElement,
  query: string,
  activeIndex: number
): number {
  const ranges = collectMatchRanges(root, query);

  if (!isFindHighlightSupported()) {
    return ranges.length;
  }

  // Register every match under the 'find-match' highlight name; the CSS in
  // globals.css paints anything registered under this name.
  const allMatches = new Highlight(...ranges);
  CSS.highlights.set("find-match", allMatches);

  // The active match additionally gets a second, distinctly-colored
  // highlight ('find-active') layered on top so the user can see which of
  // the N matches is currently focused/scrolled-to.
  const hasActiveMatch = ranges.length > 0 && activeIndex >= 0 && activeIndex < ranges.length;
  if (hasActiveMatch) {
    const activeMatch = new Highlight(ranges[activeIndex]);
    CSS.highlights.set("find-active", activeMatch);
  } else {
    CSS.highlights.delete("find-active");
  }

  return ranges.length;
}

/**
 * Clears both highlight registrations ('find-match' and 'find-active').
 * Safe to call at any time - on an unsupported runtime (no `CSS.highlights`
 * registry to delete from) this is a no-op; on a supported runtime where
 * nothing was ever registered, `Map`-like `.delete()` on a missing key is
 * also a no-op. Called on Escape, on route change, and whenever the query
 * is cleared (see the Todo 2 hook).
 */
export function clearFindHighlights(): void {
  if (!isFindHighlightSupported()) {
    // Nothing to clear: `CSS.highlights` may not exist at all on this
    // runtime, so guard instead of letting `CSS.highlights.delete(...)`
    // throw a TypeError on `undefined`.
    return;
  }
  CSS.highlights.delete("find-match");
  CSS.highlights.delete("find-active");
}

/**
 * Resolves the DOM element containing the active match, so callers (the
 * Todo 2 hook) can call `.scrollIntoView(...)` on it. `Range` objects have
 * no `scrollIntoView` method of their own, so this returns the match's
 * containing element instead - re-running `collectMatchRanges` rather than
 * caching results, since the match set can shift between calls (e.g. a
 * sorted table re-rendering) and this keeps the function stateless and
 * always correct for the current DOM.
 *
 * Returns `null` when `query` has no matches or `activeIndex` is out of
 * range, so callers can safely guard before calling `.scrollIntoView`.
 */
export function getActiveMatchElement(
  root: HTMLElement,
  query: string,
  activeIndex: number
): HTMLElement | null {
  const ranges = collectMatchRanges(root, query);
  const activeRange = ranges[activeIndex];
  if (!activeRange) {
    return null;
  }
  // startContainer is always the Text node the match was found in (see
  // collectMatchRanges); its parentElement is the nearest real element,
  // which is what scrollIntoView needs to operate on.
  return activeRange.startContainer.parentElement;
}
