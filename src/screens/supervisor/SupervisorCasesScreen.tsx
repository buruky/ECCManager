import React, { useEffect, useState } from 'react';
import {
  View, SectionList, StyleSheet, TextInput, Text, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCases } from '@/contexts/CasesContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getCasesBySupervisor } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';
import CaseCard from '@/components/CaseCard';

export default function SupervisorCasesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { casesVersion } = useCases();
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
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

  const filtered = cases.filter(c =>
    c.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const unassigned = filtered.filter(c => !c.assignedCaseManagerId);
  const assigned = filtered.filter(c => !!c.assignedCaseManagerId);

  const sections = [
    ...(unassigned.length > 0
      ? [{ title: `Needs Assignment (${unassigned.length})`, data: unassigned, urgent: true }]
      : []),
    ...(assigned.length > 0
      ? [{ title: `Assigned (${assigned.length})`, data: assigned, urgent: false }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="All Cases" subtitle={`${cases.length} in program`} />

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by client name..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <CaseCard
            item={item}
            onPress={() => navigation.navigate('SupervisorCaseDetail', { caseId: item.id })}
            showProgram={false}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, section.urgent && styles.sectionHeaderUrgent]}>
            {section.urgent && (
              <Ionicons name="alert-circle" size={15} color={COLORS.warning} style={{ marginRight: 6 }} />
            )}
            {!section.urgent && (
              <Ionicons name="checkmark-circle" size={15} color={COLORS.success} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.sectionTitle, section.urgent && styles.sectionTitleUrgent]}>
              {section.title}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'No cases match your search.' : 'No cases in your program yet.'}
          </Text>
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  sectionHeaderUrgent: {},
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleUrgent: { color: COLORS.warning },
  list: { paddingBottom: 32 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },
});