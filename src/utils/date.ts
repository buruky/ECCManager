import { Timestamp } from 'firebase/firestore';

type DateLike = Timestamp | Date | string | null | undefined;

function toDate(ts: DateLike): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  return ts.toDate();
}

export function formatDate(ts: DateLike): string {
  const d = toDate(ts);
  return d ? d.toLocaleDateString() : '—';
}

export function formatDateTime(ts: DateLike): string {
  const d = toDate(ts);
  return d ? d.toLocaleString() : '—';
}