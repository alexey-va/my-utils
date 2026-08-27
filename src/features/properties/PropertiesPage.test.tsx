import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeProperty } from "../../api/properties";
import PropertiesPage from "./PropertiesPage";

const api = vi.hoisted(() => ({
  fetchProperties: vi.fn(),
  updateProperty: vi.fn(),
}));

vi.mock("../../api/properties", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/properties")>();
  return {
    ...actual,
    fetchProperties: api.fetchProperties,
    updateProperty: api.updateProperty,
  };
});

const modelProperty: RuntimeProperty = {
  key: "openrouter.model",
  type: "STRING",
  objectType: null,
  description: "Модель OpenRouter для Telegram-агента.",
  tags: ["agent"],
  value: "openai/gpt-5.6-terra-pro",
  defaultValue: "openai/gpt-5.6-terra",
  editor: "DEFAULT",
  updatedAt: "2026-08-26T17:00:00Z",
  updatedBy: "freedeeml",
};

const telegramProperty: RuntimeProperty = {
  key: "telegram.retry-count",
  type: "INT",
  objectType: null,
  description: "Число повторных попыток Telegram.",
  tags: ["telegram"],
  value: 3,
  defaultValue: 3,
  editor: "DEFAULT",
  updatedAt: null,
  updatedBy: null,
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchProperties.mockResolvedValue([modelProperty, telegramProperty]);
  api.updateProperty.mockImplementation(async (key: string, value: unknown) => ({
    ...(key === modelProperty.key ? modelProperty : telegramProperty),
    value,
  }));
});

describe("PropertiesPage", () => {
  it("renders flat setting groups and keeps inline save behavior", async () => {
    const { container } = render(<PropertiesPage />);

    expect(await screen.findByRole("heading", { name: "Agent / OpenRouter" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Telegram" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".properties-editor__group")).toHaveLength(2);
    expect(screen.getByText("2 из 2")).toBeInTheDocument();

    const modelInput = screen.getByDisplayValue("openai/gpt-5.6-terra-pro");
    fireEvent.change(modelInput, { target: { value: "openai/gpt-5.6-terra" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить openrouter.model" }));

    await waitFor(() => {
      expect(api.updateProperty).toHaveBeenCalledWith(
        "openrouter.model",
        "openai/gpt-5.6-terra",
      );
    });
  });

  it("filters the flat list without hiding the result count", async () => {
    render(<PropertiesPage />);

    const search = await screen.findByPlaceholderText(
      "Поиск по ключу, описанию, тегу…",
    );
    fireEvent.change(search, { target: { value: "retry-count" } });

    expect(screen.queryByText("openrouter.model")).not.toBeInTheDocument();
    expect(screen.getByText("telegram.retry-count")).toBeInTheDocument();
    expect(screen.getByText("1 из 2")).toBeInTheDocument();
  });
});
