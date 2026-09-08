import type { Priority } from "../types/task";

export interface TaskFormValues {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
}

export function validateTaskForm(values: TaskFormValues): string | null {
  const title = values.title.trim();
  if (!title) {
    return "Title is required.";
  }
  if (title.length > 200) {
    return "Title must be 200 characters or fewer.";
  }

  const dueDate = values.dueDate.trim();
  if (dueDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return "Due date must use YYYY-MM-DD.";
    }
    const parsed = new Date(`${dueDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return "Please enter a valid due date.";
    }
  }

  return null;
}

export function formatDueDate(value: string | null): string {
  if (!value) {
    return "No due date";
  }
  return value;
}
