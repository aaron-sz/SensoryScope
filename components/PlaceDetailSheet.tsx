/**
 * PlaceDetailSheet
 * Full-screen bottom sheet with:
 *  - Hero photo from Google Places
 *  - Rating & open/closed status
 *  - Live sensory scores from Supabase place_reviews
 *  - User reviews list
 *  - Inline review form (noise/light/crowd sliders + comment)
 *  - Google Maps + Apple Maps deep links
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, useColors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { PlaceData } from './PlaceCard';

type Props = {
    place: PlaceData;
    onClose: () => void;
};

type Review = {
    id: number;
    sound_rating: number;
    light_rating: number;
    crowd_rating: number;
    comment: string;
    created_at: string;
    place_name: string;
};

export default function PlaceDetailSheet({ place, onClose }: Props) {
    const C = useColors();
    const insets = useSafeAreaInsets();
    const photoRef = place.photos?.[0]?.photo_reference;
    const isOpen = place.opening_hours?.open_now;

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Review form state
    const [noise, setNoise] = useState(5);
    const [light, setLight] = useState(5);
    const [crowd, setCrowd] = useState(5);
    const [comment, setComment] = useState('');

    useEffect(() => {
        fetchReviews();
    }, [place.place_id]);

    const fetchReviews = async () => {
        setLoadingReviews(true);
        const { data, error } = await supabase
            .from('place_reviews')
            .select('*')
            .eq('place_id', place.place_id)
            .order('created_at', { ascending: false });

        if (data) setReviews(data);
        setLoadingReviews(false);
    };

    // Calculate averages from reviews
    const avgNoise = reviews.length > 0 ? reviews.reduce((s, r) => s + r.sound_rating, 0) / reviews.length : null;
    const avgLight = reviews.length > 0 ? reviews.reduce((s, r) => s + r.light_rating, 0) / reviews.length : null;
    const avgCrowd = reviews.length > 0 ? reviews.reduce((s, r) => s + r.crowd_rating, 0) / reviews.length : null;

    const submitReview = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            Alert.alert('Sign in required', 'Go to Profile tab to sign in before submitting reviews.');
            return;
        }

        setSubmitting(true);
        const { error } = await supabase.from('place_reviews').insert({
            place_id: place.place_id,
            place_name: place.name,
            user_id: session.user.id,
            sound_rating: noise,
            light_rating: light,
            crowd_rating: crowd,
            comment: comment.trim(),
        });

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setShowReviewForm(false);
            setNoise(5);
            setLight(5);
            setCrowd(5);
            setComment('');
            Keyboard.dismiss();
            fetchReviews();
        }
        setSubmitting(false);
    };

    const openInMaps = (provider: 'google' | 'apple') => {
        const { lat, lng } = place.geometry.location;
        const label = encodeURIComponent(place.name);
        let url = '';
        if (provider === 'google') {
            url = Platform.select({
                android: `google.navigation:q=${lat},${lng}`,
                ios: `comgooglemaps://?daddr=${lat},${lng}&q=${label}`,
                default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
            })!;
        } else {
            url = `maps://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
        }
        Linking.canOpenURL(url).then((ok) => {
            if (ok) Linking.openURL(url);
            else Linking.openURL(
                provider === 'google'
                    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                    : `http://maps.apple.com/?daddr=${lat},${lng}`
            );
        });
    };

    const scoreColor = (val: number) =>
        val <= 3 ? '#10B981' : val <= 6 ? '#F59E0B' : '#F43F5E';

    return (
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} pointerEvents="box-none">
            <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop} />

            <Animated.View
                entering={SlideInDown.springify().damping(20).stiffness(150)}
                exiting={SlideOutDown.duration(200)}
                style={[styles.sheet, { backgroundColor: C.elevated, paddingBottom: insets.bottom + 20 }]}
            >
                <View style={[styles.handle, { backgroundColor: C.border }]} />

                <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
                    {/* Hero + Close button wrapper */}
                    <View style={styles.heroWrapper}>
                        {photoRef ? (
                            <Image
                                source={{ uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}` }}
                                style={styles.heroPhoto}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.heroPhoto, { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }]}>
                                <Ionicons name="image-outline" size={48} color={C.textDim} />
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.closeBtn, { backgroundColor: C.surface }]}
                            hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
                        >
                            <Ionicons name="close" size={20} color={C.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={[styles.name, { color: C.text }]}>{place.name}</Text>
                        <Text style={[styles.address, { color: C.textMuted }]}>{place.vicinity}</Text>

                        {/* Meta chips */}
                        <View style={styles.metaRow}>
                            {place.rating != null && (
                                <View style={[styles.chip, { backgroundColor: '#F59E0B22' }]}>
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text style={[styles.chipText, { color: '#F59E0B' }]}>
                                        {place.rating.toFixed(1)} ({place.user_ratings_total ?? 0})
                                    </Text>
                                </View>
                            )}
                            {place.distance_mi != null && (
                                <View style={[styles.chip, { backgroundColor: C.accent + '22' }]}>
                                    <Ionicons name="navigate" size={14} color={C.accent} />
                                    <Text style={[styles.chipText, { color: C.accent }]}>{place.distance_mi.toFixed(1)} mi</Text>
                                </View>
                            )}
                            {isOpen != null && (
                                <View style={[styles.chip, { backgroundColor: (isOpen ? '#10B981' : '#F43F5E') + '22' }]}>
                                    <Text style={[styles.chipText, { color: isOpen ? '#10B981' : '#F43F5E' }]}>
                                        {isOpen ? '● Open' : '● Closed'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ── Sensory Scores ── */}
                        <View style={[styles.section, { borderColor: C.border }]}>
                            <Text style={[styles.sectionTitle, { color: C.text }]}>Sensory Profile</Text>
                            {reviews.length === 0 ? (
                                <Text style={[styles.noScores, { color: C.textMuted }]}>
                                    No sensory ratings yet — be the first!
                                </Text>
                            ) : (
                                <View style={styles.sensoryGrid}>
                                    <SensoryBar label="Noise" score={avgNoise!} color={scoreColor(avgNoise!)} icon="volume-low" />
                                    <SensoryBar label="Light" score={avgLight!} color={scoreColor(avgLight!)} icon="sunny" />
                                    <SensoryBar label="Crowd" score={avgCrowd!} color={scoreColor(avgCrowd!)} icon="people" />
                                </View>
                            )}
                            <Text style={[styles.reviewCount, { color: C.textDim }]}>{reviews.length} sensory review{reviews.length !== 1 ? 's' : ''}</Text>
                        </View>

                        {/* ── Reviews ── */}
                        <View style={[styles.section, { borderColor: C.border }]}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: C.text }]}>Reviews</Text>
                                <TouchableOpacity onPress={() => setShowReviewForm(!showReviewForm)}>
                                    <Text style={[styles.addReviewBtn, { color: C.accent }]}>
                                        {showReviewForm ? 'Cancel' : '+ Add Review'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Inline review form */}
                            {showReviewForm && (
                                <View style={[styles.reviewForm, { backgroundColor: C.surface, borderColor: C.border }]}>
                                    <SliderRow label="🔊 Noise" value={noise} onChange={setNoise} />
                                    <SliderRow label="💡 Light" value={light} onChange={setLight} />
                                    <SliderRow label="👥 Crowd" value={crowd} onChange={setCrowd} />

                                    <TextInput
                                        style={[styles.commentInput, { color: C.text, borderColor: C.border, backgroundColor: C.elevated }]}
                                        placeholder="How does this place feel? (optional)"
                                        placeholderTextColor={C.textDim}
                                        value={comment}
                                        onChangeText={setComment}
                                        multiline
                                        maxLength={500}
                                    />

                                    <TouchableOpacity
                                        style={[styles.submitBtn, { backgroundColor: C.accent }]}
                                        onPress={submitReview}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.submitBtnText}>Submit Review</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Review list */}
                            {loadingReviews ? (
                                <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                            ) : reviews.length === 0 ? (
                                <Text style={[styles.noScores, { color: C.textMuted }]}>No reviews yet.</Text>
                            ) : (
                                reviews.slice(0, 10).map((r) => (
                                    <View key={r.id} style={[styles.reviewItem, { borderColor: C.border }]}>
                                        <View style={styles.reviewScores}>
                                            <MiniScore label="🔊" val={r.sound_rating} />
                                            <MiniScore label="💡" val={r.light_rating} />
                                            <MiniScore label="👥" val={r.crowd_rating} />
                                        </View>
                                        {!!r.comment && <Text style={[styles.reviewComment, { color: C.text }]}>{r.comment}</Text>}
                                        <Text style={[styles.reviewDate, { color: C.textDim }]}>
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* ── Maps Buttons ── */}
                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: '#4285F4' }]} onPress={() => openInMaps('google')}>
                                <Ionicons name="logo-google" size={18} color="#fff" />
                                <Text style={styles.mapBtnText}>Google Maps</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: '#000' }]} onPress={() => openInMaps('apple')}>
                                <Ionicons name="logo-apple" size={18} color="#fff" />
                                <Text style={styles.mapBtnText}>Apple Maps</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </Animated.View>
        </Animated.View>
    );
}

// ── Sub-components ──

function SensoryBar({ label, score, color, icon }: { label: string; score: number; color: string; icon: any }) {
    const C = useColors();
    const pct = (score / 10) * 100;
    return (
        <View style={styles.sensoryItem}>
            <View style={styles.sensoryLabelRow}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={[styles.sensoryLabel, { color: C.textMuted }]}>{label}</Text>
                <Text style={[styles.sensoryScore, { color }]}>{score.toFixed(1)}</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: C.surface }]}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
    const C = useColors();
    return (
        <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: C.text }]}>{label}</Text>
            <View style={styles.sliderBtns}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <TouchableOpacity
                        key={n}
                        onPress={() => onChange(n)}
                        style={[
                            styles.numBtn,
                            {
                                backgroundColor: n === value ? C.accent : C.elevated,
                                borderColor: n === value ? C.accent : C.border,
                            },
                        ]}
                    >
                        <Text style={[styles.numBtnText, { color: n === value ? '#fff' : C.textMuted }]}>{n}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

function MiniScore({ label, val }: { label: string; val: number }) {
    return (
        <Text style={styles.miniScore}>
            {label} {val}/10
        </Text>
    );
}

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', overflow: 'hidden' },
    handle: { width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
    heroWrapper: { position: 'relative' },
    closeBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5 },
    heroPhoto: { width: '100%', height: 220 },
    content: { padding: Spacing.lg, gap: Spacing.md },
    name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    address: { fontSize: 14, lineHeight: 20 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
    chipText: { fontSize: 13, fontWeight: '700' },

    section: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    addReviewBtn: { fontSize: 14, fontWeight: '600' },
    noScores: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
    reviewCount: { fontSize: 11, textAlign: 'center' },

    sensoryGrid: { gap: 10 },
    sensoryItem: { gap: 4 },
    sensoryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sensoryLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
    sensoryScore: { fontSize: 14, fontWeight: '800' },
    barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },

    reviewForm: { padding: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, gap: 12 },
    sliderRow: { gap: 6 },
    sliderLabel: { fontSize: 14, fontWeight: '600' },
    sliderBtns: { flexDirection: 'row', gap: 4 },
    numBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    numBtnText: { fontSize: 12, fontWeight: '700' },
    commentInput: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
    submitBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: Radius.sm },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    reviewItem: { borderBottomWidth: 1, paddingVertical: 10, gap: 4 },
    reviewScores: { flexDirection: 'row', gap: 12 },
    miniScore: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    reviewComment: { fontSize: 13, lineHeight: 18 },
    reviewDate: { fontSize: 11 },

    buttonRow: { flexDirection: 'row', gap: 10 },
    mapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.md },
    mapBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
