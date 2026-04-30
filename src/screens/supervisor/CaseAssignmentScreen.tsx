import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { getCaseById, assignCaseManager } from '@/services/caseService';
import { getUsersByRole } from '@/services/userService';
import { Case, AppUser } from '@/types';
import { COLORS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

export default function CaseAssignmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { caseId } = route.params as { caseId: string };

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [caseManagers, setCaseManagers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getCaseById(caseId), getUsersByRole('caseManager')]).then(([c, cms]) => {
      setCaseData(c);
      // Only show case managers under this supervisor
      setCaseManagers(cms.filter(cm => cm.supervisorId === user?.uid));
    });
  }, []);

  async function handleAssign() {
    const cm = caseManagers.find(c => c.uid === selected);
    if (!cm || !caseData) return;
    setLoading(true);
    try {
      await assignCaseManager(
        caseId,
        caseData.clientName,
        cm.uid,
        cm.name,
        user!.uid,
        user!.name,
        user!.uid,
        user!.name
      );
      Alert.alert('Success', `${cm.name} has been assigned to this case.`);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to assign case manager.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Assign Case Manager" showBack />
      {caseData && (
        <View style={styles.caseInfo}>
          <Text style={styles.clientLabel}>Client</Text>
          <Text style={styles.clientName}>{caseData.clientName}</Text>
        </View>
      )}
      <Text style={styles.sectionTitle}>Select a Case Manager</Text>
      <FlatList
        data={caseManagers}
        keyExtractor={cm => cm.uid}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.cmCard, selected === item.uid && styles.cmCardSelected]}
            onPress={() => setSelected(item.uid)}
          >
            <Text style={[styles.cmName, selected === item.uid && styles.cmNameSelected]}>{item.name}</Text>
            <Text style={styles.cmEmail}>{item.email}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No case managers under your supervision yet.</Text>
        }
      />
      {selected ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAssign}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm Assignment</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  caseInfo: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  clientLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, margin: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  cmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cmCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '0d' },
  cmName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cmNameSelected: { color: COLORS.primary },
  cmEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  button: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 32 },
});
