export function parseClockDuration(input: string): number | undefined {
  const text = input.trim();
  if (!/^\d+(?::[0-5]\d){0,2}$/.test(text)) return undefined;
  const parts = text.split(":").map(Number);
  const seconds = parts.length === 1 ? parts[0]! * 60 : parts.reduce((total, part) => total * 60 + part, 0);
  return Number.isSafeInteger(seconds) ? seconds : undefined;
}

export function formatClockDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const tail = String(whole % 60).padStart(2, "0");
  if (whole < 3600) return `${Math.floor(whole / 60)}:${tail}`;
  return `${Math.floor(whole / 3600)}:${String(Math.floor(whole / 60) % 60).padStart(2, "0")}:${tail}`;
}
