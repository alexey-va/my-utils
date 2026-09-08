import { useState, type ReactNode } from "react";
import { Button, Drawer, Layout } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { featureCatalog } from "../config/featureCatalog";
import ThemePicker from "../theme/ThemePicker";
import AppSider from "./AppSider";

export default function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const page = featureCatalog.find((feature) => feature.path === pathname);
  return (
    <Layout hasSider className="workspace">
      <div className="workspace__desktop-nav">
        <AppSider />
      </div>
      <Layout className="workspace__content">
        <a className="workspace__skip" href="#workspace-main">
          К содержимому
        </a>
        <header className="workspace__topbar">
          <Button
            className="workspace__menu-toggle"
            type="text"
            icon={<MenuOutlined />}
            aria-label="Открыть навигацию"
            onClick={() => setMenuOpen(true)}
          />
          <div className="workspace__breadcrumb">
            <span>My Utils</span>
            <span aria-hidden>/</span>
            <strong>{page?.label ?? "Аккаунт"}</strong>
          </div>
          <div className="workspace__topbar-end">
            <ThemePicker />
          </div>
        </header>
        <Layout.Content id="workspace-main" tabIndex={-1}>
          {children}
        </Layout.Content>
      </Layout>
      <Drawer
        title="Навигация"
        placement="left"
        width={280}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        styles={{ body: { padding: 0 } }}
        destroyOnHidden
      >
        <AppSider mobile onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </Layout>
  );
}
