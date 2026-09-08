import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AppThemeProvider from "./AppThemeProvider";
import { APP_THEMES, THEME_STORAGE_KEY, useAppTheme } from "./appTheme";

function Picker() {
  const { mode, setTheme } = useAppTheme();
  return (
    <>
      <output>{mode}</output>
      {APP_THEMES.map(({ id }) => (
        <button key={id} onClick={() => setTheme(id)}>
          {id}
        </button>
      ))}
    </>
  );
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("defaults to graphite and falls back from obsolete or invalid preferences", () => {
  for (const saved of [null, "dark", "invalid"]) {
    if (saved) localStorage.setItem(THEME_STORAGE_KEY, saved);
    else localStorage.removeItem(THEME_STORAGE_KEY);
    const view = render(
      <AppThemeProvider>
        <Picker />
      </AppThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("graphite");
    view.unmount();
  }
});
it.each(APP_THEMES)("persists and restores the $id palette", ({ id }) => {
  const first = render(
    <AppThemeProvider>
      <Picker />
    </AppThemeProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: id }));
  expect(document.documentElement.dataset.theme).toBe(id);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(id);
  first.unmount();
  render(
    <AppThemeProvider>
      <Picker />
    </AppThemeProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent(id);
  expect(document.documentElement.dataset.theme).toBe(id);
});
