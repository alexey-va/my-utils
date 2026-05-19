import { useEffect } from "react";

type Options = {
  onLogSession: () => void;
  onCloseForm: () => void;
  onFocusSearch: () => void;
  enabled?: boolean;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useWorkoutShortcuts({
  onLogSession,
  onCloseForm,
  onFocusSearch,
  enabled = true,
}: Options): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      switch (event.key) {
        case "n":
        case "N":
          event.preventDefault();
          onLogSession();
          break;
        case "Escape":
          onCloseForm();
          break;
        case "/":
          event.preventDefault();
          onFocusSearch();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onLogSession, onCloseForm, onFocusSearch]);
}
