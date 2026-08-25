import { createHash } from "node:crypto";

export const SEED_ID_NAMESPACE = "8f84603f-1057-5a6e-a0e7-7a85716bbb3a";

function namespaceBytes(namespace: string): Buffer {
  return Buffer.from(namespace.replaceAll("-", ""), "hex");
}

function nonblank(value: string, label: "kind" | "key"): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`Seed ${label} must be nonblank.`);
  return normalized;
}

export function deterministicSeedUuid(kind: string, key: string): string {
  const identity = `${nonblank(kind, "kind")}::${nonblank(key, "key")}`;
  const digest = createHash("sha1")
    .update(namespaceBytes(SEED_ID_NAMESPACE))
    .update(identity, "utf8")
    .digest()
    .subarray(0, 16);

  digest[6] = (digest[6]! & 0x0f) | 0x50;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
