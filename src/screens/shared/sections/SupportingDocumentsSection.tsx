import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Document } from '@/types';
import { COLORS, COLLECTIONS } from '@/utils/constants';
import { formatDate } from '@/utils/date';
import { Ionicons } from '@expo/vector-icons';

interface PendingUpload {
  uri: string;
  name: string;
  mimeType: string;
}

export default function SupportingDocumentsSection({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [showNaming, setShowNaming] = useState(false);

  const canUpload = user?.role === 'caseManager' || user?.role === 'manager';

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.DOCUMENTS), where('caseId', '==', caseId), orderBy('uploadedAt', 'desc'))
    );
    setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Document)));
    setLoading(false);
  }

  async function handlePickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const items: PendingUpload[] = result.assets.map(a => ({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType ?? 'application/octet-stream',
    }));
    setPending(prev => [...prev, ...items]);
    setShowNaming(true);
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPending(prev => [...prev, {
      uri: asset.uri,
      name: `Photo ${new Date().toLocaleDateString()}`,
      mimeType: 'image/jpeg',
    }]);
    setShowNaming(true);
  }

  function updateName(index: number, name: string) {
    setPending(prev => prev.map((p, i) => i === index ? { ...p, name } : p));
  }

  function removePending(index: number) {
    setPending(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setShowNaming(false);
      return next;
    });
  }

  function cancelNaming() {
    setPending([]);
    setShowNaming(false);
  }

  async function handleUploadAll() {
    if (pending.some(p => !p.name.trim())) {
      Alert.alert('Name Required', 'Please give each file a name before uploading.');
      return;
    }
    setUploading(true);
    setShowNaming(false);
    const toUpload = [...pending];
    setPending([]);
    try {
      for (const item of toUpload) {
        const blob = await (await fetch(item.uri)).blob();
        const storageRef = ref(storage, `documents/${caseId}/${Date.now()}_${item.name.trim()}`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
          caseId,
          name: item.name.trim(),
          url,
          type: item.mimeType,
          uploadedBy: user!.uid,
          uploadedByName: user!.name,
          uploadedAt: serverTimestamp(),
        });
      }
      await loadDocs();
    } catch {
      Alert.alert('Upload Failed', 'One or more files could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const FILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    'application/pdf': 'document-outline',
    'image/jpeg': 'image-outline',
    'image/png': 'image-outline',
  };

  return (
    <View style={{ flex: 1 }}>
      {canUpload && (
        <View style={styles.uploadRow}>
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
            onPress={handlePickFiles}
            disabled={uploading}
          >
            <Ionicons name="attach-outline" size={18} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Attach Files</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
            onPress={handleTakePhoto}
            disabled={uploading}
          >
            <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Take Photo</Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator color={COLORS.primary} style={{ marginLeft: 8 }} />}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.docCard}>
              <Ionicons
                name={FILE_ICONS[item.type] ?? 'document-outline'}
                size={28}
                color={COLORS.accent}
                style={styles.docIcon}
              />
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.docMeta}>
                  {item.uploadedByName} · {formatDate(item.uploadedAt)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No documents uploaded yet.</Text>}
        />
      )}

      <Modal
        visible={showNaming}
        animationType="slide"
        transparent
        onRequestClose={cancelNaming}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Name Your Files ({pending.length})
              </Text>
              <TouchableOpacity onPress={cancelNaming}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {pending.map((item, index) => (
                <View key={index} style={styles.pendingRow}>
                  <Ionicons
                    name={FILE_ICONS[item.mimeType] ?? 'document-outline'}
                    size={22}
                    color={COLORS.accent}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={styles.nameInput}
                    value={item.name}
                    onChangeText={text => updateName(index, text)}
                    placeholder="File name..."
                    placeholderTextColor={COLORS.textSecondary}
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={() => removePending(index)} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelNaming}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadAllBtn} onPress={handleUploadAll}>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadAllBtnText}>
                  Upload {pending.length} File{pending.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  uploadRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  list: { padding: 12, paddingBottom: 40 },
  docCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIcon: { marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  docMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalScroll: { paddingHorizontal: 16, paddingTop: 12 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  uploadAllBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadAllBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
