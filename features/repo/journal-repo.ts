/* Repository adapter that exposes the journal storage API through a single module.
   This file is a thin facade over `lib/journal-storage.ts` to create a clean
   dependency boundary for future migration (use-cases, DI, caching, etc.).
   It intentionally preserves the same function and type names to avoid
   behavioural changes when switching imports.
*/

export * from "../../lib/journal-storage";

// Future: add higher-level use-cases here that compose storage operations.

export default {} as unknown;
