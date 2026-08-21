import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { apiClient } from "./api";
import { clearSession, storeSession } from "./auth/session";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("App authentication", () => {
  it("renders the complete administrator menu on the first authenticated paint", () => {
    storeSession({
      id: "00000000-0000-0000-0000-000000000001",
      username: "freedeeml",
      email: "freedeeml@local.invalid",
      role: "ADMIN",
      mustChangePassword: false,
    }, "signed-token");
    window.history.replaceState({}, "", "/wireguard");
    vi.spyOn(apiClient, "get").mockResolvedValue([]);

    render(<App />);

    expect(screen.getByRole("menuitem", { name: /WireGuard/ })).toBeInTheDocument();
  });

  it("shows administrator menu items immediately after sign in", async () => {
    window.history.replaceState({}, "", "/login?to=%2Fwireguard");
    vi.spyOn(apiClient, "post").mockResolvedValue({
      token: "signed-token",
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        username: "freedeeml",
        email: "freedeeml@local.invalid",
        role: "ADMIN",
        mustChangePassword: false,
      },
    });
    vi.spyOn(apiClient, "get").mockResolvedValue([]);

    render(<App />);

    expect(screen.queryByRole("menuitem", { name: /WireGuard/ })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText("Username or email"), {
      target: { value: "freedeeml" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    const submit = screen
      .getAllByRole("button", { name: "Sign in" })
      .find((button) => button.getAttribute("type") === "submit");
    expect(submit).toBeDefined();
    fireEvent.click(submit!);

    await waitFor(() => expect(window.location.pathname).toBe("/wireguard"));
    expect(await screen.findByRole("menuitem", { name: /WireGuard/ })).toBeInTheDocument();
  }, 15_000);

  it("redirects an open administrator page when the server session expires", async () => {
    storeSession({
      id: "00000000-0000-0000-0000-000000000001",
      username: "freedeeml",
      email: "freedeeml@local.invalid",
      role: "ADMIN",
      mustChangePassword: false,
    }, "expired-token");
    window.history.replaceState({}, "", "/properties");
    vi.spyOn(apiClient, "get").mockResolvedValue([]);

    render(<App />);
    expect(await screen.findByRole("heading", { name: "Properties" })).toBeInTheDocument();

    act(() => clearSession());

    await waitFor(() => expect(window.location.pathname).toBe("/login"));
  });
});
