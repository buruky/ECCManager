import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { createCase } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS, PROGRAMS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

export default function CreateCaseScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [program, setProgram] = useState<Case['program']>(null);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!program) {
      Alert.alert('Program Required', 'Please select a program before creating the case.');
      return;
    }
    if (!clientName.trim()) {
      Alert.alert('Error', 'Client name is required.');
      return;
    }
    setLoading(true);
    try {
      await createCase({ clientName: clientName.trim(), program }, user!.uid, user!.name);
      Alert.alert('Success', 'Case created successfully.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to create case. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="New Case" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form}>

          <Text style={styles.label}>Program *</Text>
          <View style={styles.programRow}>
            {PROGRAMS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.programBtn, program === p.value && styles.programBtnActive]}
                onPress={() => setProgram(p.value as Case['program'])}
              >
                <Text style={[styles.programBtnText, program === p.value && styles.programBtnTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 24 }]}>Client Name *</Text>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Full name of the client"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />

          <Text style={styles.hint}>
            You can fill in all case details (intake, consent forms, etc.) after creating the case.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Case</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  programRow: { flexDirection: 'row', gap: 8 },
  programBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  programBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  programBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  programBtnTextActive: { color: COLORS.primary },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 12, lineHeight: 18 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});