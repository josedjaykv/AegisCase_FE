/**
 * First word of a name, capped at `max` characters (default 10) with an
 * ellipsis when truncated. Keeps compact surfaces (task cards) from breaking on
 * long names — e.g. "Jose David Jayk Vanegas" → "Jose", "Bartholomew" → "Bartholome…".
 */
export function shortFirstName(name: string | null | undefined, max = 10): string {
  if (!name) return 'Unknown';
  const first = name.trim().split(/\s+/)[0] ?? '';
  if (!first) return 'Unknown';
  return first.length > max ? `${first.slice(0, max)}…` : first;
}

/**
 * Compact "first name + last initial" label — e.g. "Jose David Jayk Vanegas"
 * → "Jose V.". Single-word names are returned unchanged. Used where a selected
 * full name would overflow a tight control (the assignee filter trigger).
 */
export function abbreviateName(name: string | null | undefined): string {
  if (!name) return 'Unknown';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Unknown';
  if (words.length === 1) return words[0]!;
  const first = words[0]!;
  const lastInitial = words[words.length - 1]![0]!.toUpperCase();
  return `${first} ${lastInitial}.`;
}
