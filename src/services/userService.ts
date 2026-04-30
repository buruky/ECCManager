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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
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
    password: string;
  },
  createdBy: string,
  createdByName: string
): Promise<AppUser> {
  const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const uid = credential.user.uid;

  const newUser: Omit<AppUser, 'uid'> = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    supervisorId: data.supervisorId,
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
