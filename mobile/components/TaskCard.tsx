import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Task } from "../types/task";
import { formatDueDate } from "../utils/validation";
import { PriorityBadge } from "./PriorityBadge";

interface TaskCardProps {
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  showActions?: boolean;
  busy?: boolean;
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleStatus,
  showActions = true,
  busy = false,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, isCompleted && styles.completedTitle]}>
          {task.title}
        </Text>
        <PriorityBadge priority={task.priority} />
      </View>

      {task.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {task.description}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatDueDate(task.due_date)}</Text>
        <Text style={[styles.status, isCompleted ? styles.statusDone : styles.statusPending]}>
          {isCompleted ? "Completed" : "Pending"}
        </Text>
      </View>

      {showActions ? (
        <View style={styles.actions}>
          <Pressable onPress={onEdit} style={styles.actionButton} disabled={busy}>
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable onPress={onToggleStatus} style={styles.actionButton} disabled={busy}>
            <Text style={styles.actionText}>
              {isCompleted ? "Reopen" : "Complete"}
            </Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.actionButton} disabled={busy}>
            <Text style={styles.deleteText}>{busy ? "Deleting..." : "Delete"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  completedTitle: {
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    fontSize: 13,
    color: "#6B7280",
  },
  status: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusPending: {
    color: "#2563EB",
  },
  statusDone: {
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  actionText: {
    color: "#1F2937",
    fontWeight: "600",
    fontSize: 13,
  },
  deleteText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 13,
  },
});
