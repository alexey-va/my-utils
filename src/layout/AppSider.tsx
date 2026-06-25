import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Tooltip } from "antd";
import {
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useGetIdentity, useMenu, useTranslate } from "@refinedev/core";
import type { RefineThemedLayoutSiderProps } from "@refinedev/antd";
import { APP_NAME } from "../config/appBranding";
import { PATH_ADMIN, PATH_HOME } from "../config/paths";
import { SIDER_EXPANDED_WIDTH, SIDER_RAIL_WIDTH } from "../config/sidebar";
import { useConfirmLogout } from "../shared/hooks/useConfirmLogout";
import { buildMenuRouteMap } from "../shared/utils/buildMenuRouteMap";
import AppTitle from "./AppTitle";
import SiderFooterButton from "./SiderFooterButton";
import { loginPathWithRedirect } from "./RequireAuth";
import { renderSiderMenu } from "./sider/renderSiderMenu";

export default function AppSider({
  Title: TitleFromProps,
  render,
  meta,
  activeItemDisabled = false,
  siderItemsAreCollapsed = true,
}: RefineThemedLayoutSiderProps) {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const onGrafanaTab = location.pathname === "/observability";
  const { data: identity } = useGetIdentity();
  const translate = useTranslate();
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu({ meta });
  const confirmLogout = useConfirmLogout();

  const RenderToTitle = TitleFromProps ?? AppTitle;
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

  const defaultExpandMenuItems = siderItemsAreCollapsed ? [] : menuItems.map(({ key }) => key);
  const items = renderSiderMenu({ tree: menuItems, selectedKey, activeItemDisabled });
  const menuNodes = render ? render({ items, logout: null, collapsed: !expanded }) : items;

  const signInLabel = translate("buttons.login", "Sign in");
  const signOutLabel = translate("buttons.logout", "Logout");
  const toggleLabel = expanded
    ? translate("buttons.collapse", "Collapse")
    : translate("buttons.expand", "Expand");

  const brand = <RenderToTitle collapsed={!expanded} />;

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
          defaultOpenKeys={[...defaultOpenKeys, ...defaultExpandMenuItems]}
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
          <SiderFooterButton
            expanded={expanded}
            icon={identity ? <LogoutOutlined /> : <LoginOutlined />}
            label={identity ? signOutLabel : signInLabel}
            onClick={() =>
              identity ? confirmLogout() : navigate(loginPathWithRedirect(PATH_ADMIN))
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
