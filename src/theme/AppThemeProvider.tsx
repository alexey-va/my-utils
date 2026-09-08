import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import {
  AppThemeContext,
  THEME_STORAGE_KEY,
  resolveTheme,
  type ThemeMode,
} from "./appTheme";
import { createAppTheme } from "./linearTheme";
import { themePalettes } from "../design/linearTokens";

export default function AppThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      return "graphite";
    }
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themePalettes[mode].canvas);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* The theme still works without storage. */
    }
  }, [mode]);
  const value = useMemo(
    () => ({
      mode,
      setTheme: setMode,
    }),
    [mode],
  );
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  return (
    <AppThemeContext.Provider value={value}>
      <ConfigProvider theme={theme}>{children}</ConfigProvider>
    </AppThemeContext.Provider>
  );
}
