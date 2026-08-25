export class PrivateApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PrivateApiClientError";
    this.code = code;
    this.status = status;
  }
}

function responseErrorBody(value: unknown): Readonly<{ code: string; message: string }> {
  if (typeof value !== "object" || value === null) {
    return { code: "request_failed", message: "The request could not be completed." };
  }
  const record = value as Record<string, unknown>;
  return {
    code: typeof record["error"] === "string" ? record["error"] : "request_failed",
    message:
      typeof record["message"] === "string"
        ? record["message"]
        : "The request could not be completed.",
  };
}

async function parsedBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function privateApiMutation<T>(
  url: string,
  options: Readonly<{
    body: unknown;
    method: "DELETE" | "PATCH" | "POST";
  }>,
): Promise<T> {
  try {
    const csrfResponse = await fetch("/api/auth/csrf", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const csrfBody = await parsedBody(csrfResponse);
    const csrfRecord =
      typeof csrfBody === "object" && csrfBody !== null
        ? (csrfBody as Record<string, unknown>)
        : {};
    const token = csrfRecord["token"];
    if (!csrfResponse.ok || typeof token !== "string" || token.length === 0) {
      const failure = responseErrorBody(csrfBody);
      throw new PrivateApiClientError(failure.code, failure.message, csrfResponse.status);
    }

    const response = await fetch(url, {
      body: JSON.stringify(options.body),
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": token,
      },
      method: options.method,
    });
    const body = await parsedBody(response);
    if (!response.ok) {
      const failure = responseErrorBody(body);
      throw new PrivateApiClientError(failure.code, failure.message, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof PrivateApiClientError) throw error;
    throw new PrivateApiClientError(
      "network_error",
      "The request did not reach the server. Check the connection and try again.",
      0,
    );
  }
}
