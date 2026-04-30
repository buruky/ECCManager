import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllUsers, deactivateUser } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { AppUser } from '@/types';
import { COLORS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

const ROLE_LABELS = { manager: 'Manager', supervisor: 'Supervisor', caseManager: 'Case Manager' };
const ROLE_COLORS = { manager: COLORS.primary, supervisor: COLORS.accent, caseManager: COLORS.success };

export default function UserManagementScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setUsers(await getAllUsers());
  }

  useEffect(() => { load(); }, []);

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
              {!item.isActive && <Text style={styles.inactive}>Deactivated</Text>}
            </View>
            {item.isActive && item.uid !== user?.uid && (
              <TouchableOpacity onPress={() => confirmDeactivate(item)} style={styles.deactivateBtn}>
                <Ionicons name="person-remove-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            )}
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
  inactive: { fontSize: 12, color: COLORS.error, marginTop: 2, fontWeight: '600' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  deactivateBtn: { padding: 8 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48 },
});
