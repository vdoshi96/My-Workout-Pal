const RETURN_PATH_LIMIT = 2_048;
const VALIDATION_ORIGIN = "https://return-path.invalid";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_CONTROL_PATTERN = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;

export function normalizeReturnPath(
  value: string | readonly string[] | undefined,
): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > RETURN_PATH_LIMIT ||
    value !== value.trim() ||
    value.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    ENCODED_CONTROL_PATTERN.test(value)
  ) {
    return "/";
  }

  let target: URL;
  try {
    target = new URL(value, VALIDATION_ORIGIN);
  } catch {
    return "/";
  }

  if (target.origin !== VALIDATION_ORIGIN || !target.pathname.startsWith("/"))
    return "/";

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(target.pathname).toLocaleLowerCase(
      "en-US",
    );
  } catch {
    return "/";
  }
  if (
    decodedPathname === "/sign-in" ||
    decodedPathname.startsWith("/sign-in/") ||
    decodedPathname === "/api/auth" ||
    decodedPathname.startsWith("/api/auth/")
  ) {
    return "/";
  }

  return `${target.pathname}${target.search}${target.hash}`;
}
