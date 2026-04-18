import React, {createContext, useState, useEffect} from 'react';
import { supabase } from './services/supabaseClient';
import { getOrCreateDatabaseUser } from './services/userMappingService';

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize userId from Supabase session on app startup
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // First check localStorage for cached userId
        const storedUserId = localStorage.getItem('userId');

        // Then verify Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // We have an active Supabase session
          if (storedUserId) {
            // Use cached userId if available
            setUserId(storedUserId);
          } else {
            // Fetch/create the legacy userId mapping
            const legacyUserId = await getOrCreateDatabaseUser();
            if (legacyUserId) {
              localStorage.setItem('userId', `${legacyUserId}`);
              setUserId(legacyUserId);
            }
          }
        } else if (storedUserId) {
          // No Supabase session but have cached userId - clear it
          localStorage.removeItem('userId');
          setUserId(null);
        }
      } catch (error) {
        console.error('Failed to initialize user:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeUser();
  }, []);

  return (
    <UserContext.Provider value={{ userId, setUserId, isInitialized }}>
      {children}
    </UserContext.Provider>
  );
};

export {UserContext, UserProvider};