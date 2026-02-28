/**
 * PlaceSearchBar
 * A frosted search bar with a live-filtered dropdown.
 * Tap to open → type to filter → tap a result → map jumps to it.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Colors, Radius, Shadows, Spacing } from '../constants/theme';
import { DisplayLocation } from './LocationModal';

const BAR_HEIGHT = 46;

type Props = {
  locations: DisplayLocation[];
  onSelect: (loc: DisplayLocation) => void;
};

export default function PlaceSearchBar({ locations, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q)
    );
  }, [locations, query]);

  const openBar = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const closeBar = () => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleSelect = (loc: DisplayLocation) => {
    closeBar();
    onSelect(loc);
  };

  return (
    <View style={styles.wrapper}>
      {/* ── Bar ── */}
      <Pressable
        style={[styles.bar, open && styles.barActive]}
        onPress={open ? undefined : openBar}
      >
        <Ionicons
          name="search"
          size={16}
          color={open ? Colors.accent : Colors.textMuted}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search places…"
          placeholderTextColor={Colors.textDim}
          value={query}
          onChangeText={setQuery}
          editable={open}
          pointerEvents={open ? 'auto' : 'none'}
        />
        {open ? (
          <Pressable onPress={closeBar} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={16} color={Colors.textDim} />
        )}
      </Pressable>

      {/* ── Dropdown ── */}
      {open && (
        <Animated.View
          entering={FadeInDown.duration(160).springify().damping(22)}
          exiting={FadeOut.duration(120)}
          style={styles.dropdown}
        >
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No places found</Text>
            ) : (
              filtered.map((loc) => (
                <Pressable
                  key={loc.id}
                  style={styles.item}
                  onPress={() => handleSelect(loc)}
                >
                  <Ionicons
                    name="location"
                    size={14}
                    color={Colors.accent}
                    style={styles.itemIcon}
                  />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {loc.name}
                    </Text>
                    {!!loc.description && (
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {loc.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textDim} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // zIndex keeps the dropdown above the FAB and other overlays
    zIndex: 20,
    elevation: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  barActive: {
    borderColor: Colors.accent,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    padding: 0,
  },
  dropdown: {
    position: 'absolute',
    top: BAR_HEIGHT + 6,
    left: 0,
    right: 0,
    backgroundColor: Colors.elevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    elevation: 20,
    zIndex: 30,
    ...Shadows.card,
  },
  list: { maxHeight: 280 },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    padding: Spacing.lg,
    fontSize: 13,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  itemIcon: { marginTop: 1 },
  itemBody: { flex: 1 },
  itemName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
});
