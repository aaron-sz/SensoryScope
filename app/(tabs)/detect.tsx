/**
 * Detect tab — removed. This file exists to prevent Expo Router errors.
 */
import { Redirect } from 'expo-router';

export default function Detect() {
    return <Redirect href="/(tabs)/explore" />;
}
