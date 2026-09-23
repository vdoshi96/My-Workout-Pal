export function timeZoneOptions(saved?: string): readonly string[] {
  return [...new Set([...Intl.supportedValuesOf("timeZone"), "UTC", ...(saved === undefined ? [] : [saved])])]
    .sort((left, right) => left.localeCompare(right, "en-US"));
}
