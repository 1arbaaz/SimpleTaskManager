import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { SearchBar } from "../components/SearchBar";
import { TaskCard } from "../components/TaskCard";
import {
  ApiRequestError,
  completeTask,
  deleteTask,
  getTasks,
  reopenTask,
} from "../services/api";
import type { Priority, Task, TaskStatus } from "../types/task";

const PRIORITY_FILTERS: Array<{ label: string; value: Priority | "" }> = [
  { label: "All", value: "" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const STATUS_FILTERS: Array<{ label: string; value: TaskStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
];

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await getTasks({
        search: debouncedSearch,
        priority,
        status,
      });
      setTasks(data);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Unable to connect to the server. Please check your connection and try again.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, priority, status]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTasks();
    }, [loadTasks])
  );

  const confirmDelete = (task: Task) => {
    setActionError(null);
    setPendingDelete(task);
  };

  const performDelete = async () => {
    if (!pendingDelete || busyId !== null) {
      return;
    }
    const taskId = pendingDelete.id;
    try {
      setBusyId(taskId);
      setActionError(null);
      await deleteTask(taskId);
      setPendingDelete(null);
      setTasks((current) => current.filter((item) => item.id !== taskId));
      await loadTasks();
    } catch (err) {
      setActionError(
        err instanceof ApiRequestError
          ? err.message
          : "Unable to connect to the server. Please check your connection and try again."
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (task: Task) => {
    if (busyId !== null) {
      return;
    }
    try {
      setBusyId(task.id);
      if (task.status === "completed") {
        await reopenTask(task.id);
      } else {
        await completeTask(task.id);
      }
      await loadTasks();
    } catch (err) {
      setActionError(
        err instanceof ApiRequestError
          ? err.message
          : "Unable to connect to the server. Please check your connection and try again."
      );
    } finally {
      setBusyId(null);
    }
  };

  const emptyMessage = () => {
    if (debouncedSearch) {
      return "No tasks match your search.";
    }
    if (status === "completed") {
      return "No completed tasks yet.";
    }
    return "You're all caught up!";
  };

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <SearchBar value={search} onChangeText={setSearch} />
        <Text style={styles.filterLabel}>Priority</Text>
        <View style={styles.chipRow}>
          {PRIORITY_FILTERS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => setPriority(item.value)}
              style={[styles.chip, priority === item.value && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  priority === item.value && styles.chipTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => setStatus(item.value)}
              style={[styles.chip, status === item.value && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  status === item.value && styles.chipTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingState message="Loading tasks..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadTasks();
              }}
            />
          }
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retry} onPress={loadTasks}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          {actionError && !pendingDelete ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{actionError}</Text>
            </View>
          ) : null}
          {!error && tasks.length === 0 ? (
            <EmptyState message={emptyMessage()} />
          ) : null}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={busyId === task.id}
              onEdit={() => router.push({ pathname: "/edit-task", params: { id: String(task.id) } })}
              onDelete={() => confirmDelete(task)}
              onToggleStatus={() => toggleStatus(task)}
            />
          ))}
        </ScrollView>
      )}

      {pendingDelete ? (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Delete task</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete this task?
            </Text>
            <Text style={styles.confirmTask}>{pendingDelete.title}</Text>
            {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancel}
                onPress={() => {
                  if (busyId !== null) {
                    return;
                  }
                  setPendingDelete(null);
                  setActionError(null);
                }}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmDelete, busyId !== null && styles.disabled]}
                onPress={performDelete}
                disabled={busyId !== null}
              >
                <Text style={styles.confirmDeleteText}>
                  {busyId === pendingDelete.id ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  chipSelected: {
    backgroundColor: "#2563EB",
  },
  chipText: {
    fontWeight: "600",
    color: "#374151",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
  },
  retry: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  confirmOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    padding: 24,
  },
  confirmBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  confirmText: {
    marginTop: 8,
    fontSize: 15,
    color: "#4B5563",
  },
  confirmTask: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  confirmCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  confirmCancelText: {
    fontWeight: "700",
    color: "#374151",
  },
  confirmDelete: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#DC2626",
  },
  confirmDeleteText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabled: {
    opacity: 0.6,
  },
});
