export type EmailIntakeStatus =
  | 'pending'
  | 'processing'
  | 'needs_review'
  | 'quarantined'
  | 'rejected'
  | 'completed'
  | 'failed';

export type EmailReviewStatus = 'pending' | 'needs_review' | 'quarantined' | 'rejected';
export type EmailSuggestionStatus = 'pending' | 'approved' | 'rejected' | 'created' | 'applied';

export interface EmailIntakeSummary {
  emailIntakeId: number;
  provider: string;
  providerMessageId: string;
  envelopeRecipient: string;
  senderEmail?: string;
  senderName?: string;
  subject?: string;
  receivedAt: string;
  status: EmailIntakeStatus;
  triageSummary?: string;
  triageReason?: string;
  triageConfidence?: number;
  attemptCount: number;
  reviewedAt?: string;
  suggestionCount: number;
  pendingSuggestionCount: number;
  aiStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'disabled';
  aiProcessedAt?: string;
}

export interface EmailIntakeDetail extends EmailIntakeSummary {
  storageBucket: string;
  storageKey: string;
  replyToEmail?: string;
  authenticationResult?: Record<string, unknown>;
  extractedText?: string;
  extractionResult?: Record<string, unknown>;
  nextAttemptAt?: string;
  processingStartedAt?: string;
  processedAt?: string;
  lastError?: string;
  reviewedById?: number;
  createdAt: string;
  updatedAt: string;
  aiLastError?: string;
  suggestions: EmailTaskSuggestion[];
  aiRuns: EmailAiRun[];
}

export interface EmailTaskSuggestion {
  emailTaskSuggestionId: number;
  emailIntakeId: number;
  suggestionNumber: number;
  title: string;
  description?: string;
  targetCompletionDate?: string;
  eventTypeId?: number;
  areaId?: number;
  priorityId?: number;
  projectId?: number;
  confidence?: number;
  missingInformation: unknown[];
  extractionData?: Record<string, unknown>;
  status: EmailSuggestionStatus;
  reviewNotes?: string;
  reviewedById?: number;
  reviewedAt?: string;
  eventId?: number;
  createdAt: string;
  updatedAt: string;
  actionType: 'create_task' | 'create_project_task' | 'update_existing_task';
  targetEventId?: number;
  sourceAiRunId?: number;
  reason?: string;
  evidence: unknown[];
  proposedChanges?: Record<string, unknown>;
}

export interface EmailAiRun {
  emailAiRunId: number;
  emailIntakeId: number;
  runRole: 'primary' | 'shadow';
  provider: string;
  model: string;
  promptVersion: string;
  status: 'processing' | 'completed' | 'failed';
  response?: Record<string, unknown>;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface EmailTriagePage {
  items: EmailIntakeSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface EmailIntakeReviewRequest {
  status: EmailReviewStatus;
  triageSummary?: string;
  triageReason?: string;
}

export interface EmailSuggestionReviewRequest {
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  eventTypeId?: number;
  areaId?: number;
  priorityId?: number;
  projectId?: number;
}

export interface EmailSuggestionReviewResult {
  status: EmailSuggestionStatus;
  eventId?: number;
  applied: boolean;
}
