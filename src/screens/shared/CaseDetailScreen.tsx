import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getCaseById, updateCaseStatus, deleteCase } from '@/services/caseService';
import { Case } from '@/types';
import { COLORS, CASE_STATUSES } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';
import IntakeSection from './sections/IntakeSection';
import ConsentFormsSection from './sections/ConsentFormsSection';
import ServiceRecordsSection from './sections/ServiceRecordsSection';
import CaseNotesSection from './sections/CaseNotesSection';
import CommunicationLogSection from './sections/CommunicationLogSection';
import SupportingDocumentsSection from './sections/SupportingDocumentsSection';

const SECTIONS = [
  { key: 'intake', label: 'Intake', icon: 'person-outline' },
  { key: 'consent', label: 'Consent Forms', icon: 'document-text-outline' },
  { key: 'services', label: 'Service Records', icon: 'briefcase-outline' },
  { key: 'notes', label: 'Case Notes', icon: 'create-outline' },
  { key: 'communication', label: 'Communication', icon: 'chatbubble-outline' },
  { key: 'documents', label: 'Documents', icon: 'attach-outline' },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  active: COLORS.success,
  onHold: COLORS.textSecondary,
};

export default function CaseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { caseId } = route.params as { caseId: string };

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('intake');
  const [loading, setLoading] = useState(true);

  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';
  const canChangeStatus = isManager || isSupervisor;
  const canDelete = isManager;

  async function load() {
    setLoading(true);
    setCaseData(await getCaseById(caseId));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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

  function confirmDelete() {
    if (!caseData) return;
    Alert.alert(
      'Delete Case',
      `Permanently delete case for ${caseData.clientName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCase(caseId, caseData.clientName, user!.uid, user!.name);
            navigation.goBack();
          },
        },
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title={caseData.clientName}
        showBack
        rightAction={canDelete ? { icon: 'trash-outline', onPress: confirmDelete } : undefined}
      />

      {/* Case meta bar */}
      <View style={styles.metaBar}>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[caseData.status] + '22' }]}
          onPress={canChangeStatus ? showStatusPicker : undefined}
          disabled={!canChangeStatus}
        >
          <Text style={[styles.statusText, { color: STATUS_COLORS[caseData.status] }]}>
            {CASE_STATUSES.find(s => s.value === caseData.status)?.label}
          </Text>
          {canChangeStatus && <Ionicons name="chevron-down" size={14} color={STATUS_COLORS[caseData.status]} style={{ marginLeft: 4 }} />}
        </TouchableOpacity>
        <Text style={styles.metaSub}>
          {caseData.assignedCaseManagerName ?? 'Unassigned'}
        </Text>
      </View>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabs}>
        {SECTIONS.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.tab, activeSection === s.key && styles.tabActive]}
            onPress={() => setActiveSection(s.key)}
          >
            <Ionicons
              name={s.icon as any}
              size={16}
              color={activeSection === s.key ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeSection === s.key && styles.tabTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section content */}
      <View style={styles.sectionContent}>
        {activeSection === 'intake' && <IntakeSection caseId={caseId} />}
        {activeSection === 'consent' && <ConsentFormsSection caseId={caseId} />}
        {activeSection === 'services' && <ServiceRecordsSection caseId={caseId} />}
        {activeSection === 'notes' && <CaseNotesSection caseId={caseId} />}
        {activeSection === 'communication' && <CommunicationLogSection caseId={caseId} />}
        {activeSection === 'documents' && <SupportingDocumentsSection caseId={caseId} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  metaBar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  metaSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  tabsContainer: { maxHeight: 52, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabs: { paddingHorizontal: 8, alignItems: 'center', gap: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  sectionContent: { flex: 1 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },
});
