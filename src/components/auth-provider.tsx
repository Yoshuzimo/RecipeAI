
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase'; // Assuming firebase is initialized here
import { Skeleton } from './ui/skeleton';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthProvider: Auth state changed. User:', user?.uid || 'null');
      setUser(user);
      setLoading(false);
      
      // Handle session cookie logic
      if (user) {
        try {
          const token = await user.getIdToken();
          console.log('AuthProvider: Got ID token. Sending to /api/auth/session...');
          // Send token to your backend to create a session cookie
          const response = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ idToken: token })
          });
          console.log('AuthProvider: /api/auth/session response status:', response.status);
          if (!response.ok) {
            console.error('AuthProvider: Failed to create session cookie.');
          } else {
            console.log('AuthProvider: Session cookie request sent successfully.');
          }
        } catch (error) {
            console.error('AuthProvider: Error getting ID token or creating session', error);
        }
      } else {
        // Clear the session cookie on logout
         console.log('AuthProvider: User is null, sending DELETE to /api/auth/session.');
         await fetch('/api/auth/session', { method: 'DELETE' });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="space-y-4 w-1/2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    )
  }

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};
