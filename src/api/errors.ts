export class ApiError extends Error {
  readonly status: number;

  readonly body: string;

  constructor(status: number, message: string, body = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** Prefer JSON `message` from API error body when present. */
  displayMessage(): string {
    if (this.body) {
      try {
        const parsed = JSON.parse(this.body) as { message?: string };
        if (parsed.message?.trim()) {
          return parsed.message.trim();
        }
      } catch {
        // not JSON
      }
      if (this.body.length < 200) {
        return this.body;
      }
    }
    return this.message;
  }
}
