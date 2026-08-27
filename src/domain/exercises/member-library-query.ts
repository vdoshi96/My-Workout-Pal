const MEMBER_LIBRARY_QUERY_LIMIT = 120;

export function normalizedMemberLibraryQuery(value: unknown): string {
  return typeof value === "string"
    ? value.trim().slice(0, MEMBER_LIBRARY_QUERY_LIMIT)
    : "";
}
