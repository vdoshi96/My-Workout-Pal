const RETURN_PATH_LIMIT = 2_048;
const VALIDATION_ORIGIN = "https://return-path.invalid";
const SAFE_DEFAULT_RETURN_PATH = "/app";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_CONTROL_PATTERN = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;
const ENCODED_PATH_SEPARATOR_PATTERN = /%(?:2f|5c)/i;
const APP_PATH_PATTERN = /^\/app(?:\/[a-z0-9-]+)*$/u;
const WORKOUT_SESSION_PATH_PATTERN = /^\/workout\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function isPrivateApplicationPath(pathname: string): boolean {
  return APP_PATH_PATTERN.test(pathname) || WORKOUT_SESSION_PATH_PATTERN.test(pathname);
}

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
    ENCODED_CONTROL_PATTERN.test(value) ||
    ENCODED_PATH_SEPARATOR_PATTERN.test(value)
  ) {
    return SAFE_DEFAULT_RETURN_PATH;
  }

  let target: URL;
  try {
    target = new URL(value, VALIDATION_ORIGIN);
  } catch {
    return SAFE_DEFAULT_RETURN_PATH;
  }

  if (target.origin !== VALIDATION_ORIGIN || !target.pathname.startsWith("/"))
    return SAFE_DEFAULT_RETURN_PATH;

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(target.pathname);
  } catch {
    return SAFE_DEFAULT_RETURN_PATH;
  }
  if (!isPrivateApplicationPath(decodedPathname)) {
    return SAFE_DEFAULT_RETURN_PATH;
  }

  return `${target.pathname}${target.search}${target.hash}`;
}
