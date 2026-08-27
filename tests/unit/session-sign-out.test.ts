import { describe, expect, it, vi } from "vitest";

import {
  parseSessionSignOutResponse,
  performSessionSignOut,
  SessionSignOutError,
} from "@/client/session-sign-out";

describe("account-shell session sign-out", () => {
  it("clears only the server viewer namespace before deleting the secure session and Firebase client state", async () => {
    const order: string[] = [];
    const clearOwner = vi.fn(async (ownerUid: string) => {
      order.push(`local:${ownerUid}`);
    });
    const deleteServerSession = vi.fn(async () => {
      order.push("server");
      return { authenticated: false };
    });
    const signOutFirebase = vi.fn(async () => {
      order.push("firebase");
    });

    await performSessionSignOut(
      { clearOwner, deleteServerSession, signOutFirebase },
      "server-derived-owner",
    );

    expect(order).toEqual(["local:server-derived-owner", "server", "firebase"]);
    expect(clearOwner).toHaveBeenCalledWith("server-derived-owner");
  });

  it("refuses malformed success before claiming Firebase sign-out", async () => {
    const signOutFirebase = vi.fn();

    await expect(performSessionSignOut(
      {
        clearOwner: vi.fn().mockResolvedValue(undefined),
        deleteServerSession: vi.fn().mockResolvedValue({ authenticated: true }),
        signOutFirebase,
      },
      "server-derived-owner",
    )).rejects.toMatchObject({ code: "malformed_response" });

    expect(signOutFirebase).not.toHaveBeenCalled();
  });

  it("accepts only the exact sign-out response contract", () => {
    expect(parseSessionSignOutResponse({ authenticated: false })).toEqual({
      authenticated: false,
    });
    for (const invalid of [null, {}, { authenticated: true }, { authenticated: false, uid: "owner" }]) {
      expect(() => parseSessionSignOutResponse(invalid)).toThrow(SessionSignOutError);
    }
  });
});
