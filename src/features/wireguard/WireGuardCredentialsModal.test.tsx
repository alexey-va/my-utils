import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WireGuardCredentialsModal from "./WireGuardCredentialsModal";

describe("WireGuardCredentialsModal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders repeatable config, local QR payload, and a download", () => {
    const createObjectUrl = vi.fn(() => "blob:wireguard-config");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const credentials = {
      peer: {
        id: "peer-id",
        name: "Alex phone",
        publicKey: "public-key",
        assignedIp: "10.89.0.2",
        enabled: true,
        latestHandshakeAt: null,
        totalReceiveBytes: 0,
        totalTransmitBytes: 0,
        metricsUpdatedAt: null,
        createdAt: "2026-08-19T10:00:00Z",
        updatedAt: "2026-08-19T10:00:00Z",
      },
      clientConfig: "[Interface]\nPrivateKey = secret\n",
      fileName: "alex-phone.conf",
    };

    render(
      <WireGuardCredentialsModal
        open
        credentials={credentials}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("alex-phone.conf")).toBeInTheDocument();
    expect(screen.getByTestId("wireguard-qr")).toHaveAttribute(
      "data-config",
      credentials.clientConfig,
    );

    fireEvent.click(screen.getByRole("button", { name: /скачать/i }));
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
