import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { Priority } from "../types/task";

interface TaskFormProps {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeDueDate: (value: string) => void;
  onChangePriority: (value: Priority) => void;
}

const PRIORITIES: Priority[] = ["low", "medium", "high"];

export function TaskForm({
  title,
  description,
  dueDate,
  priority,
  onChangeTitle,
  onChangeDescription,
  onChangeDueDate,
  onChangePriority,
}: TaskFormProps) {
  return (
    <View>
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={onChangeTitle}
        placeholder="Prepare AWS presentation"
        placeholderTextColor="#9CA3AF"
        style={styles.input}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={onChangeDescription}
        placeholder="Send the presentation to Peter"
        placeholderTextColor="#9CA3AF"
        multiline
        style={[styles.input, styles.multiline]}
      />

      <Text style={styles.label}>Due Date</Text>
      <TextInput
        value={dueDate}
        onChangeText={onChangeDueDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        style={styles.input}
      />

      <Text style={styles.label}>Priority</Text>
      <View style={styles.row}>
        {PRIORITIES.map((item) => {
          const selected = item === priority;
          return (
            <Pressable
              key={item}
              onPress={() => onChangePriority(item)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
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
});
