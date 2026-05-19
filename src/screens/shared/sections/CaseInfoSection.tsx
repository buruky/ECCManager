import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCaseById, updateCaseInfo } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS } from '@/utils/constants';

export default function CaseInfoSection({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const canEdit = !!user;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [eligibilityCriteria, setEligibilityCriteria] = useState('');
  const [intakeDate, setIntakeDate] = useState('');

  useEffect(() => {
    getCaseById(caseId).then(c => {
      if (!c) return;
      setCaseData(c);
      setClientName(c.clientName ?? '');
      setReferralSource(c.referralSource ?? '');
      setReferralReason(c.referralReason ?? '');
      setEligibilityCriteria(c.eligibilityCriteria ?? '');
      setIntakeDate(c.intakeDate ?? '');
    });
  }, [caseId]);

  async function handleSave() {
    if (!clientName.trim()) return Alert.alert('Required', 'Full case name is required.');
    if (!referralSource.trim()) return Alert.alert('Required', 'Source of referral is required.');
    if (!referralReason.trim()) return Alert.alert('Required', 'Reason for referral is required.');
    if (!eligibilityCriteria.trim()) return Alert.alert('Required', 'Eligibility criteria is required.');
    if (!intakeDate.trim()) return Alert.alert('Required', 'Date of intake is required.');

    setSaving(true);
    try {
      await updateCaseInfo(
        caseId,
        { clientName: clientName.trim(), referralSource: referralSource.trim(), referralReason: referralReason.trim(), eligibilityCriteria: eligibilityCriteria.trim(), intakeDate: intakeDate.trim() },
        user!.uid,
        user!.name
      );
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!caseData) return;
    setClientName(caseData.clientName ?? '');
    setReferralSource(caseData.referralSource ?? '');
    setReferralReason(caseData.referralReason ?? '');
    setEligibilityCriteria(caseData.eligibilityCriteria ?? '');
    setIntakeDate(caseData.intakeDate ?? '');
    setEditing(false);
  }

  if (!caseData) {
    return <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.primary} />;
  }

  const fields: { label: string; value: string; setter: (v: string) => void; multiline?: boolean }[] = [
    { label: 'Full Case Name', value: clientName, setter: setClientName },
    { label: 'Source of Referral', value: referralSource, setter: setReferralSource },
    { label: 'Reason for Referral', value: referralReason, setter: setReferralReason, multiline: true },
    { label: 'Eligibility Criteria', value: eligibilityCriteria, setter: setEligibilityCriteria, multiline: true },
    { label: 'Date of Intake', value: intakeDate, setter: setIntakeDate },
    { label: 'Program', value: caseData.program ?? '—', setter: () => {}, },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {fields.map(field => (
        <View key={field.label} style={styles.field}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          {editing && field.label !== 'Program' ? (
            <TextInput
              style={[styles.input, field.multiline && styles.multiline]}
              value={field.value}
              onChangeText={field.setter}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 3 : 1}
              placeholderTextColor={COLORS.textSecondary}
            />
          ) : (
            <Text style={styles.fieldValue}>{field.value || '—'}</Text>
          )}
        </View>
      ))}

      {canEdit && (
        editing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit Case Info</Text>
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  lockedBanner: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  lockedText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  editBtn: { marginTop: 8, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});