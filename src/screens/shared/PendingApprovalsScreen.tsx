import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SUPERVISOR_PROGRAMS, PROGRAM_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/date';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getUsersByRole,
} from '@/services/userService';
import { AppUser, UserRole } from '@/types';
import ScreenHeader from '@/components/ScreenHeader';

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Case Manager', value: 'caseManager' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Manager', value: 'manager' },
];

export default function PendingApprovalsScreen() {
  const { user } = useAuth();
  const [pending, setPending] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionUid, setActionUid] = useState<string | null>(null);

  // Approve modal
  const [approveVisible, setApproveVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [modalRole, setModalRole] = useState<UserRole>('caseManager');
  const [modalSupervisorId, setModalSupervisorId] = useState('');
  const [modalProgram, setModalProgram] = useState<'prime' | 'wamass'>('prime');
  const [availableSupervisors, setAvailableSupervisors] = useState<AppUser[]>([]);
  const [modalError, setModalError] = useState('');

  // Reject confirmation modal
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AppUser | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPending();
    }, [])
  );

  async function loadPending() {
    setLoadError('');
    setLoading(true);
    try {
      setPending(await getPendingRegistrations());
    } catch {
      setLoadError('Failed to load pending registrations. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }

  async function openApproveModal(pendingUser: AppUser) {
    setModalError('');
    setSelectedUser(pendingUser);
    setModalRole('caseManager');
    setModalProgram('prime');
    setModalSupervisorId(user?.role === 'supervisor' ? user.uid : '');
    const supervisors = await getUsersByRole('supervisor');
    setAvailableSupervisors(supervisors);
    setApproveVisible(true);
  }

  async function handleApprove() {
    if (!selectedUser || !user) return;
    if (modalRole === 'caseManager' && !modalSupervisorId) {
      setModalError('Please assign a supervisor before approving.');
      return;
    }
    setModalError('');
    setApproveVisible(false);
    setActionUid(selectedUser.uid);
    try {
      await approveRegistration(
        selectedUser.uid,
        selectedUser.name,
        {
          role: modalRole,
          supervisorId: modalRole === 'caseManager' ? modalSupervisorId : undefined,
          program: modalRole === 'supervisor' ? modalProgram : undefined,
        },
        user.uid,
        user.name
      );
      setPending(prev => prev.filter(u => u.uid !== selectedUser.uid));
    } catch {
      // re-show the user with an error indicator — actionUid clears below
    } finally {
      setActionUid(null);
    }
  }

  function openRejectModal(pendingUser: AppUser) {
    setRejectTarget(pendingUser);
    setRejectVisible(true);
  }

  async function handleReject() {
    if (!rejectTarget || !user) return;
    setRejectVisible(false);
    setActionUid(rejectTarget.uid);
    try {
      await rejectRegistration(rejectTarget.uid, rejectTarget.name, user.uid, user.name);
      setPending(prev => prev.filter(u => u.uid !== rejectTarget.uid));
    } catch {
      // silently restore — user stays in list, they can retry
    } finally {
      setActionUid(null);
    }
  }

  const roleOptions = user?.role === 'manager'
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter(r => r.value !== 'manager');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Pending Approvals"
        subtitle={pending.length > 0 ? `${pending.length} awaiting review` : 'No pending requests'}
      />

      {loadError ? (
        <View style={styles.loadErrorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
          <Text style={styles.loadErrorText}>{loadError}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={pending}
          keyExtractor={u => u.uid}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isProcessing = actionUid === item.uid;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                  <Text style={styles.dateText}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>

                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}

                {isProcessing ? (
                  <ActivityIndicator style={styles.processingLoader} color={COLORS.primary} />
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => openApproveModal(item)}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => openRejectModal(item)}>
                      <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.success} />
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubText}>No pending account requests.</Text>
            </View>
          }
        />
      )}

      {/* Approve modal */}
      <Modal visible={approveVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Approve Account</Text>
            {selectedUser && (
              <>
                <Text style={styles.modalName}>{selectedUser.name}</Text>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>

                {modalError ? (
                  <View style={styles.modalErrorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
                    <Text style={styles.modalErrorText}>{modalError}</Text>
                  </View>
                ) : null}

                <Text style={styles.modalLabel}>Assign Role</Text>
                <View style={styles.roleRow}>
                  {roleOptions.map(r => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.roleBtn, modalRole === r.value && styles.roleBtnActive]}
                      onPress={() => {
                        setModalRole(r.value);
                        setModalError('');
                        setModalSupervisorId(r.value === 'caseManager' && user?.role === 'supervisor' ? user.uid : '');
                      }}
                    >
                      <Text style={[styles.roleBtnText, modalRole === r.value && styles.roleBtnTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {modalRole === 'caseManager' && (
                  <>
                    <Text style={styles.modalLabel}>Assign Supervisor</Text>
                    {availableSupervisors.length === 0 ? (
                      <Text style={styles.noSupervisors}>
                        No active supervisors. Create a supervisor account first.
                      </Text>
                    ) : (
                      <ScrollView style={styles.supervisorList} nestedScrollEnabled>
                        {availableSupervisors.map(s => (
                          <TouchableOpacity
                            key={s.uid}
                            style={[styles.supervisorItem, modalSupervisorId === s.uid && styles.supervisorItemActive]}
                            onPress={() => { setModalSupervisorId(s.uid); setModalError(''); }}
                          >
                            <Text style={[styles.supervisorItemText, modalSupervisorId === s.uid && styles.supervisorItemTextActive]}>
                              {s.name}
                            </Text>
                            {s.program && (
                              <Text style={styles.supervisorProgram}>{PROGRAM_LABELS[s.program]}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}

                {modalRole === 'supervisor' && (
                  <>
                    <Text style={styles.modalLabel}>Assign Program</Text>
                    <View style={styles.programRow}>
                      {SUPERVISOR_PROGRAMS.map(p => (
                        <TouchableOpacity
                          key={p.value}
                          style={[styles.programBtn, modalProgram === p.value && styles.programBtnActive]}
                          onPress={() => setModalProgram(p.value as 'prime' | 'wamass')}
                        >
                          <Text style={[styles.programBtnText, modalProgram === p.value && styles.programBtnTextActive]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setApproveVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApprove} onPress={handleApprove}>
                <Text style={styles.modalApproveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject confirmation modal */}
      <Modal visible={rejectVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.rejectIconRow}>
              <Ionicons name="close-circle" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.modalTitle}>Reject Registration</Text>
            <Text style={styles.rejectMessage}>
              Are you sure you want to reject{rejectTarget ? ` ${rejectTarget.name}'s` : ''} account request? This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalReject} onPress={handleReject}>
                <Text style={styles.modalRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { marginTop: 60 },
  loadErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadErrorText: { flex: 1, fontSize: 13, color: COLORS.error, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: COLORS.warning + '22',
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.warning },
  dateText: { fontSize: 12, color: COLORS.textSecondary },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  email: { fontSize: 13, color: COLORS.textSecondary },
  phone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  processingLoader: { marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptySubText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  modalName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  modalEmail: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.error + '15',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modalErrorText: { flex: 1, fontSize: 13, color: COLORS.error, fontWeight: '500' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  roleBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  roleBtnTextActive: { color: COLORS.primary },
  noSupervisors: { fontSize: 13, color: COLORS.warning, marginBottom: 12 },
  supervisorList: { maxHeight: 150, marginBottom: 8 },
  supervisorItem: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supervisorItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  supervisorItemText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  supervisorItemTextActive: { color: COLORS.primary, fontWeight: '600' },
  supervisorProgram: { fontSize: 11, color: COLORS.textSecondary },
  programRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  programBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  programBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  programBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  programBtnTextActive: { color: COLORS.primary },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  modalApprove: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalApproveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rejectIconRow: { alignItems: 'center', marginBottom: 12 },
  rejectMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalReject: {
    flex: 1,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalRejectText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});