import makeRequest from './client';
import { generateInviteSecret } from '../crypto/inviteCrypto';
import type { LinkObjType } from '../public/types';

type ServerLinkResponse = { hash: string, expired: boolean, deleted: boolean };

/**
 * Builds the invitation fragment `#room=<hash>&secret=<secret>`. Fragments
 * are never sent by the browser as part of an HTTP request, so this is the
 * only place the secret is combined with the room id — and it happens
 * entirely on this device.
 */
const buildInviteLink = (roomId: string, secret: string): { link: string, absoluteLink: string | undefined } => {
  const fragment = `#room=${encodeURIComponent(roomId)}&secret=${encodeURIComponent(secret)}`;
  const hasWindow = typeof window !== 'undefined' && !!window.location;
  const path = hasWindow ? `${window.location.pathname}${fragment}` : fragment;
  const absoluteLink = hasWindow ? `${window.location.origin}${path}` : undefined;
  return { link: path, absoluteLink };
};

/**
 * Create a new chat room and generate a fresh client-side invitation secret.
 * The secret is 256 bits of local randomness and is never sent to the
 * server — only the server-issued room id is exchanged over the network.
 */
export const getLink = async (): Promise<LinkObjType> => {
  const { hash, expired, deleted } = await makeRequest<ServerLinkResponse>('chat-link', {
    method: 'POST'
  });
  const secret = generateInviteSecret();
  const { link, absoluteLink } = buildInviteLink(hash, secret);
  return { hash, secret, link, absoluteLink, expired, deleted };
};

/** Delete a chat link/channel. */
export const deleteLink = async ({ channelID }: { channelID?: string }): Promise<unknown> => {
  return makeRequest<unknown>(`/chat-link/${channelID}`, {
    method: 'DELETE'
  });
};
