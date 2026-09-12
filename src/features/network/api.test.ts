import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNetworkActivity, fetchNetworkAudit, fetchNetworkDoctor } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Network audit API contract", () => {
  it("encodes filters, clamps the page size, and disables caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchNetworkAudit({
      node: "node/1",
      action: "read logs",
      kind: "job.succeeded",
      actor: "web:alexey@example",
      before: "cursor /?#",
      limit: 250,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/network/v1/audit?node=node%2F1&action=read+logs&kind=job.succeeded&actor=web%3Aalexey%40example&before=cursor+%2F%3F%23&limit=200",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("loads exact activity metrics with the selected window and filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchNetworkActivity({ window: "7d", node: "gercena", action: "exec.run", actor: "mcp:agent" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/network/v1/activity?window=7d&node=gercena&action=exec.run&actor=mcp%3Aagent",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("loads read-only gateway and node diagnostics without caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchNetworkDoctor();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/network/v1/doctor",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });
});
