import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AuditLogEntry } from '@/types';
import { COLORS, COLLECTIONS } from '@/utils/constants';
import { formatDateTime } from '@/utils/date';
import ScreenHeader from '@/components/ScreenHeader';

export default function AuditLogScreen() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const snap = await getDocs(query(collection(db, COLLECTIONS.AUDIT_LOG), orderBy('timestamp', 'desc')));
    setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry)));
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Audit Log" subtitle="All system activity" />
      <FlatList
        data={logs}
        keyExtractor={l => l.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <View style={styles.row}>
              <Text style={styles.action}>{item.action.replace(/_/g, ' ')}</Text>
              <Text style={styles.time}>{formatDateTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.detail}>{item.details}</Text>
            <Text style={styles.user}>By: {item.userName}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No audit entries yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 32 },
  entry: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  action: { fontSize: 13, fontWeight: '700', color: COLORS.primary, flex: 1 },
  time: { fontSize: 12, color: COLORS.textSecondary },
  detail: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  user: { fontSize: 12, color: COLORS.textSecondary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },
});
