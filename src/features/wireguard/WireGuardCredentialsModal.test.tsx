import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WireGuardCredentialsModal from "./WireGuardCredentialsModal";

describe("WireGuardCredentialsModal", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders a compact QR profile with copy, disclosure, and download actions", async () => {
    const createObjectUrl = vi.fn(() => "blob:wireguard-config");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.isConnected).toBe(true);
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const credentials = {
      peer: {
        id: "peer-id",
        name: "Alex phone",
        category: "Пользовательские",
        sortOrder: 0,
        publicKey: "public-key",
        assignedIp: "10.89.0.2",
        enabled: true,
        latestHandshakeAt: null,
        totalReceiveBytes: 0,
        totalTransmitBytes: 0,
        currentDownloadBytesPerSecond: 0,
        currentUploadBytesPerSecond: 0,
        metricsUpdatedAt: null,
        traffic: {
          range: "HOUR" as const,
          from: "2026-08-19T09:00:00Z",
          to: "2026-08-19T10:00:00Z",
          downloadBytes: 0,
          uploadBytes: 0,
          ruDownloadBytes: 0,
          ruUploadBytes: 0,
          nonRuDownloadBytes: 0,
          nonRuUploadBytes: 0,
        },
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

    expect(screen.getByText("Конфигурация WireGuard")).toBeInTheDocument();
    expect(screen.getByText("Alex phone")).toBeInTheDocument();
    expect(screen.getByText("alex-phone.conf")).toBeInTheDocument();
    expect(screen.getByTestId("wireguard-qr")).toBeInTheDocument();
    expect(screen.getByText("Сканируй в приложении WireGuard")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /копировать/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(credentials.clientConfig));

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /скачать/i }));
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:wireguard-config");
  });
});
