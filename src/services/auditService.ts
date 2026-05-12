import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { AuditLogEntry } from '@/types';

export async function writeAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.AUDIT_LOG), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}
