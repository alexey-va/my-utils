/** Linear app UI tokens — source of truth (DESIGN-APP.md). */

export const linearTokens = {
  canvas: "#08090a",
  canvasMarketing: "#010102",
  surface0: "#08090a",
  surface1: "#0f1011",
  surface2: "#141516",
  surface3: "#18191a",
  surface4: "#191a1b",
  surfaceSecondary: "#1c1c1f",
  surfaceTertiary: "#232326",
  surfaceQuaternary: "#28282c",

  ink: "#f7f8f8",
  inkSecondary: "#d0d6e0",
  inkMuted: "#8a8f98",
  inkQuaternary: "#62666d",
  editorText: "#e4e5e9",

  hairline: "#23252a",
  hairlineStrong: "#34343a",
  hairlineTertiary: "#3e3e44",

  primary: "#5e6ad2",
  primaryHover: "#828fff",
  primaryFocus: "#5e69d1",
  accentTint: "#18182f",
  link: "#828fff",
  onPrimary: "#ffffff",

  semanticRed: "#eb5757",
  semanticOrange: "#fc7840",
  semanticYellow: "#f0bf00",
  semanticGreen: "#27a644",
  semanticBlue: "#4ea7fc",
  semanticIndigo: "#5e6ad2",
  semanticTeal: "#00b8cc",

  radiusSm: 6,
  radiusMd: 8,
  radiusLg: 12,
  siderRail: 56,
  headerHeight: 56,
} as const;

export const linearChartColors = [
  linearTokens.primary,
  linearTokens.semanticBlue,
  linearTokens.semanticGreen,
  linearTokens.semanticOrange,
  linearTokens.semanticTeal,
  linearTokens.semanticYellow,
] as const;
