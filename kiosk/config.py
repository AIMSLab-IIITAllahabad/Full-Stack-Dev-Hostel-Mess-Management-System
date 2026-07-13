# ---------------- OmniMess Kiosk Configuration ----------------
# Edit these values before running enroll.py or kiosk.py

# Where your Node backend is running.
# If backend runs on THIS laptop, localhost is fine.
API_BASE_URL = "http://localhost:5000"

# The mess this kiosk sits at (must exactly match a hostel name in the DB)
HOSTEL_NAME = "Hostel A"

# Manager/Admin account the kiosk logs in as (needed to mark attendance)
MANAGER_ROLL_NUMBER = "ADMIN001"
MANAGER_PASSWORD = "admin123"

# Camera index (0 = default laptop webcam)
CAMERA_INDEX = 0

# Seconds to display a result on screen before scanning again
RESULT_DISPLAY_SECONDS = 3.0

# Seconds to ignore repeat scans after any API call (prevents spamming
# the server while the same student is still standing in front of camera)
SCAN_COOLDOWN_SECONDS = 3.0

# Minimum face-detection confidence from InsightFace to accept a face
MIN_FACE_DET_SCORE = 0.6

# YOLO model to use for person detection at the kiosk
YOLO_MODEL = "yolo26n.pt"