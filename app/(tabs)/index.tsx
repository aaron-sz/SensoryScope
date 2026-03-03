/**
 * Index route — redirects to Explore tab.
 * Expo Router requires an index file in each directory.
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/explore" />;
}
