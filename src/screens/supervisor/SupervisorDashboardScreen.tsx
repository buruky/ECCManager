import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { getCasesBySupervisor } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS, PROGRAM_LABELS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

export default function SupervisorDashboardScreen() {
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (user) setCases(await getCasesBySupervisor(user.uid, user.program));
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const unassigned = cases.filter(c => !c.assignedCaseManagerId);
  const withNotes = cases.filter(c => c.status === 'active');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Supervisor Dashboard"
        subtitle={`Welcome, ${user?.name} · ${user?.program ? PROGRAM_LABELS[user.program] : 'No program'}`}
        rightAction={{ icon: 'log-out-outline', onPress: signOut }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Needs Attention</Text>
          <View style={styles.alertRow}>
            <View style={styles.alertStat}>
              <Text style={[styles.alertValue, { color: COLORS.warning }]}>{unassigned.length}</Text>
              <Text style={styles.alertLabel}>Unassigned Cases</Text>
            </View>
            <View style={styles.alertStat}>
              <Text style={[styles.alertValue, { color: COLORS.accent }]}>{withNotes.length}</Text>
              <Text style={styles.alertLabel}>Active Cases</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>My Cases ({cases.length})</Text>
        {cases.map(c => (
          <View key={c.id} style={styles.item}>
            <Text style={styles.itemName}>{c.clientName}</Text>
            <Text style={styles.itemSub}>
              {c.assignedCaseManagerName ?? <Text style={{ color: COLORS.warning }}>Unassigned</Text>}
            </Text>
          </View>
        ))}
        {cases.length === 0 && <Text style={styles.empty}>No cases assigned to you yet.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  alertCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-around' },
  alertStat: { alignItems: 'center' },
  alertValue: { fontSize: 36, fontWeight: '700' },
  alertLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  item: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 32 },
});
