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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import { selfRegister, isValidUsername } from '@/services/userService';
import { useIsDesktop } from '@/utils/responsive';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const isDesktop = useIsDesktop();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');
    if (!name.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (username.trim() && !isValidUsername(username.trim().toLowerCase())) {
      setError('Username may only contain lowercase letters, numbers, underscores, and hyphens (3–30 characters).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await selfRegister({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        ...(username.trim() ? { username: username.trim().toLowerCase() } : {}),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        <View style={[styles.successBox, isDesktop && styles.successBoxDesktop]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </View>
          <Text style={[styles.successTitle, isDesktop && styles.successTitleDesktop]}>
            Request Submitted!
          </Text>
          <Text style={[styles.successMessage, isDesktop && styles.successMessageDesktop]}>
            Your account request has been sent. A manager will review it, assign your role, and approve it before you can sign in.
          </Text>
          <TouchableOpacity
            style={[styles.backToLoginBtn, isDesktop && styles.backToLoginBtnDesktop]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backToLoginText, isDesktop && styles.backToLoginTextDesktop]}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDesktop && styles.containerDesktop]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Request an Account</Text>
          <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
            A manager will review and assign your role
          </Text>
        </View>

        <View style={[styles.form, isDesktop && styles.formDesktop]}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Jane Smith"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Username <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. jane_smith"
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.hint}>Used to sign in instead of your email</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="(555) 000-0000"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Min. 6 characters"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Submit Request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    textAlign: 'center',
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 14,
  },
  optional: {
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
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
  backBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '500',
  },
  successBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },
  successMessage: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  backToLoginBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  backToLoginText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  containerDesktop: {
    backgroundColor: '#f0f4f8',
  },
  scrollDesktop: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  titleDesktop: {
    color: COLORS.text,
    fontSize: 24,
  },
  subtitleDesktop: {
    color: COLORS.textSecondary,
  },
  formDesktop: {
    width: '100%',
    maxWidth: 480,
    shadowOpacity: 0.06,
  },
  successBoxDesktop: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 48,
    margin: 24,
    alignSelf: 'center',
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  successTitleDesktop: {
    color: COLORS.text,
  },
  successMessageDesktop: {
    color: COLORS.textSecondary,
  },
  backToLoginBtnDesktop: {
    backgroundColor: COLORS.primary,
  },
  backToLoginTextDesktop: {
    color: '#fff',
  },
});