import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert
} from 'react-native';
import { collection, getDocs, query, where, orderBy, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Document } from '@/types';
import { COLORS, COLLECTIONS } from '@/utils/constants';
import { Ionicons } from '@expo/vector-icons';

export default function SupportingDocumentsSection({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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

  async function uploadFile(uri: string, name: string, mimeType: string) {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `documents/${caseId}/${Date.now()}_${name}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      const now = new Date().toISOString();
      await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
        caseId,
        name,
        url,
        type: mimeType,
        uploadedBy: user!.uid,
        uploadedByName: user!.name,
        uploadedAt: now,
      });
      await loadDocs();
    } catch {
      Alert.alert('Upload Failed', 'Could not upload the file. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await uploadFile(asset.uri, asset.name, asset.mimeType ?? 'application/octet-stream');
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
    const fileName = `photo_${Date.now()}.jpg`;
    await uploadFile(asset.uri, fileName, 'image/jpeg');
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
          <TouchableOpacity style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]} onPress={handlePickFile} disabled={uploading}>
            <Ionicons name="attach-outline" size={18} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Attach File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]} onPress={handleTakePhoto} disabled={uploading}>
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
                  {item.uploadedByName} · {new Date(item.uploadedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No documents uploaded yet.</Text>}
        />
      )}
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
});
