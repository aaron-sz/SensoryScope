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
import { Colors, Radius, Shadows, Spacing } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
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
            style={styles.container}
        >
            <View style={styles.card}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue to SensoryScope</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="your@email.com"
                        placeholderTextColor={Colors.textDim}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textDim}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.bg} />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <Link href="/signup" asChild>
                        <TouchableOpacity>
                            <Text style={styles.link}>Sign Up</Text>
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
        backgroundColor: Colors.bg,
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        ...Shadows.card,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textMuted,
        marginBottom: Spacing.xl,
    },
    inputContainer: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.primaryLight,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.bg,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        padding: Spacing.md,
        fontSize: 16,
        color: Colors.text,
    },
    button: {
        backgroundColor: Colors.accent,
        borderRadius: Radius.md,
        padding: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.md,
        ...Shadows.glow,
    },
    buttonText: {
        color: Colors.bg,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing.xl,
    },
    footerText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    link: {
        color: Colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
});
