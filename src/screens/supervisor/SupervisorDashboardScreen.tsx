import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCases } from '@/contexts/CasesContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getCasesBySupervisor } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS, PROGRAM_LABELS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

function CaseRow({ c, onPress }: { c: Case; onPress: () => void }) {
  const isAssigned = !!c.assignedCaseManagerId;
  return (
    <TouchableOpacity
      style={[styles.caseRow, { borderLeftColor: isAssigned ? COLORS.success : COLORS.warning }]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.caseName} numberOfLines={1}>{c.clientName}</Text>
        <View style={styles.caseSubRow}>
          <Ionicons
            name={isAssigned ? 'person-circle-outline' : 'alert-circle-outline'}
            size={13}
            color={isAssigned ? COLORS.success : COLORS.warning}
          />
          <Text style={[styles.caseSub, { color: isAssigned ? COLORS.success : COLORS.warning }]}>
            {isAssigned ? c.assignedCaseManagerName : 'Needs Assignment'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

export default function SupervisorDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { casesVersion } = useCases();
  const [cases, setCases] = useState<Case[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (user) setCases(await getCasesBySupervisor(user.uid, user.program));
  }

  useEffect(() => { load(); }, [casesVersion]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const unassigned = cases.filter(c => !c.assignedCaseManagerId);
  const assigned = cases.filter(c => !!c.assignedCaseManagerId);

  function goToCase(caseId: string) {
    navigation.navigate('Cases', { screen: 'SupervisorCaseDetail', params: { caseId } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Supervisor Dashboard"
        subtitle={`${user?.name} · ${user?.program ? PROGRAM_LABELS[user.program] : ''}`}
        rightAction={{ icon: 'log-out-outline', onPress: signOut }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: COLORS.warning }]}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{unassigned.length}</Text>
            <Text style={styles.statLabel}>Unassigned</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{assigned.length}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.accent }]}>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>{cases.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Unassigned section */}
        {unassigned.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
              <Text style={[styles.sectionTitle, { color: COLORS.warning }]}>
                Needs Assignment ({unassigned.length})
              </Text>
            </View>
            {unassigned.slice(0, 5).map(c => (
              <CaseRow key={c.id} c={c} onPress={() => goToCase(c.id)} />
            ))}
            {unassigned.length > 5 && (
              <TouchableOpacity onPress={() => navigation.navigate('Cases')} style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all {unassigned.length} unassigned →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Assigned section */}
        {assigned.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={[styles.sectionTitle, { color: COLORS.success }]}>
                Assigned ({assigned.length})
              </Text>
            </View>
            {assigned.slice(0, 5).map(c => (
              <CaseRow key={c.id} c={c} onPress={() => goToCase(c.id)} />
            ))}
            {assigned.length > 5 && (
              <TouchableOpacity onPress={() => navigation.navigate('Cases')} style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all {assigned.length} assigned →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {cases.length === 0 && (
          <Text style={styles.empty}>No cases in your program yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  caseRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 7,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  caseName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  caseSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caseSub: { fontSize: 12, fontWeight: '600' },
  seeAll: { alignItems: 'flex-end', marginBottom: 12 },
  seeAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },
});