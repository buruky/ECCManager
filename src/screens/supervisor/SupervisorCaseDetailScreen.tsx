import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getCaseById, updateCaseStatus } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS, CASE_STATUSES, PROGRAM_LABELS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  active: COLORS.success,
  onHold: COLORS.textSecondary,
};

export default function SupervisorCaseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { caseId } = route.params as { caseId: string };

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setCaseData(await getCaseById(caseId));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Reload when coming back from assignment screen
  useFocusEffect(useCallback(() => { load(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function showStatusPicker() {
    if (!caseData) return;
    Alert.alert(
      'Change Status',
      `Current: ${CASE_STATUSES.find(s => s.value === caseData.status)?.label}`,
      [
        ...CASE_STATUSES.filter(s => s.value !== caseData.status).map(s => ({
          text: s.label,
          onPress: async () => {
            await updateCaseStatus(caseId, caseData.clientName, s.value as Case['status'], user!.uid, user!.name);
            load();
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader title="Case" showBack />
        <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!caseData) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader title="Case Not Found" showBack />
        <Text style={styles.empty}>This case could not be loaded.</Text>
      </SafeAreaView>
    );
  }

  const isAssigned = !!caseData.assignedCaseManagerId;
  const statusColor = STATUS_COLORS[caseData.status] ?? COLORS.textSecondary;
  const statusLabel = CASE_STATUSES.find(s => s.value === caseData.status)?.label ?? caseData.status;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title={caseData.clientName} showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status row */}
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}
            onPress={showStatusPicker}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            <Ionicons name="chevron-down" size={13} color={statusColor} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          {caseData.program && (
            <View style={styles.programBadge}>
              <Text style={styles.programText}>{PROGRAM_LABELS[caseData.program] ?? caseData.program}</Text>
            </View>
          )}
        </View>

        {/* Assignment card — primary */}
        <View style={[styles.card, !isAssigned && styles.cardUnassigned]}>
          <Text style={styles.cardTitle}>Case Manager</Text>
          {isAssigned ? (
            <View style={styles.assignedRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {caseData.assignedCaseManagerName?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.assignedInfo}>
                <Text style={styles.assignedName}>{caseData.assignedCaseManagerName}</Text>
                <Text style={styles.assignedLabel}>Assigned</Text>
              </View>
            </View>
          ) : (
            <View style={styles.unassignedRow}>
              <Ionicons name="person-outline" size={28} color={COLORS.warning} />
              <Text style={styles.unassignedText}>No case manager assigned yet</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.assignBtn, isAssigned && styles.reassignBtn]}
            onPress={() => navigation.navigate('CaseAssignment', { caseId })}
          >
            <Ionicons
              name={isAssigned ? 'swap-horizontal-outline' : 'person-add-outline'}
              size={18}
              color={isAssigned ? COLORS.primary : '#fff'}
            />
            <Text style={[styles.assignBtnText, isAssigned && styles.reassignBtnText]}>
              {isAssigned ? 'Reassign Case Manager' : 'Assign Case Manager'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Case info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case Information</Text>
          <InfoRow label="Client Name" value={caseData.clientName} />
          <InfoRow label="Date of Intake" value={caseData.intakeDate} />
          <InfoRow label="Source of Referral" value={caseData.referralSource} />
          <InfoRow label="Reason for Referral" value={caseData.referralReason} />
          <InfoRow label="Eligibility Criteria" value={caseData.eligibilityCriteria} />
          <InfoRow label="Created By" value={caseData.createdByName} last />
        </View>

        {/* Secondary — view sections */}
        <TouchableOpacity
          style={styles.sectionsBtn}
          onPress={() => navigation.navigate('CaseDetail', { caseId })}
        >
          <Ionicons name="folder-open-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionsBtnText}>View Case Sections</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 13, fontWeight: '700' },
  programBadge: { backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  programText: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnassigned: { borderWidth: 1.5, borderColor: COLORS.warning + '55' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },

  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  assignedInfo: { flex: 1 },
  assignedName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  assignedLabel: { fontSize: 13, color: COLORS.success, marginTop: 2, fontWeight: '600' },

  unassignedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  unassignedText: { fontSize: 15, color: COLORS.warning, fontWeight: '600' },

  assignBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  reassignBtn: { backgroundColor: COLORS.primary + '15', borderWidth: 1.5, borderColor: COLORS.primary },
  reassignBtnText: { color: COLORS.primary },

  infoRow: { paddingVertical: 11 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 15, color: COLORS.text, lineHeight: 22 },

  sectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionsBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});