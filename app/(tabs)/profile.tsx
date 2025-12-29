import { Avatar, Button, Input, Text } from '@rneui/themed';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

export default function ProfileScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Error', error.message);
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Sign Up Error', error.message);
    else Alert.alert('Success', 'Check your email for the login link!');
    setLoading(false);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  };

  if (session && session.user) {
      return (
          <View style={styles.container}>
              <Avatar rounded icon={{name: 'person', type: 'ionicon'}} size="large" containerStyle={{marginBottom:20}} backgroundColor="#2f95dc" />
              <Text h4 style={{marginBottom: 20}}>Welcome!</Text>
              <Text style={{marginBottom: 40, fontSize: 16}}>{session.user.email}</Text>
              <Button title="Sign Out" onPress={handleSignOut} type="outline" buttonStyle={{ minWidth: 200, borderRadius: 10 }} />
          </View>
      )
  }

  return (
    <View style={styles.container}>
      <Text h3 style={styles.header}>SensoryScope</Text>
      <Input
        placeholder="Email"
        leftIcon={{ type: 'ionicon', name: 'mail' }}
        onChangeText={(text) => setEmail(text)}
        value={email}
        autoCapitalize={'none'}
      />
      <Input
        placeholder="Password"
        leftIcon={{ type: 'ionicon', name: 'lock-closed' }}
        onChangeText={(text) => setPassword(text)}
        value={password}
        secureTextEntry={true}
        autoCapitalize={'none'}
      />
      <View style={styles.verticallySpaced}>
        <Button title="Sign In" disabled={loading} onPress={handleLogin} buttonStyle={{ borderRadius: 10 }} />
      </View>
      <View style={styles.verticallySpaced}>
        <Button title="Sign Up" disabled={loading} onPress={handleSignUp} type="clear" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: { marginBottom: 40, color: '#2f95dc' },
  verticallySpaced: { paddingTop: 20, width: '100%' },
});
