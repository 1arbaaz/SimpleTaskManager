import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useRouter } from "expo-router";

import { TaskForm } from "../components/TaskForm";
import { ApiRequestError, createTask } from "../services/api";
import type { Priority } from "../types/task";
import { validateTaskForm } from "../utils/validation";

export default function CreateTaskScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSave = async () => {
    const error = validateTaskForm({ title, description, dueDate, priority });
    if (error) {
      setFormError(error);
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      await createTask({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate.trim() ? dueDate.trim() : null,
        priority,
      });
      Alert.alert("Saved", "Task created successfully.");
      router.replace("/tasks");
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError
          ? err.message
          : "Unable to connect to the server. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

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

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

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
