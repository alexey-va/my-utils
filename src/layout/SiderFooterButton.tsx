import { Tooltip } from "antd";
import type { ReactNode } from "react";

type SiderFooterButtonProps = {
  icon: ReactNode;
  label: string;
  expanded: boolean;
  onClick: () => void;
  ariaLabel?: string;
};

export default function SiderFooterButton({
  icon,
  label,
  expanded,
  onClick,
  ariaLabel,
}: SiderFooterButtonProps) {
  const button = (
    <button
      type="button"
      className="app-sider__footer-btn"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      <span className="app-sider__footer-btn-icon" aria-hidden>
        {icon}
      </span>
      <span className="app-sider__footer-btn-label">{label}</span>
    </button>
  );

  if (expanded) {
    return button;
  }

  return (
    <Tooltip title={label} placement="right">
      {button}
    </Tooltip>
  );
}
