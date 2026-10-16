const SHARE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/

/** Extract a share id from a location search string (`?share=…`), or null. */
export function shareIdFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get('share')
  return id && SHARE_ID_PATTERN.test(id) ? id : null
}

/** Build the share URL for a given share id. */
export function buildShareUrl(
  id: string,
  location: { origin: string; pathname: string },
): string {
  return `${location.origin}${location.pathname}?share=${encodeURIComponent(id)}`
}
