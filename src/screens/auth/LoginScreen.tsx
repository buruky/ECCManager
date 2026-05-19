import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/utils/constants';
import { useIsDesktop } from '@/utils/responsive';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const navigation = useNavigation<any>();
  const isDesktop = useIsDesktop();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your username or email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  const formContent = (
    <>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, isDesktop && styles.labelDark]}>Username or Email</Text>
      <TextInput
        style={[styles.input, isDesktop && styles.inputDesktop]}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="username or email"
        placeholderTextColor={COLORS.textSecondary}
        returnKeyType="next"
      />

      <Text style={[styles.label, isDesktop && styles.labelDark]}>Password</Text>
      <TextInput
        style={[styles.input, isDesktop && styles.inputDesktop]}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor={COLORS.textSecondary}
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={[styles.footerBtn, isDesktop && styles.footerBtnDesktop]}
      >
        <Text style={[styles.footer, isDesktop && styles.footerDesktop]}>
          Don't have an account?{' '}
          <Text style={[styles.footerLink, isDesktop && styles.footerLinkDesktop]}>
            Request one
          </Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  if (isDesktop) {
    return (
      <View style={desktopStyles.container}>
        {/* Left brand panel */}
        <View style={desktopStyles.brandPanel}>
          <View style={desktopStyles.brandContent}>
            <Text style={desktopStyles.brandTitle}>ECC Manager</Text>
            <Text style={desktopStyles.brandSub}>Eritrean Community Connections</Text>
            <View style={desktopStyles.divider} />
            <Text style={desktopStyles.brandTagline}>
              Supporting our community through compassionate, coordinated case management.
            </Text>
          </View>
        </View>

        {/* Right form panel */}
        <View style={desktopStyles.formPanel}>
          <View style={desktopStyles.formCard}>
            <Text style={desktopStyles.formTitle}>Sign In</Text>
            <Text style={desktopStyles.formSubtitle}>Welcome back</Text>
            {formContent}
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>ECC Manager</Text>
        <Text style={styles.subtitle}>Eritrean Community Connections</Text>
      </View>

      <View style={styles.form}>
        {formContent}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  labelDark: {
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputDesktop: {
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerBtn: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerBtnDesktop: {
    marginTop: 20,
  },
  footer: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 13,
  },
  footerDesktop: {
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerLinkDesktop: {
    color: COLORS.primary,
  },
});

const desktopStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },
  brandPanel: {
    width: '42%',
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    paddingHorizontal: 56,
  },
  brandContent: {
    maxWidth: 340,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginVertical: 28,
  },
  brandTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
  },
  formPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 48,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
});