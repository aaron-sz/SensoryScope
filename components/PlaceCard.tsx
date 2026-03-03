/**
 * PlaceCard
 * A rich card showing a Google Place with photo, name, rating, distance, and open status.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Radius, Spacing, useColors } from '../constants/theme';

const PHOTO_SIZE = Math.round(Dimensions.get('window').width * 0.22);

export type PlaceData = {
    place_id: string;
    name: string;
    vicinity: string;
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: { open_now?: boolean };
    photos?: { photo_reference: string }[];
    geometry: { location: { lat: number; lng: number } };
    types?: string[];
    // Computed client-side
    distance_mi?: number;
};

type Props = {
    place: PlaceData;
    onPress: (place: PlaceData) => void;
};

function getPhotoUrl(ref: string, maxWidth = 400): string {
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${ref}&key=${key}`;
}

function getCategoryLabel(types?: string[]): string {
    if (!types?.length) return '';
    const map: Record<string, string> = {
        restaurant: '🍽️ Restaurant',
        cafe: '☕ Cafe',
        library: '📚 Library',
        park: '🌳 Park',
        shopping_mall: '🛍️ Shopping',
        store: '🛍️ Store',
        gym: '💪 Gym',
        bar: '🍸 Bar',
        movie_theater: '🎬 Theater',
        museum: '🏛️ Museum',
        supermarket: '🛒 Supermarket',
    };
    for (const t of types) {
        if (map[t]) return map[t];
    }
    return '';
}

export default function PlaceCard({ place, onPress }: Props) {
    const C = useColors();
    const photoRef = place.photos?.[0]?.photo_reference;
    const category = getCategoryLabel(place.types);
    const isOpen = place.opening_hours?.open_now;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onPress(place)}
            style={[styles.card, { backgroundColor: C.elevated, borderColor: C.border }]}
        >
            {/* Photo */}
            {photoRef ? (
                <Image
                    source={{ uri: getPhotoUrl(photoRef) }}
                    style={styles.photo}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: C.surface }]}>
                    <Ionicons name="image-outline" size={32} color={C.textDim} />
                </View>
            )}

            {/* Info */}
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                        {place.name}
                    </Text>
                    {category ? (
                        <Text style={[styles.category, { color: C.textMuted }]}>{category}</Text>
                    ) : null}
                </View>

                <Text style={[styles.address, { color: C.textMuted }]} numberOfLines={1}>
                    {place.vicinity}
                </Text>

                <View style={styles.metaRow}>
                    {/* Rating */}
                    {place.rating != null && (
                        <View style={styles.ratingChip}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={[styles.ratingText, { color: C.text }]}>
                                {place.rating.toFixed(1)}
                            </Text>
                            {place.user_ratings_total != null && (
                                <Text style={[styles.ratingCount, { color: C.textMuted }]}>
                                    ({place.user_ratings_total})
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Distance */}
                    {place.distance_mi != null && (
                        <View style={styles.metaChip}>
                            <Ionicons name="navigate-outline" size={12} color={C.accent} />
                            <Text style={[styles.metaText, { color: C.textMuted }]}>
                                {place.distance_mi < 0.1
                                    ? `${Math.round(place.distance_mi * 5280)} ft`
                                    : `${place.distance_mi.toFixed(1)} mi`}
                            </Text>
                        </View>
                    )}

                    {/* Open/Closed */}
                    {isOpen != null && (
                        <View style={styles.metaChip}>
                            <View style={[styles.openDot, { backgroundColor: isOpen ? '#10B981' : '#F43F5E' }]} />
                            <Text style={[styles.metaText, { color: isOpen ? '#10B981' : '#F43F5E' }]}>
                                {isOpen ? 'Open' : 'Closed'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={C.textDim} style={styles.arrow} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    photo: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
    },
    photoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        flexShrink: 1,
    },
    category: {
        fontSize: 11,
        fontWeight: '500',
    },
    address: {
        fontSize: 12,
        lineHeight: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 2,
    },
    ratingChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
    },
    ratingCount: {
        fontSize: 11,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '500',
    },
    openDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    arrow: {
        marginRight: Spacing.sm,
    },
});
