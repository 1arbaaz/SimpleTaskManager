from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from tasks.models import Task
from tasks.serializers import TaskSerializer
from tasks.services import (
    AI_FRIENDLY_ERROR,
    GeminiInvalidResponse,
    GeminiRateLimited,
    GeminiUnavailable,
    parse_and_validate_ai_response,
)


class TaskAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_task(self):
        response = self.client.post(
            "/api/tasks/",
            {
                "title": "Prepare AWS presentation",
                "description": "Send it to Peter",
                "due_date": "2026-09-07",
                "priority": "high",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Task.objects.count(), 1)
        self.assertEqual(response.data["title"], "Prepare AWS presentation")
        self.assertEqual(response.data["status"], "pending")

    def test_retrieve_task(self):
        task = Task.objects.create(title="Read task")
        response = self.client.get(f"/api/tasks/{task.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "Read task")

    def test_update_task(self):
        task = Task.objects.create(title="Old title")
        response = self.client.patch(
            f"/api/tasks/{task.id}/",
            {"title": "New title"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.title, "New title")

    def test_delete_task(self):
        task = Task.objects.create(title="Delete me")
        response = self.client.delete(f"/api/tasks/{task.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

    def test_complete_and_reopen(self):
        task = Task.objects.create(title="Toggle")
        complete = self.client.post(f"/api/tasks/{task.id}/complete/")
        self.assertEqual(complete.status_code, 200)
        self.assertEqual(complete.data["status"], "completed")
        reopen = self.client.post(f"/api/tasks/{task.id}/reopen/")
        self.assertEqual(reopen.status_code, 200)
        self.assertEqual(reopen.data["status"], "pending")

    def test_search(self):
        Task.objects.create(title="AWS presentation", description="slides")
        Task.objects.create(title="Buy groceries")
        response = self.client.get("/api/tasks/?search=presentation")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "AWS presentation")

    def test_priority_filter(self):
        Task.objects.create(title="High", priority=Task.Priority.HIGH)
        Task.objects.create(title="Low", priority=Task.Priority.LOW)
        response = self.client.get("/api/tasks/?priority=high")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "High")

    def test_status_filter(self):
        Task.objects.create(title="Open", status=Task.Status.PENDING)
        Task.objects.create(title="Done", status=Task.Status.COMPLETED)
        response = self.client.get("/api/tasks/?status=completed")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Done")

    def test_combined_filters(self):
        Task.objects.create(
            title="Keep",
            priority=Task.Priority.HIGH,
            status=Task.Status.PENDING,
        )
        Task.objects.create(
            title="Skip",
            priority=Task.Priority.HIGH,
            status=Task.Status.COMPLETED,
        )
        response = self.client.get("/api/tasks/?search=keep&priority=high&status=pending")
        self.assertEqual(len(response.data), 1)

    def test_blank_title_rejected(self):
        response = self.client.post("/api/tasks/", {"title": "  "}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_invalid_priority_rejected(self):
        response = self.client.post(
            "/api/tasks/",
            {"title": "Bad priority", "priority": "urgent"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_task_returns_404(self):
        response = self.client.get("/api/tasks/999/")
        self.assertEqual(response.status_code, 404)


class DashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_dashboard_counts_and_overdue(self):
        today = timezone.localdate()
        Task.objects.create(title="Pending", status=Task.Status.PENDING)
        Task.objects.create(title="Done", status=Task.Status.COMPLETED)
        Task.objects.create(
            title="Overdue",
            status=Task.Status.PENDING,
            due_date=today - timedelta(days=1),
        )
        Task.objects.create(
            title="Future",
            status=Task.Status.PENDING,
            due_date=today + timedelta(days=2),
        )
        Task.objects.create(
            title="Completed overdue date",
            status=Task.Status.COMPLETED,
            due_date=today - timedelta(days=3),
        )
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pending"], 3)
        self.assertEqual(response.data["completed"], 2)
        self.assertEqual(response.data["overdue"], 1)


class SerializerValidationTests(TestCase):
    def test_serializer_requires_title(self):
        serializer = TaskSerializer(data={"priority": "low"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("title", serializer.errors)


class AIValidationTests(TestCase):
    def test_valid_json(self):
        payload = parse_and_validate_ai_response(
            """
            {
              "title": "Prepare AWS presentation",
              "description": "Send the presentation to Peter.",
              "dueDate": "2026-09-07",
              "priority": "high"
            }
            """
        )
        self.assertEqual(payload["title"], "Prepare AWS presentation")
        self.assertEqual(payload["priority"], "high")
        self.assertEqual(payload["dueDate"], "2026-09-07")

    def test_markdown_fenced_json(self):
        payload = parse_and_validate_ai_response(
            '```json\n{"title": "Call Peter", "description": "", "dueDate": null, "priority": "medium"}\n```'
        )
        self.assertEqual(payload["title"], "Call Peter")
        self.assertIsNone(payload["dueDate"])

    def test_empty_response(self):
        with self.assertRaises(GeminiInvalidResponse):
            parse_and_validate_ai_response("")

    def test_malformed_json(self):
        with self.assertRaises(GeminiInvalidResponse):
            parse_and_validate_ai_response("{not json")

    def test_missing_title(self):
        with self.assertRaises(GeminiInvalidResponse):
            parse_and_validate_ai_response(
                '{"title": "", "description": "x", "dueDate": null, "priority": "low"}'
            )

    def test_invalid_priority(self):
        with self.assertRaises(GeminiInvalidResponse):
            parse_and_validate_ai_response(
                '{"title": "Task", "description": "", "dueDate": null, "priority": "urgent"}'
            )

    def test_invalid_date(self):
        with self.assertRaises(GeminiInvalidResponse):
            parse_and_validate_ai_response(
                '{"title": "Task", "description": "", "dueDate": "Monday", "priority": "low"}'
            )


class AIEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_empty_text_rejected(self):
        response = self.client.post("/api/ai/create-task/", {"text": "  "}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Task.objects.count(), 0)

    @patch("tasks.views.generate_task_from_text")
    def test_ai_does_not_save_task(self, mock_generate):
        mock_generate.return_value = {
            "title": "Prepare AWS presentation",
            "description": "Send the presentation to Peter.",
            "dueDate": "2026-09-07",
            "priority": "high",
        }
        response = self.client.post(
            "/api/ai/create-task/",
            {"text": "I need to prepare the AWS presentation for Monday."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "Prepare AWS presentation")
        self.assertEqual(Task.objects.count(), 0)

    @patch("tasks.views.generate_task_from_text")
    def test_gemini_failure(self, mock_generate):
        mock_generate.side_effect = GeminiUnavailable(AI_FRIENDLY_ERROR)
        response = self.client.post(
            "/api/ai/create-task/",
            {"text": "Prepare a presentation"},
            format="json",
        )
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["detail"], AI_FRIENDLY_ERROR)
        self.assertEqual(Task.objects.count(), 0)

    @patch("tasks.views.generate_task_from_text")
    def test_invalid_gemini_json(self, mock_generate):
        mock_generate.side_effect = GeminiInvalidResponse("malformed JSON")
        response = self.client.post(
            "/api/ai/create-task/",
            {"text": "Prepare a presentation"},
            format="json",
        )
        self.assertEqual(response.status_code, 502)
        self.assertEqual(Task.objects.count(), 0)

    @patch("tasks.views.generate_task_from_text")
    def test_rate_limit(self, mock_generate):
        mock_generate.side_effect = GeminiRateLimited(AI_FRIENDLY_ERROR)
        response = self.client.post(
            "/api/ai/create-task/",
            {"text": "Prepare a presentation"},
            format="json",
        )
        self.assertEqual(response.status_code, 429)
