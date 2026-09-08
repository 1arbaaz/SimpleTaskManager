import json
import logging
import re
from datetime import date, datetime

from django.conf import settings
from django.utils import timezone

from .models import Task

logger = logging.getLogger(__name__)

AI_FRIENDLY_ERROR = (
    "Unable to generate the task right now. Please try again or create the task manually."
)
VALID_PRIORITIES = {Task.Priority.LOW, Task.Priority.MEDIUM, Task.Priority.HIGH}


class GeminiUnavailable(Exception):
    pass


class GeminiInvalidResponse(Exception):
    pass


class GeminiRateLimited(Exception):
    pass


def build_prompt(user_text: str, today: date) -> str:
    return f"""You extract a single task from the user's natural-language request.

Today's date is {today.isoformat()} ({today.strftime("%A")}).
Use this date when interpreting relative dates such as today, tomorrow, Monday, or next Friday.

Rules:
1. Extract a concise task title.
2. Put extra useful details in description. Do not invent details.
3. Extract a due date if one can be determined. Use YYYY-MM-DD.
4. If no due date can be determined, dueDate must be null.
5. Extract priority as low, medium, or high.
6. If priority is not specified, use medium.
7. Return ONLY valid JSON. No markdown. No extra text.

JSON shape:
{{
  "title": "string",
  "description": "string",
  "dueDate": "YYYY-MM-DD" or null,
  "priority": "low" | "medium" | "high"
}}

User request:
{user_text}
"""


def _extract_json_text(raw: str) -> str:
    if raw is None:
        raise GeminiInvalidResponse("empty response")
    text = raw.strip()
    if not text:
        raise GeminiInvalidResponse("empty response")

    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1).strip()
    return text


def _parse_due_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value == "" or value.lower() in {"null", "none"}:
            return None
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError as exc:
            raise GeminiInvalidResponse("invalid dueDate") from exc
        return value
    raise GeminiInvalidResponse("invalid dueDate")


def validate_ai_payload(data: dict) -> dict:
    if not isinstance(data, dict):
        raise GeminiInvalidResponse("response is not an object")

    title = data.get("title")
    if not isinstance(title, str) or not title.strip():
        raise GeminiInvalidResponse("title is missing")

    description = data.get("description", "")
    if description is None:
        description = ""
    if not isinstance(description, str):
        raise GeminiInvalidResponse("description is invalid")

    priority = data.get("priority")
    if not isinstance(priority, str):
        raise GeminiInvalidResponse("priority is missing")
    priority = priority.strip().lower()
    if priority not in VALID_PRIORITIES:
        raise GeminiInvalidResponse("priority is invalid")

    due_date = _parse_due_date(data.get("dueDate"))

    return {
        "title": title.strip()[:200],
        "description": description.strip(),
        "dueDate": due_date,
        "priority": priority,
    }


def parse_and_validate_ai_response(raw: str) -> dict:
    text = _extract_json_text(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise GeminiInvalidResponse("malformed JSON") from exc
    return validate_ai_payload(data)


def _gemini_response_text(response) -> str:
    try:
        text = response.text
        if isinstance(text, str) and text.strip():
            return text
    except ValueError:
        logger.warning("Gemini returned no usable text")
    raise GeminiInvalidResponse("empty response")


def generate_task_from_text(user_text: str) -> dict:
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    model_name = getattr(settings, "GEMINI_MODEL", "") or "gemini-2.5-flash"

    if not api_key:
        logger.warning("GEMINI_API_KEY is not set in backend/.env")
        raise GeminiUnavailable(AI_FRIENDLY_ERROR)

    today = timezone.localdate()
    prompt = build_prompt(user_text, today)

    try:
        from google import genai
        from google.genai import types
    except ImportError as extra:
        logger.warning("google-genai is not installed")
        raise GeminiUnavailable(AI_FRIENDLY_ERROR) from extra

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )

        raw = _gemini_response_text(response)

    except GeminiInvalidResponse:
        raise

    except Exception as extra:
        error_name = type(extra).__name__
        error_message = str(extra)

        logger.warning(
            "Gemini request failed: %s: %s",
            error_name,
            error_message,
        )

        if "429" in error_message or "RESOURCE_EXHAUSTED" in error_message:
            raise GeminiRateLimited(AI_FRIENDLY_ERROR) from extra

        if (
            "401" in error_message
            or "403" in error_message
            or "UNAUTHENTICATED" in error_message
            or "PERMISSION_DENIED" in error_message
        ):
            raise GeminiUnavailable(AI_FRIENDLY_ERROR) from extra

        if "404" in error_message or "NOT_FOUND" in error_message:
            logger.warning(
                "Configured Gemini model may not be available: %s",
                model_name,
            )
            raise GeminiUnavailable(AI_FRIENDLY_ERROR) from extra

        if "timeout" in error_message.lower() or "deadline" in error_message.lower():
            logger.warning("Gemini request timed out")
            raise GeminiUnavailable(AI_FRIENDLY_ERROR) from extra

        raise GeminiUnavailable(AI_FRIENDLY_ERROR) from extra

    return parse_and_validate_ai_response(raw)
