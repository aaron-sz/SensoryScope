import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { Radius, Shadows, Spacing, useColors } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function SignupScreen() {
    const C = useColors();
    const { width } = useWindowDimensions();
    const isTablet = width >= 600;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        const trimmedEmail = email.trim();
        const trimmedUsername = username.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!trimmedEmail || !password || !trimmedUsername) {
            Alert.alert('Missing Info', 'Please fill in all fields.');
            return;
        }
        if (!emailRegex.test(trimmedEmail)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        if (trimmedUsername.length < 3) {
            Alert.alert('Username Too Short', 'Username must be at least 3 characters.');
            return;
        }
        if (trimmedUsername.length > 30) {
            Alert.alert('Username Too Long', 'Username must be 30 characters or fewer.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
                data: {
                    username: trimmedUsername,
                }
            }
        });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email address is already')) {
                Alert.alert('Account Exists', 'An account with this email already exists. Try signing in instead.');
            } else if (msg.includes('password') && msg.includes('characters')) {
                Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
            } else if (msg.includes('invalid') && msg.includes('email')) {
                Alert.alert('Invalid Email', 'Please enter a valid email address.');
            } else if (msg.includes('too many requests') || msg.includes('rate limit')) {
                Alert.alert('Too Many Attempts', 'Please wait a moment before trying again.');
            } else {
                Alert.alert('Sign Up Failed', 'Something went wrong. Please try again.');
            }
        } else {
            // Note: Profile creation is handled automatically by the Supabase database trigger
            Alert.alert('Account Created!', 'Welcome to SensoryScope. Check your email if verification is required.');
            router.replace('/(tabs)' as any);
        }

        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: C.bg }]}
        >
            <View style={[styles.card, { backgroundColor: C.surface }, isTablet && styles.cardTablet]}>
                <Text style={[styles.title, { color: C.accent }]}>Create Account</Text>
                <Text style={[styles.subtitle, { color: C.textMuted }]}>Join SensoryScope today</Text>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: C.textMuted }]}>Username</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="johndoe123"
                        placeholderTextColor={C.textDim}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        accessibilityLabel="Username"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: C.textMuted }]}>Email</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="your@email.com"
                        placeholderTextColor={C.textDim}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        accessibilityLabel="Email address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: C.textMuted }]}>Password</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="••••••••"
                        placeholderTextColor={C.textDim}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        accessibilityLabel="Password"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: C.accent, ...Shadows.glow, shadowColor: C.accent }]}
                    onPress={handleSignUp}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Create account"
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: C.textMuted }]}>Already have an account? </Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text style={[styles.link, { color: C.accent }]}>Sign In</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <TouchableOpacity
                    style={styles.guestButton}
                    onPress={() => router.replace('/(tabs)' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Skip and explore as guest"
                >
                    <Text style={[styles.guestButtonText, { color: C.textMuted }]}>Skip for now — explore as guest</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    card: {
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        ...Shadows.card,
    },
    cardTablet: {
        maxWidth: 460,
        alignSelf: 'center',
        width: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: Spacing.xl,
    },
    inputContainer: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: Spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderRadius: Radius.md,
        padding: Spacing.md,
        fontSize: 16,
    },
    button: {
        borderRadius: Radius.md,
        padding: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing.xl,
    },
    footerText: {
        fontSize: 14,
    },
    link: {
        fontSize: 14,
        fontWeight: '600',
    },
    guestButton: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
        marginTop: Spacing.sm,
    },
    guestButtonText: {
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
