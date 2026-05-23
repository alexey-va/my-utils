import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Drawer, Menu } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { appFeatures } from "../../config/features";
import { SIDER_RAIL_WIDTH } from "../../config/sidebar";

/** Floating app switcher — visible over full-bleed embeds (Grafana). */
export default function AppQuickNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey =
    appFeatures.find(
      (f) =>
        location.pathname === f.path ||
        (f.path !== "/" && location.pathname.startsWith(`${f.path}/`)),
    )?.id ?? "";

  return (
    <>
      <button
        type="button"
        className="app-quick-nav__fab"
        aria-label="My Utils apps"
        onClick={() => setOpen(true)}
      >
        <AppstoreOutlined />
        <span className="app-quick-nav__fab-label">My Utils</span>
      </button>
      <Drawer
        className="app-quick-nav__drawer"
        title="My Utils"
        placement="left"
        width={SIDER_RAIL_WIDTH + 204}
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={appFeatures.map((f) => ({
            key: f.id,
            icon: f.icon,
            label: f.label,
          }))}
          onClick={({ key }) => {
            const feature = appFeatures.find((f) => f.id === key);
            if (feature) {
              navigate(feature.path);
              setOpen(false);
            }
          }}
        />
      </Drawer>
    </>
  );
}
