import { StyleSheet, Text, View } from "react-native";

import type { Priority } from "../types/task";

const LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const COLORS: Record<Priority, { background: string; text: string }> = {
  low: { background: "#D1FAE5", text: "#065F46" },
  medium: { background: "#FEF3C7", text: "#92400E" },
  high: { background: "#FEE2E2", text: "#991B1B" },
};

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colors = COLORS[priority];
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>
        {LABELS[priority]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
