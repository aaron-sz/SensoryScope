/**
 * Explore Screen
 * 
 * Curated list of sensory-friendly spots, sorted by their "Calmness" score.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radius, Shadows, Spacing, Typography, scoreColor } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Location = {
  id: number;
  name: string;
  description: string;
  avg_sound: number;
  avg_light: number;
  avg_crowd: number;
  review_count: number;
};

export default function ExploreScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTopSpots();
  }, []);

  const fetchTopSpots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('avg_sound', { ascending: true }) // Quieter first
      .limit(10);

    if (error) {
      console.error('Error fetching explore spots:', error);
    } else {
      setLocations(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const renderItem = ({ item, index }: { item: Location; index: number }) => {
    const overall = ((item.avg_sound + item.avg_light + item.avg_crowd) / 3).toFixed(1);
    const color = scoreColor(parseFloat(overall));

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).springify()}
        style={styles.cardContainer}
      >
        <Pressable style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.badgeText, { color }]}>{overall}</Text>
              </View>
            </View>

            <Text style={styles.cardSub} numberOfLines={2}>
              {item.description || 'No description available for this peaceful spot.'}
            </Text>

            <View style={styles.statsRow}>
              <Stat icon="volume-low" value={item.avg_sound.toFixed(1)} label="Sound" />
              <Stat icon="sunny" value={item.avg_light.toFixed(1)} label="Light" />
              <Stat icon="people" value={item.avg_crowd.toFixed(1)} label="Crowd" />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
        </Pressable>
      </Animated.View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[Colors.bg, Colors.surface]} style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h1}>Explore Spots</Text>
        <Text style={Typography.caption}>The calmest places near you, ranked by the community.</Text>
      </View>

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onRefresh={() => {
          setRefreshing(true);
          fetchTopSpots();
        }}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color={Colors.textDim} />
            <Text style={styles.emptyText}>No rated spots found yet.</Text>
            <Text style={styles.emptySub}>Be the first to rate a location!</Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

function Stat({ icon, value, label }: { icon: any, value: string, label: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={14} color={Colors.textMuted} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  cardContainer: {
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardContent: { flex: 1, marginRight: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textDim,
  },
});
