import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Tooltip } from "antd";
import {
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMenu, useTranslate } from "@refinedev/core";
import { APP_NAME } from "../config/appBranding";
import type { AuthUser } from "../api/types";
import { PATH_ACCOUNT, PATH_HOME } from "../config/paths";
import { SIDER_EXPANDED_WIDTH, SIDER_RAIL_WIDTH } from "../config/sidebar";
import { useConfirmLogout } from "../shared/hooks/useConfirmLogout";
import { buildMenuRouteMap } from "../shared/utils/buildMenuRouteMap";
import AppTitle from "./AppTitle";
import SiderFooterButton from "./SiderFooterButton";
import { loginPathWithRedirect } from "./authNavigation";
import { renderSiderMenu } from "./sider/renderSiderMenu";
import { readStoredUser } from "../auth/session";

export default function AppSider() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const onGrafanaTab = location.pathname === "/observability";
  const identity: AuthUser | null = readStoredUser();
  const translate = useTranslate();
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  const confirmLogout = useConfirmLogout();

  const routeByKey = useMemo(() => buildMenuRouteMap(menuItems), [menuItems]);
  const siderWidth = expanded ? SIDER_EXPANDED_WIDTH : SIDER_RAIL_WIDTH;

  const handleMenuClick = useCallback(
    ({ key }: { key: string }) => {
      const route = routeByKey.get(key);
      if (route) {
        navigate(route);
      }
    },
    [routeByKey, navigate],
  );

  const menuNodes = renderSiderMenu({ tree: menuItems, selectedKey, identity });

  const signInLabel = translate("buttons.login", "Sign in");
  const signOutLabel = translate("buttons.logout", "Logout");
  const toggleLabel = expanded
    ? translate("buttons.collapse", "Collapse")
    : translate("buttons.expand", "Expand");

  const brand = <AppTitle />;

  return (
    <Layout.Sider
      className={`app-sider${expanded ? " app-sider--expanded" : ""}`}
      collapsed={false}
      width={siderWidth}
      collapsible={false}
      trigger={null}
    >
      <div className="app-sider__inner">
        <div className="app-sider__brand">
          {expanded ? (
            brand
          ) : (
            <Tooltip title={APP_NAME} placement="right">
              <div className="app-sider__brand-hit">{brand}</div>
            </Tooltip>
          )}
        </div>

        <Menu
          className="app-sider__menu"
          mode="inline"
          inlineCollapsed={!expanded}
          selectedKeys={selectedKey ? [selectedKey] : []}
          defaultOpenKeys={defaultOpenKeys}
          onClick={handleMenuClick}
        >
          {menuNodes}
        </Menu>

        <div className="app-sider__footer">
          {onGrafanaTab ? (
            <SiderFooterButton
              expanded={expanded}
              icon={<HomeOutlined />}
              label="В приложение"
              onClick={() => navigate(PATH_HOME)}
            />
          ) : null}
          {identity ? (
            <SiderFooterButton
              expanded={expanded}
              icon={<UserOutlined />}
              label={identity.username}
              onClick={() => navigate(PATH_ACCOUNT)}
            />
          ) : null}
          <SiderFooterButton
            expanded={expanded}
            icon={identity ? <LogoutOutlined /> : <LoginOutlined />}
            label={identity ? signOutLabel : signInLabel}
            onClick={() =>
              identity ? confirmLogout() : navigate(loginPathWithRedirect(PATH_HOME))
            }
          />
          <SiderFooterButton
            expanded={expanded}
            icon={expanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            label={toggleLabel}
            ariaLabel={
              expanded
                ? translate("buttons.collapse", "Collapse sidebar")
                : translate("buttons.expand", "Expand sidebar")
            }
            onClick={() => setExpanded((value) => !value)}
          />
        </div>
      </div>
    </Layout.Sider>
  );
}
