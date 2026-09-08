import { createContext, useContext } from "react";
export const APP_THEMES = [
  { id: "graphite", label: "Графит" },
  { id: "blue", label: "Синяя" },
  { id: "violet", label: "Фиолетовая" },
  { id: "light", label: "Светлая" },
] as const;
export type ThemeMode = (typeof APP_THEMES)[number]["id"];
export function resolveTheme(value: string | null): ThemeMode {
  return APP_THEMES.find((theme) => theme.id === value)?.id ?? "graphite";
}
export const THEME_STORAGE_KEY = "my-utils.theme";
export const AppThemeContext = createContext<{
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}>({ mode: "graphite", setTheme: () => {} });
export function useAppTheme() {
  return useContext(AppThemeContext);
}
