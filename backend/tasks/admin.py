from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "priority",
        "status",
        "due_date",
        "created_at",
    )
    list_filter = ("priority", "status")
    search_fields = ("title", "description")
