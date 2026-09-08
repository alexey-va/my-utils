import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ThemePicker from "./ThemePicker";

afterEach(() => {
  cleanup();
});

it("closes the appearance dialog on Escape and removes its listener", async () => {
  const removeEventListener = vi.spyOn(document, "removeEventListener");
  render(<ThemePicker />);

  const trigger = screen.getByRole("button", { name: "Оформление: Графит" });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");

  fireEvent.keyDown(document, { key: "Escape" });

  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function), true);
});
