import { Timestamp } from 'firebase/firestore';

export type UserRole = 'manager' | 'supervisor' | 'caseManager';

export type AccountStatus = 'pending' | 'approved';

export type Program = 'prime' | 'wamass' | 'other';

export type CaseStatus = 'pending' | 'active' | 'onHold' | 'closed';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  username?: string;
  phone: string;
  role: UserRole;
  supervisorId?: string; // set for caseManagers
  program?: 'prime' | 'wamass'; // set for supervisors
  isActive: boolean;
  status?: AccountStatus;
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

export interface Case {
  id: string;
  clientName: string;
  program: Program | null;
  status: CaseStatus;
  assignedCaseManagerId: string | null;
  assignedCaseManagerName: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt?: Timestamp;
  // Required at creation, manager-only editable
  referralSource: string;
  referralReason: string;
  eligibilityCriteria: string;
  intakeDate: string; // user-entered date string, not a system timestamp
}

export interface CaseSection {
  id: string;
  caseId: string;
  content: string;
  updatedAt: Timestamp;
  updatedBy: string;
  updatedByName: string;
}

export interface CaseNote {
  id: string;
  caseId: string;
  content: string;
  createdAt: Timestamp;
  createdBy: string;
  createdByName: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

export interface CommunicationEntry {
  id: string;
  caseId: string;
  type: string; // phone call, email, in-person, text, home visit
  summary: string;
  date: string; // user-entered date string, not a system timestamp
  loggedBy: string;
  loggedByName: string;
  createdAt: Timestamp;
}

export interface Document {
  id: string;
  caseId: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: 'case' | 'user' | 'note' | 'document' | 'system';
  targetId: string;
  details: string;
  timestamp: Timestamp;
}

export interface Task {
  id: string;
  caseId: string;
  caseClientName: string;
  assignedTo: string;
  title: string;
  dueDate: string; // user-entered date string, not a system timestamp
  isCompleted: boolean;
  createdBy: string;
  createdAt: Timestamp;
}
