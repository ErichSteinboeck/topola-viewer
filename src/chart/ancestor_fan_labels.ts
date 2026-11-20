/** Keep complete surnames whenever possible before abbreviating them. */
export function ancestorNameLines(
  firstName: string | undefined,
  lastName: string | undefined,
  maxChars: number,
  allowWrap: boolean,
): string[] {
  const given = (firstName || '').trim();
  const family = (lastName || '').trim();
  const joined = [given, family].filter(Boolean).join(' ');
  if (joined.length <= maxChars) return [joined];
  if (
    allowWrap &&
    family &&
    family.length <= maxChars &&
    given.length <= maxChars
  ) {
    return [given, family];
  }
  const initials = given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0) + '.')
    .join(' ');
  const compact = [initials, family].filter(Boolean).join(' ');
  if (compact.length <= maxChars) return [compact];
  if (allowWrap && family) {
    return family.length <= maxChars
      ? [initials, family]
      : [initials, family.slice(0, maxChars - 1) + '…'];
  }
  // Extremely long family names are the only remaining reason to truncate.
  return [compact.slice(0, maxChars - 1) + '…'];
}
