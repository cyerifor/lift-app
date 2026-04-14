export type Role = "COACH" | "ATHLETE" | "ADMIN";
export type BlockStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type SessionStatus = "PLANNED" | "COMPLETED" | "MISSED";
export type MediaType = "IMAGE" | "VIDEO" | "FILE";
export type FeedbackType = "SESSION" | "BLOCK" | "GENERAL";
export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";
export type ProgressionMode = "% Only" | "RPE Only" | "% + RPE";
export type Trend = "Linear Up" | "Linear Down" | "Wave" | "Flat";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Coach {
  id: string;
  userId: string;
  bio?: string | null;
  specialty?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Athlete {
  id: string;
  userId: string;
  coachId: string;
  dateOfBirth?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: string;
  coachId: string;
  athleteId: string;
  title: string;
  goal?: string | null;
  status: BlockStatus;
  startDate: string;
  endDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Week {
  id: string;
  blockId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  objective?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  weekId: string;
  title: string;
  scheduledAt?: string | null;
  status: SessionStatus;
  durationMin?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  sessionId: string;
  name: string;
  orderIndex: number;
  instructions?: string | null;
  tempo?: string | null;
  restSec?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetPrescription {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps?: number | null;
  targetRpe?: number | null;
  targetLoadKg?: number | null;
  targetPercent?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionLog {
  id: string;
  athleteId: string;
  sessionId: string;
  coachReviewerId?: string | null;
  completedAt: string;
  perceivedExertion?: number | null;
  readinessScore?: number | null;
  bodyweightKg?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetLog {
  id: string;
  sessionLogId: string;
  exerciseId: string;
  setNumber: number;
  repsCompleted?: number | null;
  loadKg?: number | null;
  rpe?: number | null;
  velocityMps?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  coachId: string;
  athleteId: string;
  blockId?: string | null;
  sessionId?: string | null;
  sessionLogId?: string | null;
  type: FeedbackType;
  rating?: number | null;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  coachId?: string | null;
  athleteId?: string | null;
  sessionLogId?: string | null;
  type: MediaType;
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  id: string;
  coachId?: string | null;
  athleteId?: string | null;
  blockId?: string | null;
  sessionId?: string | null;
  sessionLogId?: string | null;
  metricKey: string;
  metricValue: number;
  recordedAt: string;
  createdAt: string;
}
