import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { useConfirm } from "@lydias-essence/ui";

/**
 * Warns before the person loses unsaved edits: in-app navigation shows our dialog,
 * closing/reloading the tab shows the browser's own prompt.
 * Call `bypass()` right before a deliberate navigation (e.g. after a successful save).
 */
export function useUnsavedGuard(dirty: boolean): { bypass: () => void } {
  const confirm = useConfirm();
  const skip = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !skip.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    void confirm({
      title: "Leave without saving?",
      message: "You have changes that haven’t been saved. If you leave now, they’ll be lost.",
      confirmLabel: "Leave page",
      cancelLabel: "Keep editing",
      tone: "danger"
    }).then((leave) => (leave ? blocker.proceed() : blocker.reset()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  const bypass = useCallback(() => {
    skip.current = true;
    window.setTimeout(() => (skip.current = false), 1000);
  }, []);
  return { bypass };
}
