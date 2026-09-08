import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";

import { TaskForm } from "../components/TaskForm";
import { ApiRequestError, createTask, createTaskWithAI } from "../services/api";
import type { Priority } from "../types/task";
import { validateTaskForm } from "../utils/validation";

export default function AITaskScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewReady, setReviewReady] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const onGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please describe your task first.");
      return;
    }
    if (generating) {
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const result = await createTaskWithAI(prompt.trim());
      setTitle(result.title ?? "");
      setDescription(result.description ?? "");
      setDueDate(result.dueDate ?? "");
      setPriority(result.priority ?? "medium");
      setReviewReady(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Unable to generate the task right now. Please try again or create the task manually."
      );
    } finally {
      setGenerating(false);
    }
  };

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
      await createTask({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate.trim() ? dueDate.trim() : null,
        priority,
      });
      Alert.alert("Saved", "AI-generated task saved.");
      router.replace("/tasks");
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

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {!reviewReady ? (
          <>
            <Text style={styles.label}>Describe your task naturally...</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="I need to prepare the AWS presentation for Monday and send it to Peter. This is high priority."
              placeholderTextColor="#9CA3AF"
              multiline
              editable={!generating}
              style={styles.prompt}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.primaryButton, generating && styles.disabled]}
              onPress={onGenerate}
              disabled={generating}
            >
              <Text style={styles.primaryButtonText}>
                {generating ? "Generating task..." : "Generate Task"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() => router.push("/create-task")}
              disabled={generating}
            >
              <Text style={styles.cancelText}>Create manually instead</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.heading}>AI Generated Task</Text>
            <Text style={styles.hint}>Review and edit before saving.</Text>
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
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setReviewReady(false);
                setError(null);
              }}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}
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
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  hint: {
    marginTop: 4,
    marginBottom: 8,
    color: "#6B7280",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  prompt: {
    minHeight: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    fontSize: 16,
    color: "#111827",
    textAlignVertical: "top",
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
