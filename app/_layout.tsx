import { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<{ session: Session | null }>({ session: null });

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) {
     return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <ActivityIndicator size="large" />
        </View>
     )
  }

  return (
    <AuthContext.Provider value={{ session }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthContext.Provider>
  );
}
