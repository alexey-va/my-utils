import { useCallback } from "react";
import { useLogout, useTranslate, useWarnAboutChange } from "@refinedev/core";

/** Logout with Refine unsaved-changes guard when enabled. */
export function useConfirmLogout() {
  const { warnWhen, setWarnWhen } = useWarnAboutChange();
  const translate = useTranslate();
  const { mutate: logout } = useLogout();

  return useCallback(() => {
    if (!warnWhen) {
      logout();
      return;
    }

    const confirm = window.confirm(
      translate(
        "warnWhenUnsavedChanges",
        "Are you sure you want to leave? You have unsaved changes.",
      ),
    );

    if (confirm) {
      setWarnWhen(false);
      logout();
    }
  }, [warnWhen, translate, setWarnWhen, logout]);
}
