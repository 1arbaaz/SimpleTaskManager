export type Priority = "low" | "medium" | "high";

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: Priority;
  status?: TaskStatus;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface DashboardResponse {
  pending: number;
  completed: number;
  overdue: number;
}

export interface AIResponse {
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
}

export interface APIError {
  message: string;
  status?: number;
}
