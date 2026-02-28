/**
 * Tab layout — wires up the FloatingTabBar custom renderer
 * and hides the default header chrome on every tab.
 */
import { Tabs } from 'expo-router';
import FloatingTabBar from '../../components/ui/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
      <Tabs.Screen name="submit" options={{ title: 'Rate' }} />
      <Tabs.Screen name="detect" options={{ title: 'Detect' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* Hide extra files from appearing as tabs */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
