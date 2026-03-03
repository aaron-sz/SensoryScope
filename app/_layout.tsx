import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkColors, LightColors } from '../constants/theme';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  isGuest: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, isGuest: true });

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [navigationReady, setNavigationReady] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // Track whether we've already done a redirect to avoid loops
  const hasRedirected = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      hasRedirected.current = false; // Reset so new auth changes can redirect
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || !navigationReady) return;

    const onAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

    // GUEST-FRIENDLY: Only redirect away from auth screens if the user has a session.
    // We no longer force unauthenticated users away from the tabs — they are guests.
    if (session && onAuthScreen) {
      router.replace('/(tabs)' as any);
      hasRedirected.current = true;
    }
  }, [session, loading, segments, navigationReady]);

  if (loading) {
    const C = isDark ? DarkColors : LightColors;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthContext.Provider value={{ session, isGuest: !session }}>
          <View style={{ flex: 1 }} onLayout={() => setNavigationReady(true)}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="signup" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </View>
        </AuthContext.Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
