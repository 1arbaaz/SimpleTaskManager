from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AICreateTaskView, DashboardView, TaskViewSet

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("ai/create-task/", AICreateTaskView.as_view(), name="ai-create-task"),
    *router.urls,
]
