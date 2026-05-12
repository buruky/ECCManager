export type UserRole = 'manager' | 'supervisor' | 'caseManager';

export type AccountStatus = 'pending' | 'approved';

export type Program = 'prime' | 'wamass' | 'other';

export type CaseStatus = 'pending' | 'active' | 'onHold';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  supervisorId?: string; // set for caseManagers
  program?: 'prime' | 'wamass'; // set for supervisors
  isActive: boolean;
  status?: AccountStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  // Required at creation, manager-only editable
  referralSource: string;
  referralReason: string;
  eligibilityCriteria: string;
  intakeDate: string;
}

export interface CaseSection {
  id: string;
  caseId: string;
  content: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

export interface CaseNote {
  id: string;
  caseId: string;
  content: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CommunicationEntry {
  id: string;
  caseId: string;
  type: string; // phone call, email, in-person, text, home visit
  summary: string;
  date: string;
  loggedBy: string;
  loggedByName: string;
  createdAt: string;
}

export interface Document {
  id: string;
  caseId: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: 'case' | 'user' | 'note' | 'document' | 'system';
  targetId: string;
  details: string;
  timestamp: string;
}

export interface Task {
  id: string;
  caseId: string;
  caseClientName: string;
  assignedTo: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  createdBy: string;
  createdAt: string;
}
