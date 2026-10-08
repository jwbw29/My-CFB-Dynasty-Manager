/**
 * Ambient type augmentation for the CSS Custom Highlight API's
 * `HighlightRegistry` (the `CSS.highlights` map).
 *
 * WHY THIS FILE EXISTS: this repo's pinned TypeScript version (5.8.3)
 * ships a `lib.dom.d.ts` that already declares the `Highlight` class and a
 * `HighlightRegistry` interface for `CSS.highlights` - but that bundled
 * `HighlightRegistry` only types the `forEach` method, even though the
 * actual browser implementation (and the W3C CSS Custom Highlight API spec)
 * exposes a full `Map<string, Highlight>`-like surface: `set`, `get`,
 * `has`, `delete`, `clear`, `size`, and iteration. Without this
 * augmentation, `CSS.highlights.set('find-match', highlight)` and
 * `CSS.highlights.delete('find-match')` - both required by
 * `src/utils/findInPage.ts` - fail to type-check.
 *
 * The cmdf-page-search work plan (.omo/plans/cmdf-page-search.md, Todo 1
 * "Must NOT do") explicitly forbids reaching for `as any`/`@ts-ignore`/
 * `@ts-expect-error` to paper over this gap. Declaration merging is the
 * correct fix: this interface merges with (does not replace) the one
 * already declared in lib.dom.d.ts, adding only the members that are
 * missing. If a future TypeScript upgrade ships a complete
 * `HighlightRegistry` type, this file becomes a harmless no-op duplicate
 * (TS allows re-declaring identical members across merged interfaces) and
 * can be deleted.
 *
 * Reference: https://developer.mozilla.org/docs/Web/API/HighlightRegistry
 */
declare global {
  interface HighlightRegistry {
    /** Number of highlights currently registered. */
    readonly size: number;
    /** Registers (or replaces) a highlight under `key`; returns the registry for chaining, matching native Map semantics. */
    set(key: string, value: Highlight): this;
    /** Looks up a previously registered highlight, or `undefined` if none exists under `key`. */
    get(key: string): Highlight | undefined;
    /** Whether a highlight is currently registered under `key`. */
    has(key: string): boolean;
    /** Removes the highlight registered under `key`; returns whether one existed. A no-op (returns `false`) if `key` was never set. */
    delete(key: string): boolean;
    /** Removes every registered highlight. */
    clear(): void;
    entries(): IterableIterator<[string, Highlight]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<Highlight>;
    [Symbol.iterator](): IterableIterator<[string, Highlight]>;
  }
}

// Required so this file is treated as a module (enabling `declare global`)
// rather than a global script, per standard TS ambient-augmentation pattern.
export {};
