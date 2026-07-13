"""OmniMess face enrollment station.

A student logs in with their roll number + password, looks at the camera,
and presses SPACE to capture. The 512-d ArcFace embedding (never the photo)
is sent to the backend.

Run:  python enroll.py
Keys: SPACE = capture & enroll   |   Q = quit
"""

import getpass

import cv2

import config
from api_client import ApiError, login, enroll_face
from face_engine import FaceEngine


def main():
    print("=== OmniMess Face Enrollment ===")
    roll = input("Student roll number: ").strip()
    password = getpass.getpass("Password: ")

    try:
        token, user = login(roll, password)
    except ApiError as err:
        print(f"Login failed: {err}")
        return
    except Exception as err:
        print(f"Could not reach backend at {config.API_BASE_URL}: {err}")
        return

    print(f"Logged in as {user.get('name', roll)}. Opening camera...")

    engine = FaceEngine()

    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    if not cap.isOpened():
        print("Could not open camera. Check CAMERA_INDEX in config.py.")
        return

    window = "OmniMess Enrollment  |  SPACE = enroll   Q = quit"

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Camera read failed.")
            break

        display = frame.copy()

        embedding, bbox = engine.best_face(frame)

        if bbox is not None:
            x1, y1, x2, y2 = bbox
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 200, 0), 2)
            cv2.putText(display, "Face detected - press SPACE",
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                        (0, 200, 0), 2)
        else:
            cv2.putText(display, "Position your face in the frame",
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                        (0, 0, 255), 2)

        cv2.imshow(window, display)
        key = cv2.waitKey(1) & 0xFF

        if key in (ord("q"), ord("Q")):
            break

        if key == 32:  # SPACE
            if embedding is None:
                print("No face detected — try again with better lighting.")
                continue

            try:
                result = enroll_face(token, embedding)
                print(f"✅ {result.get('message', 'Enrolled!')}")
                break
            except ApiError as err:
                print(f"❌ Enrollment rejected: {err}")
            except Exception as err:
                print(f"❌ Network error: {err}")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()