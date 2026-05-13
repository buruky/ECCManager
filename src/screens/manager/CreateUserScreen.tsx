import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { createUser, getUsersByRole, isValidUsername } from '@/services/userService';
import { AppUser, UserRole } from '@/types';
import { COLORS, SUPERVISOR_PROGRAMS } from '@/utils/constants';
import ScreenHeader from '@/components/ScreenHeader';

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Manager', value: 'manager' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Case Manager', value: 'caseManager' },
];

export default function CreateUserScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('caseManager');
  const [supervisorId, setSupervisorId] = useState('');
  const [supervisorProgram, setSupervisorProgram] = useState<'prime' | 'wamass' | ''>('');
  const [supervisors, setSupervisors] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUsersByRole('supervisor').then(setSupervisors);
  }, []);

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Error', 'All fields are required.');
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
      await createUser(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role,
          supervisorId: supervisorId || undefined,
          program: role === 'supervisor' ? (supervisorProgram as 'prime' | 'wamass') : undefined,
          ...(username.trim() ? { username: username.trim().toLowerCase() } : {}),
        },
        user!.uid,
        user!.name
      );
      Alert.alert('Success', `${name} has been added as a ${role}.`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Add Staff Member" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form}>
          {[
            { label: 'Full Name *', value: name, setter: setName, placeholder: 'Jane Doe', capitalize: 'words' as const },
            { label: 'Username (optional)', value: username, setter: setUsername, placeholder: 'e.g. jane_smith', hint: 'Used to sign in instead of email' },
            { label: 'Email *', value: email, setter: setEmail, placeholder: 'jane@example.com', keyboard: 'email-address' as const },
            { label: 'Phone *', value: phone, setter: setPhone, placeholder: '+1 (555) 000-0000', keyboard: 'phone-pad' as const },
            { label: 'Temporary Password *', value: password, setter: setPassword, placeholder: 'Min 8 characters', secure: true },
          ].map(f => (
            <View key={f.label}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType={f.keyboard}
                autoCapitalize={f.capitalize ?? 'none'}
                secureTextEntry={f.secure}
              />
              {f.hint ? <Text style={styles.fieldHint}>{f.hint}</Text> : null}
            </View>
          ))}

          <Text style={styles.label}>Role *</Text>
          <View style={styles.roleRow}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                onPress={() => setRole(r.value)}
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
                </TouchableOpacity>
              ))}
              {supervisors.length === 0 && (
                <Text style={styles.hint}>No supervisors yet. Create a supervisor first.</Text>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add Staff Member</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: 24, paddingBottom: 48 },
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
  },
  supervisorBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  supervisorBtnText: { fontSize: 14, color: COLORS.text },
  supervisorBtnTextActive: { color: COLORS.primary, fontWeight: '600' },
  hint: { fontSize: 13, color: COLORS.warning, marginTop: 4 },
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
