/**
 * Custom hook for call state management
 */

import { useState, useEffect, useCallback } from 'react';

export const useCallTimer = () => {
  const [duration, setDuration] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setDuration(0);
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  return {
    duration,
    setDuration,
    startTimer,
    stopTimer,
    formatDuration,
  };
};
