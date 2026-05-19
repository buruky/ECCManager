import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCommunicationLog, addCommunicationEntry } from '@/services/caseService';
import { CommunicationEntry } from '@/types';
import { COLORS, COMMUNICATION_TYPES } from '@/utils/constants';
import { Ionicons } from '@expo/vector-icons';

export default function CommunicationLogSection({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CommunicationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState(COMMUNICATION_TYPES[0]);
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const canAdd = !!user;

  useEffect(() => {
    getCommunicationLog(caseId).then(e => { setEntries(e); setLoading(false); });
  }, []);

  async function handleAdd() {
    if (!summary.trim()) { Alert.alert('Error', 'Please enter a summary.'); return; }
    setSaving(true);
    try {
      const entry = await addCommunicationEntry({ caseId, type, summary: summary.trim(), date }, user!.uid, user!.name);
      setEntries(prev => [entry, ...prev]);
      setSummary('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowModal(false);
    } catch {
      Alert.alert('Error', 'Failed to log communication.');
    } finally {
      setSaving(false);
    }
  }

  const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    'Phone Call': 'call-outline',
    'Email': 'mail-outline',
    'Text Message': 'chatbubble-outline',
    'In-Person Meeting': 'people-outline',
    'Home Visit': 'home-outline',
    'Other': 'ellipsis-horizontal-outline',
  };

  return (
    <View style={{ flex: 1 }}>
      {canAdd && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Log Communication</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={e => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.entry}>
              <View style={styles.entryHeader}>
                <View style={styles.typeRow}>
                  <Ionicons name={TYPE_ICONS[item.type] ?? 'ellipsis-horizontal-outline'} size={16} color={COLORS.accent} />
                  <Text style={styles.entryType}>{item.type}</Text>
                </View>
                <Text style={styles.entryDate}>{new Date(item.date).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.entrySummary}>{item.summary}</Text>
              <Text style={styles.entryBy}>Logged by {item.loggedByName}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No communication logged yet.</Text>}
        />
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Communication</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {COMMUNICATION_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
            />
            <Text style={styles.label}>Summary *</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={summary}
              onChangeText={setSummary}
              placeholder="Describe the communication..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Entry</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    margin: 12,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, paddingBottom: 40 },
  entry: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  entryType: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  entryDate: { fontSize: 12, color: COLORS.textSecondary },
  entrySummary: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  entryBy: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalContent: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 14 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  typeBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  typeBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.text,
  },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
