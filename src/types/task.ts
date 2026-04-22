// Types Task Manager — Phase 8
// Alignement strict avec supabase/migrations/015_tasks.sql

export type TaskOwnerType = 'prospect' | 'contact' | 'centre';
export type TaskStatus = 'open' | 'done' | 'skipped';
export type TaskRecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskCategory = 'call' | 'email' | 'inmail' | 'todo';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  owner_type: TaskOwnerType | null;
  owner_id: string | null;
  due_at: string | null; // ISO8601
  status: TaskStatus;
  done_at: string | null;
  skipped_at: string | null;
  recurrence_kind: TaskRecurrenceKind;
  category: TaskCategory;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
}

// Enrichi avec le libellé du owner pour l'affichage (jointure côté endpoint)
export interface TaskWithOwner extends Task {
  owner_label: string | null; // "Anthony Athuil", "Samuel Benayoun", "Audition Jean Le Pins"
  owner_slug: string | null; // id pour prospect/contact, slug pour centre
}

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrenceKind, string> = {
  none: 'Jamais',
  daily: 'Tous les jours',
  weekly: 'Toutes les semaines',
  monthly: 'Tous les mois',
};

export const TASK_OWNER_TYPE_LABELS: Record<TaskOwnerType, string> = {
  prospect: 'Prospect',
  contact: 'Contact',
  centre: 'Centre',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'À faire',
  done: 'Terminée',
  skipped: 'Ignorée',
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  call: 'Appel',
  email: 'E-mail',
  inmail: 'InMail',
  todo: 'À faire',
};
