import { App as AntApp } from "antd";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppRoutes from "./AppRoutes";

vi.mock("../features/workout/WorkoutPage", () => ({
  default: () => <div>Workout route</div>,
}));

describe("AppRoutes", () => {
  it("renders a feature for each of its additional public paths", async () => {
    render(
      <AntApp>
        <MemoryRouter initialEntries={["/workout/journal"]}>
          <AppRoutes />
        </MemoryRouter>
      </AntApp>,
    );

    expect(await screen.findByText("Workout route")).toBeInTheDocument();
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });
});
