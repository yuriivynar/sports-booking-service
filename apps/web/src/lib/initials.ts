/** "Олена Коваль" → "ОК"; one word or an email → its first two letters. */
export function initials(name: string | null | undefined, fallback = ''): string {
  const source = name?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}
