export const COLORS = {
  primary: '#1a3a5c',
  primaryLight: '#2c5282',
  accent: '#3182ce',
  background: '#f7f8fa',
  surface: '#ffffff',
  border: '#e2e8f0',
  text: '#1a202c',
  textSecondary: '#718096',
  error: '#e53e3e',
  success: '#38a169',
  warning: '#d69e2e',
  pending: '#d69e2e',
  active: '#38a169',
  onHold: '#718096',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export const PROGRAMS: { label: string; value: string }[] = [
  { label: 'Prime', value: 'prime' },
  { label: 'WA-MASS', value: 'wamass' },
  { label: 'Other', value: 'other' },
];

export const SUPERVISOR_PROGRAMS: { label: string; value: string }[] = [
  { label: 'Prime', value: 'prime' },
  { label: 'WA-MASS', value: 'wamass' },
];

export const PROGRAM_LABELS: Record<string, string> = {
  prime: 'Prime',
  wamass: 'WA-MASS',
  other: 'Other',
};

export const CASE_STATUSES: { label: string; value: string }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'onHold' },
];

export const COMMUNICATION_TYPES = [
  'Phone Call',
  'Email',
  'Text Message',
  'In-Person Meeting',
  'Home Visit',
  'Other',
];

export const BUG_REPORT_EMAIL = 'burukyimesgen@gmail.com';

export const COLLECTIONS = {
  USERS: 'users',
  CASES: 'cases',
  CASE_NOTES: 'caseNotes',
  CASE_SECTIONS: 'caseSections',
  COMMUNICATION_LOG: 'communicationLog',
  DOCUMENTS: 'documents',
  AUDIT_LOG: 'auditLog',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
};
