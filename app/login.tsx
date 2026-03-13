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
    View
} from 'react-native';
import { Radius, Shadows, Spacing, useColors } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
    const C = useColors();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);
        if (error) {
            Alert.alert('Login Failed', error.message);
        } else {
            router.replace('/(tabs)' as any);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: C.bg }]}
        >
            <View style={[styles.card, { backgroundColor: C.surface }]}>
                <Text style={[styles.title, { color: C.primary }]}>Welcome Back</Text>
                <Text style={[styles.subtitle, { color: C.textMuted }]}>Sign in to continue to SensoryScope</Text>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: C.primaryLight }]}>Email</Text>
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
                    <Text style={[styles.label, { color: C.primaryLight }]}>Password</Text>
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
                    onPress={handleLogin}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in"
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.guestButton, { borderColor: C.border }]}
                    onPress={() => router.replace('/(tabs)' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Continue as guest"
                >
                    <Text style={[styles.guestButtonText, { color: C.textMuted }]}>Continue as Guest</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: C.textMuted }]}>Don't have an account? </Text>
                    <Link href="/signup" asChild>
                        <TouchableOpacity>
                            <Text style={[styles.link, { color: C.accent }]}>Sign Up</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

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
    guestButton: {
        borderRadius: Radius.md,
        padding: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.sm,
        borderWidth: 1,
    },
    guestButtonText: {
        fontSize: 15,
        fontWeight: '500',
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
});
