import { useLink } from "@refinedev/core";
import { ThunderboltOutlined } from "@ant-design/icons";
import type { RefineLayoutThemedTitleProps } from "@refinedev/ui-types";
import { APP_NAME } from "../config/appBranding";

/** Sidebar brand — icon stays fixed; title fades via `.app-sider--expanded` CSS. */
export default function AppTitle(_props: RefineLayoutThemedTitleProps) {
  const Link = useLink();

  return (
    <Link to="/" className="app-brand">
      <span className="app-brand__icon" aria-hidden>
        <ThunderboltOutlined />
      </span>
      <span className="app-brand__text">{APP_NAME}</span>
    </Link>
  );
}
