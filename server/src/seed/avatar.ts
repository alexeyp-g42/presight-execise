export const HUE_COUNT = 12;

/**
 * Anything outside A-Z becomes `X` so the generated path always satisfies the
 * avatar route's pattern. Without this, a name starting with an accented
 * character would produce a URL that 404s.
 */
function initial(name: string): string {
  const char = name.trim().charAt(0).toUpperCase();
  return char >= 'A' && char <= 'Z' ? char : 'X';
}

/** FNV-1a: small, fast, and stable across runs and platforms. */
export function hueFor(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // `>>> 0` rather than Math.abs: Math.abs(-2147483648) is still negative.
  return (hash >>> 0) % HUE_COUNT;
}

export function avatarPath(firstName: string, lastName: string): string {
  const initials = `${initial(firstName)}${initial(lastName)}`;
  return `/api/avatars/${initials}-${hueFor(`${firstName} ${lastName}`)}.svg`;
}
