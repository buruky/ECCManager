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
  const { signIn, pendingMfa, completeMfaSignIn, cancelMfa } = useAuth();
  const navigation = useNavigation<any>();
  const isDesktop = useIsDesktop();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
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

  async function handleMfaVerify() {
    setError('');
    if (totpCode.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      await completeMfaSignIn(totpCode);
    } catch (err: any) {
      setError(
        err.code === 'auth/invalid-verification-code'
          ? 'Incorrect code. Check your authenticator app and try again.'
          : err.message ?? 'Verification failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCancelMfa() {
    setTotpCode('');
    setError('');
    cancelMfa();
  }

  const mfaFormContent = (
    <>
      <View style={styles.mfaHeader}>
        <Ionicons name="shield-checkmark-outline" size={36} color={isDesktop ? COLORS.primary : '#fff'} />
        <Text style={[styles.mfaTitle, isDesktop && styles.mfaTitleDesktop]}>Two-Factor Authentication</Text>
        <Text style={[styles.mfaSubtitle, isDesktop && styles.mfaSubtitleDesktop]}>
          Enter the 6-digit code from your authenticator app.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, isDesktop && styles.labelDark]}>Verification Code</Text>
      <TextInput
        style={[styles.input, styles.codeInput, isDesktop && styles.inputDesktop]}
        value={totpCode}
        onChangeText={(t) => { setTotpCode(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={COLORS.textSecondary}
        returnKeyType="go"
        onSubmitEditing={handleMfaVerify}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleMfaVerify}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleCancelMfa} style={[styles.footerBtn, isDesktop && styles.footerBtnDesktop]}>
        <Text style={[styles.footer, isDesktop && styles.footerDesktop]}>← Back to sign in</Text>
      </TouchableOpacity>
    </>
  );

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

  const activeForm = pendingMfa ? mfaFormContent : formContent;

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
            <Text style={desktopStyles.formTitle}>{pendingMfa ? 'Verification' : 'Sign In'}</Text>
            <Text style={desktopStyles.formSubtitle}>{pendingMfa ? 'ECC Manager' : 'Welcome back'}</Text>
            {activeForm}
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
        {activeForm}
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
  mfaHeader: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  mfaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  mfaTitleDesktop: {
    color: COLORS.text,
  },
  mfaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 19,
  },
  mfaSubtitleDesktop: {
    color: COLORS.textSecondary,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
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