# ECC Manager — How It Works

---

## Interview Stack Summary

ECC Manager is a cross-platform case management mobile app built with React Native and Expo, targeting iOS, Android, and web from a single TypeScript codebase. The backend is entirely Firebase — Firestore as the NoSQL database, Firebase Authentication for login, and Firebase Storage for document uploads. The app has a role-based access system with three staff levels (manager, supervisor, and case manager), and Firestore security rules enforce those permissions server-side so the frontend role checks are never the last line of defense. Navigation is handled with React Navigation using role-gated stack and bottom-tab navigators that render an entirely different app shell depending on who is logged in.

---

## What the App Is

ECC Manager is an internal staff tool for Eritrean Community Connections, a non-profit that runs case management programs for clients. Staff log into the app to create and manage client cases, record intake information, track communication, upload documents, and coordinate work across supervisors and case managers. Everything is organized around **Cases** — one case per client — and every case has a set of structured sections that different staff members fill out over time.

The app runs on staff phones and also works in a browser on desktop (with a sidebar layout that replaces the bottom tabs).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Database | Firebase Firestore (NoSQL) |
| Authentication | Firebase Auth (email/password) |
| File Storage | Firebase Storage |
| Session Storage | AsyncStorage (React Native) |
| Icons | Expo Vector Icons (Ionicons) |
| Document Picker | expo-document-picker |
| Camera | expo-image-picker |

---

## The Three Roles

Every user account has a `role` field that determines what they can see and do.

### Manager
The top-level admin. Managers have unrestricted access across the whole system. They create cases, create and manage staff accounts, approve self-registered accounts, assign cases to supervisors and case managers, change case status, delete cases, and view the full audit log. Only managers can create cases and user accounts.

### Supervisor
A mid-level staff role scoped to a program (`prime` or `wamass`). Supervisors see cases that belong to their program. They can change case status, assign case managers to cases within their program, and view all case details. They cannot create cases or manage user accounts.

### Case Manager
A frontline worker. Case managers only see cases that are actively assigned to them (closed cases disappear from their view). They fill out case sections (intake forms, consent forms, service records), add case notes, log communications, and upload documents. They cannot create cases, change status, or see other case managers' cases.

---

## How Authentication Works

Login supports both email and username. When a user submits credentials:

1. If the input looks like an email, Firebase Auth is called directly.
2. If it looks like a username, Firestore is queried for a matching `username` field, the email is retrieved, and Firebase Auth is called with that email.
3. After authentication succeeds, the user's Firestore document is fetched to check `isActive` and `status`.
4. If the account is pending approval or deactivated, the user is signed out and shown an appropriate message — Firebase Auth credentials alone are not enough to get into the app.
5. A session start timestamp is written to AsyncStorage. Every time the app resumes, it checks whether 8 hours have passed and logs the user out if so.

Self-registration is supported. A new staff member can register their own account, which is saved with `status: 'pending'` and `isActive: false`. It shows up in the manager's Pending Approvals screen and does not grant any access until a manager approves it and assigns a role.

---

## Data Model

All data lives in Firestore. Here are the main collections:

### `users`
One document per staff member. Contains name, email, phone, role, program (supervisors), supervisorId (case managers), isActive, status, and approval metadata. Used for login, name lookups, and role-gating.

### `cases`
One document per client case. Contains the core administrative fields (client name, program, referral source, reason, eligibility criteria, intake date), assignment info (assigned case manager ID/name, supervisor ID/name), and status (`pending` → `active` → `onHold` / `closed`).

### `caseSections`
Free-text content blocks, one per section per case. The document ID is `{caseId}_{sectionName}`. Each record stores the full text content, who last edited it, and when. Sections are: `intake`, `consent`, `services` (and any others added in the future — the pattern is generic).

### `caseNotes`
Timestamped notes attached to a case. Each note records who wrote it, when, and the text. Notes have an `isApproved` field that managers and supervisors can toggle.

### `communicationLog`
Immutable log entries (no updates allowed by Firestore rules). Each entry records the communication type (phone, email, in-person, etc.), a summary, the date it happened, and who logged it.

### `documents`
Metadata for files uploaded to Firebase Storage. Stores the file name, download URL, MIME type, and who uploaded it. The actual files live in Storage at `documents/{caseId}/{timestamp}_{filename}`.

### `tasks`
Action items assigned to case managers. Each task has a title, a due date, a case reference, and an `isCompleted` flag. Tasks that are past their due date surface as alerts on the case manager dashboard.

### `auditLog`
Append-only log of every significant action in the system. Entries are written by service functions automatically and cannot be modified or deleted by any role. Managers can view the full log.

### `notifications`
Per-user notification records. Each user can only read and update their own notifications.

---

## How Navigation Is Structured

When the app loads, `AppNavigator` checks whether a user is logged in and what their role is:

- **Not logged in** → Auth stack (Login, Register)
- **Manager** → `ManagerNavigator` (Dashboard, Cases, Users, Audit Log, Report Bug)
- **Supervisor** → `SupervisorNavigator` (Dashboard, Cases, Report Bug)
- **Case Manager** → `CaseManagerNavigator` (Dashboard, My Cases, Report Bug)

Each navigator is a bottom-tab navigator. Each tab contains its own stack navigator so navigating into a case detail doesn't lose the tab bar. The same `CaseDetailScreen` component is shared across all three role navigators — role-specific UI differences inside it are handled by checking `user.role` at render time.

On web/desktop (`useIsDesktop()` returns true when width > 768px), the bottom tabs are replaced by a sidebar navigation panel.

---

## The Case Lifecycle

```
Created (pending) → Assigned (active) → In progress → Closed / On Hold
```

1. **Manager creates a case.** They fill out client name, program, referral source, reason, eligibility criteria, and intake date. The case is saved with `status: 'pending'` and no assignment.

2. **Manager or supervisor assigns a case manager.** The `CaseAssignmentScreen` lets them pick from active case managers. When assigned, the case moves to `status: 'active'` and the supervisor ID is linked.

3. **Case manager works the case.** They fill out the sections on the Case Detail screen — Intake, Consent Forms, Service Records. They add Case Notes as they go. They log communications with the client. They upload supporting documents.

4. **Manager or supervisor changes status.** The status badge in the case detail header is tappable (only for managers and supervisors). They can move it to `onHold`, back to `active`, or `closed`.

5. **Case is closed.** It disappears from the case manager's view (their query filters out closed cases) but stays visible to managers and supervisors.

---

## Case Detail Screen

The `CaseDetailScreen` is the heart of the app. It takes a `caseId` parameter and loads:

- The case document from Firestore
- A completion status check (which sections have content)

The screen renders a horizontal tab bar with 7 tabs:

| Tab | Component | What it stores |
|---|---|---|
| Info | CaseInfoSection | Core case fields (client name, referral, dates) |
| Intake | IntakeSection → TextBoxSection | Free-text intake narrative |
| Consent | ConsentFormsSection → TextBoxSection | Consent form notes |
| Services | ServiceRecordsSection → TextBoxSection | Services provided |
| Notes | CaseNotesSection | Timestamped case notes |
| Communication | CommunicationLogSection | Communication log entries |
| Documents | SupportingDocumentsSection | Uploaded files |

Each tab shows a green dot if it has content, giving a visual progress indicator. The header also shows `X/7 sections filled`.

Every role can now edit all sections and add notes and communication entries. The `Info` tab fields (client name, referral source, etc.) are editable by all roles and write back to the `cases` collection document. The section tabs write to `caseSections`. Notes write to `caseNotes`. Communication entries write to `communicationLog`.

---

## Case Manager Dashboard

The case manager dashboard is the most information-dense screen. It loads:

- All cases assigned to the logged-in case manager
- All incomplete tasks assigned to them

It then organizes what it shows into zones:

**Overdue Tasks** — A red alert banner appears if any tasks are past their due date. Each overdue task is listed with a "Done" button.

**In Progress** — Active cases that have at least one section incomplete. Each card shows a progress bar and which sections still need content.

**Needs Attention** — Cases with `pending` or `onHold` status (they're assigned but not active — either not yet started or paused). These get status pills.

**Upcoming Tasks** — Non-overdue tasks sorted by due date with a "Done" button on each.

Tapping any case card navigates to that case's detail screen.

---

## How File Uploads Work

The `SupportingDocumentsSection` supports two upload paths:

1. **Attach Files** — Opens `expo-document-picker` for any file type. Multiple files can be selected at once.
2. **Take Photo** — Opens `expo-image-picker` camera. One photo at a time.

After selection, a modal appears where the user can rename each file before uploading. On confirm:

1. The file is read from the local filesystem using `expo-file-system`.
2. It is uploaded to Firebase Storage at `documents/{caseId}/{timestamp}_{name}`.
3. A download URL is obtained from Storage.
4. A metadata record is written to the `documents` Firestore collection.
5. The file appears in the list immediately (optimistic UI update).

---

## Firestore Security Rules

The Firestore rules are the authoritative permission layer. Frontend role checks improve UX but the rules are what actually prevents unauthorized reads and writes.

Key rules:

- **users** — All active staff can read user documents (needed for name lookups). Only managers can update or delete accounts. Anyone can create their own account document during self-registration (with restrictions: must be pending/inactive and have no role).
- **cases** — Managers read all; supervisors read only their program's cases; case managers read only cases assigned to them that aren't closed. All three roles can update cases. Only managers can create or delete.
- **caseSections** — All authenticated staff can read. All three roles can write.
- **caseNotes** — All authenticated staff can read and create. Only managers and supervisors can update (for the approval flag). Only managers can delete.
- **communicationLog** — All authenticated staff can read and create. No one can update entries (immutable). Only managers can delete.
- **documents** — All authenticated staff can read and create. No one can update. Only managers can delete.
- **auditLog** — Managers read all; supervisors read only their own entries. Any authenticated user can create entries (the service functions do this). No one can update or delete.
- **tasks** — Managers and supervisors can create and delete. Case managers can update only their own tasks (to mark complete). Read access follows the same pattern.

---

## Audit Logging

Every significant mutation in the app writes an audit log entry automatically inside the service function — it is not something individual components have to remember to do. The audit entries capture: who did it (`userId`, `userName`), what action it was (`CREATE_CASE`, `ASSIGN_CASE_MANAGER`, `UPDATE_USER_ROLE`, etc.), what it affected (`targetType`, `targetId`), a human-readable `details` string, and a server-side timestamp.

Managers can browse the full audit log from the Audit Log tab in their navigator.

---

## Name Propagation

Firestore is a NoSQL document store, so names are often denormalized — stored in multiple places for easy display (e.g., `assignedCaseManagerName` on a case document, `createdByName` on a note, `loggedByName` on a communication entry). When a manager renames a user account, `propagateNameChange()` runs and queries all 7 relevant collections for documents containing that user's UID, then updates the corresponding name field in each one. Firestore batch writes (max 500 operations per batch) are used to do this efficiently.

---

## Responsive / Desktop Layout

The app targets mobile-first but includes desktop support for browser use. The `useIsDesktop()` utility hook checks `Dimensions.get('window').width > 768`. When on desktop:

- The `WebTabBar` component renders as a vertical sidebar instead of a horizontal bottom bar.
- Content areas add a left margin equal to `SIDEBAR_WIDTH` so they don't underlap the sidebar.
- Screen headers and layouts adjust padding for the wider viewport.

---

## File Structure Reference

```
src/
├── config/firebase.ts          — Firebase app initialization
├── contexts/
│   ├── AuthContext.tsx         — User auth state, login/logout, session management
│   └── CasesContext.tsx        — Version counter to trigger case list re-fetches
├── navigation/
│   ├── AppNavigator.tsx        — Root router (auth state + role branching)
│   ├── ManagerNavigator.tsx    — Manager bottom tabs
│   ├── SupervisorNavigator.tsx — Supervisor bottom tabs
│   └── CaseManagerNavigator.tsx— Case manager bottom tabs
├── screens/
│   ├── auth/                   — Login, Register
│   ├── manager/                — Dashboard, AllCases, CreateCase, UserManagement,
│   │                             CreateUser, EditUser, AuditLog
│   ├── supervisor/             — Dashboard, Cases, CaseDetail, CaseAssignment
│   ├── casemanager/            — Dashboard, MyCases
│   └── shared/
│       ├── CaseDetailScreen.tsx— Tabbed case view (used by all roles)
│       ├── PendingApprovalsScreen.tsx
│       └── sections/           — CaseInfo, Intake, Consent, Services,
│                                 CaseNotes, CommunicationLog, TextBox, Documents
├── services/
│   ├── caseService.ts          — All case/section/note/communication/task operations
│   ├── userService.ts          — User CRUD, self-register, approve/reject, name propagation
│   └── auditService.ts         — writeAuditLog()
├── types/index.ts              — All TypeScript interfaces
└── utils/
    ├── constants.ts            — Colors, status values, programs, communication types
    ├── date.ts                 — formatDate(), formatDateTime()
    └── responsive.ts           — useIsDesktop() hook
```