import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getCasesBySupervisor, getCaseCompletionStatus } from '@/services/caseService';
import { getCaseManagersBySupervisor } from '@/services/userService';
import { AppUser, Case } from '@/types';
import { COLORS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

const TOTAL_SECTIONS = 7;

const STATUS_COLOR: Record<string, string> = {
  pending: COLORS.warning,
  active: COLORS.success,
  onHold: COLORS.onHold,
  closed: COLORS.closed,
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  onHold: 'On Hold',
  closed: 'Closed',
};

function completionCount(comp: Record<string, boolean>): number {
  return Object.values(comp).filter(Boolean).length;
}

export default function MyTeamScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [caseManagers, setCaseManagers] = useState<AppUser[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [completions, setCompletions] = useState<Record<string, Record<string, boolean>>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!user) return;
    const [cms, allCases] = await Promise.all([
      getCaseManagersBySupervisor(user.uid),
      getCasesBySupervisor(user.uid, user.program),
    ]);
    setCaseManagers(cms);
    setCases(allCases);

    if (allCases.length > 0) {
      const results = await Promise.all(allCases.map(c => getCaseCompletionStatus(c.id)));
      const map: Record<string, Record<string, boolean>> = {};
      allCases.forEach((c, i) => { map[c.id] = results[i]; });
      setCompletions(map);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function toggle(uid: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function casesFor(uid: string) {
    return cases.filter(c => c.assignedCaseManagerId === uid);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader title="My Team" />
        <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="My Team"
        subtitle={`${caseManagers.length} case manager${caseManagers.length !== 1 ? 's' : ''}`}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {caseManagers.length === 0 && (
          <Text style={styles.empty}>No case managers assigned to you yet.</Text>
        )}

        {caseManagers.map(cm => {
          const cmCases = casesFor(cm.uid);
          const isOpen = expanded.has(cm.uid);
          const activeCount = cmCases.filter(c => c.status === 'active').length;

          // aggregate completion across all this CM's cases
          const totalDone = cmCases.reduce((sum, c) => {
            const comp = completions[c.id];
            return sum + (comp ? completionCount(comp) : 0);
          }, 0);
          const totalPossible = cmCases.length * TOTAL_SECTIONS;
          const overallPct = totalPossible > 0 ? totalDone / totalPossible : 0;

          return (
            <View key={cm.uid} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggle(cm.uid)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{cm.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cmName}>{cm.name}</Text>
                  <Text style={styles.cmSub}>
                    {cmCases.length} case{cmCases.length !== 1 ? 's' : ''}
                    {'  ·  '}
                    {activeCount} active
                  </Text>
                  {cmCases.length > 0 && (
                    <View style={styles.headerProgress}>
                      <View style={styles.miniTrack}>
                        <View style={[styles.miniFill, { width: `${overallPct * 100}%` as any }]} />
                      </View>
                      <Text style={styles.overallFraction}>
                        {totalDone}/{totalPossible} sections
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={COLORS.textSecondary}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.caseList}>
                  {cmCases.length === 0 ? (
                    <Text style={styles.noCases}>No cases assigned.</Text>
                  ) : (
                    cmCases.map(c => {
                      const comp = completions[c.id];
                      const done = comp ? completionCount(comp) : 0;
                      const pct = done / TOTAL_SECTIONS;

                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.caseRow}
                          onPress={() => navigation.navigate('TeamCaseDetail', { caseId: c.id })}
                          activeOpacity={0.7}
                        >
                          <View style={styles.caseRowInner}>
                            <View style={styles.caseRowTop}>
                              <Text style={styles.caseName} numberOfLines={1}>{c.clientName}</Text>
                              <View style={styles.caseRowRight}>
                                <Text style={styles.fraction}>{done}/{TOTAL_SECTIONS}</Text>
                                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[c.status] + '22' }]}>
                                  <Text style={[styles.badgeText, { color: STATUS_COLOR[c.status] }]}>
                                    {STATUS_LABEL[c.status]}
                                  </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                              </View>
                            </View>
                            <View style={styles.miniTrack}>
                              <View style={[styles.miniFill, { width: `${pct * 100}%` as any }]} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 48 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cmName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cmSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  headerProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  overallFraction: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', flexShrink: 0 },
  caseList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  noCases: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  caseRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  caseRowInner: { flex: 1 },
  caseRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  caseName: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  caseRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  fraction: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  miniTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
});