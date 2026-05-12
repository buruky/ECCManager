import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCaseSection, saveCaseSection } from '@/services/caseService';
import { COLORS } from '@/utils/constants';
import { formatDate } from '@/utils/date';

interface Props {
  caseId: string;
  sectionName: string;
  placeholder?: string;
}

export default function TextBoxSection({ caseId, sectionName, placeholder }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastUpdatedBy, setLastUpdatedBy] = useState('');

  const canEdit = user?.role === 'manager' || user?.role === 'caseManager';

  useEffect(() => {
    getCaseSection(caseId, sectionName).then(section => {
      if (section) {
        setContent(section.content);
        setSavedContent(section.content);
        setLastUpdated(formatDate(section.updatedAt));
        setLastUpdatedBy(section.updatedByName);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveCaseSection(caseId, sectionName, content, user!.uid, user!.name);
      setSavedContent(content);
      setLastUpdated(formatDate(new Date()));
      setLastUpdatedBy(user!.name);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setContent(savedContent);
    setEditing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {lastUpdated ? (
        <Text style={styles.meta}>
          Last updated {lastUpdated} by {lastUpdatedBy}
        </Text>
      ) : null}

      {editing ? (
        <>
          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            multiline
            placeholder={placeholder ?? `Enter ${sectionName} details...`}
            placeholderTextColor={COLORS.textSecondary}
            autoFocus
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.contentBox}>
            {content ? (
              <Text style={styles.contentText}>{content}</Text>
            ) : (
              <Text style={styles.emptyText}>No information recorded yet.</Text>
            )}
          </View>
          {canEdit && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>{content ? 'Edit' : 'Add Information'}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 200,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  contentBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contentText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  editBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
