import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Linking, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { BUG_REPORT_EMAIL } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

export default function ReportBugScreen() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue before submitting.');
      return;
    }
    setLoading(true);
    const subject = encodeURIComponent('ECC Manager - Bug Report');
    const body = encodeURIComponent(
      `Reported by: ${user?.name} (${user?.role})\n` +
      `Email: ${user?.email}\n\n` +
      `Issue Description:\n${description.trim()}\n\n` +
      `Steps to Reproduce:\n${steps.trim() || 'Not provided'}\n\n` +
      `Submitted: ${new Date().toLocaleString()}`
    );
    const url = `mailto:${BUG_REPORT_EMAIL}?subject=${subject}&body=${body}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      setDescription('');
      setSteps('');
    } else {
      Alert.alert('Error', `Could not open mail app. Please email ${BUG_REPORT_EMAIL} directly.`);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Report a Bug" subtitle="Help us improve the app" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Found something broken? Describe the issue below and it will be sent to the developer.
          </Text>

          <Text style={styles.label}>What went wrong? *</Text>
          <TextInput
            style={[styles.input, styles.inputLarge]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the bug clearly..."
            placeholderTextColor="#aaa"
            multiline
          />

          <Text style={styles.label}>Steps to reproduce (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMedium]}
            value={steps}
            onChangeText={setSteps}
            placeholder="1. Go to...\n2. Tap on...\n3. See error"
            placeholderTextColor="#aaa"
            multiline
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Your name, role, and email will be included automatically.</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Bug Report</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 20, paddingBottom: 48 },
  intro: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#1a202c', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1a202c',
    textAlignVertical: 'top',
  },
  inputLarge: { minHeight: 140 },
  inputMedium: { minHeight: 100 },
  infoBox: {
    backgroundColor: '#ebf8ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: { fontSize: 13, color: '#2b6cb0' },
  button: {
    backgroundColor: '#1a3a5c',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
