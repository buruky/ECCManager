import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { getCasesByManager, getTasksForUser, completeTask } from '@/services/caseService';
import { Case, Task } from '@/types';
import { COLORS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

export default function CaseManagerDashboardScreen() {
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!user) return;
    const [c, t] = await Promise.all([getCasesByManager(user.uid), getTasksForUser(user.uid)]);
    setCases(c);
    setTasks(t);
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCompleteTask(taskId: string) {
    await completeTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  const overdue = tasks.filter(t => new Date(t.dueDate) < new Date());

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="My Dashboard"
        subtitle={`Welcome, ${user?.name}`}
        rightAction={{ icon: 'log-out-outline', onPress: signOut }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>{cases.length}</Text>
            <Text style={styles.statLabel}>My Caseload</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {cases.filter(c => c.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: overdue.length > 0 ? COLORS.error : COLORS.textSecondary }]}>
              {overdue.length}
            </Text>
            <Text style={styles.statLabel}>Overdue Tasks</Text>
          </View>
        </View>

        {tasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            {tasks.slice(0, 5).map(t => (
              <View key={t.id} style={[styles.taskCard, new Date(t.dueDate) < new Date() && styles.taskOverdue]}>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <Text style={styles.taskSub}>{t.caseClientName} · Due {new Date(t.dueDate).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCompleteTask(t.id)} style={styles.completeBtn}>
                  <Text style={styles.completeBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Recent Cases</Text>
        {cases.slice(0, 5).map(c => (
          <View key={c.id} style={styles.caseItem}>
            <Text style={styles.caseName}>{c.clientName}</Text>
            <Text style={styles.caseSub}>{c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Pending' : 'On Hold'}</Text>
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
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 10 },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  taskOverdue: { borderLeftColor: COLORS.error },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  taskSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  completeBtn: {
    backgroundColor: COLORS.success + '22',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  completeBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  caseItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caseName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  caseSub: { fontSize: 13, color: COLORS.textSecondary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 32 },
});
