import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { ref as storageRef, listAll, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { Case, CaseSection, CaseNote, CommunicationEntry, Task } from '@/types';
import { COLLECTIONS } from '@/utils/constants';
import { writeAuditLog } from './auditService';

// Cases
export async function getAllCases(): Promise<Case[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.CASES), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Case));
}

export async function getCasesByManager(uid: string): Promise<Case[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.CASES), where('assignedCaseManagerId', '==', uid))
  );
  const cases = snap.docs.map(d => ({ id: d.id, ...d.data() } as Case));
  return cases.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Returns all cases in the supervisor's program. Falls back to cases they own if no program is set.
// Sorting is done in-memory to avoid requiring composite Firestore indexes.
export async function getCasesBySupervisor(uid: string, supervisorProgram?: 'prime' | 'wamass'): Promise<Case[]> {
  const snap = supervisorProgram
    ? await getDocs(query(collection(db, COLLECTIONS.CASES), where('program', '==', supervisorProgram)))
    : await getDocs(query(collection(db, COLLECTIONS.CASES), where('supervisorId', '==', uid)));

  const cases = snap.docs.map(d => ({ id: d.id, ...d.data() } as Case));
  return cases.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getCaseById(caseId: string): Promise<Case | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CASES, caseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Case;
}

export async function getCaseCompletionStatus(caseId: string): Promise<Record<string, boolean>> {
  const hasOne = (col: string) =>
    getDocs(query(collection(db, col), where('caseId', '==', caseId), limit(1))).then(s => !s.empty);

  const [intake, consent, services, notes, communication, documents] = await Promise.all([
    getCaseSection(caseId, 'intake').then(s => !!s),
    getCaseSection(caseId, 'consentForms').then(s => !!s),
    getCaseSection(caseId, 'serviceRecords').then(s => !!s),
    hasOne(COLLECTIONS.CASE_NOTES),
    hasOne(COLLECTIONS.COMMUNICATION_LOG),
    hasOne(COLLECTIONS.DOCUMENTS),
  ]);

  return { info: true, intake, consent, services, notes, communication, documents };
}

export async function createCase(
  data: {
    clientName: string;
    program: Case['program'];
    referralSource: string;
    referralReason: string;
    eligibilityCriteria: string;
    intakeDate: string;
  },
  actorId: string,
  actorName: string
): Promise<Case> {
  const now = new Date().toISOString();
  const newCase: Omit<Case, 'id'> = {
    clientName: data.clientName,
    program: data.program,
    referralSource: data.referralSource,
    referralReason: data.referralReason,
    eligibilityCriteria: data.eligibilityCriteria,
    intakeDate: data.intakeDate,
    status: 'pending',
    assignedCaseManagerId: null,
    assignedCaseManagerName: null,
    supervisorId: null,
    supervisorName: null,
    createdBy: actorId,
    createdByName: actorName,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, COLLECTIONS.CASES), newCase);
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'CREATE_CASE',
    targetType: 'case',
    targetId: ref.id,
    details: `Created ${data.program ?? 'untagged'} case for client: ${data.clientName}`,
  });
  return { id: ref.id, ...newCase };
}

export async function updateCaseInfo(
  caseId: string,
  data: { clientName: string; referralSource: string; referralReason: string; eligibilityCriteria: string; intakeDate: string },
  actorId: string,
  actorName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CASES, caseId), { ...data, updatedAt: new Date().toISOString() });
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'UPDATE_CASE_INFO',
    targetType: 'case',
    targetId: caseId,
    details: `Updated case info for client: ${data.clientName}`,
  });
}

export async function updateCaseStatus(
  caseId: string,
  clientName: string,
  status: Case['status'],
  actorId: string,
  actorName: string
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Partial<Case> = { status, updatedAt: now };
  if (status === 'onHold') updates.closedAt = now;
  await updateDoc(doc(db, COLLECTIONS.CASES, caseId), updates);
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'UPDATE_CASE_STATUS',
    targetType: 'case',
    targetId: caseId,
    details: `Changed status to ${status} for case: ${clientName}`,
  });
}

export async function assignCaseManager(
  caseId: string,
  clientName: string,
  caseManagerId: string,
  caseManagerName: string,
  supervisorId: string,
  supervisorName: string,
  actorId: string,
  actorName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CASES, caseId), {
    assignedCaseManagerId: caseManagerId,
    assignedCaseManagerName: caseManagerName,
    supervisorId,
    supervisorName,
    status: 'active',
    updatedAt: new Date().toISOString(),
  });
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'ASSIGN_CASE_MANAGER',
    targetType: 'case',
    targetId: caseId,
    details: `Assigned ${caseManagerName} to case: ${clientName}`,
  });
}

export async function deleteCase(
  caseId: string,
  clientName: string,
  actorId: string,
  actorName: string
): Promise<void> {
  // Delete all related Firestore subcollections in parallel
  const relatedCollections = [
    COLLECTIONS.CASE_SECTIONS,
    COLLECTIONS.CASE_NOTES,
    COLLECTIONS.COMMUNICATION_LOG,
    COLLECTIONS.DOCUMENTS,
    COLLECTIONS.TASKS,
    COLLECTIONS.NOTIFICATIONS,
  ];
  await Promise.all(
    relatedCollections.map(async col => {
      const snap = await getDocs(query(collection(db, col), where('caseId', '==', caseId)));
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    })
  );

  // Delete uploaded files from Storage
  try {
    const folder = storageRef(storage, `documents/${caseId}`);
    const listed = await listAll(folder);
    await Promise.all(listed.items.map(item => deleteObject(item)));
  } catch {
    // Folder may not exist if no files were ever uploaded
  }

  await deleteDoc(doc(db, COLLECTIONS.CASES, caseId));
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'DELETE_CASE',
    targetType: 'case',
    targetId: caseId,
    details: `Deleted case for client: ${clientName}`,
  });
}

// Case sections (Intake, Consent, Service Records, Communication)
export async function getCaseSection(caseId: string, sectionName: string): Promise<CaseSection | null> {
  const q = query(
    collection(db, COLLECTIONS.CASE_SECTIONS),
    where('caseId', '==', caseId),
    where('sectionName', '==', sectionName)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as CaseSection;
}

export async function saveCaseSection(
  caseId: string,
  sectionName: string,
  content: string,
  actorId: string,
  actorName: string
): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.CASE_SECTIONS),
    where('caseId', '==', caseId),
    where('sectionName', '==', sectionName)
  );
  const snap = await getDocs(q);
  const now = new Date().toISOString();
  const data = { caseId, sectionName, content, updatedAt: now, updatedBy: actorId, updatedByName: actorName };
  if (snap.empty) {
    await addDoc(collection(db, COLLECTIONS.CASE_SECTIONS), data);
  } else {
    await updateDoc(snap.docs[0].ref, data);
  }
}

// Case Notes
export async function getCaseNotes(caseId: string): Promise<CaseNote[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.CASE_NOTES), where('caseId', '==', caseId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseNote));
}

export async function addCaseNote(
  caseId: string,
  content: string,
  actorId: string,
  actorName: string
): Promise<CaseNote> {
  const now = new Date().toISOString();
  const newNote: Omit<CaseNote, 'id'> = {
    caseId,
    content,
    createdAt: now,
    createdBy: actorId,
    createdByName: actorName,
    isApproved: false,
  };
  const ref = await addDoc(collection(db, COLLECTIONS.CASE_NOTES), newNote);
  await writeAuditLog({
    userId: actorId,
    userName: actorName,
    action: 'ADD_CASE_NOTE',
    targetType: 'note',
    targetId: ref.id,
    details: `Added note to case ${caseId}`,
  });
  return { id: ref.id, ...newNote };
}

// Communication Log
export async function getCommunicationLog(caseId: string): Promise<CommunicationEntry[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.COMMUNICATION_LOG), where('caseId', '==', caseId), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunicationEntry));
}

export async function addCommunicationEntry(
  data: { caseId: string; type: string; summary: string; date: string },
  actorId: string,
  actorName: string
): Promise<CommunicationEntry> {
  const now = new Date().toISOString();
  const entry: Omit<CommunicationEntry, 'id'> = {
    ...data,
    loggedBy: actorId,
    loggedByName: actorName,
    createdAt: now,
  };
  const ref = await addDoc(collection(db, COLLECTIONS.COMMUNICATION_LOG), entry);
  return { id: ref.id, ...entry };
}

// Tasks
export async function getTasksForUser(userId: string): Promise<Task[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.TASKS), where('assignedTo', '==', userId), where('isCompleted', '==', false))
  );
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
  return tasks.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
}

export async function createTask(
  data: { caseId: string; caseClientName: string; assignedTo: string; title: string; dueDate: string },
  actorId: string
): Promise<Task> {
  const now = new Date().toISOString();
  const task: Omit<Task, 'id'> = { ...data, isCompleted: false, createdBy: actorId, createdAt: now };
  const ref = await addDoc(collection(db, COLLECTIONS.TASKS), task);
  return { id: ref.id, ...task };
}

export async function completeTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.TASKS, taskId), { isCompleted: true });
}
