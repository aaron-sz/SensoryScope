/**
 * Detect Screen — Sensory Environment Scanner
 *
 * Coming Soon: Real-time sound + light detection using the device microphone
 * and ambient light sensor to help users gauge their sensory environment before
 * even entering a space.
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, useColors } from '../../constants/theme';

const NUM_BARS = 14;

export default function DetectScreen() {
    const C = useColors();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    // Animate fake sound wave bars
    const bars = Array.from({ length: NUM_BARS }, (_, i) => useSharedValue(0.2 + Math.random() * 0.4));

    useEffect(() => {
        bars.forEach((bar, i) => {
            const min = 0.15;
            const max = 0.55 + Math.random() * 0.45;
            bar.value = withDelay(
                i * 90,
                withRepeat(
                    withSequence(
                        withTiming(max, { duration: 600 + Math.random() * 500 }),
                        withTiming(min, { duration: 600 + Math.random() * 500 }),
                    ),
                    -1,
                    true,
                ),
            );
        });
    }, []);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
            ]}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
        >
            {/* ── Header ── */}
            <Animated.View entering={FadeInDown.delay(0).springify()}>
                <Text style={[styles.title, { color: C.text }]}>Sensory Detect</Text>
                <Text style={[styles.subtitle, { color: C.textMuted }]}>
                    Use your device to measure your environment before entering a space.
                </Text>
            </Animated.View>

            {/* ── Hero Card — Coming Soon — sound wave ── */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.heroCard}>
                <LinearGradient
                    colors={['rgba(16,185,129,0.08)', 'rgba(16,185,129,0.02)']}
                    style={[styles.heroGradient, { borderColor: C.border }]}
                >
                    {/* Animated wave bars */}
                    <View style={styles.waveContainer}>
                        {bars.map((bar, i) => (
                            <AnimatedBar key={i} bar={bar} color={C.accent} />
                        ))}
                    </View>

                    {/* Coming Soon badge */}
                    <BlurView
                        tint={Platform.OS === 'ios' ? 'systemMaterial' : 'light'}
                        intensity={90}
                        style={styles.badge}
                    >
                        <Text style={[styles.badgeText, { color: C.accent }]}>🔬  Coming Soon</Text>
                    </BlurView>

                    <Text style={[styles.heroLabel, { color: C.text }]}>Sound Level Detection</Text>
                    <Text style={[styles.heroSub, { color: C.textMuted }]}>
                        Live dB readings from your microphone to measure ambient noise in real time.
                    </Text>
                </LinearGradient>
            </Animated.View>

            {/* ── Feature cards ── */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.row}>
                <FeatureCard
                    C={C}
                    icon="🎙️"
                    title="Sound Meter"
                    desc="Real-time decibel reading from your device microphone"
                    eta="Q3 2025"
                />
                <FeatureCard
                    C={C}
                    icon="💡"
                    title="Light Sensor"
                    desc="Ambient lux measurement using your front camera"
                    eta="Q3 2025"
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.row}>
                <FeatureCard
                    C={C}
                    icon="🌡️"
                    title="Crowd Estimator"
                    desc="AI-powered crowd estimate using brief camera scan"
                    eta="Q4 2025"
                />
                <FeatureCard
                    C={C}
                    icon="📊"
                    title="Auto Rate"
                    desc="One-tap rating based on your detected environment"
                    eta="Q4 2025"
                />
            </Animated.View>

            {/* ── Privacy note ── */}
            <Animated.View entering={FadeInUp.delay(400).springify()}>
                <View style={[styles.privacyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.privacyTitle, { color: C.text }]}>🔒  Your Privacy</Text>
                    <Text style={[styles.privacyText, { color: C.textMuted }]}>
                        All sensor data is processed on-device and never uploaded. Sound detection uses only
                        volume levels — no audio is recorded or stored.
                    </Text>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

function AnimatedBar({ bar, color }: { bar: { value: number }; color: string }) {
    const style = useAnimatedStyle(() => ({ height: bar.value * 64, opacity: 0.5 + bar.value * 0.5 }));
    return <Animated.View style={[styles.bar, style, { backgroundColor: color }]} />;
}

function FeatureCard({
    C, icon, title, desc, eta,
}: {
    C: ReturnType<typeof useColors>;
    icon: string;
    title: string;
    desc: string;
    eta: string;
}) {
    return (
        <View style={[styles.featureCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <Text style={[styles.featureTitle, { color: C.text }]}>{title}</Text>
            <Text style={[styles.featureDesc, { color: C.textMuted }]}>{desc}</Text>
            <View style={[styles.etaBadge, { backgroundColor: C.accentGlow }]}>
                <Text style={[styles.etaText, { color: C.accent }]}>{eta}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: Spacing.sm,
    },
    heroCard: {
        borderRadius: Radius.xl,
        overflow: 'hidden',
    },
    heroGradient: {
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderCurve: 'continuous' as any,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 72,
        gap: 4,
        marginBottom: Spacing.sm,
    },
    bar: {
        width: 6,
        borderRadius: 3,
        borderCurve: 'continuous' as any,
    },
    badge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.pill,
        overflow: 'hidden',
    },
    badgeText: {
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.2,
    },
    heroLabel: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
        textAlign: 'center',
    },
    heroSub: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    featureCard: {
        flex: 1,
        borderRadius: Radius.lg,
        borderCurve: 'continuous' as any,
        borderWidth: 1,
        padding: Spacing.md,
        gap: 6,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    } as any,
    featureIcon: { fontSize: 24 },
    featureTitle: { fontSize: 15, fontWeight: '700' },
    featureDesc: { fontSize: 12, lineHeight: 17 },
    etaBadge: {
        alignSelf: 'flex-start',
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Radius.pill,
    },
    etaText: { fontSize: 11, fontWeight: '600' },
    privacyCard: {
        borderRadius: Radius.lg,
        borderCurve: 'continuous' as any,
        borderWidth: 1,
        padding: Spacing.md,
        gap: 6,
    },
    privacyTitle: { fontWeight: '700', fontSize: 14 },
    privacyText: { fontSize: 13, lineHeight: 19 },
});
