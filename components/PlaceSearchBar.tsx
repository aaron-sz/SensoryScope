/**
 * PlaceSearchBar
 * Frosted search bar using Google Places Autocomplete.
 * Results are sorted by distance from the user's location.
 * Scrollable dropdown with distance labels.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Radius, Shadows, Spacing, useColors } from '../constants/theme';
import { DisplayLocation } from './LocationModal';

const BAR_HEIGHT = 46;

type Props = {
  locations: DisplayLocation[];
  onSelect: (loc: DisplayLocation) => void;
  userLocation?: { latitude: number; longitude: number } | null;
};

type Prediction = {
  place_id: string;
  description: string;
  distance_meters?: number;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

/** Quick haversine distance in meters between two lat/lng points */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

export default function PlaceSearchBar({ onSelect, userLocation }: Props) {
  const C = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => fetchPredictions(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchPredictions = async (text: string) => {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) return;

    setLoading(true);
    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${API_KEY}`;

      if (userLocation) {
        url += `&location=${userLocation.latitude},${userLocation.longitude}&radius=20000&origin=${userLocation.latitude},${userLocation.longitude}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (json.predictions) {
        // Google returns distance_meters when origin is set — sort by it
        const sorted = [...json.predictions].sort((a: any, b: any) => {
          const distA = a.distance_meters ?? Infinity;
          const distB = b.distance_meters ?? Infinity;
          return distA - distB;
        });
        setResults(sorted);
      }
    } catch (e) {
      console.warn('Autocomplete error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openBar = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const closeBar = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
  };

  const handleSelectPrediction = async (prediction: Prediction) => {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) return;

    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name,vicinity&key=${API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.result?.geometry) {
        const place = json.result;
        const newLoc: DisplayLocation = {
          id: prediction.place_id,
          name: place.name,
          description: place.vicinity || prediction.structured_formatting.secondary_text,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          avg_sound: null,
          avg_light: null,
          avg_crowd: null,
          review_count: 0,
        };
        closeBar();
        onSelect(newLoc);
      }
    } catch (e) {
      console.warn('Place Details error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item: pred }: { item: Prediction }) => {
    const distLabel = pred.distance_meters
      ? formatDistance(pred.distance_meters)
      : userLocation
        ? null
        : null;

    return (
      <Pressable
        style={[styles.item, { borderBottomColor: C.border }]}
        onPress={() => handleSelectPrediction(pred)}
      >
        <Ionicons name="location" size={16} color={C.accent} style={styles.itemIcon} />
        <View style={styles.itemBody}>
          <Text style={[styles.itemName, { color: C.text }]} numberOfLines={1}>
            {pred.structured_formatting.main_text}
          </Text>
          {!!pred.structured_formatting.secondary_text && (
            <Text style={[styles.itemSub, { color: C.textMuted }]} numberOfLines={1}>
              {pred.structured_formatting.secondary_text}
            </Text>
          )}
        </View>
        {distLabel && (
          <Text style={[styles.distLabel, { color: C.accent }]}>{distLabel}</Text>
        )}
        <Ionicons name="chevron-forward" size={14} color={C.textDim} />
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* ── Bar ── */}
      <Pressable
        style={[
          styles.bar,
          { backgroundColor: C.elevated, borderColor: C.border },
          open && { borderColor: C.accent }
        ]}
        onPress={open ? undefined : openBar}
      >
        <Ionicons name="search" size={18} color={open ? C.accent : C.textMuted} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: C.text }]}
          placeholder="Search places..."
          placeholderTextColor={C.textDim}
          value={query}
          onChangeText={setQuery}
          editable={open}
          pointerEvents={open ? 'auto' : 'none'}
          returnKeyType="search"
        />
        {loading && open ? (
          <ActivityIndicator size="small" color={C.accent} style={{ marginRight: 6 }} />
        ) : null}
        {open ? (
          <Pressable onPress={closeBar} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={C.textMuted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={C.textDim} />
        )}
      </Pressable>

      {/* ── Dropdown ── */}
      {open && (
        <Animated.View
          entering={FadeInDown.duration(160).springify().damping(22)}
          exiting={FadeOut.duration(120)}
          style={[styles.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          {results.length === 0 && !loading && query.length > 0 ? (
            <Text style={[styles.empty, { color: C.textMuted }]}>No places found</Text>
          ) : results.length === 0 && !loading ? (
            <Text style={[styles.empty, { color: C.textMuted }]}>Type to search...</Text>
          ) : (
            <FlatList
              data={results}
              renderItem={renderItem}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              style={styles.list}
              nestedScrollEnabled={true}
            />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 20,
    elevation: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: BAR_HEIGHT,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Shadows.card,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  dropdown: {
    position: 'absolute',
    top: BAR_HEIGHT + 6,
    left: 0,
    right: 0,
    maxHeight: 350,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 30,
    ...Shadows.card,
    elevation: 30,
  },
  list: {
    maxHeight: 340,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.lg,
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm + 2,
  },
  itemIcon: { marginTop: 1 },
  itemBody: { flex: 1 },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  distLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
});
