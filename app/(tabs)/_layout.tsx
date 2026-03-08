/**
 * Tab layout — 4-tab structure: Explore, Map, Rate, Profile.
 */
import { Tabs } from 'expo-router';
import FloatingTabBar from '../../components/ui/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="submit" options={{ title: 'Rate' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* Hide removed routes if they still exist in file system */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="detect" options={{ href: null }} />
    </Tabs>
  );
}
