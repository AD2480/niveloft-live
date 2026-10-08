/**
 * Niveloft API contract.
 *
 * These types describe the JSON exchanged with the Spring Boot backend
 * (`/api/**`). The in-browser mock API (src/mock) implements exactly the same
 * contract, so the UI works identically against either.
 *
 * Conventions
 * - Dates without time are ISO `yyyy-MM-dd` strings (LocalDate on the backend).
 * - Timestamps are ISO-8601 instants (`2026-09-25T10:15:30Z`, Instant on the backend).
 * - Every response is wrapped in {@link ApiResponse}; errors in {@link ApiErrorBody}.
 */

export type Role = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type Health = 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'COMPLETED';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
/** What a piece of submission evidence is. SCREENSHOT and FILE are uploads; the rest are links. */
export type EvidenceKind = 'REPOSITORY' | 'DEPLOYMENT' | 'LINK' | 'SCREENSHOT' | 'FILE';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'INVITATION'
  | 'SUBMISSION'
  | 'REVIEW_APPROVED'
  | 'CHANGES_REQUESTED'
  | 'COMMENT'
  | 'ROLE_CHANGED'
  | 'PLAN_CHANGED';

export type ActivityType =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_DELETED'
  | 'CRITERIA_UPDATED'
  | 'CHECKLIST_UPDATED'
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_REMOVED'
  | 'PLAN_APPLIED'
  | 'COMMENT_ADDED'
  | 'SUBMISSION_CREATED'
  | 'REVIEW_APPROVED'
  | 'REVIEW_CHANGES_REQUESTED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'INVITATION_SENT'
  | 'MILESTONE_CREATED'
  | 'MILESTONE_UPDATED'
  | 'MILESTONE_DELETED';

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: true;
  message?: string | null;
  data: T;
  timestamp: string;
}

/** Machine-readable error codes; clients branch on these, not on messages. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'WORKFLOW_VIOLATION'
  /** The record changed since the client loaded it (optimistic locking). Reload and retry. */
  | 'EDIT_CONFLICT'
  /** AI isn't configured on the server (or the hourly limit is reached). Nothing was generated. */
  | 'AI_UNAVAILABLE'
  /** The AI provider failed or replied with something unusable. Nothing was generated. */
  | 'AI_FAILED'
  /** Sent by the Vite dev proxy (not the backend) when Spring Boot isn't reachable. */
  | 'BACKEND_UNAVAILABLE'
  /** Too many attempts from this address or for this account. */
  | 'RATE_LIMITED'
  /** Sign-in refused until the email address is confirmed. */
  | 'EMAIL_NOT_VERIFIED'
  /** An emailed link is invalid, used or expired. */
  | 'LINK_EXPIRED'
  /** The server doesn't have what this needs (e.g. email isn't set up). */
  | 'NOT_AVAILABLE'
  /** The same request (Idempotency-Key) is still being handled; it won't be done twice. */
  | 'DUPLICATE_REQUEST'
  /** An Idempotency-Key was reused for a different request. */
  | 'IDEMPOTENCY_MISMATCH'
  /** A size or count limit was reached (request size, tasks per project, storage…). */
  | 'LIMIT_REACHED'
  /** The project owner's plan doesn't include more projects or people; upgrading does. */
  | 'PLAN_LIMIT'
  /** A spending cap on a paid service (AI, email) was reached for today or this month. */
  | 'SPENDING_CAP'
  /** The server or its database is busy; nothing was changed, try again shortly. */
  | 'UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  success: false;
  status: number;
  code: ApiErrorCode;
  error: string;
  message: string;
  /** Field name -> validation message (400 responses). */
  fieldErrors?: Record<string, string> | null;
  path?: string;
  timestamp: string;
  /** Matches the X-Request-Id header and the server's log lines for this request. */
  requestId?: string | null;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  avatarColor: string;
}

export interface User extends UserSummary {
  jobTitle: string | null;
  createdAt: string;
  /** True once the person clicked the confirmation link in their email. */
  emailVerified?: boolean;
  /** Runs this copy of Niveloft (OPERATOR_EMAILS): may open Site health. */
  operator?: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: 'Bearer';
  /** Seconds until the token expires. */
  expiresIn: number;
  user: User;
  verificationRequired?: false;
  email?: string;
}

/** Registration succeeded, but the account must confirm its email before it can sign in. */
export interface PendingVerification {
  token: null;
  user: null;
  tokenType: 'Bearer';
  expiresIn: number;
  verificationRequired: true;
  /** Where the confirmation link was sent. */
  email: string;
}

export type RegisterResponse = AuthResponse | PendingVerification;

/** What this server offers on the sign-in pages. */
export interface AuthOptions {
  registrationOpen: boolean;
  /** Emails actually reach inboxes (not just the server log). */
  emailDelivery: boolean;
  emailVerificationRequired: boolean;
  /** "Forgot password?" can send a link. */
  passwordReset: boolean;
  /** The server checks a Cloudflare Turnstile token. */
  turnstile: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  /** Honeypot: hidden from people, so it stays empty unless a bot fills it in. */
  website?: string;
  captchaToken?: string | null;
  /** Which campaign or site brought them (UTM tags), when known. */
  attribution?: SignupAttribution | null;
}

/** UTM tags (or the referring site) of the visit that led to a sign-up or a message. */
export interface SignupAttribution {
  source: string;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  referrer: string | null;
  landingPath: string | null;
}

/** Ask for an emailed link (a new confirmation link, or a password reset). */
export interface EmailLinkRequest {
  email: string;
  website?: string;
  captchaToken?: string | null;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface UpdateProfileRequest {
  name: string;
  jobTitle: string | null;
  avatarColor: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ---------------------------------------------------------------------------
// Projects, members, invitations, milestones
// ---------------------------------------------------------------------------

export interface TaskCounts {
  total: number;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  /** Open tasks past their due date (also counted in their status)… */
  overdue: number;
  /** …and how many of them are in each status. */
  overdueTodo: number;
  overdueInProgress: number;
  overdueInReview: number;
}

export interface ProjectSummary {
  id: number;
  key: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  startDate: string;
  deadline: string | null;
  owner: UserSummary;
  myRole: Role;
  memberCount: number;
  taskCounts: TaskCounts;
  /** Percentage (0–100) of tasks in DONE, computed from task records. */
  progress: number;
  health: Health;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  /** Human-readable explanation of which health rules fired. */
  healthReasons: string[];
  /** Where progress "should" be today given start date and deadline (0–100), or null without a deadline. */
  expectedProgress: number | null;
  members: Member[];
  /** Optimistic-locking version; send it back with updates. */
  version: number;
}

export interface ProjectRequest {
  name: string;
  key: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  startDate: string;
  deadline: string | null;
  /** Version the client last saw; a mismatch returns EDIT_CONFLICT. */
  version?: number | null;
}

export interface Member {
  id: number;
  user: UserSummary & { jobTitle: string | null };
  role: Role;
  joinedAt: string;
  openTaskCount: number;
}

export interface Invitation {
  id: number;
  projectId: number;
  projectName: string;
  projectColor: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  invitedBy: UserSummary;
  createdAt: string;
  respondedAt: string | null;
}

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
  taskCount: number;
  doneCount: number;
  progress: number;
  createdAt: string;
}

export interface MilestoneRequest {
  name: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Tasks, comments, submissions, reviews
// ---------------------------------------------------------------------------

export interface Task {
  id: number;
  projectId: number;
  projectKey: string;
  projectName: string;
  projectColor: string;
  /** Human key, e.g. "WEB-12". */
  key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee: UserSummary | null;
  reporter: UserSummary;
  dueDate: string | null;
  milestoneId: number | null;
  milestoneName: string | null;
  /** Fractional sort key within its status column (ascending = top to bottom). */
  position: number;
  commentCount: number;
  submissionCount: number;
  /** Due date is before today and the task is not DONE. */
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
  /** First time the task entered In Progress (cycle time starts here). */
  startedAt: string | null;
  completedAt: string | null;
  /** What a reviewer checks. Snapshotted into each submission. */
  acceptanceCriteria: Criterion[];
  /** Steps the assignee ticks off; all must be done before submitting. */
  checklist: ChecklistItem[];
  /** Optimistic-locking version; send it back with updates. */
  version: number;
  /** Estimated effort in working days (Mon–Fri), or null if nobody has estimated it. Always labelled as an estimate. */
  estimateDays: number | null;
}

/** The fields of a task the dependency map and timeline need. */
export interface DependencyTask {
  id: number;
  key: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  assignee: UserSummary | null;
  overdue: boolean;
  startedAt: string | null;
  completedAt: string | null;
  milestoneId: number | null;
}

/** Finish-to-start: `blocker` must be done before `blocked` can finish. Same project only; no cycles. */
export interface Dependency {
  id: number;
  projectId: number;
  blocker: DependencyTask;
  blocked: DependencyTask;
  createdBy: UserSummary;
  createdAt: string;
}

export interface Criterion {
  id: number;
  position: number;
  text: string;
}

export interface ChecklistItem {
  id: number;
  position: number;
  text: string;
  done: boolean;
  doneBy: UserSummary | null;
  doneAt: string | null;
}

export interface TaskRequest {
  title: string;
  description: string | null;
  priority: Priority;
  status?: TaskStatus;
  assigneeId: number | null;
  dueDate: string | null;
  milestoneId: number | null;
  /** Version the client last saw (updates only); a mismatch returns EDIT_CONFLICT. */
  version?: number | null;
  /** Create only: initial acceptance criteria and checklist. */
  acceptanceCriteria?: string[];
  checklist?: string[];
  /** Estimated working days (1–250) or null. Omitting it on update clears it, so always send the current value. */
  estimateDays: number | null;
}

/** One recorded status change (GET /projects/{id}/history), oldest first. */
export interface StatusChange {
  taskId: number;
  from: TaskStatus | null;
  to: TaskStatus;
  at: string;
}

/** One task change from a planning scenario, tagged with the task version it was computed from. */
export interface PlanChange {
  taskId: number;
  version: number;
  dueDate?: string | null;
  assigneeId?: number | null;
  estimateDays?: number | null;
  unassign?: boolean;
}

/** What the browser-side schedule was computed from; if any of it changed, the server rejects the plan. */
export interface PlanBasis {
  /** Every open task of the project, with the version the scenario saw. */
  tasks: { taskId: number; version: number }[];
  /** Every dependency id in the project. */
  dependencyIds: number[];
}

export interface PlanApplyRequest {
  changes: PlanChange[];
  basis: PlanBasis;
  note?: string | null;
}

export interface PlanResult {
  changedTasks: number;
  tasks: Task[];
}

/** Replace the full criteria list. Items with an id keep it; items without are new. */
export interface CriteriaUpdateRequest {
  items: { id: number | null; text: string }[];
  version: number | null;
}

export interface ChecklistUpdateRequest {
  items: { id: number | null; text: string; done: boolean }[];
  version: number | null;
}

export type DueFilter = 'overdue' | 'today' | 'week' | 'none';
export type TaskSort = 'position' | 'dueDate' | 'priority' | 'createdAt' | 'updatedAt' | 'title';

export interface TaskQuery {
  search?: string;
  /** A status, or "OPEN" for every status except DONE. */
  status?: TaskStatus | 'OPEN' | '';
  priority?: Priority | '';
  /** A user id, "me" or "unassigned". */
  assignee?: string;
  milestoneId?: number | '';
  due?: DueFilter | '';
  sort?: TaskSort;
  direction?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

/**
 * Move a task on the board. The server places it directly between the given
 * neighbours in the destination column (either may be null for the ends) and
 * only rewrites the moved task's fractional position.
 */
export interface MoveTaskRequest {
  status: TaskStatus;
  previousTaskId: number | null;
  nextTaskId: number | null;
}

export interface Comment {
  id: number;
  taskId: number;
  author: UserSummary;
  body: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface Attachment {
  id: number;
  fileName: string;
  size: number;
  contentType: string;
  /** Authorised download URL, relative to the API base (e.g. "/api/files/12"). Requires the bearer token. */
  url: string;
}

/** One piece of evidence in a submission: a typed link, or an uploaded file/screenshot. */
export interface Evidence {
  id: number;
  kind: EvidenceKind;
  label: string;
  /** For link kinds. */
  url: string | null;
  /** For SCREENSHOT and FILE. */
  file: Attachment | null;
}

/** An acceptance criterion as it was when the work was submitted (immutable). */
export interface SubmittedCriterion {
  id: number;
  /** The live criterion it was copied from; null if that criterion was later deleted. */
  criterionId: number | null;
  position: number;
  text: string;
}

export interface CriterionResult {
  submissionCriterionId: number;
  text: string;
  met: boolean;
  note: string | null;
}

export interface Review {
  id: number;
  reviewer: UserSummary;
  decision: ReviewDecision;
  feedback: string | null;
  createdAt: string;
  /** The reviewer's verdict on each submitted criterion. */
  results: CriterionResult[];
}

export interface Submission {
  id: number;
  taskId: number;
  /** 1 for the first submission, 2 after the first round of changes, … */
  version: number;
  submittedBy: UserSummary;
  notes: string;
  status: SubmissionStatus;
  createdAt: string;
  criteria: SubmittedCriterion[];
  evidence: Evidence[];
  review: Review | null;
}

export interface EvidenceLinkInput {
  kind: Extract<EvidenceKind, 'REPOSITORY' | 'DEPLOYMENT' | 'LINK'>;
  label: string;
  url: string;
}

/** Sent as multipart/form-data: a JSON "data" part ({notes, evidence}) and "files" parts. */
export interface SubmissionRequest {
  notes: string;
  evidence: EvidenceLinkInput[];
  files: File[];
}

export interface CriterionVerdict {
  submissionCriterionId: number;
  met: boolean;
  note: string | null;
}

export interface ReviewRequest {
  decision: ReviewDecision;
  feedback: string | null;
  /** Required for approval: every criterion, all met. */
  results: CriterionVerdict[];
}

// ---------------------------------------------------------------------------
// Activity & notifications
// ---------------------------------------------------------------------------

export interface Activity {
  id: number;
  projectId: number;
  projectName: string;
  taskId: number | null;
  taskKey: string | null;
  actor: UserSummary;
  type: ActivityType;
  message: string;
  /** For field changes: which field changed and its before/after values (display strings). */
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  /** In-app route to open, e.g. "/projects/1/tasks/4". */
  link: string | null;
  read: boolean;
  actor: UserSummary | null;
  invitationId: number | null;
  createdAt: string;
}

export type NotificationCategory = 'ALL' | 'UNREAD' | 'ASSIGNMENTS' | 'INVITATIONS' | 'SUBMISSIONS' | 'REVIEWS';

// ---------------------------------------------------------------------------
// Dashboard, analytics, calendar
// ---------------------------------------------------------------------------

export interface TrendPoint {
  /** Monday of the ISO week (yyyy-MM-dd). */
  weekStart: string;
  created: number;
  completed: number;
}

export interface WorkloadRow {
  user: UserSummary;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  overdue: number;
  open: number;
}

export interface ProjectAnalytics {
  projectId: number;
  progress: number;
  expectedProgress: number | null;
  health: Health;
  healthReasons: string[];
  taskCounts: TaskCounts;
  statusDistribution: { status: TaskStatus; count: number }[];
  priorityDistribution: { priority: Priority; count: number }[];
  workload: WorkloadRow[];
  completionTrend: TrendPoint[];
  overdueTasks: Task[];
  upcomingDeadlines: Task[];
  milestones: Milestone[];
  averageCycleDays: number | null;
  approvalRate: number | null;
  /** Tasks per status at the end of each of the last 28 days, replayed from status changes. */
  flow: FlowPoint[];
  reviewStats: ReviewStats;
  /** Median days in In Progress / In Review (finished stays only). */
  timeInStatus: TimeInStatus[];
}

export interface FlowPoint {
  date: string;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
}

export interface ReviewStats {
  submissions: number;
  reviewed: number;
  pending: number;
  /** Median hours from submission to review decision. */
  medianHoursToReview: number | null;
  /** Share of reviews that requested changes (%). */
  reworkRate: number | null;
  /** Average submissions per approved task. */
  roundsToApproval: number | null;
}

export interface TimeInStatus {
  status: TaskStatus;
  medianDays: number | null;
  samples: number;
}

export interface UpcomingItem {
  type: 'TASK' | 'MILESTONE';
  id: number;
  title: string;
  /** The task's key (null for a milestone). */
  key: string | null;
  date: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  link: string;
  overdue: boolean;
}

export interface DashboardData {
  stats: {
    activeProjects: number;
    myOpenTasks: number;
    myOverdueTasks: number;
    awaitingMyReview: number;
    completedThisWeek: number;
  };
  myTasks: Task[];
  reviewQueue: Task[];
  projects: ProjectSummary[];
  upcoming: UpcomingItem[];
  completionTrend: TrendPoint[];
  recentActivity: Activity[];
  /** What needs a decision, each with the rule that raised it and the records it refers to. */
  attention: AttentionItem[];
  /** Work approved in the last 14 days and the evidence it was approved on. */
  recentlyApproved: ApprovedItem[];
}

export type AttentionKind =
  | 'REVIEW_WAITING'
  | 'CHANGES_REQUESTED'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'AWAITING_REVIEW'
  | 'PROJECT_RISK'
  | 'MILESTONE_RISK'
  | 'WORKLOAD'
  | 'UNASSIGNED'
  | 'BLOCKED'
  | 'BLOCKING';

export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: Severity;
  title: string;
  /** Plain-language explanation naming the records involved. */
  reason: string;
  /** Task keys the item is about. */
  refs: string[];
  link: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  date: string | null;
}

export interface ApprovedItem {
  taskId: number;
  taskKey: string;
  title: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  approvedAt: string;
  reviewer: UserSummary;
  submittedBy: UserSummary;
  version: number;
  evidenceCount: number;
  criteriaCount: number;
  link: string;
}

export interface SearchHit {
  type: 'PROJECT' | 'TASK';
  id: number;
  key: string;
  title: string;
  subtitle: string;
  color: string;
  status: TaskStatus | null;
  link: string;
}

export interface SearchResult {
  query: string;
  projects: SearchHit[];
  tasks: SearchHit[];
}

export interface CalendarEvent {
  id: string;
  type: 'TASK' | 'MILESTONE' | 'PROJECT_DEADLINE';
  title: string;
  date: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  status: TaskStatus | null;
  priority: Priority | null;
  completed: boolean;
  overdue: boolean;
  link: string;
}

// ---------------------------------------------------------------------------
// AI assistance (server-side provider; suggestions only)
// ---------------------------------------------------------------------------

export interface AiStatus {
  available: boolean;
  provider: string | null;
  model: string | null;
  /** Why AI is unavailable, when it is. */
  reason: string | null;
  remainingThisHour: number;
}

export interface AiCriterionNote {
  submissionCriterionId: number;
  criterion: string;
  whatToCheck: string;
  concern: string;
}

export interface AiReviewAssist {
  model: string;
  criteria: AiCriterionNote[];
  draftFeedback: string;
  /** What the AI did not or could not do (e.g. it never opens links or files). */
  limits: string[];
}

export interface AiCriteriaSuggestion {
  model: string;
  criteria: string[];
  limits: string[];
}

export interface AiSummary {
  model: string;
  text: string;
  limits: string[];
}

/** One earlier question and answer, sent back for follow-up questions. */
export interface AiTurn {
  question: string;
  answer: string;
}

/** The scheduler's estimate the page already shows; the server checks keys and labels it as an estimate. */
export interface AiForecast {
  finish: string | null;
  /** `assumed`: the task had no estimate, so the scheduler used its default duration. */
  tasks: { key: string; start: string; finish: string; late: boolean; assumed: boolean }[];
  /** The dependency-aware simulation's range for the whole project, as the page shows it. */
  range?: AiForecastRange | null;
}

export interface AiForecastRange {
  optimistic: string;
  likely: string;
  cautious: string;
  /** 0–100, or null without a deadline. */
  chanceByDeadlinePercent: number | null;
  /** The task that holds the most work up, if any. */
  mainBlocker: string | null;
}

export interface AiAskRequest {
  question: string;
  previous?: AiTurn[];
  forecast?: AiForecast | null;
  /** A specific server model (from /ai/models), e.g. for the Arena; the default model otherwise. */
  model?: string | null;
}

/** A model the server can answer with right now. */
export interface AiModel {
  name: string;
  provider: string;
  /** The one used when no model is asked for. */
  isDefault: boolean;
}

export interface AiAnswer {
  model: string;
  answer: string;
  /** Task keys the answer relies on (only keys that exist in the project). */
  citedTasks: string[];
  /** What the question needed but the records don't contain — "unknown", not "no". */
  notInRecords: string[];
  limits: string[];
  asOf: string;
  /** Actions the assistant suggests. Never applied by the server: the app asks the person to confirm. */
  proposals?: AiProposal[];
}

/** "Plan a project" with AI: draft tasks from a brief. Nothing is created until the person confirms. */
export interface AiPlanRequest {
  brief: string;
}

export interface AiPlanTask {
  title: string;
  description: string | null;
  priority: Priority | null;
  /** Only when the brief states a date. */
  dueDate: string | null;
  /** Only when the brief names someone in the project. */
  assigneeName: string | null;
  estimateDays: number | null;
  /** Indexes (in the same plan) of tasks this one waits on. */
  dependsOn: number[];
}

export interface AiPlan {
  model: string;
  tasks: AiPlanTask[];
  /** What the brief leaves open, for the person to decide. */
  questions: string[];
  limits: string[];
}

/** A suggested action from the AI, already validated by the server (known task keys, known priorities, real dates). */
export interface AiProposal {
  type: 'CREATE_TASK' | 'START_TASK';
  taskKey: string | null;
  title: string | null;
  description: string | null;
  priority: Priority | null;
  dueDate: string | null;
  assigneeName: string | null;
  estimateDays: number | null;
}

// ---------------------------------------------------------------- contact, site health, arena

export type ContactTopic = 'QUESTION' | 'PROBLEM' | 'DATA' | 'FEEDBACK' | 'OTHER';

export interface ContactRequest {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  /** An error reference (request id) the message is about, if any. */
  reference?: string | null;
  /** The page the message was written from (path only). */
  page?: string | null;
  website?: string;
  captchaToken?: string | null;
  attribution?: SignupAttribution | null;
}

export interface ContactReceipt {
  id: number;
  /** Emailed to the operator as well as saved (false: saved for them to read on Site health). */
  delivered: boolean;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  reference: string | null;
  page: string | null;
  source: string | null;
  createdAt: string;
  handled: boolean;
}

export interface FormStats {
  form: string;
  views: number;
  submits: number;
  successes: number;
  invalid: number;
  rejected: number;
  failed: number;
}

export interface SignupSource {
  source: string;
  medium: string | null;
  campaign: string | null;
  count: number;
}

export interface SiteHealth {
  days: number;
  from: string;
  to: string;
  forms: FormStats[];
  signups: { total: number; attributed: number; sources: SignupSource[] };
  contact: { open: number; total: number; recent: ContactMessage[] };
  spending: {
    aiRequestsToday: number;
    aiRequestsPerDay: number;
    aiTokensThisMonth: number;
    aiTokensPerMonth: number;
    emailsToday: number;
    emailsPerDay: number;
    emailsThisMonth: number;
    emailsPerMonth: number;
  };
  arenaVotes: number;
}

export type ArenaWinner = 'A' | 'B' | 'TIE' | 'NEITHER';

export interface ArenaVoteRequest {
  projectId: number;
  /** Contender ids: "builtin", "chrome" or "server:<model>". */
  a: string;
  b: string;
  winner: ArenaWinner;
}

export interface ArenaStanding {
  contender: string;
  votes: number;
  wins: number;
  losses: number;
  ties: number;
  bothBad: number;
}

export interface ArenaScoreboard {
  totalVotes: number;
  myVotes: number;
  standings: ArenaStanding[];
}

// ------------------------------------------------------------------ plans and UPI payments

export type PlanId = 'FREE' | 'PRO' | 'TEAM';
export type BillingPeriod = 'MONTH' | 'YEAR';
export type PaymentStatus = 'AWAITING_PAYMENT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface PlanOption {
  id: PlanId;
  name: string;
  /** Prices in paise (₹1 = 100 paise). */
  monthPaise: number;
  yearPaise: number;
  /** 0: the plan sets no limit. */
  maxActiveProjects: number;
  maxPeoplePerProject: number;
}

export interface Payment {
  id: number;
  /** Order reference, also in the UPI note (e.g. NL7K3Q9P2A). */
  reference: string;
  plan: Exclude<PlanId, 'FREE'>;
  period: BillingPeriod;
  amountPaise: number;
  payeeVpa: string;
  payeeName: string;
  /** upi://pay?… with everything filled in; only while the payment is waiting to be paid. */
  upiUri: string | null;
  status: PaymentStatus;
  utr: string | null;
  createdAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface BillingSummary {
  /** The plan that applies now. */
  plan: PlanId;
  /** The plan last paid for, and when it ends (or ended). */
  paidPlan: PlanId;
  expiresAt: string | null;
  maxActiveProjects: number;
  maxPeoplePerProject: number;
  activeProjects: number;
  /** This server has a UPI ID to pay to. */
  payable: boolean;
  payeeVpa: string;
  payeeName: string;
  plans: PlanOption[];
  payments: Payment[];
}

export interface AdminPayment {
  payment: Payment;
  userId: number;
  userName: string;
  userEmail: string;
  currentPlan: PlanId;
  currentExpiresAt: string | null;
}

export interface AdminPaymentList {
  /** Payments waiting for a decision. */
  waiting: number;
  payments: AdminPayment[];
}
