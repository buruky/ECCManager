import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useCases } from '@/contexts/CasesContext';
import { createCase } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS, PROGRAMS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

export default function CreateCaseScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { notifyCasesChanged } = useCases();

  const [clientName, setClientName] = useState('');
  const [program, setProgram] = useState<Case['program']>(null);
  const [referralSource, setReferralSource] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [eligibilityCriteria, setEligibilityCriteria] = useState('');
  const [intakeDate, setIntakeDate] = useState('');
  const [loading, setLoading] = useState(false);

  function handleIntakeDateChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    setIntakeDate(formatted);
  }

  async function handleCreate() {
    if (!clientName.trim()) return Alert.alert('Required', 'Full case name is required.');
    if (!program) return Alert.alert('Required', 'Please select a program.');
    if (!referralSource.trim()) return Alert.alert('Required', 'Source of referral is required.');
    if (!referralReason.trim()) return Alert.alert('Required', 'Reason for referral is required.');
    if (!eligibilityCriteria.trim()) return Alert.alert('Required', 'Eligibility criteria is required.');
    if (!intakeDate.trim()) return Alert.alert('Required', 'Date of intake is required.');

    setLoading(true);
    try {
      await createCase(
        { clientName: clientName.trim(), program, referralSource: referralSource.trim(), referralReason: referralReason.trim(), eligibilityCriteria: eligibilityCriteria.trim(), intakeDate: intakeDate.trim() },
        user!.uid,
        user!.name
      );
      notifyCasesChanged();
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
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>Full Case Name *</Text>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Full name of the client"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />

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

          <Text style={styles.label}>Source of Referral *</Text>
          <TextInput
            style={styles.input}
            value={referralSource}
            onChangeText={setReferralSource}
            placeholder="e.g. Hospital, Community center, Self-referral"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Reason for Referral *</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={referralReason}
            onChangeText={setReferralReason}
            placeholder="Describe why the client was referred"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Eligibility Criteria *</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={eligibilityCriteria}
            onChangeText={setEligibilityCriteria}
            placeholder="Describe eligibility criteria met"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Date of Intake *</Text>
          <TextInput
            style={styles.input}
            value={intakeDate}
            onChangeText={handleIntakeDateChange}
            placeholder="MM-DD-YYYY"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numbers-and-punctuation"
          />

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
  form: { padding: 24, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 20 },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
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