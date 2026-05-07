import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, firebaseConfig } from '@/config/firebase';
import { AppUser, UserRole } from '@/types';
import { COLLECTIONS } from '@/utils/constants';
import { writeAuditLog } from './auditService';

export async function getUserById(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.USERS));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
}

export async function getUsersByRole(role: UserRole): Promise<AppUser[]> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('role', '==', role),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
}

export async function createUser(
  data: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    supervisorId?: string;
    program?: 'prime' | 'wamass';
    password: string;
  },
  createdBy: string,
  createdByName: string
): Promise<AppUser> {
  const secondaryApp = initializeApp(firebaseConfig, `create-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  let authUser: { uid: string; delete: () => Promise<void> } | null = null;

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
    authUser = credential.user;
    const uid = authUser.uid;

    const newUser: Omit<AppUser, 'uid'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      ...(data.supervisorId ? { supervisorId: data.supervisorId } : {}),
      ...(data.program ? { program: data.program } : {}),
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);

    await writeAuditLog({
      userId: createdBy,
      userName: createdByName,
      action: 'CREATE_USER',
      targetType: 'user',
      targetId: uid,
      details: `Created ${data.role} account for ${data.name}`,
    });

    return { uid, ...newUser };
  } catch (err) {
    // Roll back the Auth account so it doesn't become an orphan
    if (authUser) {
      try { await authUser.delete(); } catch { /* best-effort */ }
    }
    throw err;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function deactivateUser(
  targetUid: string,
  targetName: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, targetUid), { isActive: false });
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'DEACTIVATE_USER',
    targetType: 'user',
    targetId: targetUid,
    details: `Deactivated account for ${targetName}`,
  });
}

export async function updateUserRole(
  targetUid: string,
  targetName: string,
  newRole: UserRole,
  supervisorId: string | undefined,
  actorId: string,
  actorName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, targetUid), { role: newRole, supervisorId: supervisorId ?? null });
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'UPDATE_USER_ROLE',
    targetType: 'user',
    targetId: targetUid,
    details: `Changed role of ${targetName} to ${newRole}`,
  });
}

export async function updateUser(
  targetUid: string,
  changes: {
    name: string;
    phone: string;
    role: UserRole;
    supervisorId?: string;
    program?: 'prime' | 'wamass';
  },
  actorId: string,
  actorName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, targetUid), {
    name: changes.name,
    phone: changes.phone,
    role: changes.role,
    supervisorId: changes.supervisorId ?? null,
    program: changes.program ?? null,
  });
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'UPDATE_USER',
    targetType: 'user',
    targetId: targetUid,
    details: `Updated profile for ${changes.name} (${changes.role})`,
  });
}
