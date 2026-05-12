import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllUsers, deactivateUser, getPendingRegistrations } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { AppUser } from '@/types';
import { COLORS, PROGRAM_LABELS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

const ROLE_LABELS = { manager: 'Manager', supervisor: 'Supervisor', caseManager: 'Case Manager' };
const ROLE_COLORS = { manager: COLORS.primary, supervisor: COLORS.accent, caseManager: COLORS.success };

export default function UserManagementScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [allUsers, pending] = await Promise.all([getAllUsers(), getPendingRegistrations()]);
    setUsers(allUsers);
    setPendingCount(pending.length);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDeactivate(target: AppUser) {
    Alert.alert(
      'Deactivate Account',
      `Are you sure you want to deactivate ${target.name}? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            await deactivateUser(target.uid, target.name, user!.uid, user!.name);
            load();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Staff Management"
        subtitle={`${users.filter(u => u.isActive).length} active members`}
        rightAction={{ icon: 'person-add-outline', onPress: () => navigation.navigate('CreateUser') }}
      />
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={() => navigation.navigate('PendingApprovals')}>
          <Ionicons name="time-outline" size={16} color="#fff" />
          <Text style={styles.pendingBannerText}>
            {pendingCount} account request{pendingCount > 1 ? 's' : ''} awaiting approval
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}
      <FlatList
        data={users}
        keyExtractor={u => u.uid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isActive && styles.cardInactive]}>
            <View style={styles.info}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: ROLE_COLORS[item.role] + '22' }]}>
                  <Text style={[styles.badgeText, { color: ROLE_COLORS[item.role] }]}>
                    {ROLE_LABELS[item.role]}
                  </Text>
                </View>
              </View>
              <Text style={styles.email}>{item.email}</Text>
              {item.role === 'supervisor' && (
                <Text style={styles.program}>
                  {item.program ? PROGRAM_LABELS[item.program] : 'No program assigned'}
                </Text>
              )}
              {!item.isActive && <Text style={styles.inactive}>Deactivated</Text>}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => navigation.navigate('EditUser', { user: item })} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={20} color={COLORS.accent} />
              </TouchableOpacity>
              {item.isActive && item.uid !== user?.uid && (
                <TouchableOpacity onPress={() => confirmDeactivate(item)} style={styles.actionBtn}>
                  <Ionicons name="person-remove-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No staff members found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInactive: { opacity: 0.5 },
  info: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  email: { fontSize: 13, color: COLORS.textSecondary },
  program: { fontSize: 12, color: COLORS.accent, marginTop: 2, fontWeight: '600' },
  inactive: { fontSize: 12, color: COLORS.error, marginTop: 2, fontWeight: '600' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { padding: 8 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pendingBannerText: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 13 },
});
