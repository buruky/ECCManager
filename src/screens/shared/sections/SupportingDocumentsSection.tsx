import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert
} from 'react-native';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Document } from '@/types';
import { COLORS, COLLECTIONS } from '@/utils/constants';
import { Ionicons } from '@expo/vector-icons';

export default function SupportingDocumentsSection({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

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

  function showComingSoon() {
    Alert.alert('Coming Soon', 'Document uploads will be available once Firebase Storage is enabled.');
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
          <TouchableOpacity style={styles.uploadBtn} onPress={showComingSoon}>
            <Ionicons name="attach-outline" size={18} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Attach File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={showComingSoon}>
            <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Take Photo</Text>
          </TouchableOpacity>
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
