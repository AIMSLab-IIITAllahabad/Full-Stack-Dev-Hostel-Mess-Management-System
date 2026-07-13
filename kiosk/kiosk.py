"""OmniMess mess-gate kiosk.

Runs at the mess entrance. Watches the camera, and when a person is
detected (YOLO26) it extracts their face embedding (InsightFace/ArcFace)
and asks the backend whether entry is allowed.

Green  = welcome, attendance marked
Red    = denied (rebate conflict / no subscription / already ate)
Yellow = face not recognized

Every outcome is also spoken aloud.

Run:  python kiosk.py
Keys: M = change meal   |   Q = quit
"""

import time
from datetime import datetime

import cv2

import config
from api_client import ApiError, login, mark_attendance
from face_engine import FaceEngine
from voice import speak

MEALS = ["BREAKFAST", "LUNCH", "DINNER"]

GREEN = (0, 190, 0)
RED = (0, 0, 230)
YELLOW = (0, 200, 230)
WHITE = (240, 240, 240)


def default_meal():
    """Pick the meal from the current time (can be overridden with M key)."""
    hour = datetime.now().hour
    if hour < 11:
        return "BREAKFAST"
    if hour < 16:
        return "LUNCH"
    return "DINNER"

def select_hostel():
    """Ask which hostel this kiosk belongs to."""
    valid_hostels = {
        "A": "HOSTEL_A",
        "B": "HOSTEL_B",
        "C": "HOSTEL_C",
        "D": "HOSTEL_D",
        "E": "HOSTEL_E",
    }

    while True:
        hostel = input("Enter hostel (A/B/C/D/E): ").strip().upper()

        if hostel in valid_hostels:
            return valid_hostels[hostel]

        print("Invalid hostel. Please enter A, B, C, D or E.")


def draw_banner(frame, lines, color):
    """Big status banner at the top of the frame."""
    h, w = frame.shape[:2]
    cv2.rectangle(frame, (0, 0), (w, 90 + 35 * (len(lines) - 1)), color, -1)
    y = 55
    for line in lines:
        cv2.putText(frame, line, (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, WHITE, 3)
        y += 45


def draw_footer(frame, meal):
    h, w = frame.shape[:2]
    text = f"Mess: {config.HOSTEL_NAME}   Meal: {meal}   [M] change meal  [Q] quit"
    cv2.rectangle(frame, (0, h - 45), (w, h), (30, 30, 30), -1)
    cv2.putText(frame, text, (15, h - 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, WHITE, 2)


def main():


    try:
        token, user = login(config.MANAGER_ROLL_NUMBER, config.MANAGER_PASSWORD)
    except ApiError as err:
        print(f"Manager login failed: {err}")
        return
    except Exception as err:
        print(f"Could not reach backend at {config.API_BASE_URL}: {err}")
        return

    print(f"Kiosk logged in as {user.get('name', 'manager')}.")

    engine = FaceEngine()

    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    if not cap.isOpened():
        print("Could not open camera. Check CAMERA_INDEX in config.py.")
        return

    meal = default_meal()

    # Result banner state
    banner_lines = None
    banner_color = GREEN
    banner_until = 0.0

    # Cooldown so we don't hammer the API while someone stands there
    next_scan_at = 0.0

    window = "OmniMess Kiosk"

    speak("OmniMess kiosk ready")

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Camera read failed.")
            break

        now = time.time()
        display = frame.copy()

        showing_banner = now < banner_until

        if not showing_banner and now >= next_scan_at:
            # Stage 1: cheap YOLO26 person gate
            if engine.person_present(frame):
                # Stage 2: face detection + embedding
                embedding, bbox = engine.best_face(frame)

                if bbox is not None:
                    x1, y1, x2, y2 = bbox
                    cv2.rectangle(display, (x1, y1), (x2, y2), WHITE, 2)

                if embedding is not None:
                    next_scan_at = now + config.SCAN_COOLDOWN_SECONDS

                    try:
                        result = mark_attendance(
                            token, embedding, meal, config.HOSTEL_NAME
                        )
                        student = result.get("student", {})
                        conf = result.get("confidence", 0)
                        banner_lines = [
                            f"WELCOME {student.get('name', '')}".strip(),
                            f"{student.get('rollNumber', '')}   match {conf:.2f}",
                        ]
                        banner_color = GREEN
                        speak(f"Welcome, {student.get('name', '')}. Entry allowed.")
                        print(f"[OK] {banner_lines[0]} ({banner_lines[1]})")

                    except ApiError as err:
                        code = err.payload.get("code", "")
                        student = err.payload.get("student", {})
                        who = student.get("name", "")

                        if code == "NO_MATCH":
                            banner_lines = ["FACE NOT RECOGNIZED",
                                            "Please enroll first"]
                            banner_color = YELLOW
                            speak("Face not recognized. Please enroll first.")
                        elif code == "REBATE_CONFLICT":
                            banner_lines = [f"ENTRY DENIED - {who}",
                                            "Rebate claimed for today"]
                            banner_color = RED
                            speak(f"Entry not allowed. {who}, you have a rebate for today.")
                        elif code == "ALREADY_MARKED":
                            banner_lines = [f"ALREADY SERVED - {who}",
                                            f"{meal} was already taken"]
                            banner_color = RED
                            speak(f"Entry not allowed. {who}, this meal was already taken.")
                        elif code == "NO_SUBSCRIPTION":
                            banner_lines = [f"ENTRY DENIED - {who}",
                                            "No subscription for this mess"]
                            banner_color = RED
                            speak("Entry not allowed. No active subscription for this mess.")
                        else:
                            banner_lines = ["ERROR", str(err)]
                            banner_color = RED
                            speak("Entry not allowed.")

                        print(f"[DENY] {banner_lines[0]}: {banner_lines[1]}")

                    except Exception as err:
                        banner_lines = ["BACKEND UNREACHABLE", "Check server"]
                        banner_color = RED
                        speak("System error. Backend unreachable.")
                        print(f"[ERR] {err}")

                    banner_until = time.time() + config.RESULT_DISPLAY_SECONDS

        if showing_banner and banner_lines:
            draw_banner(display, banner_lines, banner_color)
        else:
            cv2.putText(display, "Look at the camera",
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, WHITE, 2)

        draw_footer(display, meal)
        cv2.imshow(window, display)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), ord("Q")):
            break
        if key in (ord("m"), ord("M")):
            meal = MEALS[(MEALS.index(meal) + 1) % len(MEALS)]
            print(f"Meal switched to {meal}")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()