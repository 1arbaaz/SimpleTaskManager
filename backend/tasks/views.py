from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Task
from .serializers import AITaskRequestSerializer, TaskSerializer
from .services import (
    AI_FRIENDLY_ERROR,
    GeminiInvalidResponse,
    GeminiRateLimited,
    GeminiUnavailable,
    generate_task_from_text,
)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.all()
        search = self.request.query_params.get("search")
        priority = self.request.query_params.get("priority")
        task_status = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        if priority:
            valid_priorities = Task.Priority.values
            if priority not in valid_priorities:
                return queryset.none()
            queryset = queryset.filter(priority=priority)

        if task_status:
            valid_statuses = Task.Status.values
            if task_status not in valid_statuses:
                return queryset.none()
            queryset = queryset.filter(status=task_status)

        return queryset

    def list(self, request, *args, **kwargs):
        priority = request.query_params.get("priority")
        task_status = request.query_params.get("status")

        if priority and priority not in Task.Priority.values:
            return Response(
                {"detail": "priority must be low, medium, or high."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if task_status and task_status not in Task.Status.values:
            return Response(
                {"detail": "status must be pending or completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.COMPLETED
        task.save(update_fields=["status", "updated_at"])
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.PENDING
        task.save(update_fields=["status", "updated_at"])
        return Response(TaskSerializer(task).data)


class DashboardView(APIView):
    def get(self, request):
        today = timezone.localdate()
        tasks = Task.objects.all()
        pending = tasks.filter(status=Task.Status.PENDING).count()
        completed = tasks.filter(status=Task.Status.COMPLETED).count()
        overdue = tasks.filter(
            status=Task.Status.PENDING,
            due_date__lt=today,
        ).count()
        return Response(
            {
                "pending": pending,
                "completed": completed,
                "overdue": overdue,
            }
        )


class AICreateTaskView(APIView):
    def post(self, request):
        serializer = AITaskRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = generate_task_from_text(serializer.validated_data["text"])
        except GeminiRateLimited:
            return Response({"detail": AI_FRIENDLY_ERROR}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except (GeminiUnavailable, GeminiInvalidResponse):
            return Response({"detail": AI_FRIENDLY_ERROR}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(payload, status=status.HTTP_200_OK)
