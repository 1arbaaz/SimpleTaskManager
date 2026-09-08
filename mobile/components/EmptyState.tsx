import { StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  message: {
    color: "#6B7280",
    fontSize: 16,
    textAlign: "center",
  },
});
