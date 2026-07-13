"""Shared helper for talking to the OmniMess Node backend."""

import requests

import config


class ApiError(Exception):
    """Raised when the backend returns an error we want to surface."""

    def __init__(self, status_code, payload):
        self.status_code = status_code
        self.payload = payload if isinstance(payload, dict) else {}
        message = self.payload.get("message", f"HTTP {status_code}")
        super().__init__(message)


def _post(path, json_body, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    response = requests.post(
        f"{config.API_BASE_URL}{path}",
        json=json_body,
        headers=headers,
        timeout=15,
    )

    try:
        payload = response.json()
    except ValueError:
        payload = {}

    if not response.ok:
        raise ApiError(response.status_code, payload)

    return payload


def login(roll_number, password):
    """Login. Returns (token, user_dict)."""
    payload = _post(
        "/api/auth/login",
        {"rollNumber": roll_number, "password": password},
    )
    return payload["token"], payload.get("user", {})


def enroll_face(token, embedding):
    """Enroll the logged-in student's face embedding."""
    return _post("/api/face/enroll", {"embedding": embedding}, token=token)


def mark_attendance(token, embedding, meal_type, hostel):
    """Scan a face at the mess gate. Raises ApiError on denial."""
    return _post(
        "/api/attendance/mark",
        {"embedding": embedding, "mealType": meal_type, "hostel": hostel},
        token=token,
    )