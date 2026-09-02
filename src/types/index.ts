
export type Priority = 'high' | 'medium' | 'low';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
export type ViewType = 'today' | 'week' | 'month';
export type ItemType = 'note' | 'memo' | 'todo' | 'event';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Memo {
  id: string;
  content: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isAllDay: boolean;
  repeat: RepeatType;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface AppState {
  notes: Note[];
  memos: Memo[];
  todos: Todo[];
  events: Event[];
  tags: Tag[];
}

