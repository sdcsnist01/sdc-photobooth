/**
 * Generates a cryptographically secure, unguessable session token.
 * Uses the browser's built-in CSPRNG — no external library needed.
 * UUID v4 has 122 bits of entropy (2^122 possible values).
 */
export function generateSecureToken(): string {
  return crypto.randomUUID()
}
