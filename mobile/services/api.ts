import Constants from "expo-constants";
import { Platform } from "react-native";

import type {
  AIResponse,
  CreateTaskPayload,
  DashboardResponse,
  Priority,
  Task,
  TaskStatus,
  UpdateTaskPayload,
} from "../types/task";

const REQUEST_TIMEOUT_MS = 20000;
const AI_TIMEOUT_MS = 30000;

function getApiHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostname = hostUri.split(":")[0];
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:8000`;
    }
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }

  return "http://127.0.0.1:8000";
}

export const API_BASE_URL = `${getApiHost()}/api`;

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

const CONNECTION_ERROR =
  "Unable to connect to the server. Please check your connection and try again.";
const AI_ERROR =
  "Unable to generate the task right now. Please try again or create the task manually.";

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("failed to fetch") ||
      message.includes("aborted") ||
      message.includes("timeout")
    );
  }
  return false;
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const body = data as Record<string, unknown>;
  if (typeof body.detail === "string") {
    return body.detail;
  }

  const firstKey = Object.keys(body)[0];
  if (!firstKey) {
    return fallback;
  }
  const value = body[firstKey];
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  fallbackError: string = CONNECTION_ERROR
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    let data: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: fallbackError };
      }
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiRequestError(
          "Too many requests. Please wait a moment and try again.",
          429
        );
      }
      throw new ApiRequestError(
        parseErrorMessage(data, fallbackError),
        response.status
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    if (isNetworkError(error)) {
      throw new ApiRequestError(fallbackError);
    }
    throw new ApiRequestError(fallbackError);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getTasks(params?: {
  search?: string;
  priority?: Priority | "";
  status?: TaskStatus | "";
}): Promise<Task[]> {
  const query = new URLSearchParams();
  if (params?.search) {
    query.set("search", params.search);
  }
  if (params?.priority) {
    query.set("priority", params.priority);
  }
  if (params?.status) {
    query.set("status", params.status);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<Task[]>(`/tasks/${suffix}`);
}

export async function getTask(id: number): Promise<Task> {
  return request<Task>(`/tasks/${id}/`);
}

export async function createTask(data: CreateTaskPayload): Promise<Task> {
  return request<Task>("/tasks/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: number,
  data: UpdateTaskPayload
): Promise<Task> {
  return request<Task>(`/tasks/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: number): Promise<void> {
  await request<void>(`/tasks/${id}/`, { method: "DELETE" });
}

export async function completeTask(id: number): Promise<Task> {
  return request<Task>(`/tasks/${id}/complete/`, { method: "POST" });
}

export async function reopenTask(id: number): Promise<Task> {
  return request<Task>(`/tasks/${id}/reopen/`, { method: "POST" });
}

export async function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>("/dashboard/");
}

export async function createTaskWithAI(text: string): Promise<AIResponse> {
  try {
    return await request<AIResponse>(
      "/ai/create-task/",
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
      AI_TIMEOUT_MS,
      AI_ERROR
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new ApiRequestError(AI_ERROR, error.status);
    }
    throw new ApiRequestError(AI_ERROR);
  }
}
