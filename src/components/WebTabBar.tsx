import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/utils/constants';
import { useIsDesktop, SIDEBAR_WIDTH } from '@/utils/responsive';

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  supervisor: 'Supervisor',
  caseManager: 'Case Manager',
};

export default function WebTabBar(props: BottomTabBarProps) {
  const { user, signOut } = useAuth();
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return <BottomTabBar {...props} />;
  }

  const { state, descriptors, navigation } = props;

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ECC Manager</Text>
        <Text style={styles.headerSub}>Eritrean Community</Text>
      </View>

      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const labelVal = options.tabBarLabel;
          const label = typeof labelVal === 'string' ? labelVal : (options.title ?? route.name);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              style={[styles.navItem, isFocused && styles.navItemActive]}
              onPress={() => navigation.navigate(route.name)}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? '#fff' : 'rgba(255,255,255,0.5)',
                size: 20,
              })}
              <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.userRole}>{user?.role ? ROLE_LABELS[user.role] : ''}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('MfaEnrollment')}
            style={styles.signOutBtn}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.primary,
    flexDirection: 'column',
    zIndex: 999,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
  },
  nav: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  navLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  userMeta: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, color: '#fff', fontWeight: '600' },
  userRole: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  signOutBtn: { padding: 4 },
});