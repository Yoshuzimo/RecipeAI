
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './use-toast';

const RATE_LIMIT = 3; // requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

const requestTimestamps: number[] = [];

export function useRateLimiter() {
  const { toast } = useToast();
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [timeToWait, setTimeToWait] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer(); // Cleanup timer on unmount
  }, []);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length >= RATE_LIMIT) {
      const waitTime = Math.ceil((requestTimestamps[0] + RATE_LIMIT_WINDOW - now) / 1000);
      setTimeToWait(waitTime);
      setIsRateLimited(true);
      
      toast({
        variant: "destructive",
        title: "You're doing that a bit too fast!",
        description: `Please wait ${waitTime} more seconds before trying again.`,
      });

      // Start a countdown timer
      clearTimer();
      timerRef.current = setInterval(() => {
        setTimeToWait(prev => {
          if (prev <= 1) {
            clearTimer();
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return false;
    }

    setIsRateLimited(false);
    setTimeToWait(0);
    return true;
  }, [toast]);

  const recordRequest = useCallback(() => {
    const now = Date.now();
    requestTimestamps.push(now);
  }, []);

  return { isRateLimited, timeToWait, checkRateLimit, recordRequest };
}
