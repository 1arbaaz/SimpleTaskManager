import { useCallback, useState } from "react";
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
import { TaskCard } from "../components/TaskCard";
import { ApiRequestError, getDashboard, getTasks } from "../services/api";
import type { DashboardResponse, Task } from "../types/task";

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardResponse | null>(null);
  const [recent, setRecent] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [dashboard, tasks] = await Promise.all([getDashboard(), getTasks()]);
      setStats(dashboard);
      setRecent(tasks.slice(0, 3));
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadData();
        }} />
      }
    >
      <Text style={styles.heading}>TaskFlow</Text>
      <Text style={styles.subheading}>Your task overview</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.statsRow}>
          <StatCard label="Pending" value={stats?.pending ?? 0} />
          <StatCard label="Completed" value={stats?.completed ?? 0} />
          <StatCard label="Overdue" value={stats?.overdue ?? 0} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Tasks</Text>
      {!error && recent.length === 0 ? (
        <EmptyState message="You're all caught up!" />
      ) : null}
      {recent.map((task) => (
        <TaskCard key={task.id} task={task} showActions={false} />
      ))}

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/create-task")}
      >
        <Text style={styles.primaryButtonText}>+ Create Task</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/ai-task")}
      >
        <Text style={styles.secondaryButtonText}>Create with AI</Text>
      </Pressable>
      <Pressable
        style={styles.tertiaryButton}
        onPress={() => router.push("/tasks")}
      >
        <Text style={styles.tertiaryButtonText}>View All Tasks</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  subheading: {
    marginTop: 4,
    marginBottom: 20,
    color: "#6B7280",
    fontSize: 15,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 16,
  },
  tertiaryButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  tertiaryButtonText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    lineHeight: 20,
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
});
