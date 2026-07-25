import { useEffect } from "react";
import { App } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

/** Shows a one-time hint after a restricted route redirect. */
export default function AuthNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const notice =
    typeof (location.state as { authNotice?: unknown } | null)?.authNotice === "string"
      ? (location.state as { authNotice: string }).authNotice
      : undefined;

  useEffect(() => {
    if (!notice) {
      return;
    }
    message.info({ key: "auth-notice", content: notice });
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null },
    );
  }, [location.hash, location.pathname, location.search, message, navigate, notice]);

  return null;
}
