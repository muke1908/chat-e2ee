/**
 * Invitation-fragment URL handling utilities.
 *
 * Invitations are carried as `#room=<public-room-id>&secret=<base64url secret>`.
 * Browsers never send the URL fragment as part of an HTTP request, so the
 * secret parsed/written here never reaches the server.
 */

export interface ParsedInvite {
  roomId: string;
  secret: string;
}

/** Parse `#room=...&secret=...` from the current URL, if present. */
export function getUrlInvite(): ParsedInvite | null {
  return parseInviteFragment(window.location.hash);
}

/** Parse a raw fragment string (with or without the leading `#`) into a room id + secret. */
export function parseInviteFragment(fragment: string): ParsedInvite | null {
  if (!fragment) {
    return null;
  }
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const params = new URLSearchParams(raw);
  const roomId = params.get('room');
  const secret = params.get('secret');
  if (!roomId || !secret) {
    return null;
  }
  return { roomId, secret };
}

/**
 * Parse a full invite string, which may be:
 *  - a full URL (e.g. pasted from the address bar) with a `#room=...&secret=...` fragment,
 *  - or a bare fragment (e.g. `room=...&secret=...` or `#room=...&secret=...`).
 */
export function parseInviteInput(input: string): ParsedInvite | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const hashIndex = trimmed.indexOf('#');
  const fragment = hashIndex >= 0 ? trimmed.slice(hashIndex) : trimmed;
  return parseInviteFragment(fragment);
}

/** Update the URL with the invitation fragment, without a page reload. */
export function updateUrlInvite(roomId: string, secret: string): void {
  if (!roomId || !secret) {
    return;
  }
  window.location.hash = `room=${encodeURIComponent(roomId)}&secret=${encodeURIComponent(secret)}`;
}

/** Whether the current URL contains a parseable invite fragment. */
export function hasValidInvite(): boolean {
  return getUrlInvite() !== null;
}
