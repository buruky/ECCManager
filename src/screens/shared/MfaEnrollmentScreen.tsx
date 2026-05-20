import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { multiFactor, TotpMultiFactorGenerator, MultiFactorInfo, sendEmailVerification } from 'firebase/auth';
import type { TotpSecret } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ScreenHeader from '@/components/ScreenHeader';
import { COLORS } from '@/utils/constants';
import { useIsDesktop, SIDEBAR_WIDTH } from '@/utils/responsive';

type Step = 'loading' | 'unverified-email' | 'enrolled' | 'setup' | 'success' | 'error';

export default function MfaEnrollmentScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isDesktop = useIsDesktop();

  const [step, setStep] = useState<Step>('loading');
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [enrolledFactors, setEnrolledFactors] = useState<MultiFactorInfo[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setStep('loading');
    setError('');
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) { setStep('error'); return; }

      if (!firebaseUser.emailVerified) {
        setStep('unverified-email');
        return;
      }

      const mfaUser = multiFactor(firebaseUser);
      if (mfaUser.enrolledFactors.length > 0) {
        setEnrolledFactors(mfaUser.enrolledFactors);
        setStep('enrolled');
        return;
      }

      const session = await mfaUser.getSession();
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
      setSecret(totpSecret);
      setOtpauthUrl(
        totpSecret.generateQrCodeUrl(
          user?.email || user?.name || 'user',
          'ECC Manager',
        ),
      );
      setTotpCode('');
      setStep('setup');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize MFA setup.');
      setStep('error');
    }
  }

  async function handleEnroll() {
    if (!secret || totpCode.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, totpCode);
      await multiFactor(auth.currentUser!).enroll(assertion, 'Authenticator App');
      setStep('success');
    } catch (err: any) {
      setError(
        err.code === 'auth/invalid-verification-code'
          ? 'Incorrect code. Check your authenticator app and try again.'
          : err.message || 'Enrollment failed.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendVerification() {
    setActionLoading(true);
    setError('');
    try {
      await sendEmailVerification(auth.currentUser!);
      setError('Verification email sent. Check your inbox, verify, then come back here.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnenroll() {
    setActionLoading(true);
    setError('');
    try {
      const mfaUser = multiFactor(auth.currentUser!);
      for (const factor of mfaUser.enrolledFactors) {
        await mfaUser.unenroll(factor);
      }
      await initialize();
    } catch (err: any) {
      setError(
        err.code === 'auth/requires-recent-login'
          ? 'Sign out and sign back in, then try again.'
          : err.message || 'Failed to remove MFA.',
      );
      setActionLoading(false);
    }
  }

  function formatSecret(key: string) {
    return key.replace(/(.{4})/g, '$1 ').trim();
  }

  const contentStyle = [styles.content, isDesktop && { marginLeft: SIDEBAR_WIDTH }];

  function renderBody() {
    if (step === 'loading') {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (step === 'unverified-email') {
      return (
        <View style={styles.card}>
          <Ionicons name="mail-outline" size={40} color={COLORS.primary} style={styles.icon} />
          <Text style={styles.cardTitle}>Verify Your Email First</Text>
          <Text style={styles.cardText}>
            Firebase requires a verified email before enabling two-factor authentication.
            Send a verification link to your inbox, then return here.
          </Text>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
              <Text style={[styles.errorText, { color: COLORS.success }]}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.button, actionLoading && styles.buttonDisabled]}
            onPress={handleSendVerification}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Send Verification Email</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={initialize}>
            <Text style={styles.secondaryBtnText}>I've verified — continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'error') {
      return (
        <View style={styles.card}>
          <Ionicons name="warning-outline" size={40} color={COLORS.error} style={styles.icon} />
          <Text style={styles.cardTitle}>Setup Failed</Text>
          <Text style={styles.cardText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={initialize}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'success') {
      return (
        <View style={styles.card}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.success} style={styles.icon} />
          <Text style={styles.cardTitle}>Two-Factor Authentication Enabled</Text>
          <Text style={styles.cardText}>
            Your account is now protected. You'll need your authenticator app each time you sign in.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'enrolled') {
      return (
        <View style={styles.card}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.success} style={styles.icon} />
          <Text style={styles.cardTitle}>Two-Factor Authentication Active</Text>
          <Text style={styles.cardText}>Your account is secured with the following factor:</Text>
          {enrolledFactors.map((f) => (
            <View key={f.uid} style={styles.factorRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.primary} />
              <Text style={styles.factorLabel}>{f.displayName || 'Authenticator App'}</Text>
            </View>
          ))}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger, actionLoading && styles.buttonDisabled]}
            onPress={handleUnenroll}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Remove MFA</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // step === 'setup'
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Set Up Authenticator App</Text>
        <Text style={styles.cardText}>
          Open Google Authenticator, Authy, or any TOTP app and add a new account.
        </Text>

        {/* Open in authenticator (works on iOS and Android) */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => Linking.openURL(otpauthUrl)}
          >
            <Ionicons name="open-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.buttonText, { color: COLORS.primary }]}>Open in Authenticator App</Text>
          </TouchableOpacity>
        )}

        {/* Manual key entry fallback */}
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>Or enter this key manually:</Text>
          <Text style={styles.secretKey} selectable>{formatSecret(secret?.secretKey ?? '')}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>Enter the 6-digit code from your app</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.codeInput}
          value={totpCode}
          onChangeText={(t) => { setTotpCode(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="go"
          onSubmitEditing={handleEnroll}
        />
        <TouchableOpacity
          style={[styles.button, actionLoading && styles.buttonDisabled]}
          onPress={handleEnroll}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Enable Two-Factor Authentication</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Security" subtitle="Two-Factor Authentication" showBack />
      <ScrollView contentContainerStyle={contentStyle}>
        {renderBody()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  icon: { alignSelf: 'center', marginBottom: 16 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  factorLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  secretBox: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  secretLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  secretKey: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  codeInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: COLORS.error, fontSize: 13, fontWeight: '500' },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  buttonDanger: { backgroundColor: COLORS.error },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, color: COLORS.textSecondary },
});
