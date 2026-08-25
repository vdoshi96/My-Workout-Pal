import { afterEach, describe, expect, it, vi } from "vitest";

import { PrivateApiClientError, privateApiMutation } from "@/client/private-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("private API client", () => {
  it("bootstraps CSRF and sends one same-origin JSON mutation", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "csrf-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ saved: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      privateApiMutation<{ saved: boolean }>("/api/app/example", {
        body: { value: 1 },
        method: "POST",
      }),
    ).resolves.toEqual({ saved: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ value: 1 }),
      cache: "no-store",
      credentials: "same-origin",
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }),
      method: "POST",
    });
  });

  it("preserves stable server failures and maps unreachable requests", async () => {
    const denied = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "csrf-token" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "stale", message: "Reload before saving." }), { status: 409 }),
      );
    vi.stubGlobal("fetch", denied);
    await expect(
      privateApiMutation("/api/app/example", { body: {}, method: "PATCH" }),
    ).rejects.toMatchObject({ code: "stale", message: "Reload before saving.", status: 409 } satisfies Partial<PrivateApiClientError>);

    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));
    await expect(
      privateApiMutation("/api/app/example", { body: {}, method: "DELETE" }),
    ).rejects.toMatchObject({ code: "network_error", status: 0 } satisfies Partial<PrivateApiClientError>);
  });
});
