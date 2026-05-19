import { useEffect } from "react";
import { message } from "antd";
import { AUTH_NOTICE_KEY } from "../config/auth";

/** Shows a one-time hint after a restricted route redirect. */
export default function AuthNotice() {
  useEffect(() => {
    const text = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (!text) {
      return;
    }
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
    message.info(text);
  }, []);

  return null;
}
