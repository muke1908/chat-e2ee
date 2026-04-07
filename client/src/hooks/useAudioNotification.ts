/**
 * Custom hook for audio notifications
 */

import { useCallback } from 'react';
import { playBeep } from '../utils/audioNotification';

export const useAudioNotification = () => {
  const notify = useCallback(() => {
    playBeep();
  }, []);

  return { notify };
};
