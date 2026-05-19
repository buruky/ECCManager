import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, getUsersByRole, isValidUsername } from '@/services/userService';
import { AppUser, UserRole } from '@/types';
import { COLORS, SUPERVISOR_PROGRAMS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Manager', value: 'manager' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Case Manager', value: 'caseManager' },
];

export default function EditUserScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user: actor } = useAuth();
  const target: AppUser = route.params.user;

  const [name, setName] = useState(target.name);
  const [username, setUsername] = useState(target.username ?? '');
  const [phone, setPhone] = useState(target.phone);
  const [role, setRole] = useState<UserRole>(target.role);
  const [supervisorId, setSupervisorId] = useState(target.supervisorId ?? '');
  const [supervisorProgram, setSupervisorProgram] = useState<'prime' | 'wamass' | ''>(
    target.program ?? ''
  );
  const [supervisors, setSupervisors] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUsersByRole('supervisor').then(setSupervisors);
  }, []);

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Error', 'Name and phone are required.');
      return;
    }
    if (username.trim() && !isValidUsername(username.trim().toLowerCase())) {
      Alert.alert('Error', 'Username may only contain lowercase letters, numbers, underscores, and hyphens (3–30 characters).');
      return;
    }
    if (role === 'caseManager' && !supervisorId) {
      Alert.alert('Error', 'Please select a supervisor for this case manager.');
      return;
    }
    if (role === 'supervisor' && !supervisorProgram) {
      Alert.alert('Error', 'Please select a program for this supervisor.');
      return;
    }
    setLoading(true);
    try {
      await updateUser(
        target.uid,
        {
          name: name.trim(),
          phone: phone.trim(),
          role,
          supervisorId: role === 'caseManager' ? supervisorId : undefined,
          program: role === 'supervisor'
            ? (supervisorProgram as 'prime' | 'wamass')
            : role === 'caseManager'
            ? supervisors.find(s => s.uid === supervisorId)?.program
            : undefined,
          username: username.trim().toLowerCase(),
        },
        actor!.uid,
        actor!.name
      );
      Alert.alert('Saved', `${name} has been updated.`);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Edit Staff Member" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form}>

          <Text style={styles.emailNote}>{target.email}</Text>

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />

          <Text style={styles.label}>
            Username <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. jane_smith"
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.fieldHint}>
            {username.trim() ? 'User can sign in with this username' : 'Leave blank to remove username'}
          </Text>

          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Role *</Text>
          <View style={styles.roleRow}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                onPress={() => {
                  setRole(r.value);
                  setSupervisorId('');
                  setSupervisorProgram('');
                }}
              >
                <Text style={[styles.roleBtnText, role === r.value && styles.roleBtnTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {role === 'supervisor' && (
            <>
              <Text style={styles.label}>Program *</Text>
              <View style={styles.roleRow}>
                {SUPERVISOR_PROGRAMS.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.roleBtn, supervisorProgram === p.value && styles.roleBtnActive]}
                    onPress={() => setSupervisorProgram(p.value as 'prime' | 'wamass')}
                  >
                    <Text style={[styles.roleBtnText, supervisorProgram === p.value && styles.roleBtnTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {role === 'caseManager' && (
            <>
              <Text style={styles.label}>Assign to Supervisor *</Text>
              {supervisors.map(s => (
                <TouchableOpacity
                  key={s.uid}
                  style={[styles.supervisorBtn, supervisorId === s.uid && styles.supervisorBtnActive]}
                  onPress={() => setSupervisorId(s.uid)}
                >
                  <Text style={[styles.supervisorBtnText, supervisorId === s.uid && styles.supervisorBtnTextActive]}>
                    {s.name}
                  </Text>
                  {s.program && (
                    <Text style={styles.supervisorProgramTag}>
                      {s.program === 'prime' ? 'Prime' : 'WA-MASS'}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              {supervisors.length === 0 && (
                <Text style={styles.hint}>No supervisors yet.</Text>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: 24, paddingBottom: 48 },
  emailNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  roleBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  roleBtnTextActive: { color: COLORS.primary },
  supervisorBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supervisorBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  supervisorBtnText: { fontSize: 14, color: COLORS.text },
  supervisorBtnTextActive: { color: COLORS.primary, fontWeight: '600' },
  supervisorProgramTag: { fontSize: 11, fontWeight: '700', color: COLORS.accent },
  hint: { fontSize: 13, color: COLORS.warning, marginTop: 4 },
  optional: { fontWeight: '400' as const, color: COLORS.textSecondary },
  fieldHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});