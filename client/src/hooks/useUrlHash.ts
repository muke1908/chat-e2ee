/**
 * Custom hook for invite-fragment URL management
 * (`#room=<public-room-id>&secret=<secret>`).
 */

import { useEffect, useState } from 'react';
import { getUrlInvite, updateUrlInvite, hasValidInvite, type ParsedInvite } from '../utils/urlHash';

export const useUrlHash = () => {
  const [invite, setInvite] = useState<ParsedInvite | null>(null);

  useEffect(() => {
    if (hasValidInvite()) {
      setInvite(getUrlInvite());
    }
  }, []);

  const updateInvite = (roomId: string, secret: string) => {
    setInvite({ roomId, secret });
    updateUrlInvite(roomId, secret);
  };

  return {
    invite,
    setInvite,
    updateInvite,
    hasValidInvite: hasValidInvite(),
  };
};
