import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import WorkoutGridCellEditorModal from "./WorkoutGridCellEditorModal";
import { WorkoutLocaleProvider } from "./workoutLocale";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("keeps the draft open on save failure and closes only after a successful retry", async () => {
  localStorage.setItem("my-utils.workout-locale", "en");
  let reject!: (error: Error) => void;
  const pending = new Promise<void>((_, no) => {
    reject = no;
  });
  const onSave = vi
    .fn()
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce(undefined);
  const onClose = vi.fn();
  render(
    <WorkoutLocaleProvider>
      <WorkoutGridCellEditorModal
        session={{
          mode: "add",
          exerciseId: "one",
          exerciseName: "Bench",
          date: "2026-09-07",
          dateLabel: "Sep 7",
          weightKg: 20,
          repsPattern: "10",
        }}
        onSave={onSave}
        onClose={onClose}
      />
    </WorkoutLocaleProvider>,
  );
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "25" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("spinbutton")).toBeDisabled();
  await act(async () => {
    reject(new Error("Offline"));
  });
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("spinbutton")).toHaveValue("25.00");
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({ exerciseId: "one" }),
    25,
    "10",
  );
}, 15_000);
