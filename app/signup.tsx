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

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        if (!email || !password || !username) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                }
            }
        });

        if (error) {
            Alert.alert('Sign Up Error', error.message);
        } else {
            // Note: Profile creation is handled automatically by the Supabase database trigger
            Alert.alert('Success', 'Account created! Check your email if verification is required.');
            router.replace('/(tabs)' as any);
        }

        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join SensoryScope today</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="johndoe123"
                        placeholderTextColor={Colors.textDim}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>

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
                    onPress={handleSignUp}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.bg} />
                    ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text style={styles.link}>Sign In</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

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
