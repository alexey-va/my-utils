import { afterEach, describe, expect, it, vi } from "vitest";
import { updateProperty } from "./properties";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("updateProperty", () => {
  it("keeps dots literal in runtime setting keys", async () => {
    const updated = {
      key: "openrouter.model",
      type: "STRING" as const,
      objectType: null,
      description: "OpenRouter model",
      tags: ["agent"],
      value: "openai/gpt-5.6-terra-pro",
      defaultValue: "openai/gpt-5.6-terra",
      editor: "DEFAULT" as const,
      updatedAt: "2026-08-26T17:00:00Z",
      updatedBy: "freedeeml",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await updateProperty("openrouter.model", "openai/gpt-5.6-terra-pro");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/settings/openrouter.model");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ value: "openai/gpt-5.6-terra-pro" }),
    });
  });
});
