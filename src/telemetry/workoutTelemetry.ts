import { buildApiUrl } from "../api/client";

const CLIENT_STORAGE_KEY = "my-utils-telemetry-client";
const SESSION_STORAGE_KEY = "my-utils-telemetry-session";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type TelemetryWindow = Pick<
  Window,
  "crypto" | "localStorage" | "sessionStorage" | "location" | "innerWidth" | "innerHeight" | "screen" | "navigator"
>;

type SendWorkoutPageViewOptions = {
  windowRef?: TelemetryWindow;
  fetchImpl?: typeof fetch;
};

function randomId(windowRef: TelemetryWindow): string {
  try {
    if (typeof windowRef.crypto?.randomUUID === "function") {
      return windowRef.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    windowRef.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now().toString(36)}-telemetry`;
  }
}

function storedId(
  storage: StorageLike,
  key: string,
  windowRef: TelemetryWindow,
): string {
  try {
    const existing = storage.getItem(key);
    if (existing) {
      return existing;
    }
    const created = randomId(windowRef);
    storage.setItem(key, created);
    return created;
  } catch {
    return randomId(windowRef);
  }
}

export function workoutPageViewPayload(windowRef: TelemetryWindow = window) {
  return {
    clientApp: "my-utils",
    events: [
      {
        eventId: randomId(windowRef),
        clientId: storedId(windowRef.localStorage, CLIENT_STORAGE_KEY, windowRef),
        sessionId: storedId(windowRef.sessionStorage, SESSION_STORAGE_KEY, windowRef),
        pageViewId: randomId(windowRef),
        occurredAt: new Date().toISOString(),
        sequence: 1,
        elapsedMs: 0,
        sincePreviousMs: 0,
        type: "page_view",
        page: "/",
        uiMode: "workout",
        viewportWidth: windowRef.innerWidth,
        viewportHeight: windowRef.innerHeight,
        screenWidth: windowRef.screen?.width,
        screenHeight: windowRef.screen?.height,
        webdriver: windowRef.navigator?.webdriver === true,
        language: windowRef.navigator?.language,
        platform: windowRef.navigator?.platform,
        hardwareConcurrency: windowRef.navigator?.hardwareConcurrency,
        maxTouchPoints: windowRef.navigator?.maxTouchPoints,
      },
    ],
  };
}

export function sendWorkoutPageView({
  windowRef = window,
  fetchImpl = window.fetch.bind(window),
}: SendWorkoutPageViewOptions = {}): void {
  try {
    const body = JSON.stringify(workoutPageViewPayload(windowRef));
    void Promise.resolve(
      fetchImpl(buildApiUrl("/api/client-events"), {
        method: "POST",
        credentials: "omit",
        keepalive: true,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body,
      }),
    ).catch(() => undefined);
  } catch {
    // Analytics must never affect the public Workout dashboard.
  }
}

let sentForCurrentPageLoad = false;

export function sendWorkoutPageViewOnce(): void {
  if (sentForCurrentPageLoad) {
    return;
  }
  sentForCurrentPageLoad = true;
  sendWorkoutPageView();
}
