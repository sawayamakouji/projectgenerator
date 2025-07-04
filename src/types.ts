import { Timestamp } from 'firebase/firestore';

// ★ 変更点: 全体的に日付の型を string | undefined に統一

export interface ProjectInput {
  overview: string;
  startDate: string;
  dueDate: string;
}

export enum TaskStatus {
  TODO = '未着手',
  IN_PROGRESS = '進行中',
  COMPLETED = '完了',
}

export interface Task {
  id: string;
  code: string;
  name: string;
  description: string;
  purpose?: string;
  acceptanceCriteria?: string;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  dependsOn?: string[];
  assignee?: string;
  createdAt?: string; // ★ 変更: Timestamp -> string
  updatedAt?: string; // ★ 変更: Timestamp -> string
}

export type ProjectVisibility = 'private' | 'public_view' | 'public_edit';

export interface Project extends ProjectInput {
  id: string;
  tasks: Task[];
  purpose?: string;
  acceptanceCriteria?: string;
  ownerId: string;
  visibility: ProjectVisibility;
  createdAt?: string; // ★ 変更: Timestamp -> string
  updatedAt?: string; // ★ 変更: Timestamp -> string
  additionalNotes?: string;
}

export interface TaskSuggestion {
  name:string;
  description: string;
  purpose?: string;
  acceptanceCriteria?: string;
  startDate: string;
  dueDate: string;
  prerequisiteTaskNames?: string[];
  assignee?: string;
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  parts: { text: string }[];
  timestamp: Date;
  taskSuggestion?: TaskSuggestion;
}

export type ConfirmationButtonVariant = 'default' | 'destructive';

export interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmButtonText?: string;
  confirmButtonVariant?: ConfirmationButtonVariant;
}