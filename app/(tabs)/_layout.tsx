import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#2f95dc',
      headerShown: true
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'SensoryScope',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Rate Place',
          tabBarLabel: 'Rate',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
