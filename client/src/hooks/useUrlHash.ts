/**
 * Custom hook for URL hash management
 */

import { useEffect, useState } from 'react';
import { getUrlHash, updateUrlHash, hasValidHash } from '../utils/urlHash';

export const useUrlHash = () => {
  const [hash, setHash] = useState<string>('');

  useEffect(() => {
    const initialHash = getUrlHash();
    if (hasValidHash()) {
      setHash(initialHash);
    }
  }, []);

  const updateHash = (newHash: string) => {
    setHash(newHash);
    updateUrlHash(newHash);
  };

  return {
    hash,
    setHash,
    updateHash,
    hasValidHash: hasValidHash(),
  };
};
