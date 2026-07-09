// ⌘K palette open/closed — tiny module store, same useSyncExternalStore
// pattern as progress.ts, so the TopBar button, the global hotkey listener
// and the overlay itself share one flag without prop drilling or context.
// Session-only UI state: never persisted (no localStorage — CLAUDE.md §2).
import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = (): boolean => open;

/** Reactive read — SearchOverlay renders null while this is false. */
export function useSearchOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function openSearchPalette(): void {
  if (!open) {
    open = true;
    emit();
  }
}

export function closeSearchPalette(): void {
  if (open) {
    open = false;
    emit();
  }
}

export function toggleSearchPalette(): void {
  open = !open;
  emit();
}
