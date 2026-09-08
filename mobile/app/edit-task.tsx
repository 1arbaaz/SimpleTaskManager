import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { LoadingState } from "../components/LoadingState";
import { TaskForm } from "../components/TaskForm";
import { ApiRequestError, getTask, updateTask } from "../services/api";
import type { Priority } from "../types/task";
import { validateTaskForm } from "../utils/validation";

export default function EditTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setError("Task not found.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const task = await getTask(taskId);
      setTitle(task.title);
      setDescription(task.description ?? "");
      setDueDate(task.due_date ?? "");
      setPriority(task.priority);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Unable to connect to the server. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTask();
    }, [loadTask])
  );

  const onSave = async () => {
    const validationError = validateTaskForm({
      title,
      description,
      dueDate,
      priority,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateTask(taskId, {
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate.trim() ? dueDate.trim() : null,
        priority,
      });
      Alert.alert("Updated", "Task updated successfully.");
      router.back();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Unable to connect to the server. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading task..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TaskForm
          title={title}
          description={description}
          dueDate={dueDate}
          priority={priority}
          onChangeTitle={setTitle}
          onChangeDescription={setDescription}
          onChangeDueDate={setDueDate}
          onChangePriority={setPriority}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, saving && styles.disabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? "Saving..." : "Save Task"}
          </Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  error: {
    marginTop: 12,
    color: "#B91C1C",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 16,
  },
});
