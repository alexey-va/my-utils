import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNetworkAudit, fetchNetworkAuditActivity } from "./api";

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

  it("loads up to 200 queued requests for activity histograms", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchNetworkAuditActivity({ node: "gercena", action: "exec.run", actor: "mcp:agent" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/network/v1/audit?node=gercena&action=exec.run&kind=job.queued&actor=mcp%3Aagent&limit=200",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });
});
