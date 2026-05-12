import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCases } from '@/contexts/CasesContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getAllCases } from '@/services/caseService';
import { getAllUsers } from '@/services/userService';
import { Case, AppUser } from '@/types';
import { COLORS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

interface Stat { label: string; value: number; color: string }

export default function ManagerDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { casesVersion } = useCases();
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [c, u] = await Promise.all([getAllCases(), getAllUsers()]);
    setCases(c);
    setUsers(u);
  }

  useEffect(() => { load(); }, [casesVersion]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const stats: Stat[] = [
    { label: 'Total Cases', value: cases.length, color: COLORS.accent },
    { label: 'Active', value: cases.filter(c => c.status === 'active').length, color: COLORS.success },
    { label: 'Pending', value: cases.filter(c => c.status === 'pending').length, color: COLORS.warning },
    { label: 'On Hold', value: cases.filter(c => c.status === 'onHold').length, color: COLORS.textSecondary },
    { label: 'Closed', value: cases.filter(c => c.status === 'closed').length, color: COLORS.closed },
    { label: 'Staff Members', value: users.filter(u => u.isActive).length, color: COLORS.primaryLight },
    { label: 'Unassigned', value: cases.filter(c => !c.assignedCaseManagerId).length, color: COLORS.error },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Manager Dashboard"
        subtitle={`Welcome, ${user?.name}`}
        rightAction={{ icon: 'log-out-outline', onPress: signOut }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.grid}>
          {stats.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Cases</Text>
        {cases.slice(0, 5).map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.recentItem, { borderLeftColor: c.assignedCaseManagerId ? COLORS.success : COLORS.warning }]}
            onPress={() => navigation.navigate('Cases', { screen: 'CaseDetail', params: { caseId: c.id } })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.recentName}>{c.clientName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons
                  name={c.assignedCaseManagerId ? 'person-circle-outline' : 'alert-circle-outline'}
                  size={13}
                  color={c.assignedCaseManagerId ? COLORS.success : COLORS.warning}
                />
                <Text style={[styles.recentSub, { color: c.assignedCaseManagerId ? COLORS.success : COLORS.warning }]}>
                  {c.assignedCaseManagerName ?? 'Needs Assignment'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  recentItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  recentName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  recentSub: { fontSize: 13, color: COLORS.textSecondary },
});
