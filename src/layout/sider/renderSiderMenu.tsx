import { UnorderedListOutlined } from "@ant-design/icons";
import type { TreeMenuItem } from "@refinedev/core";
import { Menu } from "antd";
import type { CSSProperties } from "react";
import type { AuthUser } from "../../api/types";
import { canAccessResource } from "../../auth/access";
import type { AppResourceMeta } from "../../types/resource";

type RenderSiderMenuOptions = {
  tree: TreeMenuItem[];
  selectedKey?: string;
  activeItemDisabled?: boolean;
  identity: AuthUser | null;
};

export function renderSiderMenu({
  tree,
  selectedKey,
  activeItemDisabled = false,
  identity,
}: RenderSiderMenuOptions) {
  return tree.flatMap((item) => {
    const { key, name, children, meta } = item;
    if (!canAccessResource(meta as AppResourceMeta | undefined, identity)) {
      return [];
    }
    const parentName = meta?.parent;
    const label = item.label ?? meta?.label ?? name;
    const icon = meta?.icon;
    const isRoute = !(parentName !== undefined && children.length === 0);

    if (children.length > 0) {
      return [(
        <Menu.SubMenu key={item.key} icon={icon ?? <UnorderedListOutlined />} title={label}>
          {renderSiderMenu({ tree: children, selectedKey, activeItemDisabled, identity })}
        </Menu.SubMenu>
      )];
    }

    const isSelected = key === selectedKey;
    const linkStyle: CSSProperties =
      activeItemDisabled && isSelected ? { pointerEvents: "none" } : {};

    return [(
      <Menu.Item
        key={item.key}
        icon={icon ?? (isRoute ? <UnorderedListOutlined /> : undefined)}
        title={String(label)}
        style={linkStyle}
      >
        <span className="app-sider__item-label">{label}</span>
      </Menu.Item>
    )];
  });
}
