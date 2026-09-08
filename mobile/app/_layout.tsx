import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#F4F6FB" },
          headerShadowVisible: false,
          headerTintColor: "#111827",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#F4F6FB" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "TaskFlow" }} />
        <Stack.Screen name="tasks" options={{ title: "Tasks" }} />
        <Stack.Screen name="create-task" options={{ title: "Create Task" }} />
        <Stack.Screen name="edit-task" options={{ title: "Edit Task" }} />
        <Stack.Screen name="ai-task" options={{ title: "Create with AI" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
