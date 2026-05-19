import type { ThemeConfig } from "antd";
import { theme } from "antd";

/** Grafana-like dark palette for Ant Design. */
export const appTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: "#121621",
    colorBgLayout: "#121621",
    colorBgContainer: "#181d29",
    colorTextBase: "#d6dae1",
    colorBorder: "#2a3142",
    colorPrimary: "#9aa4b2",
    borderRadius: 8,
    controlHeight: 36,
  },
  components: {
    Layout: {
      siderBg: "#151a26",
      headerBg: "#121621",
      bodyBg: "#121621",
    },
    Menu: {
      itemBg: "transparent",
      itemColor: "#b7c0cc",
      itemHoverBg: "#1c2230",
      itemHoverColor: "#e5eaf1",
      itemSelectedBg: "#222838",
      itemSelectedColor: "#eef2f7",
      activeBarBorderWidth: 0,
    },
    Card: {
      colorBgContainer: "#181d29",
      colorBorderSecondary: "#2a3142",
      headerBg: "#181d29",
    },
    Button: {
      colorPrimary: "#394457",
      colorPrimaryHover: "#46536a",
      colorPrimaryActive: "#2e394a",
      defaultBg: "#1f2533",
      defaultBorderColor: "#2a3142",
      defaultColor: "#c7cfdb",
      borderRadius: 8,
    },
    Input: {
      colorBgContainer: "#141a26",
      colorTextPlaceholder: "#8b93a1",
      hoverBorderColor: "#394457",
      activeBorderColor: "#394457",
    },
  },
};
