
"use client";

import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

const RATE_LIMIT = 3; // requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

// This is a simple in-memory store. For a real app with users,
// this would be stored in a more persistent way (e.g., localStorage
// or even a server-side store tied to the user's session).
const requestTimestamps: number[] = [];

export function useRateLimiter() {
  const { toast } = useToast();
  const [isRateLimited, setIsRateLimited] = useState(false);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    // Remove timestamps that are outside the time window
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length >= RATE_LIMIT) {
      const timeToWait = Math.ceil((requestTimestamps[0] + RATE_LIMIT_WINDOW - now) / 1000);
      toast({
        variant: "destructive",
        title: "You're doing that a bit too fast!",
        description: `Please wait ${timeToWait} more seconds before trying again.`,
      });
      setIsRateLimited(true);
      return false;
    }

    setIsRateLimited(false);
    return true;
  }, [toast]);

  const recordRequest = useCallback(() => {
    const now = Date.now();
    requestTimestamps.push(now);
  }, []);

  return { isRateLimited, checkRateLimit, recordRequest };
}
