import { KeyboardEvent as ReactKeyboardEvent } from "react";

/*
 * Ensures that only the CMD or Ctrl key is pressed depending on the system.
 */
export function hasShortcutModifier(
  e: ReactKeyboardEvent | KeyboardEvent,
): boolean {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  if (isMac) {
    return e.metaKey && !e.ctrlKey;
  } else {
    return !e.metaKey && e.ctrlKey;
  }
}
