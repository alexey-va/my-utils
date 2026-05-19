import { UnorderedListOutlined } from "@ant-design/icons";
import { CanAccess, type TreeMenuItem } from "@refinedev/core";
import { Menu } from "antd";
import type { CSSProperties } from "react";

type RenderSiderMenuOptions = {
  tree: TreeMenuItem[];
  selectedKey?: string;
  activeItemDisabled?: boolean;
};

export function renderSiderMenu({
  tree,
  selectedKey,
  activeItemDisabled = false,
}: RenderSiderMenuOptions) {
  return tree.map((item) => {
    const { key, name, children, meta } = item;
    const parentName = meta?.parent;
    const label = item.label ?? meta?.label ?? name;
    const icon = meta?.icon;
    const isRoute = !(parentName !== undefined && children.length === 0);

    if (children.length > 0) {
      return (
        <CanAccess key={item.key} resource={name} action="list" params={{ resource: item }}>
          <Menu.SubMenu key={item.key} icon={icon ?? <UnorderedListOutlined />} title={label}>
            {renderSiderMenu({ tree: children, selectedKey, activeItemDisabled })}
          </Menu.SubMenu>
        </CanAccess>
      );
    }

    const isSelected = key === selectedKey;
    const linkStyle: CSSProperties =
      activeItemDisabled && isSelected ? { pointerEvents: "none" } : {};

    return (
      <CanAccess key={item.key} resource={name} action="list" params={{ resource: item }}>
        <Menu.Item
          key={item.key}
          icon={icon ?? (isRoute ? <UnorderedListOutlined /> : undefined)}
          title={String(label)}
          style={linkStyle}
        >
          <span className="app-sider__item-label">{label}</span>
        </Menu.Item>
      </CanAccess>
    );
  });
}
