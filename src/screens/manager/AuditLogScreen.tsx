import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection, getDocs, orderBy, query, limit, startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/config/firebase';
import { AuditLogEntry } from '@/types';
import { COLORS, COLLECTIONS } from '@/utils/constants';
import { formatDateTime } from '@/utils/date';
import ScreenHeader from '@/components/ScreenHeader';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: 'Create User',
  UPDATE_USER: 'Update User',
  UPDATE_USER_ROLE: 'Update Role',
  DEACTIVATE_USER: 'Deactivate User',
  APPROVE_REGISTRATION: 'Approve Account',
  REJECT_REGISTRATION: 'Reject Account',
  CREATE_CASE: 'Create Case',
  UPDATE_CASE_INFO: 'Update Case',
  UPDATE_CASE_STATUS: 'Update Status',
  ASSIGN_CASE_MANAGER: 'Assign Manager',
  DELETE_CASE: 'Delete Case',
  ADD_CASE_NOTE: 'Add Note',
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ??
    action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function getActionColor(action: string): string {
  if (/^(CREATE|APPROVE|ADD)/.test(action)) return COLORS.success;
  if (/^(DELETE|REJECT|DEACTIVATE)/.test(action)) return COLORS.error;
  return COLORS.accent;
}

function getActionIcon(action: string): keyof typeof Ionicons.glyphMap {
  if (action.includes('NOTE')) return 'document-text-outline';
  if (action.includes('CASE')) return 'folder-outline';
  return 'person-outline';
}

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Users', value: 'user' },
  { label: 'Cases', value: 'case' },
  { label: 'Notes', value: 'note' },
] as const;

type FilterValue = '' | 'user' | 'case' | 'note';

export default function AuditLogScreen() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('');

  async function fetchPage(afterDoc?: QueryDocumentSnapshot) {
    const constraints: any[] = [orderBy('timestamp', 'desc'), limit(PAGE_SIZE)];
    if (afterDoc) constraints.push(startAfter(afterDoc));
    const snap = await getDocs(query(collection(db, COLLECTIONS.AUDIT_LOG), ...constraints));
    return snap;
  }

  async function load() {
    setLoading(true);
    try {
      const snap = await fetchPage();
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry)));
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const snap = await fetchPage();
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry)));
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const snap = await fetchPage(lastDoc);
      setLogs(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry))]);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      if (filter && l.targetType !== filter) return false;
      if (q && !l.userName.toLowerCase().includes(q) && !l.details.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, search, filter]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Audit Log" subtitle="All system activity" />

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or action..."
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={l => l.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const color = getActionColor(item.action);
            return (
              <View style={[styles.entry, { borderLeftColor: color }]}>
                <View style={styles.entryHeader}>
                  <View style={[styles.actionBadge, { backgroundColor: color + '18' }]}>
                    <Ionicons name={getActionIcon(item.action)} size={12} color={color} />
                    <Text style={[styles.actionLabel, { color }]}>{formatAction(item.action)}</Text>
                  </View>
                  <Text style={styles.time}>{formatDateTime(item.timestamp)}</Text>
                </View>
                <Text style={styles.detail}>{item.details}</Text>
                <Text style={styles.actor}>By {item.userName}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={40} color={COLORS.border} />
              <Text style={styles.empty}>
                {search || filter ? 'No matching entries.' : 'No audit entries yet.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore && !search && !filter ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <ActivityIndicator color={COLORS.primary} size="small" />
                  : <Text style={styles.loadMoreText}>Load more</Text>
                }
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { marginTop: 60 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: '#fff',
  },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  entry: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flexShrink: 0,
  },
  detail: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  actor: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  empty: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});