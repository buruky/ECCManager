import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCases } from '@/contexts/CasesContext';
import { getCasesByManager, getTasksForUser, completeTask, getCaseCompletionStatus } from '@/services/caseService';
import { Case, Task } from '@/types';
import { COLORS, PROGRAM_LABELS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  active: COLORS.success,
  onHold: COLORS.textSecondary,
  closed: COLORS.closed,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  onHold: 'On Hold',
  closed: 'Closed',
};

const TOTAL_SECTIONS = 7;

function completionCount(comp: Record<string, boolean>): number {
  return Object.values(comp).filter(Boolean).length;
}

export default function CaseManagerDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { casesVersion } = useCases();
  const [cases, setCases] = useState<Case[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Record<string, Record<string, boolean>>>({});
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!user) return;
    const [c, t] = await Promise.all([getCasesByManager(user.uid), getTasksForUser(user.uid)]);
    setCases(c);
    setTasks(t);

    // fetch completion for all cases in parallel
    if (c.length > 0) {
      const results = await Promise.all(c.map(cas => getCaseCompletionStatus(cas.id)));
      const map: Record<string, Record<string, boolean>> = {};
      c.forEach((cas, i) => { map[cas.id] = results[i]; });
      setCompletions(map);
    }
  }

  useEffect(() => { load(); }, [casesVersion]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCompleteTask(taskId: string) {
    await completeTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  const now = new Date();
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < now);
  const upcomingTasks = tasks.filter(t => new Date(t.dueDate) >= now);
  const activeCases = cases.filter(c => c.status === 'active');
  const pendingCases = cases.filter(c => c.status === 'pending');
  const onHoldCases = cases.filter(c => c.status === 'onHold');
  const needsAttention = [...pendingCases, ...onHoldCases];

  // active cases that still have sections to fill
  const inProgress = activeCases.filter(c => {
    const comp = completions[c.id];
    return !comp || completionCount(comp) < TOTAL_SECTIONS;
  });

  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title={`Hi, ${firstName}`}
        subtitle={today}
        rightAction={{ icon: 'log-out-outline', onPress: signOut }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>{cases.length}</Text>
            <Text style={styles.statLabel}>Total Cases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{activeCases.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{pendingCases.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>{onHoldCases.length}</Text>
            <Text style={styles.statLabel}>On Hold</Text>
          </View>
        </View>

        {/* Overdue alert banner */}
        {overdueTasks.length > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning-outline" size={18} color={COLORS.error} />
            <Text style={styles.alertText}>
              {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'} — action needed
            </Text>
          </View>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {overdueTasks.map(t => (
              <View key={t.id} style={[styles.taskCard, styles.taskCardOverdue]}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} style={styles.taskIcon} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <Text style={[styles.taskSub, { color: COLORS.error }]}>
                    {t.caseClientName} · Due {new Date(t.dueDate).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleCompleteTask(t.id)} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ))}
            {upcomingTasks.slice(0, 5).map(t => (
              <View key={t.id} style={styles.taskCard}>
                <Ionicons name="time-outline" size={18} color={COLORS.accent} style={styles.taskIcon} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <Text style={styles.taskSub}>
                    {t.caseClientName} · Due {new Date(t.dueDate).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleCompleteTask(t.id)} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* In progress: active cases with incomplete sections */}
        {inProgress.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>In Progress</Text>
            {inProgress.map(c => {
              const comp = completions[c.id];
              const done = comp ? completionCount(comp) : 0;
              const pct = done / TOTAL_SECTIONS;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.caseRow}
                  onPress={() => navigation.navigate('CaseDetail', { caseId: c.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.caseRowMain}>
                    <View style={styles.caseRowTop}>
                      <Text style={styles.caseRowName} numberOfLines={1}>{c.clientName}</Text>
                      <Text style={styles.completionFraction}>{done}/{TOTAL_SECTIONS} sections</Text>
                    </View>
                    {c.program ? (
                      <Text style={styles.caseRowProgram}>{PROGRAM_LABELS[c.program]}</Text>
                    ) : null}
                    <View style={styles.miniTrack}>
                      <View style={[styles.miniFill, { width: `${pct * 100}%` as any }]} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Needs attention: pending + on hold */}
        {needsAttention.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            {needsAttention.map(c => {
              const comp = completions[c.id];
              const done = comp ? completionCount(comp) : null;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.caseRow}
                  onPress={() => navigation.navigate('CaseDetail', { caseId: c.id })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[c.status] }]} />
                  <View style={styles.caseRowMain}>
                    <View style={styles.caseRowTop}>
                      <Text style={styles.caseRowName} numberOfLines={1}>{c.clientName}</Text>
                      {done !== null && (
                        <Text style={styles.completionFraction}>{done}/{TOTAL_SECTIONS}</Text>
                      )}
                    </View>
                    {c.program ? (
                      <Text style={styles.caseRowProgram}>{PROGRAM_LABELS[c.program]}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[c.status] + '22' }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_COLORS[c.status] }]}>
                      {STATUS_LABELS[c.status]}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Link to My Cases tab */}
        {cases.length > 0 && (
          <TouchableOpacity
            style={styles.myCasesLink}
            onPress={() => navigation.navigate('Cases')}
            activeOpacity={0.7}
          >
            <Ionicons name="folder-outline" size={18} color={COLORS.accent} />
            <Text style={styles.myCasesLinkText}>View all {cases.length} cases</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}

        {/* Empty state */}
        {cases.length === 0 && tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={52} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No cases assigned yet</Text>
            <Text style={styles.emptyText}>Your supervisor will assign cases to you.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 30, fontWeight: '700' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1,
    borderColor: COLORS.error + '33',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
  },
  alertText: { fontSize: 14, fontWeight: '600', color: COLORS.error },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 10,
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  taskCardOverdue: {
    borderLeftColor: COLORS.error,
    backgroundColor: COLORS.error + '08',
  },
  taskIcon: { flexShrink: 0 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  taskSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  doneBtn: {
    backgroundColor: COLORS.success + '22',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  doneBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.success },

  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
  },
  caseRowMain: { flex: 1 },
  caseRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  caseRowName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  caseRowProgram: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  completionFraction: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flexShrink: 0,
  },
  miniTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  myCasesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  myCasesLinkText: { fontSize: 14, fontWeight: '600', color: COLORS.accent },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});