import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
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
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() } as AppUser))
    .filter(u => u.status !== 'pending');
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

export async function getCaseManagersBySupervisor(supervisorId: string): Promise<AppUser[]> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('role', '==', 'caseManager'),
    where('supervisorId', '==', supervisorId),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() } as AppUser))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_-]{3,30}$/.test(username);
}

export async function getUserByUsername(username: string): Promise<AppUser | null> {
  const q = query(collection(db, COLLECTIONS.USERS), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() } as AppUser;
}

async function checkUsernameAvailable(username: string, excludeUid?: string): Promise<boolean> {
  const q = query(collection(db, COLLECTIONS.USERS), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return true;
  if (excludeUid && snap.docs.length === 1 && snap.docs[0].id === excludeUid) return true;
  return false;
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
    username?: string;
  },
  createdBy: string,
  createdByName: string
): Promise<AppUser> {
  if (data.username) {
    const uname = data.username.trim().toLowerCase();
    if (!isValidUsername(uname)) {
      throw new Error('Username may only contain lowercase letters, numbers, underscores, and hyphens (3–30 characters).');
    }
    if (!(await checkUsernameAvailable(uname))) {
      throw new Error('That username is already taken.');
    }
    data = { ...data, username: uname };
  }

  const secondaryApp = initializeApp(firebaseConfig, `create-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  let authUser: { uid: string; delete: () => Promise<void> } | null = null;

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
    authUser = credential.user;
    const uid = authUser.uid;

    const localNow = Timestamp.fromDate(new Date());
    const newUser: Omit<AppUser, 'uid'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      ...(data.username ? { username: data.username } : {}),
      ...(data.supervisorId ? { supervisorId: data.supervisorId } : {}),
      ...(data.program ? { program: data.program } : {}),
      isActive: true,
      createdAt: localNow,
      createdBy,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, uid), { ...newUser, createdAt: serverTimestamp() });

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
    username?: string; // undefined = no change, '' = clear, value = set
  },
  actorId: string,
  actorName: string
): Promise<void> {
  const current = await getUserById(targetUid);
  const nameChanged = current?.name !== changes.name;

  const payload: Record<string, any> = {
    name: changes.name,
    phone: changes.phone,
    role: changes.role,
    supervisorId: changes.supervisorId ?? null,
    program: changes.program ?? null,
  };

  if (changes.username !== undefined) {
    const trimmed = changes.username.trim().toLowerCase();
    if (trimmed) {
      if (!isValidUsername(trimmed)) {
        throw new Error('Username may only contain lowercase letters, numbers, underscores, and hyphens (3–30 characters).');
      }
      if (!(await checkUsernameAvailable(trimmed, targetUid))) {
        throw new Error('That username is already taken.');
      }
      payload.username = trimmed;
    } else {
      payload.username = deleteField();
    }
  }

  await updateDoc(doc(db, COLLECTIONS.USERS, targetUid), payload);

  if (nameChanged) {
    await propagateNameChange(targetUid, changes.name);
  }

  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'UPDATE_USER',
    targetType: 'user',
    targetId: targetUid,
    details: `Updated profile for ${changes.name} (${changes.role})`,
  });
}

// Updates every denormalized name field across live documents when a user is renamed.
// Audit log entries are intentionally excluded — they are immutable historical records.
async function propagateNameChange(uid: string, newName: string): Promise<void> {
  const mappings = [
    { col: COLLECTIONS.CASES,             filterField: 'assignedCaseManagerId', nameField: 'assignedCaseManagerName' },
    { col: COLLECTIONS.CASES,             filterField: 'supervisorId',           nameField: 'supervisorName' },
    { col: COLLECTIONS.CASES,             filterField: 'createdBy',              nameField: 'createdByName' },
    { col: COLLECTIONS.CASE_SECTIONS,     filterField: 'updatedBy',              nameField: 'updatedByName' },
    { col: COLLECTIONS.CASE_NOTES,        filterField: 'createdBy',              nameField: 'createdByName' },
    { col: COLLECTIONS.COMMUNICATION_LOG, filterField: 'loggedBy',               nameField: 'loggedByName' },
    { col: COLLECTIONS.DOCUMENTS,         filterField: 'uploadedBy',             nameField: 'uploadedByName' },
  ];

  const snaps = await Promise.all(
    mappings.map(m => getDocs(query(collection(db, m.col), where(m.filterField, '==', uid))))
  );

  const updates: Array<{ ref: ReturnType<typeof doc>; field: string }> = [];
  snaps.forEach((snap, i) => {
    snap.docs.forEach(d => updates.push({ ref: d.ref as ReturnType<typeof doc>, field: mappings[i].nameField }));
  });

  if (updates.length === 0) return;

  // Commit in chunks to stay within Firestore's 500-operations-per-batch limit.
  for (let i = 0; i < updates.length; i += 500) {
    const batch = writeBatch(db);
    updates.slice(i, i + 500).forEach(u => batch.update(u.ref, { [u.field]: newName }));
    await batch.commit();
  }
}

export async function selfRegister(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  username?: string;
}): Promise<void> {
  if (data.username) {
    const uname = data.username.trim().toLowerCase();
    if (!isValidUsername(uname)) {
      throw new Error('Username may only contain lowercase letters, numbers, underscores, and hyphens (3–30 characters).');
    }
    if (!(await checkUsernameAvailable(uname))) {
      throw new Error('That username is already taken.');
    }
    data = { ...data, username: uname };
  }

  const secondaryApp = initializeApp(firebaseConfig, `register-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
    const uid = credential.user.uid;

    // role is intentionally omitted — manager assigns it during approval
    const newUser = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      ...(data.username ? { username: data.username } : {}),
      isActive: false,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      createdBy: 'self',
    };

    await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);
    await sendEmailVerification(credential.user);
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function getPendingRegistrations(): Promise<AppUser[]> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
}

export async function approveRegistration(
  targetUid: string,
  targetName: string,
  details: { role: UserRole; supervisorId?: string; program?: 'prime' | 'wamass' },
  actorId: string,
  actorName: string
): Promise<void> {
  const updates: Record<string, any> = {
    role: details.role,
    isActive: true,
    status: 'approved',
    approvedBy: actorId,
    approvedAt: serverTimestamp(),
  };
  if (details.supervisorId) updates.supervisorId = details.supervisorId;
  if (details.program) updates.program = details.program;

  await updateDoc(doc(db, COLLECTIONS.USERS, targetUid), updates);
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'APPROVE_REGISTRATION',
    targetType: 'user',
    targetId: targetUid,
    details: `Approved account registration for ${targetName}`,
  });
}

export async function rejectRegistration(
  targetUid: string,
  targetName: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.USERS, targetUid));
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'REJECT_REGISTRATION',
    targetType: 'user',
    targetId: targetUid,
    details: `Rejected and deleted account registration for ${targetName}`,
  });
}
