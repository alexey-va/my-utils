import type { ThemeConfig } from "antd";
import { theme } from "antd";
import { linearTokens } from "../design/linearTokens";

const t = linearTokens;

/** Ant Design theme mapped from Linear DESIGN-APP tokens. */
export const linearAntTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: t.canvas,
    colorBgLayout: t.canvas,
    colorBgContainer: t.surface1,
    colorBgElevated: t.surface2,
    colorTextBase: t.ink,
    colorTextSecondary: t.inkMuted,
    colorTextTertiary: t.inkQuaternary,
    colorBorder: t.hairline,
    colorBorderSecondary: t.hairline,
    colorPrimary: t.primary,
    colorPrimaryHover: t.primaryHover,
    colorPrimaryActive: t.primaryFocus,
    colorLink: t.link,
    colorLinkHover: t.primaryHover,
    colorSuccess: t.semanticGreen,
    colorWarning: t.semanticYellow,
    colorError: t.semanticRed,
    colorInfo: t.semanticBlue,
    borderRadius: t.radiusMd,
    borderRadiusLG: t.radiusLg,
    controlHeight: 36,
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
    fontFamilyCode: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace",
  },
  components: {
    Layout: {
      siderBg: t.surface1,
      headerBg: t.canvas,
      bodyBg: t.canvas,
      triggerBg: t.surface1,
    },
    Menu: {
      itemBg: "transparent",
      itemColor: t.inkSecondary,
      itemHoverBg: t.surface2,
      itemHoverColor: t.ink,
      itemSelectedBg: t.surface3,
      itemSelectedColor: t.ink,
      activeBarBorderWidth: 0,
    },
    Card: {
      colorBgContainer: t.surface1,
      colorBorderSecondary: t.hairline,
      headerBg: t.surface1,
    },
    Button: {
      colorPrimary: t.primary,
      colorPrimaryHover: t.primaryHover,
      colorPrimaryActive: t.primaryFocus,
      primaryShadow: "none",
      defaultBg: t.surface1,
      defaultBorderColor: t.hairline,
      defaultColor: t.inkSecondary,
      borderRadius: t.radiusMd,
    },
    Input: {
      colorBgContainer: t.surface1,
      colorTextPlaceholder: t.inkMuted,
      hoverBorderColor: t.hairlineStrong,
      activeBorderColor: t.primaryFocus,
    },
    Select: {
      colorBgContainer: t.surface1,
      optionSelectedBg: t.surface3,
    },
    Table: {
      headerBg: t.surface1,
      headerColor: t.inkMuted,
      rowHoverBg: t.surface2,
      borderColor: t.hairline,
    },
    Segmented: {
      trackBg: t.surface1,
      itemSelectedBg: t.surface3,
      itemColor: t.inkMuted,
      itemSelectedColor: t.ink,
    },
    Tag: {
      defaultBg: t.surface2,
      defaultColor: t.inkSecondary,
    },
    Modal: {
      contentBg: t.surface2,
      headerBg: t.surface2,
    },
    Collapse: {
      headerBg: t.surface1,
      contentBg: t.surface1,
    },
  },
};
