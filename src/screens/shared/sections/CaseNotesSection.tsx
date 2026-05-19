import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCaseNotes, addCaseNote } from '@/services/caseService';
import { CaseNote } from '@/types';
import { COLORS } from '@/utils/constants';
import { formatDate } from '@/utils/date';

export default function CaseNotesSection({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canAddNote = !!user;

  async function load() {
    setLoading(true);
    setNotes(await getCaseNotes(caseId));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const note = await addCaseNote(caseId, newNote.trim(), user!.uid, user!.name);
      setNotes(prev => [note, ...prev]);
      setNewNote('');
    } catch {
      Alert.alert('Error', 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {canAddNote && (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={newNote}
            onChangeText={setNewNote}
            placeholder="Write a case note..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
          />
          <TouchableOpacity
            style={[styles.addBtn, (!newNote.trim() || saving) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newNote.trim() || saving}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add Note</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteAuthor}>{item.createdByName}</Text>
                <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.noteContent}>{item.content}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No case notes yet.</Text>}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputArea: {
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  noteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  noteAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  noteDate: { fontSize: 12, color: COLORS.textSecondary },
  noteContent: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
