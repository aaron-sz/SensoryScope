import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkColors, LightColors } from '../constants/theme';
import { supabase } from '../lib/supabase';

const ONBOARDING_KEY = 'sensoryscope_onboarding_v1';

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
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  const segments = useSegments();
  const router = useRouter();

  // Track whether we've already done a redirect to avoid loops
  const hasRedirected = useRef(false);
  // Prevent re-redirecting to onboarding after user completes it in the same session
  const onboardingRedirected = useRef(false);

  useEffect(() => {
    // Check onboarding completion in parallel with auth
    SecureStore.getItemAsync(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });

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
    if (loading || !navigationReady || onboardingDone === null) return;

    const onOnboarding = segments[0] === 'onboarding';
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

    // Show onboarding on first launch (guard prevents re-redirect after completion)
    if (!onboardingDone && !onOnboarding && !onboardingRedirected.current) {
      onboardingRedirected.current = true;
      router.replace('/onboarding' as any);
      return;
    }

    // GUEST-FRIENDLY: Only redirect away from auth screens if the user has a session.
    if (session && onAuthScreen) {
      router.replace('/(tabs)' as any);
      hasRedirected.current = true;
    }
  }, [session, loading, segments, navigationReady, onboardingDone]);

  if (loading || onboardingDone === null) {
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
              <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
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
