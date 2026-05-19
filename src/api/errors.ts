export class ApiError extends Error {
  readonly status: number;

  readonly body: string;

  constructor(status: number, message: string, body = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
