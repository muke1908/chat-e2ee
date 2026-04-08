/**
 * URL hash handling utilities
 */

/**
 * Extract hash from current URL
 */
export function getUrlHash(): string {
  return window.location.hash.replace('#', '');
}

/**
 * Update URL with hash
 */
export function updateUrlHash(hash: string): void {
  if (hash) {
    window.location.hash = hash;
  }
}

/**
 * Check if URL contains a valid hash
 */
export function hasValidHash(): boolean {
  const hash = getUrlHash();
  return hash.length > 5;
}
